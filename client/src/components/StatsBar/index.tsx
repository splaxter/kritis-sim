import { GameState, getGameModeConfig } from '@kritis/shared';
import { SkillBar } from './SkillBar';
import { RelationshipBar } from './RelationshipBar';
import {
  BAND_CLASS,
  stressBand,
  complianceBand,
  budgetClass,
  relationshipClass,
  getDefeatWarnings,
} from './bands';

interface StatsBarProps {
  state: GameState;
  /** Track-local lesson label, e.g. "SSH & Remote-Zugriff · 2/3" or "… · ★". */
  lessonLabel?: string;
  /** 0–100 progress within the current track (core levels). Omit to hide the bar. */
  lessonProgressPercent?: number;
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

// Learning mode: minimal header focused on the current track's progress.
// The label is track-local (nonlinear hub → no meaningful global "Lektion N/47").
function LearningModeHeader({ lessonLabel, lessonProgressPercent }: StatsBarProps) {
  return (
    <div className="border border-terminal-border p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
          <span className="shrink-0 text-lg text-terminal-green">📚 LERNMODUS</span>
          {lessonLabel && (
            <span className="min-w-0 break-words text-sm text-terminal-green-dim">{lessonLabel}</span>
          )}
        </div>
        {lessonProgressPercent !== undefined && (
          <div className="flex w-full min-w-0 items-center gap-2 text-sm sm:w-auto">
            <span className="shrink-0 text-terminal-green-dim">Fortschritt:</span>
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded border border-terminal-border bg-terminal-bg-dark sm:w-32 sm:flex-none">
              <div
                className="h-full bg-terminal-green transition-all duration-500"
                style={{ width: `${lessonProgressPercent}%` }}
              />
            </div>
            <span className="shrink-0 text-terminal-green">{lessonProgressPercent}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function StatsBar({ state, lessonLabel, lessonProgressPercent }: StatsBarProps) {
  // Learning mode gets minimal header
  if (state.gameMode === 'learning') {
    return <LearningModeHeader state={state} lessonLabel={lessonLabel} lessonProgressPercent={lessonProgressPercent} />;
  }

  const modeConfig = getGameModeConfig(state.gameMode);
  const totalWeeks = modeConfig.gameLength.totalWeeks;
  const { stressGameOver, complianceGameOver, chefRelationshipGameOver } = modeConfig.thresholds;

  const stressColor = BAND_CLASS[stressBand(state.stress, stressGameOver)];
  const stressBlocks = Math.floor(state.stress / 10);
  const complianceColor = BAND_CLASS[complianceBand(state.compliance, complianceGameOver)];
  const budgetColor = budgetClass(state.budget);
  const warnings = getDefeatWarnings(state);

  return (
    <div className="border border-terminal-border p-4">
      {/* Pre-defeat warning banner — pulses while any metric is in its danger band */}
      {warnings.length > 0 && (
        <div className="mb-3 border border-terminal-danger px-3 py-1.5 text-sm text-terminal-danger animate-pulse motion-reduce:animate-none">
          {warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-terminal-border">
        <div className="flex items-center gap-3">
          <span className="text-lg">KRITIS ADMIN SIMULATOR</span>
          <span className="text-terminal-green-dim text-sm border border-terminal-border px-2 py-0.5">
            {modeConfig.icon} {modeConfig.name}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-terminal-green-dim">
            Woche {state.currentWeek}/{totalWeeks} | {DAYS[state.currentDay]}
          </span>
        </div>
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
                valueColorClass={relationshipClass(key, value, chefRelationshipGameOver)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="mt-4 pt-2 border-t border-terminal-border flex gap-8 text-sm">
        <span className={stressColor}>
          Stress:{' '}
          <span className="font-mono">
            {Array.from({ length: 10 }, (_, i) => {
              const filled = i < stressBlocks;
              // Each block coloured by the band its position falls into, so the
              // bar reddens from the right as stress climbs.
              const cls = filled ? BAND_CLASS[stressBand((i + 1) * 10, stressGameOver)] : 'text-terminal-green-dim';
              return (
                <span key={i} className={cls}>
                  {filled ? '█' : '░'}
                </span>
              );
            })}
          </span>{' '}
          {state.stress}/{stressGameOver}
        </span>
        <span className={budgetColor}>Budget: €{state.budget.toLocaleString('de-DE')}</span>
        <span className={complianceColor}>Compliance: {state.compliance}%</span>
      </div>
    </div>
  );
}
