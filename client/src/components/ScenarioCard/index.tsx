import { Scenario, ScenarioChoice } from '@kritis/shared';
import { getUrgencyColor, getUrgencyLabel } from '../../engine/scenarioEngine';
import { getContactById, getRandomCatchphrase } from '../../content/packs';
import { useState, useEffect } from 'react';
import {
  Portrait,
  UrgencyBadge,
  CategoryIcon,
  NpcId,
} from '../GameAssets';

interface ScenarioCardProps {
  scenario: Scenario;
  onChoice: (choice: ScenarioChoice) => void;
}

// Map NPC contact IDs to portrait IDs
const NPC_TO_PORTRAIT: Record<string, NpcId> = {
  // AMSE IT
  'AMSE-MARCO': 'marco',
  'AMSE-STEFAN': 'stefan',
  // Telekom
  'TELEKOM-THOMAS': 'thomas',
  'TELEKOM-SABINE': 'sabine',
  // Cloud365
  'CLOUD365-KEVIN': 'kevin',
  'CLOUD365-MARTIN': 'martin',
};

export function ScenarioCard({ scenario, onChoice }: ScenarioCardProps) {
  const [npcBark, setNpcBark] = useState<string | null>(null);

  // Get random catchphrase from involved NPC on mount
  useEffect(() => {
    if (scenario.involvedNpcs && scenario.involvedNpcs.length > 0) {
      const catchphrase = getRandomCatchphrase(scenario.involvedNpcs[0]);
      if (catchphrase) {
        setNpcBark(catchphrase);
      }
    }
  }, [scenario]);

  // Get NPC contact info for display
  const primaryNpc = scenario.involvedNpcs?.[0]
    ? getContactById(scenario.involvedNpcs[0])
    : null;

  // Get portrait ID for primary NPC
  const portraitId = scenario.involvedNpcs?.[0]
    ? NPC_TO_PORTRAIT[scenario.involvedNpcs[0]]
    : undefined;

  return (
    <div className="border border-terminal-border p-4">
      {/* Header with urgency and category */}
      <div className="flex justify-between items-center mb-2 text-sm">
        <div className="flex items-center gap-2">
          <CategoryIcon category={scenario.category} size="sm" />
          <span className="text-terminal-green-dim">─ SZENARIO ─</span>
        </div>
        <div className="flex items-center gap-4">
          <UrgencyBadge urgency={scenario.urgency} />
          <span className="text-terminal-green-muted">
            Schwierigkeit: {'★'.repeat(scenario.difficulty)}{'☆'.repeat(5 - scenario.difficulty)}
          </span>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-xl mb-4">&gt; {scenario.title}</h2>

      {/* NPC bark if available - now with portrait */}
      {npcBark && primaryNpc && (
        <div className="mb-4 p-3 border-l-2 border-terminal-info bg-terminal-bg-secondary flex gap-3 items-start">
          {portraitId && (
            <Portrait npcId={portraitId} size="sm" showName={false} />
          )}
          <div className="flex-1">
            <span className="text-terminal-info font-bold">{primaryNpc.name}:</span>
            <p className="text-terminal-green-dim italic mt-1">"{npcBark}"</p>
          </div>
        </div>
      )}

      {/* Flavor text */}
      <div className="whitespace-pre-wrap mb-6 text-terminal-green-dim leading-relaxed">
        {scenario.flavorText}
      </div>

      {/* Choices */}
      <div className="space-y-2">
        {scenario.choices.map((choice, index) => (
          <button
            key={choice.id}
            onClick={() => onChoice(choice)}
            className="w-full text-left p-3 border border-terminal-border hover:bg-terminal-bg-highlight hover:border-terminal-green transition-colors"
          >
            <span className="text-terminal-green-dim">[{choice.id}]</span>{' '}
            {choice.text}
          </button>
        ))}
      </div>

      {/* Footer with category info */}
      <div className="mt-4 pt-2 border-t border-terminal-border flex justify-between text-sm text-terminal-green-muted">
        <span>
          Kategorie: {scenario.category.replace(/_/g, ' ')}
        </span>
        {scenario.bsiReference && (
          <span className="text-terminal-info">
            {scenario.bsiReference}
          </span>
        )}
      </div>
    </div>
  );
}
