import { lazy, Suspense, useMemo, useState } from 'react';
import { levelKatalog, type KatalogLevel, type Gewinnmodell, type LevelArt } from '../../engine/levelKatalog';

const Terminal = lazy(() => import('../Terminal').then((m) => ({ default: m.Terminal })));
const WindowsLevel = lazy(() => import('../WindowsLevel').then((m) => ({ default: m.WindowsLevel })));

/**
 * Alle Level auf einen Blick — die Autorenansicht.
 *
 * Warum es sie gibt: Ein Level im laufenden Spiel zu erreichen ist Glückssache.
 * Szenarien kommen frühestens ab Woche 8 und dann gewichtet aus einem Topf von
 * 48; in 200 simulierten Läufen sah ein Spieler drei bestimmte Fälle nur neun
 * Mal. Wer prüfen will, ob ein Level sich spielen lässt, kann nicht würfeln.
 *
 * Gezeigt wird deshalb nicht nur der Titel, sondern das, was man beim Bauen
 * wirklich braucht: Gewinnmodell (Zustandsziele oder nur Befehlsmuster),
 * gesäter Host-Zustand, und bei Szenarien der Zugang — welche Modi, ab welcher
 * Woche. Genau diese Zahlen musste ich bisher jedes Mal von Hand messen.
 */

const ART_LABEL: Record<LevelArt, string> = {
  'terminal-linux': 'Terminal · Linux',
  'terminal-windows': 'Terminal · PowerShell',
  gui: 'GUI',
};

const MODELL_LABEL: Record<Gewinnmodell, string> = {
  zustandsziele: 'Zustandsziele',
  befehlsmuster: 'Befehlsmuster',
  'gui-interaktionen': 'Interaktionen',
  unklar: 'unklar',
};

const MODELL_FARBE: Record<Gewinnmodell, string> = {
  zustandsziele: 'text-terminal-green',
  befehlsmuster: 'text-yellow-400',
  'gui-interaktionen': 'text-terminal-green',
  unklar: 'text-red-400',
};

