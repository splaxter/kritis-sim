import { RunSummary, RunOutcome } from '../../engine/runSummary';
import { MetaProgress } from '../../engine/metaProgress';

interface RunSummaryScreenProps {
  summary: RunSummary;
  modeName: string;
  modeIcon: string;
  meta: MetaProgress;
  onRetry: () => void;
  learningTip?: boolean;
}

const SKILL_LABELS: Record<string, string> = {
  netzwerk: 'Netzwerk',
  linux: 'Linux',
  windows: 'Windows',
  security: 'Security',
  troubleshooting: 'Troubleshooting',
  softSkills: 'Soft Skills',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  chef: 'Chef',
  kollegen: 'Kollegen',
  kaemmerer: 'Kämmerer',
  fachabteilung: 'Fachabteilung',
  gf: 'Geschäftsführung',
};

// Content tags → readable German themes. Unknown tags fall back to the raw tag.
const THEME_LABELS: Record<string, string> = {
  security: 'Sicherheit',
  crisis: 'Krisen',
  support: 'Anwender-Support',
  personal: 'Work-Life-Balance',
  compliance: 'Compliance',
  politics: 'Büropolitik',
  team: 'Teamdynamik',
  budget: 'Budget',
  absurd: 'Das Absurde',
  technical: 'Technik',
  network: 'Netzwerk',
  mystery: 'Rätselhaftes',
};

const OUTCOME_HEADLINE: Record<RunOutcome, string> = {
  victory: '🎉 PROBEZEIT ÜBERSTANDEN!',
  burnout: '❌ AUSGEBRANNT',
  fired: '❌ GEFEUERT',
  bsi_bussgeld: '❌ BSI-BUSSGELD',
  ended: '— LAUF BEENDET —',
};

const OUTCOME_BLURB: Record<RunOutcome, string> = {
  victory: 'Du hast durchgehalten. Alle Wochen überstanden.',
  burnout: 'Du bist ausgebrannt. Die Arbeit war zu viel.',
  fired: 'Dein Chef hat dich gefeuert.',
  bsi_bussgeld: 'Die BSI-Compliance rutschte zu tief. Massive Bußgelder.',
  ended: 'Der Lauf ist zu Ende.',
};

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

export function RunSummaryScreen({
  summary,
  modeName,
  modeIcon,
  meta,
  onRetry,
  learningTip = false,
}: RunSummaryScreenProps) {
  const movedSkills = summary.skillDeltas.filter((d) => d.delta !== 0);
  const movedRelationships = summary.relationshipDeltas.filter((d) => d.delta !== 0);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="border border-terminal-green/50 p-8 max-w-2xl w-full">
        <div className="text-center text-terminal-green text-xl font-bold mb-2 tracking-widest">
          {OUTCOME_HEADLINE[summary.outcome]}
        </div>
        <div className="text-center text-terminal-green-dim text-sm mb-6">
          {OUTCOME_BLURB[summary.outcome]}
        </div>

        {/* Bilanz */}
        <div className="border border-terminal-green/30 p-4 text-sm text-terminal-green-dim space-y-3">
          <div className="text-terminal-green tracking-widest">— BILANZ —</div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <div>
              Modus: <span className="text-terminal-green">{modeIcon} {modeName}</span>
            </div>
            <div>
              Woche{' '}
              <span className="text-terminal-green">
                {summary.weekReached}/{summary.totalWeeks}
              </span>{' '}
              erreicht
            </div>
            <div>
              Entscheidungen: <span className="text-terminal-green">{summary.decisionsMade}</span>
            </div>
            <div>
              Stress final: <span className="text-terminal-green">{summary.finalStats.stress}</span>
            </div>
            <div>
              Budget final: <span className="text-terminal-green">{summary.finalStats.budget.toLocaleString('de-DE')} €</span>
            </div>
            <div>
              Compliance final: <span className="text-terminal-green">{summary.finalStats.compliance}%</span>
            </div>
          </div>

          {movedSkills.length > 0 && (
            <div className="pt-2 border-t border-terminal-green/20">
              <div className="text-terminal-green-muted mb-1">Skills</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                {movedSkills.map((d) => (
                  <div key={d.key}>
                    {SKILL_LABELS[d.key] ?? d.key}:{' '}
                    <span className={d.delta > 0 ? 'text-terminal-green' : 'text-terminal-green-muted'}>
                      {signed(d.delta)}
                    </span>{' '}
                    <span className="text-terminal-green-muted">({d.end})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {movedRelationships.length > 0 && (
            <div className="pt-2 border-t border-terminal-green/20">
              <div className="text-terminal-green-muted mb-1">Beziehungen</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                {movedRelationships.map((d) => (
                  <div key={d.key}>
                    {RELATIONSHIP_LABELS[d.key] ?? d.key}:{' '}
                    <span className={d.delta > 0 ? 'text-terminal-green' : 'text-terminal-green-muted'}>
                      {signed(d.delta)}
                    </span>{' '}
                    <span className="text-terminal-green-muted">({d.end})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.topThemes.length > 0 && (
            <div className="pt-2 border-t border-terminal-green/20">
              <div className="text-terminal-green-muted mb-1">Womit du dich beschäftigt hast</div>
              <div>
                {summary.topThemes
                  .map((t) => `${THEME_LABELS[t.tag] ?? t.tag} (${t.count})`)
                  .join(' · ')}
              </div>
            </div>
          )}

          {summary.openConsequences > 0 && (
            <div className="pt-2 border-t border-terminal-green/20 text-terminal-green-muted">
              Offene Konsequenzen, die nie fällig wurden: {summary.openConsequences}
            </div>
          )}
        </div>

        {learningTip && (
          <div className="mt-4 border border-terminal-green/30 p-3 text-sm text-terminal-green-dim">
            <span className="text-terminal-green">Tipp:</span> Im Lernmodus kannst du
            Terminal- und Windows-Aufgaben in Ruhe üben — ohne Zeitdruck und Stress.
            Du erreichst ihn im Hauptmenü über <span className="text-terminal-green">[LERNMODUS]</span>.
          </div>
        )}

        <div className="mt-6 text-center text-terminal-green-muted text-sm">
          Durchläufe gesamt: <span className="text-terminal-green">{meta.runsCompleted}</span>
        </div>

        <button
          onClick={onRetry}
          className="w-full mt-6 p-3 border border-terminal-green hover:bg-terminal-bg-highlight"
        >
          [ NOCHMAL VERSUCHEN ]
        </button>
      </div>
    </div>
  );
}
