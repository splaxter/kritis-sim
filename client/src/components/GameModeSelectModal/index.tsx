/**
 * Game Mode Selection Modal
 * Allows players to choose a game mode when starting a new game
 */

import { useEffect, useState } from 'react';
import { GameModeId, GameModeConfig, getVisibleGameModes } from '@kritis/shared';
import { AsciiFrame } from '../TerminalUI';

interface GameModeSelectModalProps {
  onSelect: (mode: GameModeId) => void;
  onClose: () => void;
}

export function GameModeSelectModal({ onSelect, onClose }: GameModeSelectModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const modes = getVisibleGameModes();

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
            {/* Mode cards - single click starts directly */}
            <div className="space-y-2">
              {modes.map((mode, index) => (
                <GameModeCard
                  key={mode.id}
                  mode={mode}
                  isSelected={index === selectedIndex}
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
  onClick: () => void;
  onMouseEnter: () => void;
}

function GameModeCard({ mode, isSelected, onClick, onMouseEnter }: GameModeCardProps) {
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

