import { GameState } from '@kritis/shared';
import { SkillBar } from './SkillBar';
import { RelationshipBar } from './RelationshipBar';

interface StatsBarProps {
  state: GameState;
}

const DAYS = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

const SKILL_LABELS: Record<string, string> = {
  netzwerk: 'Netzwerk',
  linux: 'Linux',
  windows: 'Windows',
  security: 'Security',
  troubleshooting: 'Troubleshoot',
  softSkills: 'Soft Skills',
};

const RELATIONSHIP_LABELS: Record<string, { name: string; color: string }> = {
  chef: { name: 'Chef', color: '#ff8800' },
  gf: { name: 'GF', color: '#aa44ff' },
  kaemmerer: { name: 'Kämmerer', color: '#ff4444' },
  fachabteilung: { name: 'Fachabtlg.', color: '#44aaff' },
  kollegen: { name: 'Kollegen', color: '#44ff88' },
};

export function StatsBar({ state }: StatsBarProps) {
  const stressColor = state.stress > 80
    ? 'text-terminal-danger'
    : state.stress > 50
      ? 'text-terminal-warning'
      : 'text-terminal-green';

  return (
    <div className="border border-terminal-border p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-terminal-border">
        <span className="text-lg">KRITIS ADMIN SIMULATOR</span>
        <span className="text-terminal-green-dim">
          Woche {state.currentWeek} | {DAYS[state.currentDay]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Skills */}
        <div>
          <div className="text-terminal-green-dim mb-2 text-sm">─ SKILLS ─</div>
          <div className="space-y-1">
            {Object.entries(state.skills).map(([key, value]) => (
              <SkillBar key={key} name={SKILL_LABELS[key] || key} value={value} />
            ))}
          </div>
        </div>

        {/* Relationships */}
        <div>
          <div className="text-terminal-green-dim mb-2 text-sm">─ BEZIEHUNGEN ─</div>
          <div className="space-y-1">
            {Object.entries(state.relationships).map(([key, value]) => (
              <RelationshipBar
                key={key}
                name={RELATIONSHIP_LABELS[key]?.name || key}
                value={value}
                color={RELATIONSHIP_LABELS[key]?.color}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="mt-4 pt-2 border-t border-terminal-border flex gap-8 text-sm">
        <span className={stressColor}>
          Stress: {'█'.repeat(Math.floor(state.stress / 10))}
          {'░'.repeat(10 - Math.floor(state.stress / 10))} {state.stress}/100
        </span>
        <span>Budget: €{state.budget.toLocaleString('de-DE')}</span>
        <span>Compliance: {state.compliance}%</span>
      </div>
    </div>
  );
}
