// client/src/components/Terminal/useTerminal.ts
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { TerminalContext, Skills } from '@kritis/shared';
import { createShellFromContext, ShellEngine, Completion, resolveTemplateIds } from '../../engine/shell';

interface UseTerminalOptions {
  context: TerminalContext;
  onSolved: (skillGain: Partial<Skills>) => void;
  onPartialSolution: (feedback: string) => void;
}

export function useTerminal({ context, onSolved, onPartialSolution }: UseTerminalOptions) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const shellRef = useRef<ShellEngine | null>(null);
  const [currentLine, setCurrentLine] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [commandsUsed, setCommandsUsed] = useState<string[]>([]);

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
    // Use VFS current path for dynamic prompt
    const vfs = shellRef.current?.getVfs();
    const currentPath = vfs?.getCurrentPath() || context.currentPath;

    if (context.type === 'linux') {
      return `${context.username}@${context.hostname}:${currentPath}$ `;
    }
    return `PS ${currentPath}> `;
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

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Get initial prompt
    const getTermPrompt = () => {
      const vfs = shellRef.current?.getVfs();
      const currentPath = vfs?.getCurrentPath() || context.currentPath;
      if (context.type === 'linux') {
        return `${context.username}@${context.hostname}:${currentPath}$ `;
      }
      return `PS ${currentPath}> `;
    };

    let prompt = getTermPrompt();

    term.writeln(`Connected to ${context.hostname}`);
    term.writeln('\x1b[90mTipp: Tab für Autovervollständigung, ↑/↓ für History, H für Hinweise\x1b[0m');
    term.writeln('');
    term.write(prompt);

    let line = '';
    let cursorPos = 0;
    let savedLine = ''; // For history navigation

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

    term.onData((data) => {
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
          term.writeln('');
          if (line.trim()) {
            const trimmed = line.trim();

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

                if (cmd.isSolution) {
                  // Show output first
                  term.writeln(output);
                  term.writeln('');

                  // Show realistic exit code
                  term.writeln('\x1b[90m[Process completed with exit code 0]\x1b[0m');
                  term.writeln('');

                  // Show success feedback
                  term.writeln('\x1b[32m╔════════════════════════════════════════╗\x1b[0m');
                  term.writeln('\x1b[32m║  ✓ Problem erfolgreich gelöst!        ║\x1b[0m');
                  term.writeln('\x1b[32m╚════════════════════════════════════════╝\x1b[0m');
                  term.writeln('');
                  term.writeln('\x1b[90mWeiter in 3 Sekunden...\x1b[0m');

                  // Wait before transitioning
                  setTimeout(() => onSolvedRef.current(cmd.skillGain || {}), 3000);
                  return; // Don't write prompt after solution
                }

                if (cmd.isPartialSolution) {
                  term.writeln(output);
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

                // Non-solution scenario command - show output
                term.writeln(output);
                line = '';
                cursorPos = 0;
                setCurrentLine('');
                prompt = getTermPrompt();
                term.write(prompt);
                return;
              }
            }

            // No scenario match - use shell engine for command execution
            if (!scenarioMatch && shellRef.current) {
              const result = shellRef.current.execute(trimmed);

              // Handle clear screen
              if (result.clearScreen) {
                term.clear();
              } else {
                // Show output or error
                if (result.error) {
                  term.writeln(`\x1b[31m${result.error}\x1b[0m`);
                } else if (result.output) {
                  term.writeln(result.output);
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

        case '\t': // Tab - autocomplete
          {
            // Prevent default tab behavior (focus change)
            // Get completions from shell engine
            const shellCompletions = shellRef.current?.complete(line, cursorPos) || [];

            // Also get scenario command completions - match partial commands
            const tokens = line.split(/\s+/);
            const lastToken = tokens[tokens.length - 1] || '';
            const isFirstToken = tokens.length <= 1 && !line.includes(' ');

            // For first token, match against command starts; for later tokens, use path/arg completion
            const scenarioMatches = isFirstToken
              ? availableCommands.filter(cmd =>
                  cmd.toLowerCase().startsWith(line.toLowerCase().trim())
                )
              : [];

            // Combine and deduplicate completions
            const allCompletions = new Map<string, Completion>();

            // Add shell completions
            for (const comp of shellCompletions) {
              allCompletions.set(comp.value, comp);
            }

            // Add scenario completions (these take priority for display purposes)
            for (const cmd of scenarioMatches) {
              if (!allCompletions.has(cmd)) {
                allCompletions.set(cmd, {
                  value: cmd,
                  display: cmd,
                  type: 'command',
                  description: 'Scenario command',
                });
              }
            }

            const completions = Array.from(allCompletions.values());

            if (completions.length === 1) {
              // Single match - complete it
              const completion = completions[0];
              // Find what to add based on the last token
              const toAdd = completion.value.slice(lastToken.length);

              // Add space after completion if it's a command/directory
              const suffix = (completion.type === 'command' || completion.type === 'directory') ? ' ' : '';

              if (toAdd.length > 0 || suffix.length > 0) {
                // Insert at cursor position
                line = line.slice(0, cursorPos) + toAdd + suffix + line.slice(cursorPos);
                cursorPos += toAdd.length + suffix.length;
                setCurrentLine(line);
                term.write(toAdd + suffix);
              }
              // If nothing to add, the completion is already complete
            } else if (completions.length > 1) {
              // Multiple matches - find common prefix
              const values = completions.map(c => c.value);

              // Find common prefix
              let commonPrefix = values[0] || '';
              for (const val of values) {
                let i = 0;
                while (i < commonPrefix.length && i < val.length && commonPrefix[i] === val[i]) {
                  i++;
                }
                commonPrefix = commonPrefix.slice(0, i);
              }

              // If common prefix extends current input, complete to it
              if (commonPrefix.length > lastToken.length) {
                const toAdd = commonPrefix.slice(lastToken.length);
                line = line.slice(0, cursorPos) + toAdd + line.slice(cursorPos);
                cursorPos += toAdd.length;
                setCurrentLine(line);
                term.write(toAdd);
              } else {
                // Show all matches
                term.writeln('');

                // Group by type for better display
                const byType: Record<string, Completion[]> = {};
                for (const comp of completions) {
                  const type = comp.type || 'other';
                  if (!byType[type]) byType[type] = [];
                  byType[type].push(comp);
                }

                // Display completions
                for (const [type, comps] of Object.entries(byType)) {
                  const displayStr = comps.map(c => {
                    if (type === 'directory') {
                      return `\x1b[34m${c.display}/\x1b[0m`;
                    } else if (type === 'file') {
                      return c.display;
                    } else if (type === 'command') {
                      return `\x1b[32m${c.display}\x1b[0m`;
                    }
                    return c.display;
                  }).join('  ');
                  term.writeln(displayStr);
                }

                term.write(prompt + line);
                term.write('\x1b[' + (prompt.length + cursorPos + 1) + 'G');
              }
            } else if (line.length === 0) {
              // Empty line - show help message
              term.writeln('');
              term.writeln('\x1b[36mVerfügbare Befehle: help, ls, cd, cat, grep, ...\x1b[0m');
              term.writeln('\x1b[36mSzenario-Befehle: ' + availableCommands.slice(0, 3).join(', ') + (availableCommands.length > 3 ? ', ...' : '') + '\x1b[0m');
              term.write(prompt);
            } else {
              // No completions found for current input - show visual feedback
              term.write('\x07'); // Bell character (visual bell in most terminals)
            }
          }
          break;

        case 'h': // H - show hint (but only if at start of line or alone)
        case 'H':
          // Show hint if line is empty, otherwise type the character
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
            // Typing h/H as part of command
            line = line.slice(0, cursorPos) + data + line.slice(cursorPos);
            cursorPos++;
            setCurrentLine(line);
            term.write(data + line.slice(cursorPos));
            term.write('\x1b[' + (prompt.length + cursorPos + 1) + 'G');
          }
          break;

        default:
          if (data >= ' ') {
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

    const handleResize = () => fitAddon.fit();
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
      term.dispose();
    };
  }, [context, shell]); // Depend on context and shell

  return {
    terminalRef,
    hintsUsed,
    hintsRemaining: context.hints.length - hintsUsed,
    commandsUsed,
    showHint,
    shell, // Expose shell engine for external access
  };
}
