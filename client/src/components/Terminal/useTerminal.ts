// client/src/components/Terminal/useTerminal.ts
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { TerminalContext, Skills, GameModeId } from '@kritis/shared';
import { createShellFromContext, ShellEngine, Completion, resolveTemplateIds, formatGrid } from '../../engine/shell';
import { gatherCompletions, applyCompletionToLine, longestCommonPrefix, tokenUnderCursor } from './completion';
import { buildPrompt } from './prompt';

interface UseTerminalOptions {
  context: TerminalContext;
  onSolved: (skillGain: Partial<Skills>) => void;
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
    });
  }, [context.type, context.hostname, context.username, context.currentPath, context.vfsOverlay, context.env, context.templateIds]);

  // Track teached commands ref for solution checking
  const teachedCommandsRef = useRef(teachedCommands);
  useEffect(() => {
    teachedCommandsRef.current = teachedCommands;
  }, [teachedCommands]);

  // Check if any solution condition is met
  const checkSolutions = useCallback((newTeachedCommands: Set<string>) => {
    if (!context.solutions || context.solutions.length === 0) return null;

    for (const solution of context.solutions) {
      if (solution.allRequired) {
        // All commands must be learned - exact match required
        const allMet = solution.commands.every(cmd => newTeachedCommands.has(cmd));
        if (allMet) return solution;
      } else {
        // Any command matches
        const anyMet = solution.commands.some(cmd => newTeachedCommands.has(cmd));
        if (anyMet) return solution;
      }
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
    const vfs = shellRef.current?.getVfs();
    return buildPrompt({
      type: context.type,
      username: context.username,
      hostname: context.hostname,
      path: vfs?.getCurrentPath() || context.currentPath,
      home: vfs?.getEnv('HOME'),
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

    // Get initial prompt
    const getTermPrompt = () => {
      const vfs = shellRef.current?.getVfs();
      return buildPrompt({
        type: context.type,
        username: context.username,
        hostname: context.hostname,
        path: vfs?.getCurrentPath() || context.currentPath,
        home: vfs?.getEnv('HOME'),
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
          onSolvedRef.current(pendingSkillGain);
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
                  // then show the exit code + success banner.
                  emitScenarioOutput(output, isPingLike, () => {
                    term.writeln('');

                    // Show realistic exit code
                    term.writeln('\x1b[90m[Process completed with exit code 0]\x1b[0m');
                    term.writeln('');

                    // Show success feedback
                    term.writeln('\x1b[32m╔══════════════════════════════════════════════════════════════╗\x1b[0m');
                    term.writeln('\x1b[32m║  ✓ AUFGABE ABGESCHLOSSEN                                     ║\x1b[0m');
                    term.writeln('\x1b[32m╚══════════════════════════════════════════════════════════════╝\x1b[0m');
                    term.writeln('');

                    // Wait for the player to confirm with Enter (all modes) so the
                    // solution stays readable instead of auto-advancing.
                    term.writeln(
                      gameMode === 'learning'
                        ? '\x1b[33m[ENTER] Weiter zur nächsten Lektion...\x1b[0m'
                        : '\x1b[33m[ENTER] Weiter...\x1b[0m'
                    );
                    solved = true;
                    pendingSkillGain = cmd.skillGain || {};
                  });
                  return; // Don't write prompt after solution
                }

                if (cmd.isPartialSolution) {
                  const partialLines = output.split('\n');
                  for (const partialLine of partialLines) {
                    term.writeln(partialLine);
                  }
                  term.writeln('');
                  term.writeln('\x1b[33m[Exit code 1 - Teilweise erfolgreich]\x1b[0m');
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
                    term.writeln('');
                    term.writeln('\x1b[32m╔══════════════════════════════════════════════════════════════╗\x1b[0m');
                    term.writeln('\x1b[32m║  ✓ AUFGABE ABGESCHLOSSEN                                     ║\x1b[0m');
                    term.writeln('\x1b[32m╚══════════════════════════════════════════════════════════════╝\x1b[0m');
                    term.writeln('');
                    // Show full result text for learning mode
                    if (solution.resultText) {
                      term.writeln('\x1b[36m' + solution.resultText + '\x1b[0m');
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
                    pendingSkillGain = solution.skillGain || {};
                    return;
                  }

                  line = '';
                  cursorPos = 0;
                  setCurrentLine('');
                  prompt = getTermPrompt();
                  term.write(prompt);
                });
                return;
              }
            }

            // No scenario match - use shell engine for command execution
            if (!scenarioMatch && shellRef.current) {
              const result = shellRef.current.execute(trimmed);

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

              // Handle clear screen
              if (result.clearScreen) {
                term.clear();
              } else if (result.output && result.output.split('\n').some(isPingReplyLine)) {
                // Live network command (ping etc.): pace the reply lines so it
                // feels like the host is actually being probed, then finish up.
                emitScenarioOutput(result.output, true, () => {
                  if (result.error) writeShellError(result.error);
                  line = '';
                  cursorPos = 0;
                  setCurrentLine('');
                  prompt = getTermPrompt();
                  term.write(prompt);
                });
                return; // prompt is written in the done callback above
              } else {
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
              }
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
