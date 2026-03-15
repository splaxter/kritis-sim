/**
 * Scenario Preview Component
 * Shows how the scenario will look in-game
 */

import { Scenario, ScenarioChoice } from '@kritis/shared';
import { useState } from 'react';
import { UrgencyBadge, CategoryIcon, OutcomeBadge } from '../GameAssets';

interface ScenarioPreviewProps {
  scenario: Scenario;
}

export function ScenarioPreview({ scenario }: ScenarioPreviewProps) {
  const [selectedChoice, setSelectedChoice] = useState<ScenarioChoice | null>(
    null
  );

  if (selectedChoice) {
    return (
      <div className="border border-terminal-border p-4">
        <div className="flex justify-between items-center mb-4">
          <OutcomeBadge outcome={selectedChoice.outcome} />
          <button
            onClick={() => setSelectedChoice(null)}
            className="text-terminal-info hover:underline"
          >
            [Zurück zur Auswahl]
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-terminal-green-muted text-sm mb-1">
              Konsequenz:
            </div>
            <p className="whitespace-pre-wrap">{selectedChoice.consequence}</p>
          </div>

          <div>
            <div className="text-terminal-green-muted text-sm mb-1">
              Lektion:
            </div>
            <p className="text-terminal-info italic">{selectedChoice.lesson}</p>
          </div>

          <div className="flex gap-4 text-sm">
            <span
              className={
                selectedChoice.scoreChange >= 0
                  ? 'text-terminal-green'
                  : 'text-terminal-danger'
              }
            >
              Score: {selectedChoice.scoreChange >= 0 ? '+' : ''}
              {selectedChoice.scoreChange}
            </span>
            <span
              className={
                selectedChoice.reputationChange >= 0
                  ? 'text-terminal-green'
                  : 'text-terminal-danger'
              }
            >
              Reputation: {selectedChoice.reputationChange >= 0 ? '+' : ''}
              {selectedChoice.reputationChange}
            </span>
          </div>
        </div>
      </div>
    );
  }

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
            Schwierigkeit: {'★'.repeat(scenario.difficulty)}
            {'☆'.repeat(5 - scenario.difficulty)}
          </span>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-xl mb-4">&gt; {scenario.title}</h2>

      {/* Flavor text */}
      <div className="whitespace-pre-wrap mb-6 text-terminal-green-dim leading-relaxed">
        {scenario.flavorText}
      </div>

      {/* Choices */}
      <div className="space-y-2">
        {scenario.choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => setSelectedChoice(choice)}
            className="w-full text-left p-3 border border-terminal-border hover:bg-terminal-bg-highlight hover:border-terminal-green transition-colors"
          >
            <span className="text-terminal-green-dim">[{choice.id}]</span>{' '}
            {choice.text}
          </button>
        ))}
      </div>

      {/* Footer with category info */}
      <div className="mt-4 pt-2 border-t border-terminal-border flex justify-between text-sm text-terminal-green-muted">
        <span>Kategorie: {scenario.category.replace(/_/g, ' ')}</span>
        {scenario.bsiReference && (
          <span className="text-terminal-info">{scenario.bsiReference}</span>
        )}
      </div>

      {/* Tags */}
      {scenario.tags && scenario.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {scenario.tags.map((tag) => (
            <span
              key={tag}
              className="px-1 text-xs text-terminal-green-muted border border-terminal-border"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
