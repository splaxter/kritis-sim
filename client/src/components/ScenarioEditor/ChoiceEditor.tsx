/**
 * Choice Editor Component
 * Form for editing individual scenario choices
 */

import { ScenarioChoice, ScenarioOutcome } from '@kritis/shared';

interface ChoiceEditorProps {
  choice: ScenarioChoice;
  onChange: (choice: ScenarioChoice) => void;
  onRemove: () => void;
  choiceNumber: number;
}

const OUTCOMES: { value: ScenarioOutcome; label: string; color: string }[] = [
  { value: 'PERFECT', label: 'Perfekt', color: 'text-yellow-400' },
  { value: 'PERFECT_ALTERNATIVE', label: 'Perfekt (Alt.)', color: 'text-yellow-400' },
  { value: 'SUCCESS', label: 'Erfolg', color: 'text-terminal-green' },
  { value: 'PARTIAL_SUCCESS', label: 'Teilerfolg', color: 'text-terminal-warning' },
  { value: 'FAIL', label: 'Fehlschlag', color: 'text-orange-500' },
  { value: 'CRITICAL_FAIL', label: 'Kritischer Fehler', color: 'text-terminal-danger' },
];

const OUTCOME_COLORS: Record<ScenarioOutcome, string> = {
  PERFECT: 'border-yellow-400',
  PERFECT_ALTERNATIVE: 'border-yellow-400',
  SUCCESS: 'border-terminal-green',
  PARTIAL_SUCCESS: 'border-terminal-warning',
  FAIL: 'border-orange-500',
  CRITICAL_FAIL: 'border-terminal-danger',
};

export function ChoiceEditor({
  choice,
  onChange,
  onRemove,
  choiceNumber,
}: ChoiceEditorProps) {
  const updateField = <K extends keyof ScenarioChoice>(
    field: K,
    value: ScenarioChoice[K]
  ) => {
    onChange({ ...choice, [field]: value });
  };

  const borderColor = OUTCOME_COLORS[choice.outcome] || 'border-terminal-border';

  return (
    <div className={`border-l-2 ${borderColor} pl-3 space-y-2`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-terminal-green font-bold">
          Auswahl [{choice.id}]
        </span>
        <button
          onClick={onRemove}
          className="text-terminal-danger hover:underline text-sm"
        >
          [Entfernen]
        </button>
      </div>

      {/* Choice text */}
      <div>
        <label className="text-terminal-green-muted text-sm">
          Auswahltext (was der Spieler sieht)
        </label>
        <input
          type="text"
          value={choice.text}
          onChange={(e) => updateField('text', e.target.value)}
          placeholder='z.B. "Marco zurückschreiben: Das funktioniert nicht"'
          className="w-full bg-terminal-bg border border-terminal-border px-2 py-1 text-terminal-green focus:border-terminal-info outline-none"
        />
      </div>

      {/* Outcome */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-terminal-green-muted text-sm">Ergebnis</label>
          <select
            value={choice.outcome}
            onChange={(e) =>
              updateField('outcome', e.target.value as ScenarioOutcome)
            }
            className="bg-terminal-bg border border-terminal-border px-2 py-1 text-terminal-green focus:border-terminal-info outline-none"
          >
            {OUTCOMES.map((outcome) => (
              <option key={outcome.value} value={outcome.value}>
                {outcome.label}
              </option>
            ))}
          </select>
        </div>

        {/* Score & Reputation */}
        <div className="flex items-center gap-2">
          <label className="text-terminal-green-muted text-sm">Score</label>
          <input
            type="number"
            value={choice.scoreChange}
            onChange={(e) => updateField('scoreChange', parseInt(e.target.value) || 0)}
            className="w-20 bg-terminal-bg border border-terminal-border px-2 py-1 text-terminal-green focus:border-terminal-info outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-terminal-green-muted text-sm">Reputation</label>
          <input
            type="number"
            value={choice.reputationChange}
            onChange={(e) =>
              updateField('reputationChange', parseInt(e.target.value) || 0)
            }
            className="w-20 bg-terminal-bg border border-terminal-border px-2 py-1 text-terminal-green focus:border-terminal-info outline-none"
          />
        </div>
      </div>

      {/* Consequence */}
      <div>
        <label className="text-terminal-green-muted text-sm">
          Konsequenz (was passiert nach der Wahl)
        </label>
        <textarea
          value={choice.consequence}
          onChange={(e) => updateField('consequence', e.target.value)}
          placeholder="Beschreibe was passiert. Nutze konkrete Details und Dialogfetzen."
          rows={3}
          className="w-full bg-terminal-bg border border-terminal-border px-2 py-1 text-terminal-green focus:border-terminal-info outline-none resize-none"
        />
      </div>

      {/* Lesson */}
      <div>
        <label className="text-terminal-green-muted text-sm">
          Lektion (was der Spieler lernt)
        </label>
        <textarea
          value={choice.lesson}
          onChange={(e) => updateField('lesson', e.target.value)}
          placeholder="Was ist die Erkenntnis? Was sollte man in der echten Welt tun?"
          rows={2}
          className="w-full bg-terminal-bg border border-terminal-border px-2 py-1 text-terminal-green focus:border-terminal-info outline-none resize-none"
        />
      </div>

      {/* Advanced options (collapsible) */}
      <details className="text-sm">
        <summary className="text-terminal-green-muted cursor-pointer hover:text-terminal-info">
          Erweiterte Optionen
        </summary>
        <div className="mt-2 space-y-2 pl-2 border-l border-terminal-border">
          <div className="flex items-center gap-2">
            <label className="text-terminal-green-muted w-32">
              Löst Event aus
            </label>
            <input
              type="text"
              value={choice.triggersEvent || ''}
              onChange={(e) => updateField('triggersEvent', e.target.value || undefined)}
              placeholder="Event-ID"
              className="flex-1 bg-terminal-bg border border-terminal-border px-2 py-1 text-terminal-green focus:border-terminal-info outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-terminal-green-muted w-32">
              Folge-Event
            </label>
            <input
              type="text"
              value={choice.followupEvent || ''}
              onChange={(e) => updateField('followupEvent', e.target.value || undefined)}
              placeholder="Event-ID"
              className="flex-1 bg-terminal-bg border border-terminal-border px-2 py-1 text-terminal-green focus:border-terminal-info outline-none"
            />
          </div>
        </div>
      </details>
    </div>
  );
}
