/**
 * Scenario Editor
 * Form-based UI for creating and editing game scenarios
 */

import { useState } from 'react';
import {
  Scenario,
  ScenarioChoice,
  ScenarioCategory,
  ScenarioUrgency,
  ScenarioOutcome,
} from '@kritis/shared';
import { ChoiceEditor } from './ChoiceEditor';
import { ScenarioPreview } from './ScenarioPreview';
import { AsciiFrame } from '../TerminalUI';

interface ScenarioEditorProps {
  initialScenario?: Partial<Scenario>;
  onSave: (scenario: Scenario) => void;
  onCancel: () => void;
  availableNpcs?: Array<{ id: string; name: string }>;
}

const CATEGORIES: { value: ScenarioCategory; label: string }[] = [
  { value: 'vendor_management', label: 'Dienstleister-Management' },
  { value: 'security_incident', label: 'Sicherheitsvorfall' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
  { value: 'crisis_management', label: 'Krisenmanagement' },
  { value: 'team_dynamics', label: 'Team-Dynamik' },
  { value: 'budget_politics', label: 'Budget & Politik' },
];

const URGENCIES: { value: ScenarioUrgency; label: string }[] = [
  { value: 'low', label: 'Niedrig' },
  { value: 'medium', label: 'Mittel' },
  { value: 'high', label: 'Hoch' },
  { value: 'critical', label: 'Kritisch' },
];

const EMPTY_CHOICE: Omit<ScenarioChoice, 'id'> = {
  text: '',
  outcome: 'SUCCESS',
  consequence: '',
  scoreChange: 0,
  reputationChange: 0,
  lesson: '',
};

export function ScenarioEditor({
  initialScenario,
  onSave,
  onCancel,
  availableNpcs = [],
}: ScenarioEditorProps) {
  const [scenario, setScenario] = useState<Partial<Scenario>>({
    id: '',
    title: '',
    category: 'troubleshooting',
    difficulty: 3,
    flavorText: '',
    urgency: 'medium',
    choices: [],
    realWorldReference: '',
    bsiReference: '',
    involvedNpcs: [],
    tags: [],
    ...initialScenario,
  });

  const [showPreview, setShowPreview] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const updateField = <K extends keyof Scenario>(
    field: K,
    value: Scenario[K]
  ) => {
    setScenario((prev) => ({ ...prev, [field]: value }));
  };

  const addChoice = () => {
    const newChoices = [...(scenario.choices || [])];
    const choiceIds = ['A', 'B', 'C', 'D'];
    const nextId = choiceIds[newChoices.length] || `X${newChoices.length}`;
    newChoices.push({ ...EMPTY_CHOICE, id: nextId } as ScenarioChoice);
    updateField('choices', newChoices);
  };

  const updateChoice = (index: number, choice: ScenarioChoice) => {
    const newChoices = [...(scenario.choices || [])];
    newChoices[index] = choice;
    updateField('choices', newChoices);
  };

  const removeChoice = (index: number) => {
    const newChoices = [...(scenario.choices || [])];
    newChoices.splice(index, 1);
    updateField('choices', newChoices);
  };

  const addTag = () => {
    if (tagInput.trim() && !(scenario.tags || []).includes(tagInput.trim())) {
      updateField('tags', [...(scenario.tags || []), tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    updateField(
      'tags',
      (scenario.tags || []).filter((t) => t !== tag)
    );
  };

  const handleSave = () => {
    if (!scenario.id || !scenario.title || !scenario.flavorText) {
      alert('Bitte fülle alle Pflichtfelder aus (ID, Titel, Beschreibung)');
      return;
    }
    if ((scenario.choices || []).length < 2) {
      alert('Ein Szenario braucht mindestens 2 Auswahlmöglichkeiten');
      return;
    }
    onSave(scenario as Scenario);
  };

  const exportAsJson = () => {
    const json = JSON.stringify(scenario, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scenario.id || 'scenario'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsTypeScript = () => {
    const ts = `// Generated Scenario
import { Scenario } from '@kritis/shared';

export const ${scenario.id?.replace(/-/g, '_') || 'newScenario'}: Scenario = ${JSON.stringify(scenario, null, 2)};
`;
    const blob = new Blob([ts], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scenario.id || 'scenario'}.ts`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (showPreview) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center p-2 border-b border-terminal-border">
          <span>Vorschau</span>
          <button
            onClick={() => setShowPreview(false)}
            className="text-terminal-info hover:underline"
          >
            [Zurück zum Editor]
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <ScenarioPreview scenario={scenario as Scenario} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col font-mono">
      {/* Header */}
      <div className="flex justify-between items-center p-2 border-b border-terminal-border bg-terminal-bg-secondary">
        <span className="text-terminal-green">─ SZENARIO EDITOR ─</span>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(true)}
            className="text-terminal-info hover:underline"
          >
            [Vorschau]
          </button>
          <button
            onClick={onCancel}
            className="text-terminal-danger hover:underline"
          >
            [Abbrechen]
          </button>
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Basic Info */}
        <AsciiFrame title="Grunddaten">
          <div className="space-y-3 p-2">
            {/* ID */}
            <div className="flex items-center gap-2">
              <label className="w-32 text-terminal-green-muted">ID *</label>
              <input
                type="text"
                value={scenario.id || ''}
                onChange={(e) => updateField('id', e.target.value)}
                placeholder="z.B. VENDOR-SC-001"
                className="flex-1 bg-terminal-bg border border-terminal-border px-2 py-1 text-terminal-green focus:border-terminal-info outline-none"
              />
            </div>

            {/* Title */}
            <div className="flex items-center gap-2">
              <label className="w-32 text-terminal-green-muted">Titel *</label>
              <input
                type="text"
                value={scenario.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Der aussagekräftige Titel"
                className="flex-1 bg-terminal-bg border border-terminal-border px-2 py-1 text-terminal-green focus:border-terminal-info outline-none"
              />
            </div>

            {/* Category & Urgency */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2 flex-1">
                <label className="w-32 text-terminal-green-muted">Kategorie</label>
                <select
                  value={scenario.category}
                  onChange={(e) =>
                    updateField('category', e.target.value as ScenarioCategory)
                  }
                  className="flex-1 bg-terminal-bg border border-terminal-border px-2 py-1 text-terminal-green focus:border-terminal-info outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 flex-1">
                <label className="w-24 text-terminal-green-muted">Dringlichkeit</label>
                <select
                  value={scenario.urgency}
                  onChange={(e) =>
                    updateField('urgency', e.target.value as ScenarioUrgency)
                  }
                  className="flex-1 bg-terminal-bg border border-terminal-border px-2 py-1 text-terminal-green focus:border-terminal-info outline-none"
                >
                  {URGENCIES.map((urg) => (
                    <option key={urg.value} value={urg.value}>
                      {urg.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Difficulty */}
            <div className="flex items-center gap-2">
              <label className="w-32 text-terminal-green-muted">Schwierigkeit</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((d) => (
                  <button
                    key={d}
                    onClick={() => updateField('difficulty', d)}
                    className={`w-8 h-8 border ${scenario.difficulty === d ? 'border-terminal-green bg-terminal-green/20 text-terminal-green' : 'border-terminal-border text-terminal-green-muted hover:border-terminal-info'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <span className="text-terminal-green-dim ml-2">
                {'★'.repeat(scenario.difficulty || 1)}
                {'☆'.repeat(5 - (scenario.difficulty || 1))}
              </span>
            </div>
          </div>
        </AsciiFrame>

        {/* Flavor Text */}
        <AsciiFrame title="Szenario-Beschreibung">
          <div className="p-2">
            <textarea
              value={scenario.flavorText || ''}
              onChange={(e) => updateField('flavorText', e.target.value)}
              placeholder="Beschreibe die Situation aus Spieler-Perspektive. Was passiert? Wer ist involviert? Was ist das Problem?"
              rows={6}
              className="w-full bg-terminal-bg border border-terminal-border px-2 py-1 text-terminal-green focus:border-terminal-info outline-none resize-none"
            />
            <div className="text-terminal-green-muted text-sm mt-1">
              Tipp: Schreibe in der Du-Perspektive. Nutze konkrete Details.
            </div>
          </div>
        </AsciiFrame>

        {/* Choices */}
        <AsciiFrame title={`Auswahlmöglichkeiten (${(scenario.choices || []).length})`}>
          <div className="p-2 space-y-4">
            {(scenario.choices || []).map((choice, index) => (
              <ChoiceEditor
                key={index}
                choice={choice}
                onChange={(c) => updateChoice(index, c)}
                onRemove={() => removeChoice(index)}
                choiceNumber={index + 1}
              />
            ))}

            {(scenario.choices || []).length < 4 && (
              <button
                onClick={addChoice}
                className="w-full border border-dashed border-terminal-border p-2 text-terminal-green-muted hover:border-terminal-info hover:text-terminal-info transition-colors"
              >
                [+] Neue Auswahl hinzufügen
              </button>
            )}
          </div>
        </AsciiFrame>

        {/* References */}
        <AsciiFrame title="Referenzen & Metadaten">
          <div className="space-y-3 p-2">
            {/* Real World Reference */}
            <div>
              <label className="text-terminal-green-muted block mb-1">
                Real-World Referenz
              </label>
              <textarea
                value={scenario.realWorldReference || ''}
                onChange={(e) => updateField('realWorldReference', e.target.value)}
                placeholder="Was macht dieses Szenario realistisch? Beispiele aus der Praxis?"
                rows={2}
                className="w-full bg-terminal-bg border border-terminal-border px-2 py-1 text-terminal-green focus:border-terminal-info outline-none resize-none"
              />
            </div>

            {/* BSI Reference */}
            <div className="flex items-center gap-2">
              <label className="w-32 text-terminal-green-muted">BSI-Referenz</label>
              <input
                type="text"
                value={scenario.bsiReference || ''}
                onChange={(e) => updateField('bsiReference', e.target.value)}
                placeholder="z.B. BSI IT-Grundschutz: OPS.2.1"
                className="flex-1 bg-terminal-bg border border-terminal-border px-2 py-1 text-terminal-green focus:border-terminal-info outline-none"
              />
            </div>

            {/* NPCs */}
            <div className="flex items-center gap-2">
              <label className="w-32 text-terminal-green-muted">Beteiligte NPCs</label>
              <select
                multiple
                value={scenario.involvedNpcs || []}
                onChange={(e) =>
                  updateField(
                    'involvedNpcs',
                    Array.from(e.target.selectedOptions, (o) => o.value)
                  )
                }
                className="flex-1 bg-terminal-bg border border-terminal-border px-2 py-1 text-terminal-green focus:border-terminal-info outline-none h-20"
              >
                {availableNpcs.map((npc) => (
                  <option key={npc.id} value={npc.id}>
                    {npc.name} ({npc.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="text-terminal-green-muted block mb-1">Tags</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {(scenario.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-terminal-info/20 border border-terminal-info text-terminal-info text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-terminal-danger"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  placeholder="Neuen Tag hinzufügen..."
                  className="flex-1 bg-terminal-bg border border-terminal-border px-2 py-1 text-terminal-green focus:border-terminal-info outline-none"
                />
                <button
                  onClick={addTag}
                  className="px-2 border border-terminal-border hover:border-terminal-info"
                >
                  [+]
                </button>
              </div>
            </div>
          </div>
        </AsciiFrame>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center p-2 border-t border-terminal-border bg-terminal-bg-secondary">
        <div className="flex gap-2">
          <button
            onClick={exportAsJson}
            className="text-terminal-green-muted hover:text-terminal-info hover:underline"
          >
            [Export JSON]
          </button>
          <button
            onClick={exportAsTypeScript}
            className="text-terminal-green-muted hover:text-terminal-info hover:underline"
          >
            [Export TypeScript]
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1 border border-terminal-border hover:border-terminal-warning text-terminal-warning"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1 border border-terminal-green bg-terminal-green/20 hover:bg-terminal-green/30 text-terminal-green"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
