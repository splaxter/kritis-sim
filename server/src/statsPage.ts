/**
 * Server-rendered /stats page — no client JS, terminal aesthetic, German labels.
 * Player names are self-supplied, so every interpolation is HTML-escaped.
 */
import { StatsAggregate, PlayerStat } from './store.js';

// Total learning lessons (16 CLI + 10 GUI + 5 Blackout) — see docs/CONTENT_INVENTORY.md.
const TOTAL_LESSONS = 31;

const MODE_LABELS: Record<string, string> = {
  beginner: 'Einsteiger',
  learning: 'Lernmodus',
  story: 'Story',
  intermediate: 'Standard',
  hard: 'Schwer',
  kritis: 'KRITIS',
  unknown: '—',
};

const ENDING_LABELS: Record<string, string> = {
  good: 'Der Held',
  neutral: 'Gerade so',
  bad: 'Pech gehabt',
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function displayName(p: PlayerStat): string {
  if (p.name) return esc(p.name);
  // Anonymous: short-id tail, e.g. "Spieler-3f2a".
  const tail = p.playerId.replace(/^player-/, '').slice(-4);
  return `Spieler-${esc(tail)}`;
}

function bestResult(p: PlayerStat): string {
  // Prefer a story ending; else the deepest week reached in any mode.
  if (p.endingsSeen.length > 0) {
    const labels = p.endingsSeen.map((e) => ENDING_LABELS[e] ?? e);
    return `Story: ${esc(labels.join(', '))}`;
  }
  let best: { mode: string; week: number; score?: number } | null = null;
  for (const m of p.perMode) {
    if (!best || m.bestWeekReached > best.week) {
      best = { mode: m.mode, week: m.bestWeekReached, score: m.bestScore };
    }
  }
  if (!best || best.week === 0) return '—';
  const mode = MODE_LABELS[best.mode] ?? best.mode;
  return `${esc(mode)}: Woche ${best.week}`;
}

function bar(done: number, total: number): string {
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  const filled = Math.round(pct * 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  // Keep it simple + locale-stable: YYYY-MM-DD from the ISO string.
  return esc(iso.slice(0, 10));
}

export function renderStatsHtml(agg: StatsAggregate): string {
  const rows = agg.players
    .map((p) => {
      const modeCells = p.perMode
        .map(
          (m) =>
            `${esc(MODE_LABELS[m.mode] ?? m.mode)} ${m.runsCompleted}/${m.runsStarted}`
        )
        .join(' · ');
      return `
      <tr>
        <td class="name">${displayName(p)}</td>
        <td>${p.runsStarted}</td>
        <td>${p.runsCompleted}</td>
        <td>${bestResult(p)}</td>
        <td>${modeCells || '—'}</td>
        <td class="learn"><span class="barbox">${bar(p.lessonsCompleted.length, TOTAL_LESSONS)}</span> ${p.lessonsCompleted.length}/${TOTAL_LESSONS}</td>
        <td>${fmtDate(p.lastSeen)}</td>
      </tr>`;
    })
    .join('');

  const empty = agg.players.length === 0
    ? `<p class="empty">Noch keine Spieldaten. Sobald jemand spielt, erscheint hier eine Zeile.</p>`
    : '';

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>KRITIS — Team-Statistik</title>
<style>
  :root { color-scheme: dark; }
  body { background:#0a0e0a; color:#8fbf8f; font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; margin:0; padding:2rem; }
  h1 { color:#7fff7f; letter-spacing:0.15em; font-size:1.3rem; margin:0 0 0.25rem; }
  .sub { color:#5a7a5a; font-size:0.8rem; margin-bottom:1.5rem; }
  .wrap { overflow-x:auto; }
  table { border-collapse:collapse; width:100%; min-width:720px; }
  th, td { text-align:left; padding:0.5rem 0.9rem; border-bottom:1px solid #1e2a1e; font-size:0.85rem; white-space:nowrap; }
  th { color:#7fff7f; text-transform:uppercase; letter-spacing:0.08em; font-size:0.72rem; }
  td.name { color:#c8f7c8; }
  td.learn .barbox { color:#4caf50; letter-spacing:-1px; }
  tr:hover td { background:#111811; }
  .empty { color:#5a7a5a; }
  .foot { color:#3a4a3a; font-size:0.72rem; margin-top:2rem; }
</style>
</head>
<body>
  <h1>KRITIS — TEAM-STATISTIK</h1>
  <div class="sub">${agg.players.length} Spieler · ${agg.totalEvents} Ereignisse · Stand ${fmtDate(agg.generatedAt)}</div>
  ${empty}
  <div class="wrap">
  <table>
    <thead>
      <tr>
        <th>Spieler</th><th>Starts</th><th>Beendet</th><th>Bestes Ergebnis</th>
        <th>Pro Modus (beendet/gestartet)</th><th>Lernfortschritt</th><th>Zuletzt</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  </div>
  <div class="foot">Pseudonyme Team-Statistik. Namen sind freiwillig selbst angegeben. Siehe Datenschutz.</div>
</body>
</html>`;
}
