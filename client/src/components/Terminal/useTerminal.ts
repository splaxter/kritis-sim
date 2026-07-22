// client/src/components/Terminal/useTerminal.ts
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { TerminalContext, Skills, GameModeId, EventEffects, FeedbackRule } from '@kritis/shared';
import { createShellFromContext, ShellEngine, Completion, resolveTemplateIds, formatGrid, checkStateGoals, CommandResult, selectFeedback } from '../../engine/shell';
import { gatherCompletions, applyCompletionToLine, longestCommonPrefix, tokenUnderCursor } from './completion';
import { buildPrompt } from './prompt';

/** Sum two skill-gain maps; overlapping keys add up (live drip + solution gain). */
function mergeSkillGain(a: Partial<Skills>, b: Partial<Skills>): Partial<Skills> {
  const out: Partial<Skills> = { ...a };
  for (const [key, value] of Object.entries(b) as [keyof Skills, number][]) {
    out[key] = (out[key] ?? 0) + value;
  }
  return out;
}

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
  const [currentLine, setCurrentLine] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [commandsUsed, setCommandsUsed] = useState<string[]>([]);
  const [teachedCommands, setTeachedCommands] = useState<Set<string>>(new Set());

  // Use refs to store latest values without triggering re-renders
  const hintsUsedRef = useRef(hintsUsed);
  const onSolvedRef = useRef(onSolved);
  const onPartialSolutionRef = useRef(onPartialSolution);

  // Create shell engine from context
  const shell = useMemo(() => {
    // Resolve template IDs to actual templates
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

  // Track teached commands ref for solution checking
  const teachedCommandsRef = useRef(teachedCommands);
  useEffect(() => {
    teachedCommandsRef.current = teachedCommands;
  }, [teachedCommands]);

  // Check if any solution condition is met: the command condition (when
  // commands are listed) AND all stateGoals (when present) must hold.
  const checkSolutions = useCallback((newTeachedCommands: Set<string>) => {
    if (!context.solutions || context.solutions.length === 0) return null;

    for (const solution of context.solutions) {
      // A solution with neither commands nor stateGoals would be vacuously
      // true — treat it as an authoring mistake and never match it.
      if (solution.commands.length === 0 && !solution.stateGoals) continue;

      const commandsMet = solution.commands.length === 0
        || (solution.allRequired
          ? solution.commands.every(cmd => newTeachedCommands.has(cmd))
          : solution.commands.some(cmd => newTeachedCommands.has(cmd)));
      if (!commandsMet) continue;

      if (solution.stateGoals) {
        const engine = shellRef.current;
        if (!engine || !checkStateGoals(engine, solution.stateGoals)) continue;
      }
      return solution;
    }
    return null;
  }, [context.solutions]);

  // Keep refs up to date
  useEffect(() => {
    hintsUsedRef.current = hintsUsed;
  }, [hintsUsed]);

  useEffect(() => {
    onSolvedRef.current = onSolved;
    onPartialSolutionRef.current = onPartialSolution;
  }, [onSolved, onPartialSolution]);

  useEffect(() => {
    shellRef.current = shell;
  }, [shell]);

  const getPrompt = useCallback(() => {
    // Live prompt info from the engine so ssh sessions change the prompt;
    // context fields are only the fallback while the shell isn't ready.
    const info = shellRef.current?.getPromptInfo();
    return buildPrompt({
      type: context.type,
      username: info?.username ?? context.username,
      hostname: info?.hostname ?? context.hostname,
      path: info?.path || context.currentPath,
      home: info?.home,
    });
  }, [context.type, context.username, context.hostname, context.currentPath]);

  const showHint = useCallback(() => {
    if (hintsUsedRef.current < context.hints.length && xtermRef.current) {
      const hint = context.hints[hintsUsedRef.current];
      xtermRef.current.writeln(`\r\n\x1b[33m${hint}\x1b[0m`);
      xtermRef.current.write(getPrompt());
      setHintsUsed((prev) => prev + 1);
    }
  }, [context.hints, getPrompt]);

  // Initialize terminal only once when context changes
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
    shellRef.current?.setTermCols(term.cols);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Get initial prompt — live engine info so ssh sessions swap the prompt.
    const getTermPrompt = () => {
      const info = shellRef.current?.getPromptInfo();
      return buildPrompt({
        type: context.type,
        username: info?.username ?? context.username,
        hostname: info?.hostname ?? context.hostname,
        path: info?.path || context.currentPath,
        home: info?.home,
      });
    };

    let prompt = getTermPrompt();

    term.writeln(`Connected to ${context.hostname}`);
    term.writeln('\x1b[90mTipp: Tab für Autovervollständigung, ↑/↓ für History, ? für Hinweise\x1b[0m');
    term.writeln('');

    // Auto-show first hint only in beginner mode (not learning mode)
    if (gameMode === 'beginner' && context.hints.length > 0) {
      term.writeln(`\x1b[33m💡 ${context.hints[0]}\x1b[0m`);
      term.writeln('');
      setHintsUsed(1);
    }

    term.write(prompt);

    // Auto-focus terminal so user can start typing immediately
    term.focus();

    // Idle timer for beginner mode suggestions
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const IDLE_TIMEOUT = 8000; // 8 seconds

    const showIdleSuggestion = () => {
      if (gameMode !== 'beginner') return;  // Only auto-hint in beginner mode
      const currentHintIndex = hintsUsedRef.current;
      if (currentHintIndex < context.hints.length) {
        term.writeln('');
        term.writeln(`\x1b[33m💡 ${context.hints[currentHintIndex]}\x1b[0m`);
        term.write(getTermPrompt());
        setHintsUsed(prev => prev + 1);
      }
    };

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (gameMode === 'beginner') {  // Only idle hints in beginner mode
        idleTimer = setTimeout(showIdleSuggestion, IDLE_TIMEOUT);
      }
    };

    // Start initial idle timer
    resetIdleTimer();

    let line = '';
    let cursorPos = 0;
    let savedLine = ''; // For history navigation

    // Once a level is solved the terminal is "frozen": the success/solution
    // text stays on screen and only Enter advances (no auto-timeout).
    let solved = false;
    let pendingSkillGain: Partial<Skills> = {};
    let pendingSolutionEffects: EventEffects = {};

    // Pending-input mode: a command (ssh password prompt etc.) owns the next
    // line. The buffered answer bypasses history, canned matching and echo
    // (when masked), and is fed to shell.continueInput on Enter.
    let pendingActive = false;
    let pendingMask = false;
    let pendingLine = '';
    // First token of the command that opened the prompt — skill drip is
    // credited to it when the chain finally completes with exit 0.
    let pendingCmdName = '';

    // Live skill drip: first successful use of a commandSkillGain command.
    const creditedCommands = new Set<string>();
    let liveSkillGain: Partial<Skills> = {};

    // While a command "streams" its output line-by-line (e.g. ping printing one
    // reply per interval), the terminal swallows input until it finishes.
    let streaming = false;
    let streamTimer: ReturnType<typeof setTimeout> | null = null;

    // Tab-completion scratch state (reset on edits so a stale list never lingers).
    let tabCompletions: Completion[] = [];
    let tabIndex = -1;

    // Get all available command patterns for scenario-specific autocomplete
    const availableCommands = context.commands.map(cmd => cmd.pattern);

    // Helper to clear current line and rewrite
    const rewriteLine = (newLine: string, newCursorPos?: number) => {
      // Move cursor to start of input
      term.write('\x1b[' + (prompt.length + cursorPos + 1) + 'G');
      // Clear from cursor to end of line
      term.write('\x1b[K');
      // Move to prompt end
      term.write('\x1b[' + (prompt.length + 1) + 'G');
      // Clear input area
      term.write('\x1b[K');
      // Write new line
      term.write(newLine);
      line = newLine;
      cursorPos = newCursorPos !== undefined ? newCursorPos : newLine.length;
      // Position cursor
      if (cursorPos < newLine.length) {
        term.write('\x1b[' + (prompt.length + cursorPos + 1) + 'G');
      }
      setCurrentLine(line);
    };

    // A "reply/attempt" line of a ping-style command — the lines we want to
    // pace out over time instead of dumping instantly.
    const isPingReplyLine = (l: string) =>
      /icmp_seq|bytes from|Request timeout|no answer|timed out|Destination.*Unreachable|packet loss/i.test(l);

    // Emit a scenario command's output. For ping-like commands the reply lines
    // are written one at a time with a short delay so it feels like a real
    // ping "trying" the host; everything else is written instantly. `done`
    // runs once all output is on screen (prompt/solution banner/etc.).
    const emitScenarioOutput = (
      output: string,
      pingLike: boolean,
      done: () => void
    ) => {
      const lines = output.split('\n');
      if (!pingLike || !lines.some(isPingReplyLine)) {
        for (const l of lines) term.writeln(l);
        done();
        return;
      }
      streaming = true;
      let i = 0;
      const step = () => {
        if (i >= lines.length) {
          streaming = false;
          streamTimer = null;
          done();
          return;
        }
        const l = lines[i++];
        if (isPingReplyLine(l)) {
          streamTimer = setTimeout(() => {
            term.writeln(l);
            step();
          }, 450);
        } else {
          term.writeln(l);
          step();
        }
      };
      step();
    };

    const resetLineAndPrompt = () => {
      line = '';
      cursorPos = 0;
      setCurrentLine('');
      prompt = getTermPrompt();
      term.write(prompt);
    };

    // Writes an error line plus a beginner-mode tip for common cases.
    const writeShellError = (error: string) => {
      term.writeln(`\x1b[31m${error}\x1b[0m`);
      if (isBeginnerMode) {
        if (error.includes('command not found') || error.includes('not recognized')) {
          term.writeln('\x1b[33m💡 Tipp: Tippe "help" für eine Liste verfügbarer Befehle.\x1b[0m');
        } else if (error.includes('No such file') || error.includes('cannot find')) {
          term.writeln('\x1b[33m💡 Tipp: Nutze "ls" um zu sehen, welche Dateien und Ordner existieren.\x1b[0m');
        } else if (error.includes('Permission denied')) {
          term.writeln('\x1b[33m💡 Tipp: Du hast keine Berechtigung für diese Aktion. Vielleicht mit "sudo"?\x1b[0m');
        } else if (error.includes('not a directory')) {
          term.writeln('\x1b[33m💡 Tipp: Du versuchst, in eine Datei zu wechseln. Nutze "cd" nur für Ordner.\x1b[0m');
        }
      }
    };

    // Success banner + [ENTER] confirmation — shared by the canned-command
    // and real-shell solve paths. Live skill drip is merged in here.
    const announceSolved = (solution: {
      resultText?: string;
      skillGain?: Partial<Skills>;
      effects?: EventEffects;
      feedback?: FeedbackRule[];
    }) => {
      term.writeln('');
      term.writeln('\x1b[32m╔══════════════════════════════════════════════════════════════╗\x1b[0m');
      term.writeln('\x1b[32m║  ✓ AUFGABE ABGESCHLOSSEN                                     ║\x1b[0m');
      term.writeln('\x1b[32m╚══════════════════════════════════════════════════════════════╝\x1b[0m');
      term.writeln('');
      if (solution.resultText) {
        // Append the after-action line (how it was solved) below the base
        // resultText (what was achieved); only the written string changes.
        const extra =
          solution.feedback && shellRef.current
            ? selectFeedback(solution.feedback, shellRef.current.getExecutionLog())
            : null;
        const resultText = extra ? `${solution.resultText}\n\n${extra}` : solution.resultText;
        for (const line of resultText.split('\n')) {
          term.writeln('\x1b[36m' + line + '\x1b[0m');
        }
        term.writeln('');
      }
      // Wait for the player to confirm with Enter (all modes) so the
      // solution stays readable instead of auto-advancing.
      term.writeln(
        gameMode === 'learning'
          ? '\x1b[33m[ENTER] Weiter zur nächsten Lektion...\x1b[0m'
          : '\x1b[33m[ENTER] Weiter...\x1b[0m'
      );
      solved = true;
      pendingSkillGain = mergeSkillGain(liveSkillGain, solution.skillGain || {});
      pendingSolutionEffects = solution.effects || {};
    };

    const creditSkillDrip = (cmdName: string) => {
      const gain = context.commandSkillGain?.[cmdName];
      if (!gain || creditedCommands.has(cmdName)) return;
      creditedCommands.add(cmdName);
      liveSkillGain = mergeSkillGain(liveSkillGain, gain);
    };

    // Tail of every real shell.execute/continueInput result: print output,
    // then either arm the pending-input prompt, announce a solve, or write a
    // fresh prompt. Solutions are never checked mid password prompt.
    const handleShellResult = (result: CommandResult, cmdName: string) => {
      const finish = () => {
        if (result.pendingInput) {
          pendingActive = true;
          pendingMask = result.pendingInput.mask;
          pendingCmdName = cmdName;
          pendingLine = '';
          term.write(result.pendingInput.prompt);
          return;
        }
        if (result.exitCode === 0) {
          creditSkillDrip(cmdName);
        }
        const solution = checkSolutions(teachedCommandsRef.current);
        if (solution) {
          announceSolved(solution);
          return;
        }
        resetLineAndPrompt();
      };

      if (result.clearScreen) {
        term.clear();
        finish();
        return;
      }
      if (!result.pendingInput && result.output && result.output.split('\n').some(isPingReplyLine)) {
        // Live network command (ping etc.): pace the reply lines so it
        // feels like the host is actually being probed, then finish up.
        emitScenarioOutput(result.output, true, () => {
          if (result.error) writeShellError(result.error);
          finish();
        });
        return;
      }
      // Show stdout AND stderr — a pipeline can produce both
      // (`grep x missing | wc -l` prints grep's error and wc's 0).
      if (result.output) {
        for (const shellLine of result.output.split('\n')) {
          term.writeln(shellLine);
        }
      }
      if (result.error) {
        writeShellError(result.error);
      }
      finish();
    };

    term.onData((data) => {
      // Reset idle timer on any input
      resetIdleTimer();

      // While output is streaming (e.g. ping), ignore keystrokes so the
      // animation isn't interrupted or interleaved with a new command.
      if (streaming) {
        return;
      }

      // After solving, swallow all input except Enter, which advances. This
      // keeps the solution on screen until the player confirms.
      if (solved) {
        if (data === '\r') {
          solved = false;
          onSolvedRef.current(pendingSkillGain, undefined, pendingSolutionEffects);
        }
        return;
      }

      // A command owns the next line (ssh password prompt etc.). The answer
      // bypasses history/canned matching; masked input echoes nothing (like
      // real ssh). History, arrows and tab are disabled while pending.
      if (pendingActive) {
        if (data === '\r') {
          term.writeln('');
          const answer = pendingLine;
          pendingActive = false;
          pendingLine = '';
          const result = shellRef.current?.continueInput(answer);
          if (result) {
            // May carry pendingInput again (retry prompt / chained question).
            handleShellResult(result, pendingCmdName);
          } else {
            resetLineAndPrompt();
          }
          return;
        }
        if (data === '\x03') { // Ctrl+C aborts the prompt
          shellRef.current?.cancelPendingInput();
          pendingActive = false;
          pendingLine = '';
          term.writeln('^C');
          resetLineAndPrompt();
          return;
        }
        if (data === '\u007F') { // Backspace edits the buffered answer
          if (pendingLine.length > 0) {
            pendingLine = pendingLine.slice(0, -1);
            if (!pendingMask) term.write('\b \b');
          }
          return;
        }
        if (data.startsWith('\x1b') || data === '\t') {
          return;
        }
        if (data >= ' ') {
          pendingLine += data;
          if (!pendingMask) term.write(data);
        }
        return;
      }

      // Handle escape sequences (arrow keys, etc.)
      if (data.startsWith('\x1b[')) {
        const seq = data.slice(2);
        switch (seq) {
          case 'A': // Up arrow - history navigation
            if (savedLine === '' && line !== '') {
              savedLine = line;
            }
            const prevCmd = shellRef.current?.navigateHistory('up');
            if (prevCmd !== undefined) {
              rewriteLine(prevCmd);
            }
            return;

          case 'B': // Down arrow - history navigation
            const nextCmd = shellRef.current?.navigateHistory('down');
            if (nextCmd !== undefined) {
              rewriteLine(nextCmd);
            } else if (savedLine !== '') {
              rewriteLine(savedLine);
              savedLine = '';
            }
            return;

          case 'C': // Right arrow
            if (cursorPos < line.length) {
              cursorPos++;
              term.write(data);
            }
            return;

          case 'D': // Left arrow
            if (cursorPos > 0) {
              cursorPos--;
              term.write(data);
            }
            return;

          case 'H': // Home
            cursorPos = 0;
            term.write('\x1b[' + (prompt.length + 1) + 'G');
            return;

          case 'F': // End
            cursorPos = line.length;
            term.write('\x1b[' + (prompt.length + line.length + 1) + 'G');
            return;

          case '3~': // Delete
            if (cursorPos < line.length) {
              line = line.slice(0, cursorPos) + line.slice(cursorPos + 1);
              setCurrentLine(line);
              // Rewrite rest of line
              term.write(line.slice(cursorPos) + ' ');
              term.write('\x1b[' + (prompt.length + cursorPos + 1) + 'G');
            }
            return;
        }
        return;
      }

      switch (data) {
        case '\r': // Enter
          // Reset tab completion state
          tabCompletions = [];
          tabIndex = -1;
          term.writeln('');
          if (line.trim()) {
            // Bash history expansion (!!, !N, !$). When it changes the line,
            // real bash echoes the expanded command before running it.
            const expansion = shellRef.current?.expandHistory(line.trim());
            if (expansion?.changed) {
              term.writeln(expansion.expanded);
            } else if (expansion && expansion.expanded !== line.trim() && !expansion.changed) {
              // `!5: event not found` style errors: show and abort.
              term.writeln(`\x1b[31m${expansion.expanded}\x1b[0m`);
              line = '';
              cursorPos = 0;
              setCurrentLine('');
              prompt = getTermPrompt();
              term.write(prompt);
              break;
            }
            const trimmed = expansion?.changed ? expansion.expanded.trim() : line.trim();

            // Add to shell history
            shellRef.current?.addToHistory(trimmed);
            savedLine = '';

            // First, check scenario-specific commands (for solutions/partial solutions)
            let scenarioMatch = false;
            for (const cmd of context.commands) {
              let matches = false;

              if (cmd.patternRegex) {
                matches = new RegExp(cmd.patternRegex).test(trimmed);
              } else {
                matches = trimmed.startsWith(cmd.pattern) || trimmed === cmd.pattern;
              }

              if (matches) {
                setCommandsUsed((prev) => [...prev, trimmed]);
                const output = cmd.output;
                scenarioMatch = true;

                // Ping-style commands stream their reply lines over time.
                const isPingLike =
                  cmd.teachesCommand === 'ping' ||
                  cmd.pattern.startsWith('ping') ||
                  /^PING /.test(output);

                // Track executed commands for solution checking
                // Store both the pattern and teachesCommand for flexible matching
                const newTeached = new Set(teachedCommandsRef.current);
                newTeached.add(cmd.pattern);  // Store the full pattern
                if (cmd.teachesCommand) {
                  newTeached.add(cmd.teachesCommand);  // Also store short form
                }
                setTeachedCommands(newTeached);
                teachedCommandsRef.current = newTeached;

                // Also execute the command in shell engine for cd/navigation
                // This ensures the prompt path updates correctly
                if (trimmed.startsWith('cd ') || trimmed === 'cd') {
                  shellRef.current?.execute(trimmed);
                }

                if (cmd.isSolution) {
                  // Stream output (ping-style commands pace their reply lines),
                  // then show the success banner.
                  emitScenarioOutput(output, isPingLike, () => {
                    announceSolved({ skillGain: cmd.skillGain });
                  });
                  return; // Don't write prompt after solution
                }

                if (cmd.isPartialSolution) {
                  const partialLines = output.split('\n');
                  for (const partialLine of partialLines) {
                    term.writeln(partialLine);
                  }
                  term.writeln('');
                  onPartialSolutionRef.current(
                    cmd.wrongApproachFeedback || 'Das hat nicht wie erwartet funktioniert.'
                  );
                  line = '';
                  cursorPos = 0;
                  setCurrentLine('');
                  prompt = getTermPrompt();
                  term.write(prompt);
                  return;
                }

                // Non-solution scenario command - show output (ping-style
                // commands stream their reply lines), then either the success
                // banner (if this command completed a multi-step solution) or a
                // fresh prompt.
                emitScenarioOutput(output, isPingLike, () => {
                  // Check if all solution requirements are now met
                  const solution = checkSolutions(teachedCommandsRef.current);
                  if (solution) {
                    announceSolved(solution);
                    return;
                  }
                  resetLineAndPrompt();
                });
                return;
              }
            }

            // No scenario match - use shell engine for command execution.
            // handleShellResult owns the tail: output, pending-input prompt,
            // solution check (incl. stateGoals), skill drip, fresh prompt.
            if (!scenarioMatch && shellRef.current) {
              const cmdName = trimmed.split(/\s+/)[0];
              const result = shellRef.current.execute(trimmed);
              handleShellResult(result, cmdName);
              return;
            }
          }
          line = '';
          cursorPos = 0;
          setCurrentLine('');
          prompt = getTermPrompt();
          term.write(prompt);
          break;

        case '\u007F': // Backspace
          // Reset tab completion state
          tabCompletions = [];
          tabIndex = -1;
          if (cursorPos > 0) {
            line = line.slice(0, cursorPos - 1) + line.slice(cursorPos);
            cursorPos--;
            setCurrentLine(line);
            // Move back, rewrite rest of line, clear extra char
            term.write('\b');
            term.write(line.slice(cursorPos) + ' ');
            term.write('\x1b[' + (prompt.length + cursorPos + 1) + 'G');
          }
          break;

        case '\x03': // Ctrl+C
          term.writeln('^C');
          line = '';
          cursorPos = 0;
          setCurrentLine('');
          term.write(prompt);
          break;

        case '\x0c': // Ctrl+L - clear screen, preserve the current line
          term.clear();
          term.write(prompt + line);
          if (cursorPos < line.length) {
            term.write('\x1b[' + (prompt.length + cursorPos + 1) + 'G');
          }
          break;

        case '\x15': // Ctrl+U - clear line
          line = '';
          cursorPos = 0;
          setCurrentLine('');
          term.write('\x1b[' + (prompt.length + 1) + 'G');
          term.write('\x1b[K');
          break;

        case '\x0b': // Ctrl+K - clear to end of line
          line = line.slice(0, cursorPos);
          setCurrentLine(line);
          term.write('\x1b[K');
          break;

        case '\x01': // Ctrl+A - move to start
          cursorPos = 0;
          term.write('\x1b[' + (prompt.length + 1) + 'G');
          break;

        case '\x05': // Ctrl+E - move to end
          cursorPos = line.length;
          term.write('\x1b[' + (prompt.length + line.length + 1) + 'G');
          break;

        case '\x17': // Ctrl+W - delete word backwards
          if (cursorPos > 0) {
            let newPos = cursorPos - 1;
            // Skip trailing spaces
            while (newPos > 0 && line[newPos] === ' ') newPos--;
            // Find word boundary
            while (newPos > 0 && line[newPos - 1] !== ' ') newPos--;

            const deletedChars = cursorPos - newPos;
            line = line.slice(0, newPos) + line.slice(cursorPos);
            cursorPos = newPos;
            setCurrentLine(line);

            // Rewrite line from new cursor position
            term.write('\x1b[' + (prompt.length + cursorPos + 1) + 'G');
            term.write(line.slice(cursorPos) + ' '.repeat(deletedChars));
            term.write('\x1b[' + (prompt.length + cursorPos + 1) + 'G');
          }
          break;

        case '\t': // Tab - bash-style completion (fill common prefix, then list)
          {
            // Print all matches as an aligned column grid below the line, then
            // redraw the prompt + current input — what bash shows when the
            // options can't be narrowed further.
            const printCompletionList = (comps: Completion[]) => {
              const items = comps.map(c => c.display || c.value);
              term.writeln('');
              for (const row of formatGrid(items, term.cols || 80)) {
                term.writeln('\x1b[36m' + row + '\x1b[0m');
              }
              term.write(prompt + line);
              if (cursorPos < line.length) {
                term.write('\x1b[' + (prompt.length + cursorPos + 1) + 'G');
              }
            };

            const completions = gatherCompletions(shellRef.current, availableCommands, line, cursorPos);

            if (completions.length === 0) {
              if (line.length === 0) {
                term.writeln('');
                term.writeln('\x1b[36mVerfügbare Befehle: help, ls, cd, cat, grep, ...\x1b[0m');
                term.writeln('\x1b[36mSzenario-Befehle: ' + availableCommands.slice(0, 3).join(', ') + (availableCommands.length > 3 ? ', ...' : '') + '\x1b[0m');
                term.write(prompt);
              } else {
                term.write('\x07'); // visual bell — nothing matches
              }
            } else if (completions.length === 1) {
              const r = applyCompletionToLine(line, cursorPos, completions[0]);
              rewriteLine(r.line, r.cursor);
            } else {
              // Several matches: first fill the longest common prefix (this also
              // corrects case, e.g. `get-c` → `Get-C`); when it can't extend any
              // further, list every option like bash's second Tab.
              const token = tokenUnderCursor(line, cursorPos);
              const lcp = longestCommonPrefix(completions.map(c => c.value));
              if (lcp !== token) {
                const r = applyCompletionToLine(line, cursorPos, { value: lcp, display: lcp, type: 'argument' }, false);
                rewriteLine(r.line, r.cursor);
              } else {
                printCompletionList(completions);
              }
            }
            // Cycling is gone; keep the shared tab state clean.
            tabCompletions = [];
            tabIndex = -1;
          }
          break;

        case '?': // ? - show hint (only when the line is empty, so it never
                  // eats characters of a typed command). We use '?' instead of
                  // 'h' precisely so commands like `help`, `head`, `history`
                  // stay typeable — the [Hinweis] button works in every case.
          if (line.length === 0) {
            if (hintsUsedRef.current < context.hints.length) {
              const hint = context.hints[hintsUsedRef.current];
              term.writeln('');
              term.writeln(`\x1b[33m💡 ${hint}\x1b[0m`);
              term.write(prompt);
              setHintsUsed((prev) => prev + 1);
            } else {
              term.writeln('');
              term.writeln('\x1b[33mKeine weiteren Hinweise verfügbar.\x1b[0m');
              term.write(prompt);
            }
          } else {
            // Typing '?' as part of a command (e.g. a glob)
            line = line.slice(0, cursorPos) + data + line.slice(cursorPos);
            cursorPos++;
            setCurrentLine(line);
            term.write(data + line.slice(cursorPos));
            term.write('\x1b[' + (prompt.length + cursorPos + 1) + 'G');
          }
          break;

        default:
          if (data >= ' ') {
            // Reset tab completion state on any regular input
            tabCompletions = [];
            tabIndex = -1;
            // Insert character at cursor position
            line = line.slice(0, cursorPos) + data + line.slice(cursorPos);
            cursorPos++;
            setCurrentLine(line);
            // Write char and rest of line
            term.write(data + line.slice(cursorPos));
            // Position cursor
            if (cursorPos < line.length) {
              term.write('\x1b[' + (prompt.length + cursorPos + 1) + 'G');
            }
          }
      }
    });

    const handleResize = () => {
      fitAddon.fit();
      shellRef.current?.setTermCols(term.cols);
    };
    window.addEventListener('resize', handleResize);

    // Prevent browser default Tab behavior (focus change) when terminal is focused
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
      }
    };

    // Attach to the terminal container element
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
      if (streamTimer) clearTimeout(streamTimer);
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
