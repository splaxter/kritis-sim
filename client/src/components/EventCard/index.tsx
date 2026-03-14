import { GameEvent, EventChoice, GameState } from '@kritis/shared';
import { getVisibleChoices } from '../../engine/eventEngine';

interface EventCardProps {
  event: GameEvent;
  state: GameState;
  onChoice: (choice: EventChoice) => void;
  characters?: Record<string, string>;
}

export function EventCard({ event, state, onChoice, characters = {} }: EventCardProps) {
  const visibleChoices = getVisibleChoices(event, state);

  const replaceCharacterNames = (text: string): string => {
    let result = text;
    for (const [role, name] of Object.entries(characters)) {
      result = result.replace(new RegExp(`\\{${role}\\}`, 'g'), name);
    }
    return result;
  };

  return (
    <div className="border border-terminal-border p-4">
      <div className="text-terminal-green-dim mb-2 text-sm">─ EREIGNIS ─</div>

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
              className="w-full text-left p-2 border border-terminal-border hover:bg-terminal-bg-highlight hover:border-terminal-green transition-colors flex justify-between items-center"
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
        [1-{visibleChoices.length}] Auswählen   [H] Hilfe   [S] Speichern   [M] Menü
      </div>
    </div>
  );
}
