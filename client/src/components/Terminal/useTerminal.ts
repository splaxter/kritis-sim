// client/src/components/Terminal/useTerminal.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { TerminalContext, TerminalCommand, Skills } from '@kritis/shared';

interface UseTerminalOptions {
  context: TerminalContext;
  onSolved: (skillGain: Partial<Skills>) => void;
  onPartialSolution: (feedback: string) => void;
}

export function useTerminal({ context, onSolved, onPartialSolution }: UseTerminalOptions) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [currentLine, setCurrentLine] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [commandsUsed, setCommandsUsed] = useState<string[]>([]);

  const getPrompt = useCallback(() => {
    if (context.type === 'linux') {
      return `${context.username}@${context.hostname}:${context.currentPath}$ `;
    }
    return `PS ${context.currentPath}> `;
  }, [context]);

  const executeCommand = useCallback((input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';

    // Find matching command
    for (const cmd of context.commands) {
      let matches = false;

      if (cmd.patternRegex) {
        matches = new RegExp(cmd.patternRegex).test(trimmed);
      } else {
        matches = trimmed.startsWith(cmd.pattern) || trimmed === cmd.pattern;
      }

      if (matches) {
        setCommandsUsed((prev) => [...prev, trimmed]);

        if (cmd.isSolution) {
          setTimeout(() => onSolved(cmd.skillGain || {}), 100);
          return cmd.output;
        }

        if (cmd.isPartialSolution) {
          onPartialSolution(cmd.wrongApproachFeedback || 'Das hat nicht wie erwartet funktioniert.');
          return cmd.output;
        }

        return cmd.output;
      }
    }

    return `${trimmed.split(' ')[0]}: Befehl nicht gefunden`;
  }, [context, onSolved, onPartialSolution]);

  const showHint = useCallback(() => {
    if (hintsUsed < context.hints.length && xtermRef.current) {
      const hint = context.hints[hintsUsed];
      xtermRef.current.writeln(`\r\n\x1b[33m${hint}\x1b[0m`);
      xtermRef.current.write(getPrompt());
      setHintsUsed((prev) => prev + 1);
    }
  }, [hintsUsed, context.hints, getPrompt]);

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

    // Welcome message
    term.writeln(`Connected to ${context.hostname}`);
    term.writeln('');
    term.write(getPrompt());

    let line = '';

    term.onData((data) => {
      switch (data) {
        case '\r': // Enter
          term.writeln('');
          if (line.trim()) {
            const output = executeCommand(line);
            if (output) {
              term.writeln(output);
            }
          }
          line = '';
          setCurrentLine('');
          term.write(getPrompt());
          break;

        case '\u007F': // Backspace
          if (line.length > 0) {
            line = line.slice(0, -1);
            setCurrentLine(line);
            term.write('\b \b');
          }
          break;

        case '\t': // Tab - show hint
          showHint();
          break;

        default:
          if (data >= ' ') {
            line += data;
            setCurrentLine(line);
            term.write(data);
          }
      }
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [context, getPrompt, executeCommand, showHint]);

  return {
    terminalRef,
    hintsUsed,
    hintsRemaining: context.hints.length - hintsUsed,
    commandsUsed,
    showHint,
  };
}
