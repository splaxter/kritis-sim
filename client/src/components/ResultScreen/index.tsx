// client/src/components/ResultScreen/index.tsx
import { EventChoice, EventEffects } from '@kritis/shared';
import { MentorNote } from '../MentorNote';

interface ResultScreenProps {
  choice: EventChoice;
  onContinue: () => void;
  characters?: Record<string, string>;
  mentorNote?: string;
  mentorModeEnabled?: boolean;
  isStoryMode?: boolean;
}

export function ResultScreen({ choice, onContinue, characters = {}, mentorNote, mentorModeEnabled, isStoryMode }: ResultScreenProps) {
  const replaceCharacterNames = (text: string): string => {
    let result = text;
    for (const [role, name] of Object.entries(characters)) {
      result = result.replace(new RegExp(`\\{${role}\\}`, 'g'), name);
    }
    return result;
  };

  const renderEffects = (effects: EventEffects) => {
    const items: JSX.Element[] = [];

    if (effects.skills) {
      for (const [skill, value] of Object.entries(effects.skills)) {
        if (value) {
          const color = value > 0 ? 'text-terminal-success' : 'text-terminal-danger';
          const sign = value > 0 ? '+' : '';
          items.push(
            <div key={`skill-${skill}`} className={color}>
              {skill.charAt(0).toUpperCase() + skill.slice(1)} {sign}{value}
            </div>
          );
        }
      }
    }

    if (effects.relationships) {
      for (const [rel, value] of Object.entries(effects.relationships)) {
        if (value) {
          const color = value > 0 ? 'text-terminal-success' : 'text-terminal-danger';
          const sign = value > 0 ? '+' : '';
          items.push(
            <div key={`rel-${rel}`} className={color}>
              {rel.charAt(0).toUpperCase() + rel.slice(1)} {sign}{value}
            </div>
          );
        }
      }
    }

    if (effects.stress) {
      const color = effects.stress < 0 ? 'text-terminal-success' : 'text-terminal-danger';
      const sign = effects.stress > 0 ? '+' : '';
      items.push(
        <div key="stress" className={color}>
          Stress {sign}{effects.stress}
        </div>
      );
    }

    if (effects.budget) {
      const color = effects.budget > 0 ? 'text-terminal-success' : 'text-terminal-danger';
      const sign = effects.budget > 0 ? '+' : '';
      items.push(
        <div key="budget" className={color}>
          Budget {sign}€{Math.abs(effects.budget).toLocaleString('de-DE')}
        </div>
      );
    }

    if (effects.compliance) {
      const color = effects.compliance > 0 ? 'text-terminal-success' : 'text-terminal-danger';
      const sign = effects.compliance > 0 ? '+' : '';
      items.push(
        <div key="compliance" className={color}>
          Compliance {sign}{effects.compliance}%
        </div>
      );
    }

    return items;
  };

  // Story mode styling
  if (isStoryMode) {
    return (
      <div className="p-5">
        <div className="text-terminal-success text-lg mb-3 flex items-center gap-2">
          <span className="text-xl">✓</span> Entscheidung getroffen
        </div>

        <div className="mb-5 text-gray-200 leading-relaxed">
          {replaceCharacterNames(choice.resultText)}
        </div>

        {choice.teachingMoment && (
          <div className="bg-terminal-info/10 border-l-4 border-terminal-info p-4 mb-5 rounded-r">
            <div className="text-terminal-info text-sm font-medium mb-1">Lerneffekt</div>
            <div className="text-gray-300 text-sm">
              {choice.teachingMoment}
            </div>
            {choice.unlocks && choice.unlocks.length > 0 && (
              <div className="mt-2 text-terminal-success text-sm">
                Neuer Befehl: {choice.unlocks.join(', ')}
              </div>
            )}
          </div>
        )}

        {mentorNote && (
          <MentorNote note={mentorNote} isEnabled={mentorModeEnabled} />
        )}

        <div className="bg-black/30 rounded p-4 mb-5">
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Auswirkungen</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {renderEffects(choice.effects)}
          </div>
        </div>

        <button
          onClick={onContinue}
          className="w-full py-3 bg-terminal-green/20 border border-terminal-green rounded hover:bg-terminal-green/30 transition-colors text-center text-white"
        >
          Weiter [Enter]
        </button>
      </div>
    );
  }

  // Standard mode styling
  return (
    <div className="border border-terminal-border p-6">
      <div className="text-terminal-success text-xl mb-4">
        ✓ ENTSCHEIDUNG GETROFFEN
      </div>

      <div className="mb-6 text-terminal-green-dim leading-relaxed">
        {replaceCharacterNames(choice.resultText)}
      </div>

      {choice.teachingMoment && (
        <div className="border border-terminal-info p-4 mb-6">
          <div className="text-terminal-info mb-2">- LERNEFFEKT -</div>
          <div className="text-terminal-green-dim">
            {choice.teachingMoment}
          </div>
          {choice.unlocks && choice.unlocks.length > 0 && (
            <div className="mt-2 text-terminal-success">
              Neuer Befehl gelernt: {choice.unlocks.join(', ')}
            </div>
          )}
        </div>
      )}

      {mentorNote && (
        <MentorNote note={mentorNote} isEnabled={mentorModeEnabled} />
      )}

      <div className="border border-terminal-border p-4 mb-6">
        <div className="text-terminal-green-dim mb-2">- AUSWIRKUNGEN -</div>
        <div className="grid grid-cols-2 gap-2">
          {renderEffects(choice.effects)}
        </div>
      </div>

      <button
        onClick={onContinue}
        className="w-full p-3 border border-terminal-green hover:bg-terminal-bg-highlight transition-colors text-center"
      >
        [ENTER] Weiter
      </button>
    </div>
  );
}