export function LevelBrowser() {
  const alle = useMemo(() => levelKatalog(), []);
  const [suche, setSuche] = useState('');
  const [nurArt, setNurArt] = useState<LevelArt | 'alle'>('alle');
  const [nurModell, setNurModell] = useState<Gewinnmodell | 'alle'>('alle');
  const [offen, setOffen] = useState<KatalogLevel | null>(null);
  const [ergebnis, setErgebnis] = useState<string | null>(null);

  const gefiltert = useMemo(() => {
    const s = suche.trim().toLowerCase();
    return alle.filter((l) => {
      if (nurArt !== 'alle' && l.art !== nurArt) return false;
      if (nurModell !== 'alle' && l.gewinnmodell !== nurModell) return false;
      if (!s) return true;
      return (
        l.id.toLowerCase().includes(s) ||
        l.titel.toLowerCase().includes(s) ||
        l.gruppe.toLowerCase().includes(s)
      );
    });
  }, [alle, suche, nurArt, nurModell]);

  if (offen) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="bg-yellow-900/40 border-b border-yellow-500/50 text-yellow-200 text-xs px-3 py-1 font-mono flex items-center gap-4">
          <span>
            🧪 LEVEL-ANSICHT — {offen.id} · {ART_LABEL[offen.art]}
            {ergebnis && ` · ${ergebnis}`}
          </span>
          <button
            className="underline"
            onClick={() => {
              setOffen(null);
              setErgebnis(null);
            }}
          >
            [zurück zur Liste]
          </button>
        </div>
        <div className="flex-1 p-4">
          <Suspense fallback={<div className="p-8 text-terminal-green font-mono">Wird geladen…</div>}>
            {offen.terminalContext ? (
              <Terminal
                context={offen.terminalContext}
                task={offen.titel}
                onSolved={(skillGain) => setErgebnis(`gelöst: ${JSON.stringify(skillGain)}`)}
                onCancel={() => setErgebnis('abgebrochen')}
                onFlagsSet={() => {}}
                gameMode="learning"
              />
            ) : offen.guiContext ? (
              <WindowsLevel
                context={offen.guiContext}
                onSolved={(skillGain) => setErgebnis(`gelöst: ${JSON.stringify(skillGain)}`)}
                onCancel={() => setErgebnis('abgebrochen')}
              />
            ) : null}
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 text-terminal-green font-mono text-sm">
      <div className="bg-yellow-900/40 border border-yellow-500/50 text-yellow-200 text-xs px-3 py-1 mb-4">
        🧪 LEVEL-ANSICHT — alle {alle.length} spielbaren Level. Nicht Teil des Spiels: Hier gibt es
        keinen Fortschritt, keinen Spielstand und keine Reihenfolge.
      </div>

      <div className="flex flex-wrap gap-3 items-center mb-4">
        <input
          aria-label="Suche"
          className="bg-black border border-terminal-green/40 px-2 py-1 text-terminal-green w-64"
          placeholder="ID, Titel oder Gruppe…"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
        />
        <select
          aria-label="Art"
          className="bg-black border border-terminal-green/40 px-2 py-1"
          value={nurArt}
          onChange={(e) => setNurArt(e.target.value as LevelArt | 'alle')}
        >
          <option value="alle">Art: alle</option>
          {(Object.keys(ART_LABEL) as LevelArt[]).map((a) => (
            <option key={a} value={a}>{ART_LABEL[a]}</option>
          ))}
        </select>
        <select
          aria-label="Gewinnmodell"
          className="bg-black border border-terminal-green/40 px-2 py-1"
          value={nurModell}
          onChange={(e) => setNurModell(e.target.value as Gewinnmodell | 'alle')}
        >
          <option value="alle">Gewinnmodell: alle</option>
          {(Object.keys(MODELL_LABEL) as Gewinnmodell[]).map((m) => (
            <option key={m} value={m}>{MODELL_LABEL[m]}</option>
          ))}
        </select>
        <span className="text-terminal-green-muted" data-testid="treffer">
          {gefiltert.length} von {alle.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-terminal-green-muted border-b border-terminal-green/30">
              <th className="py-1 pr-3">ID</th>
              <th className="py-1 pr-3">Titel</th>
              <th className="py-1 pr-3">Gruppe</th>
              <th className="py-1 pr-3">Art</th>
              <th className="py-1 pr-3">Gewinnmodell</th>
              <th className="py-1 pr-3">Host-Zustand</th>
              <th className="py-1 pr-3">Zugang</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {gefiltert.map((l) => (
              <tr key={`${l.id}|${l.art}`} className="border-b border-terminal-green/10 align-top">
                <td className="py-1 pr-3 whitespace-nowrap">{l.id}</td>
                <td className="py-1 pr-3">{l.titel}</td>
                <td className="py-1 pr-3 text-terminal-green-muted whitespace-nowrap">{l.gruppe}</td>
                <td className="py-1 pr-3 whitespace-nowrap">{ART_LABEL[l.art]}</td>
                <td className={`py-1 pr-3 whitespace-nowrap ${MODELL_FARBE[l.gewinnmodell]}`}>
                  {MODELL_LABEL[l.gewinnmodell]} ({l.bedingungen})
                </td>
                <td className="py-1 pr-3 text-terminal-green-muted">
                  {l.hostZustand.length > 0 ? l.hostZustand.join(', ') : '—'}
                </td>
                <td className="py-1 pr-3 text-terminal-green-muted">
                  {l.modi
                    ? `Schw. ${l.schwierigkeit} · ${l.modi.length > 0 ? `${l.modi.join(', ')} · ab Woche ${l.abWoche}` : 'NIRGENDS'}`
                    : l.verlangt?.length
                      ? `nach ${l.verlangt.join(', ')}`
                      : '—'}
                </td>
                <td className="py-1">
                  <button
                    className="border border-terminal-green/50 px-2 py-0.5 hover:bg-terminal-green/10"
                    aria-label={`Öffnen: ${l.id}`}
                    onClick={() => setOffen(l)}
                  >
                    Öffnen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
