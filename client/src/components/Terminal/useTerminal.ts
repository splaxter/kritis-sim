// client/src/components/Terminal/useTerminal.ts
// Thin React adapter over TerminalSession. It owns ONLY the framework/xterm
// concerns: creating the Terminal + FitAddon, wiring term.onData → session,
// applying the session's effects via applyEffects, mirroring terminal width,
// the beginner idle timer, resize/Tab listeners, and cleanup. It NEVER branches
// on the keystroke to decide command/password/pager semantics — every byte is
// forwarded to session.handleData, and the session decides.
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { TerminalContext, Skills, GameModeId, EventEffects } from '@kritis/shared';
import { createShellFromContext, ShellEngine, resolveTemplateIds } from '../../engine/shell';
import { TerminalSession } from './session/TerminalSession';
import { applyEffects, EffectContext } from './session/applyEffects';

interface UseTerminalOptions {
  context: TerminalContext;
  onSolved: (skillGain: Partial<Skills>, setsFlags?: string[], solutionEffects?: EventEffects) => void;
  onPartialSolution: (feedback: string) => void;
  gameMode?: GameModeId;
}

export function useTerminal({ context, onSolved, onPartialSolution, gameMode = 'intermediate' }: UseTerminalOptions) {
  const isBeginnerMode = gameMode === 'beginner' || gameMode === 'learning';
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const shellRef = useRef<ShellEngine | null>(null);
  const sessionRef = useRef<TerminalSession | null>(null);
  // Shared effect context (drip-timer registry + partial-feedback callback), set
  // when the terminal mounts so the footer [?] button can drive the session too.
  const ctxRef = useRef<EffectContext | null>(null);

  const [hintsUsed, setHintsUsed] = useState(0);
  const [commandsUsed, setCommandsUsed] = useState<string[]>([]);

  // Latest callbacks captured in refs so the session's injected closures always
  // reach the current props without re-running the mount effect.
  const onSolvedRef = useRef(onSolved);
  const onPartialSolutionRef = useRef(onPartialSolution);
  useEffect(() => {
    onSolvedRef.current = onSolved;
    onPartialSolutionRef.current = onPartialSolution;
  }, [onSolved, onPartialSolution]);

  // Create shell engine from context (memoized — the session receives this exact
  // instance and never constructs its own).
  const shell = useMemo(() => {
    const templates = context.templateIds
      ? resolveTemplateIds(context.templateIds)
      : undefined;

    return createShellFromContext({
      type: context.type,
      hostname: context.hostname,
      username: context.username,
      currentPath: context.currentPath,
      vfsOverlay: context.vfsOverlay,
      env: context.env,
      templates,
      commands: context.commands,
      hints: context.hints,
      taskText: context.taskText,
      hosts: context.hosts,
    });
  }, [context]);

  useEffect(() => {
    shellRef.current = shell;
  }, [shell]);

  // Footer [?] button: drive the session's hint request and sync hint state.
  const showHint = useCallback(() => {
    const term = xtermRef.current;
    const session = sessionRef.current;
    const ctx = ctxRef.current;
    if (!term || !session || !ctx) return;
    applyEffects(term, session.handleHintRequest(), ctx);
    setHintsUsed(session.getSnapshot().hintsUsed);
  }, []);

  // Initialize terminal once per context/shell/mode change.
  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontSize: 14,
      theme: {
        background: '#0a0a0a',
        foreground: '#00ff00',
        cursor: '#00ff00',
        cursorAccent: '#0a0a0a',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    const session = new TerminalSession({
      shell,
      context,
      gameMode,
      onSolved: (skillGain, setsFlags, effects) => onSolvedRef.current(skillGain, setsFlags, effects),
      onPartialSolution: (feedback) => onPartialSolutionRef.current(feedback),
    });

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    sessionRef.current = session;

    // Mirror the terminal width into BOTH the session (completion grid layout)
    // and the shell (session.setTermCols does NOT forward to the shell).
    session.setTermCols(term.cols);
    shell.setTermCols(term.cols);

    // Track drip timers so cleanup can clear any pending paced output.
    const dripTimers = new Set<ReturnType<typeof setTimeout>>();
    const ctx: EffectContext = {
      session,
      onPartialSolution: (f) => onPartialSolutionRef.current(f),
      registerDripTimer: (t) => dripTimers.add(t),
    };
    ctxRef.current = ctx;

    // React state is synced from the session snapshot after every effect batch —
    // the single mechanism for hint/command state (applyEffects treats
    // `updateHints` as a no-op precisely because of this).
    const syncState = () => {
      const snap = session.getSnapshot();
      setHintsUsed(snap.hintsUsed);
      setCommandsUsed(snap.commandsUsed);
    };

    // Connect banner + optional beginner auto-hint + first prompt.
    applyEffects(term, session.init(), ctx);
    syncState();

    // Auto-focus so the user can start typing immediately.
    term.focus();

    // Idle timer for beginner-mode suggestions. Single-shot: it only re-arms on
    // input (matching the original), and fires the same hint reveal the footer
    // button uses. NOTE: reproduced via session.handleHintRequest() — see report;
    // the idle hint therefore lacks the original 💡 emoji (cosmetic difference).
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const IDLE_TIMEOUT = 8000; // 8 seconds
    const showIdleSuggestion = () => {
      if (gameMode !== 'beginner') return; // Only auto-hint in beginner mode
      applyEffects(term, session.handleHintRequest(), ctx);
      syncState();
    };
    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (gameMode === 'beginner') {
        idleTimer = setTimeout(showIdleSuggestion, IDLE_TIMEOUT);
      }
    };
    resetIdleTimer();

    // Every keystroke is forwarded verbatim — the adapter never inspects `data`.
    term.onData((data) => {
      resetIdleTimer();
      applyEffects(term, session.handleData(data), ctx);
      syncState();
    });

    const handleResize = () => {
      fitAddon.fit();
      session.setTermCols(term.cols);
      shell.setTermCols(term.cols);
    };
    window.addEventListener('resize', handleResize);

    // Prevent browser default Tab behavior (focus change) while the terminal is
    // focused.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
      }
    };
    const container = terminalRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (container) {
        container.removeEventListener('keydown', handleKeyDown);
      }
      if (idleTimer) clearTimeout(idleTimer);
      for (const t of dripTimers) clearTimeout(t);
      ctxRef.current = null;
      sessionRef.current = null;
      xtermRef.current = null;
      term.dispose();
    };
  }, [context, shell, isBeginnerMode]); // Depend on context, shell, and game mode

  return {
    terminalRef,
    hintsUsed,
    hintsRemaining: context.hints.length - hintsUsed,
    commandsUsed,
    showHint,
    shell, // Expose shell engine for external access
  };
}
