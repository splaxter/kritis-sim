/**
 * Game Mode Selection Modal
 * Allows players to choose a game mode when starting a new game
 */

import { useEffect, useRef, useState } from 'react';
import { GameModeId, GameModeConfig, getVisibleGameModes, RECOMMENDED_MODE_ID } from '@kritis/shared';
import { AsciiFrame } from '../TerminalUI';

interface GameModeSelectModalProps {
  onSelect: (mode: GameModeId) => void;
  onClose: () => void;
}

const SIMULATION_MODES = getVisibleGameModes().filter((mode) =>
  ['beginner', 'intermediate', 'kritis'].includes(mode.id)
);

export function GameModeSelectModal({ onSelect, onClose }: GameModeSelectModalProps) {
  const modes = SIMULATION_MODES;
  // Pre-select the recommended mode so newcomers can just hit Enter.
  const recommendedIndex = Math.max(0, modes.findIndex((m) => m.id === RECOMMENDED_MODE_ID));
  const [selectedIndex, setSelectedIndex] = useState(recommendedIndex);
  const selectedIndexRef = useRef(recommendedIndex);
  const dialogRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectOption = (index: number, moveFocus = false) => {
    selectedIndexRef.current = index;
    setSelectedIndex(index);
    if (moveFocus) optionRefs.current[index]?.focus();
  };

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    optionRefs.current[recommendedIndex]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = e.key === 'ArrowUp'
          ? (selectedIndexRef.current - 1 + modes.length) % modes.length
          : (selectedIndexRef.current + 1) % modes.length;
        selectOption(nextIndex, true);
      } else if (e.key === 'Tab') {
        const buttons = Array.from(dialogRef.current?.querySelectorAll('button') ?? []);
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose, recommendedIndex]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Simulation wählen"
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 overscroll-contain"
    >
      <div className="w-full max-w-2xl">
        <AsciiFrame title="SIMULATION WÄHLEN" variant="info">
          <div className="p-4 space-y-3">
            {/* Newcomer guidance — the picker shows 3 variants before you know the game. */}
            <p className="text-terminal-green-dim text-sm">
              Neu hier? <span className="text-terminal-green">Einsteiger</span> ist vorausgewählt —
              einfach Enter drücken. Erfahrene wählen mit [↑↓].
            </p>

            {/* Mode cards - single click starts directly */}
            <div className="space-y-2">
              {modes.map((mode, index) => (
                <GameModeCard
                  key={mode.id}
                  mode={mode}
                  isSelected={index === selectedIndex}
                  isRecommended={mode.id === RECOMMENDED_MODE_ID}
                  onClick={() => onSelect(mode.id)}
                  onMouseEnter={() => selectOption(index)}
                  onFocus={() => selectOption(index)}
                  buttonRef={(element) => { optionRefs.current[index] = element; }}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="flex justify-between pt-2 border-t border-terminal-border">
              <span className="text-terminal-green-dim text-sm">
                [↑↓] Navigieren  [Enter/Klick] Starten  [ESC] Abbrechen
              </span>
              <button
                onClick={onClose}
                className="px-3 py-1 border border-terminal-border hover:border-terminal-green text-sm"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </AsciiFrame>
      </div>
    </div>
  );
}

interface GameModeCardProps {
  mode: GameModeConfig;
  isSelected: boolean;
  isRecommended: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onFocus: () => void;
  buttonRef: (element: HTMLButtonElement | null) => void;
}

function GameModeCard({ mode, isSelected, isRecommended, onClick, onMouseEnter, onFocus, buttonRef }: GameModeCardProps) {
  const borderColor = isSelected
    ? 'border-terminal-green bg-terminal-green/10'
    : 'border-terminal-border hover:border-terminal-info';

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-pressed={isSelected}
      className={`w-full border ${borderColor} p-3 cursor-pointer text-left transition-colors focus-visible:ring-2 focus-visible:ring-terminal-green focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <span className="text-2xl">{mode.icon}</span>

        {/* Title and weeks */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isSelected ? 'text-terminal-green' : ''}`}>
              {mode.name}
            </span>
            <span className="text-terminal-green-dim text-sm">
              ({mode.gameLength.totalWeeks} Wochen)
            </span>
            {isRecommended && (
              <span className="text-xs text-terminal-info border border-terminal-info px-1.5 py-0.5 tracking-wide">
                ★ EMPFOHLEN
              </span>
            )}
          </div>
          <div className="text-terminal-green-dim text-sm">
            {mode.description}
          </div>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <span className="text-terminal-green">[*]</span>
        )}
      </div>
    </button>
  );
}
