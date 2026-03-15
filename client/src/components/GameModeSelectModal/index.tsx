/**
 * Game Mode Selection Modal
 * Allows players to choose a game mode when starting a new game
 */

import { useEffect, useState } from 'react';
import { GameModeId, GameModeConfig, getAllGameModes } from '@kritis/shared';
import { AsciiFrame } from '../TerminalUI';

interface GameModeSelectModalProps {
  onSelect: (mode: GameModeId) => void;
  onClose: () => void;
}

export function GameModeSelectModal({ onSelect, onClose }: GameModeSelectModalProps) {
  const [selectedMode, setSelectedMode] = useState<GameModeId>('intermediate');
  const modes = getAllGameModes();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        onSelect(selectedMode);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = modes.findIndex(m => m.id === selectedMode);
        const nextIndex = e.key === 'ArrowUp'
          ? (currentIndex - 1 + modes.length) % modes.length
          : (currentIndex + 1) % modes.length;
        setSelectedMode(modes[nextIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onSelect, selectedMode, modes]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="w-full max-w-2xl">
        <AsciiFrame title="SPIELMODUS WÄHLEN" variant="info">
          <div className="p-4 space-y-3">
            {/* Mode cards */}
            <div className="space-y-2">
              {modes.map((mode) => (
                <GameModeCard
                  key={mode.id}
                  mode={mode}
                  isSelected={selectedMode === mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  onDoubleClick={() => onSelect(mode.id)}
                />
              ))}
            </div>

            {/* Selected mode details */}
            <div className="border-t border-terminal-border pt-3 mt-3">
              <SelectedModeDetails mode={modes.find(m => m.id === selectedMode)!} />
            </div>

            {/* Footer */}
            <div className="flex justify-between pt-2 border-t border-terminal-border">
              <span className="text-terminal-green-dim text-sm">
                [↑↓] Auswählen  [Enter] Starten  [ESC] Abbrechen
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1 border border-terminal-border hover:border-terminal-green text-sm"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => onSelect(selectedMode)}
                  className="px-4 py-1 border border-terminal-green text-terminal-green hover:bg-terminal-green/20 text-sm"
                >
                  Starten
                </button>
              </div>
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
  onDoubleClick: () => void;
}

function GameModeCard({ mode, isSelected, onClick, onDoubleClick }: GameModeCardProps) {
  const borderColor = isSelected
    ? 'border-terminal-green bg-terminal-green/10'
    : 'border-terminal-border hover:border-terminal-info';

  return (
    <div
      className={`border ${borderColor} p-3 cursor-pointer transition-colors`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
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

interface SelectedModeDetailsProps {
  mode: GameModeConfig;
}

function SelectedModeDetails({ mode }: SelectedModeDetailsProps) {
  // Adventure mode shows different info
  if (mode.id === 'adventure') {
    return (
      <div className="text-sm">
        <div className="text-terminal-info mb-2">─ Story: "Die Probezeit" ─</div>
        <div className="text-terminal-green-dim space-y-1 mb-3">
          <p>Du bist der neue Sysadmin bei der Kommunalen Abfallwirtschaft.</p>
          <p>Zwischen kaputten Druckern und einem mysteriösen Vorgänger wird deine Probezeit zum Abenteuer.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-terminal-green-dim mb-1">─ Features ─</div>
            <div className="space-y-0.5">
              <div>12 Kapitel in 3 Akten</div>
              <div>15+ Sidequests</div>
              <div>3 mögliche Enden</div>
              <div className="text-terminal-info">NPCs erinnern sich</div>
            </div>
          </div>
          <div>
            <div className="text-terminal-green-dim mb-1">─ Hinweise ─</div>
            <div className="space-y-0.5 text-terminal-warning">
              <div>Lineare Story</div>
              <div>Entscheidungen zählen</div>
              <div>Comedy-Drama Ton</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard mode display
  return (
    <div className="grid grid-cols-2 gap-4 text-sm">
      {/* Starting stats */}
      <div>
        <div className="text-terminal-green-dim mb-1">─ Startwerte ─</div>
        <div className="space-y-0.5">
          <div>Skills: {mode.startingStats.skills}</div>
          <div>Stress: {mode.startingStats.stress}</div>
          <div>Budget: {mode.startingStats.budget.toLocaleString('de-DE')}</div>
          <div>Compliance: {mode.startingStats.compliance}%</div>
        </div>
      </div>

      {/* Features */}
      <div>
        <div className="text-terminal-green-dim mb-1">─ Features ─</div>
        <div className="space-y-0.5">
          <div>
            Hinweise: {mode.features.showHints ? (
              <span className="text-terminal-green">Ja</span>
            ) : (
              <span className="text-terminal-green-dim">Nein</span>
            )}
          </div>
          <div>
            Effekt-Multiplikator: {mode.difficulty.effectMultiplier}x
          </div>
          <div>
            Max. Schwierigkeit: {mode.difficulty.maxScenarioDifficulty}
          </div>
          {mode.features.timerEnabled && (
            <div className="text-terminal-warning">
              Timer: {mode.features.timerSeconds}s
            </div>
          )}
          {mode.features.comboScoringEnabled && (
            <div className="text-terminal-info">
              Combo-Scoring aktiv
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
