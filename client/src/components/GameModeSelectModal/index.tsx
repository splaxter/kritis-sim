/**
 * Game Mode Selection Modal
 * Allows players to choose a game mode when starting a new game
 */

import { useEffect, useState } from 'react';
import { GameModeId, GameModeConfig, getVisibleGameModes, RECOMMENDED_MODE_ID } from '@kritis/shared';
import { AsciiFrame } from '../TerminalUI';

interface GameModeSelectModalProps {
  onSelect: (mode: GameModeId) => void;
  onClose: () => void;
}

export function GameModeSelectModal({ onSelect, onClose }: GameModeSelectModalProps) {
  const modes = getVisibleGameModes();
  // Pre-select the recommended mode so newcomers can just hit Enter.
  const recommendedIndex = Math.max(0, modes.findIndex((m) => m.id === RECOMMENDED_MODE_ID));
  const [selectedIndex, setSelectedIndex] = useState(recommendedIndex);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        onSelect(modes[selectedIndex].id);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = e.key === 'ArrowUp'
          ? (selectedIndex - 1 + modes.length) % modes.length
          : (selectedIndex + 1) % modes.length;
        setSelectedIndex(nextIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onSelect, selectedIndex, modes]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="w-full max-w-2xl">
        <AsciiFrame title="SPIELMODUS WÄHLEN" variant="info">
          <div className="p-4 space-y-3">
            {/* Newcomer guidance — the picker shows 4 modes before you know the game. */}
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
                  onMouseEnter={() => setSelectedIndex(index)}
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
}

function GameModeCard({ mode, isSelected, isRecommended, onClick, onMouseEnter }: GameModeCardProps) {
  const borderColor = isSelected
    ? 'border-terminal-green bg-terminal-green/10'
    : 'border-terminal-border hover:border-terminal-info';

  return (
    <div
      className={`border ${borderColor} p-3 cursor-pointer transition-colors`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
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
    </div>
  );
}

