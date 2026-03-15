import { GameEvent, EventChoice, GameState } from '@kritis/shared';
import { getVisibleChoices } from '../../engine/eventEngine';
import { formatArcadeTime } from '../../hooks/useArcadeTimer';
import { formatScore, getMultiplier } from '../../engine/arcadeScoring';

interface ArcadeState {
  /** Whether arcade mode is active */
  enabled: boolean;
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Progress from 0 to 1 */
  progress: number;
  /** Total time in seconds */
  totalTime: number;
  /** Current score */
  score: number;
  /** Current streak */
  streak: number;
  /** Last score popup to show */
  lastScorePopup?: {
    points: number;
    multiplier: number;
    message?: string;
  };
}

interface EventCardProps {
  event: GameEvent;
  state: GameState;
  onChoice: (choice: EventChoice) => void;
  characters?: Record<string, string>;
  arcade?: ArcadeState;
}

export function EventCard({ event, state, onChoice, characters = {}, arcade }: EventCardProps) {
  const visibleChoices = getVisibleChoices(event, state);

  const replaceCharacterNames = (text: string): string => {
    let result = text;
    for (const [role, name] of Object.entries(characters)) {
      result = result.replace(new RegExp(`\\{${role}\\}`, 'g'), name);
    }
    return result;
  };

  // Get timer bar color based on progress
  const getTimerBarColor = () => {
    if (!arcade) return 'bg-terminal-green';
    if (arcade.progress > 0.5) return 'bg-terminal-green';
    if (arcade.progress > 0.25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="border border-terminal-border p-4 relative">
      {/* Arcade Header */}
      {arcade?.enabled && (
        <div className="mb-4 pb-3 border-b border-terminal-border">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-4">
              <span className="text-terminal-info text-lg font-bold">
                SCORE: {formatScore(arcade.score)}
              </span>
              {arcade.streak > 0 && (
                <span className="text-yellow-400 text-sm">
                  x{getMultiplier(arcade.streak)} ({arcade.streak} STREAK)
                </span>
              )}
            </div>
            <div className={`text-2xl font-mono ${arcade.progress <= 0.25 ? 'text-red-500 animate-pulse' : 'text-terminal-green'}`}>
              {formatArcadeTime(arcade.timeRemaining)}
            </div>
          </div>

          {/* Timer Bar */}
          <div className="h-2 bg-terminal-bg-dark rounded-full overflow-hidden">
            <div
              className={`h-full ${getTimerBarColor()} transition-all duration-100 ease-linear`}
              style={{ width: `${arcade.progress * 100}%` }}
            />
          </div>

          {/* Score Popup */}
          {arcade.lastScorePopup && (
            <div className="absolute top-12 right-4 animate-bounce text-right">
              <div className={`text-xl font-bold ${arcade.lastScorePopup.points >= 0 ? 'text-terminal-success' : 'text-red-500'}`}>
                {arcade.lastScorePopup.points >= 0 ? '+' : ''}{formatScore(arcade.lastScorePopup.points)}
              </div>
              {arcade.lastScorePopup.multiplier > 1 && (
                <div className="text-yellow-400 text-sm">
                  x{arcade.lastScorePopup.multiplier}
                </div>
              )}
              {arcade.lastScorePopup.message && (
                <div className="text-yellow-300 text-lg font-bold animate-pulse">
                  {arcade.lastScorePopup.message}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="text-terminal-green-dim mb-2 text-sm">
        {arcade?.enabled ? '─ ARCADE EREIGNIS ─' : '─ EREIGNIS ─'}
      </div>

      <h2 className="text-xl mb-4">&gt; {event.title}</h2>

      <div className="whitespace-pre-wrap mb-6 text-terminal-green-dim leading-relaxed">
        {replaceCharacterNames(event.description)}
      </div>

      <div className="space-y-2">
        {visibleChoices.map((choice, index) => {
          const isRecommended = choice.requires &&
            state.skills[choice.requires.skill] >= choice.requires.threshold + 20;

          return (
            <button
              key={choice.id}
              onClick={() => onChoice(choice)}
              className={`w-full text-left p-2 border border-terminal-border hover:bg-terminal-bg-highlight hover:border-terminal-green transition-colors flex justify-between items-center ${
                arcade?.enabled && arcade.progress <= 0.25 ? 'hover:border-red-500' : ''
              }`}
            >
              <span>
                <span className="text-terminal-green-dim">[{index + 1}]</span>{' '}
                {choice.terminalCommand && <span className="text-terminal-info">&gt; </span>}
                {replaceCharacterNames(choice.text)}
              </span>
              {isRecommended && (
                <span className="text-terminal-success text-sm">[EMPFOHLEN]</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-2 border-t border-terminal-border text-sm text-terminal-green-muted">
        {arcade?.enabled ? (
          <span>[1-{visibleChoices.length}] Schnell auswählen!</span>
        ) : (
          <span>[1-{visibleChoices.length}] Auswählen   [H] Hilfe   [S] Speichern   [M] Menü</span>
        )}
      </div>
    </div>
  );
}
