import { EndingType } from '@kritis/shared';
import { ADVENTURE_ENDINGS } from '../../content/adventure/endings';

interface EndingStats {
  score: number;
  sidequestsCompleted: number;
  totalSidequests: number;
  charactersHelped: string[];
  storyPath: string;
  endingFlags: string[];
  preparationFlags: string[];
  penaltyFlags: string[];
}

/** Spoiler-light teaser of content this run didn't reach — nudges a replay. */
interface ReplayTeaser {
  endingsSeen: number;
  totalEndings: number;
  otherEndingTitles: string[];
  missedSidequests: string[];
  /** Short line about the trust fork the player did NOT take, if determinable. */
  untakenForkHint?: string;
}

interface EndingScreenProps {
  ending: EndingType;
  stats: EndingStats;
  onBackToMenu: () => void;
  replay?: ReplayTeaser;
}

const CHARACTER_LABELS: Record<string, string> = {
  chef: 'Chef Bert',
  kollegen: 'Jens, Henry & Bjorg',
  kollege: 'Bjorg',
  jens: 'Jens',
  henry: 'Henry',
  gf: 'Geschäftsführung',
  kaemmerer: 'Kämmerer',
  fachabteilung: 'Fachabteilungen',
};

const PATH_LABELS: Record<string, string> = {
  official: 'Der offizielle Weg',
  underground: 'Der Alleingang',
  neutral: 'Der pragmatische Weg',
};

const FLAG_LABELS: Record<string, string> = {
  saved_early: 'Früh eingedämmt — Systeme rechtzeitig geschützt',
  found_evidence: 'Beweise gesichert — lückenlose Beweiskette',
  team_prepared: 'Team vorbereitet — Krise gemeinsam gestemmt',
  trusted_by_all: 'Vertrauen verdient — das Team stand hinter dir',
};

const PENALTY_LABELS: Record<string, string> = {
  burned_bridges: 'Brücken verbrannt — Vertrauen im Team beschädigt',
  ignored_warnings: 'Warnungen ignoriert — bekannte Risiken blieben offen',
  blamed_others: 'Schuld weitergereicht — Zusammenarbeit erschwert',
};

// Only the positive, "earned" flags are shown as achievements.
const EARNED_FLAG_ORDER = ['saved_early', 'found_evidence', 'team_prepared', 'trusted_by_all'];

export function EndingScreen({ ending, stats, onBackToMenu, replay }: EndingScreenProps) {
  const text = ADVENTURE_ENDINGS[ending];
  const earned = EARNED_FLAG_ORDER.filter((f) => stats.endingFlags.includes(f));
  const preparations = stats.preparationFlags.filter((f) => FLAG_LABELS[f]);
  const penalties = stats.penaltyFlags.filter((f) => PENALTY_LABELS[f]);
  const helped = stats.charactersHelped.map((c) => CHARACTER_LABELS[c] ?? c);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="border border-terminal-green/50 p-8 max-w-2xl w-full">
        <div className="text-center text-terminal-green text-xl font-bold mb-2 tracking-widest">
          PROBEZEIT BEENDET — {text.title.toUpperCase()}
        </div>
        <div className="text-center text-terminal-green-muted text-sm mb-6 tracking-wide">
          {text.title}
        </div>

        <div className="text-terminal-green-dim leading-relaxed space-y-4 text-[15px]">
          {text.paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
          <p className="text-terminal-green font-semibold whitespace-pre-line pt-2 border-t border-terminal-green/20">
            {text.epilogue}
          </p>
        </div>

        {/* Bilanz */}
        <div className="mt-8 border border-terminal-green/30 p-4 text-sm text-terminal-green-dim space-y-2">
          <div className="text-terminal-green tracking-widest mb-2">— BILANZ —</div>
          <div>
            Score: <span className="text-terminal-green">{stats.score}</span>/100
          </div>
          <div>Weg: {PATH_LABELS[stats.storyPath] ?? stats.storyPath}</div>
          <div>
            Verbündete:{' '}
            {helped.length > 0 ? helped.join(', ') : 'Du hast diesen Weg weitgehend allein bestritten.'}
          </div>
          {stats.sidequestsCompleted > 0 && (
            <div>
              Nebenaufträge: {stats.sidequestsCompleted}/{stats.totalSidequests}
            </div>
          )}
          {earned.length > 0 && (
            <div className="pt-2 space-y-1">
              {earned.map((f) => (
                <div key={f} className="text-terminal-green">
                  ✓ {FLAG_LABELS[f]}
                </div>
              ))}
            </div>
          )}
          <div className="pt-2 border-t border-terminal-green/20 space-y-1">
            <div className="text-terminal-green-muted">Was dieses Ende geprägt hat</div>
            {preparations.length > 0 ? preparations.map((f) => (
              <div key={f} className="text-terminal-green">✓ {FLAG_LABELS[f]}</div>
            )) : (
              <div className="text-terminal-green-muted">Keine zentrale Vorbereitung wurde eindeutig abgeschlossen.</div>
            )}
            {penalties.map((f) => (
              <div key={f} className="text-terminal-green-muted">! {PENALTY_LABELS[f]}</div>
            ))}
          </div>
        </div>

        {/* Was du nicht gesehen hast — replay teaser */}
        {replay && (
          <div className="mt-4 border border-terminal-green/20 p-4 text-sm text-terminal-green-dim space-y-2">
            <div className="text-terminal-green-muted tracking-widest mb-1">
              — WAS DU NICHT GESEHEN HAST —
            </div>
            <div>
              Enden gesehen:{' '}
              <span className="text-terminal-green">
                {replay.endingsSeen}/{replay.totalEndings}
              </span>
            </div>
            {replay.otherEndingTitles.length > 0 && (
              <div>
                Andere Ausgänge: {replay.otherEndingTitles.join(', ')}
              </div>
            )}
            {replay.missedSidequests.length > 0 && (
              <div>
                Verpasste Nebenaufträge: {replay.missedSidequests.join(', ')}
              </div>
            )}
            {replay.untakenForkHint && <div>{replay.untakenForkHint}</div>}
            <div className="text-terminal-green-muted pt-1">
              Ein anderer Weg, andere Entscheidungen — ein zweiter Durchlauf zeigt dir mehr.
            </div>
          </div>
        )}

        <button
          onClick={onBackToMenu}
          className="w-full mt-8 p-3 border border-terminal-green hover:bg-terminal-bg-highlight"
        >
          [ ZURÜCK ZUM MENÜ ]
        </button>
      </div>
    </div>
  );
}
