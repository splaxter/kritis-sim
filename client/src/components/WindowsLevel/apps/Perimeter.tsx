import { useState } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Badge,
  MessageBar,
  MessageBarBody,
  mergeClasses,
} from '@fluentui/react-components';
import { PerimeterRule, PerimeterProbe } from '@kritis/shared';
import { pruefeVerkehr } from '../../../engine/perimeterRegelwerk';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', maxHeight: 'min(68vh, 560px)', overflowY: 'auto' },
  intro: {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  shield: { fontSize: '24px' },
  introText: { display: 'flex', flexDirection: 'column' },
  introTitle: {
    fontSize: tokens.fontSizeBase400, fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  introSub: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 },
  section: {
    margin: '14px 16px 4px', fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold, color: tokens.colorNeutralForeground2,
  },
  hinweis: { margin: '0 16px 8px', fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 },
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
    padding: '10px 16px', borderBottom: `1px solid ${tokens.colorNeutralBackground2}`,
  },
  rowTraf: { backgroundColor: tokens.colorNeutralBackground3 },
  nummer: {
    fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3, minWidth: '20px',
  },
  rowMain: { display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flexGrow: 1 },
  labelLine: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  label: { fontSize: tokens.fontSizeBase300, color: tokens.colorNeutralForeground1 },
  labelBroad: { color: tokens.colorPaletteRedForeground1 },
  labelAus: { color: tokens.colorNeutralForeground4, textDecoration: 'line-through' },
  spur: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3, fontFamily: tokens.fontFamilyMonospace },
  managed: { fontSize: tokens.fontSizeBase200, color: tokens.colorPaletteYellowForeground2 },
  control: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  aktion: { fontSize: tokens.fontSizeBase200, fontWeight: tokens.fontWeightSemibold, minWidth: '86px', textAlign: 'right' },
  aktionAllow: { color: tokens.colorPaletteGreenForeground1 },
  aktionDeny: { color: tokens.colorPaletteRedForeground1 },
  message: { margin: '10px 16px' },
  probeZeile: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
    padding: '10px 16px', borderBottom: `1px solid ${tokens.colorNeutralBackground2}`,
  },
  ergebnis: { fontSize: tokens.fontSizeBase200, fontFamily: tokens.fontFamilyMonospace },
  ergebnisAus: { color: tokens.colorPaletteRedForeground1 },
  ergebnisAn: { color: tokens.colorPaletteGreenForeground1 },
});

interface PerimeterProps {
  applianceName: string;
  rules: PerimeterRule[];
  probes: PerimeterProbe[];
  emit: (interaction: string) => void;
  /**
   * Überholten Token zurücknehmen. Ein Testverkehr ist ein EREIGNIS, seine
   * Aussage aber ein ZUSTAND: „gemessen, dass diese Quelle draußen bleibt".
   * Ändert danach jemand das Regelwerk, gilt die Messung nicht mehr — ohne
   * Rücknahme löste eine spätere Regeländerung das Level mit einem Beweis,
   * der zu einem anderen Regelwerk gehört (siehe `invalidateSubmit` in
   * Meldung.tsx, dieselbe Wurzel).
   */
  retract: (interaction: string) => void;
  locked: boolean;
}

export function Perimeter({ applianceName, rules, probes, emit, retract, locked }: PerimeterProps) {
  const styles = useStyles();
  const [reihen, setReihen] = useState<PerimeterRule[]>(rules);
  const [warnung, setWarnung] = useState<string | null>(null);
  const [messungen, setMessungen] = useState<Record<string, string>>({});
  const [getroffen, setGetroffen] = useState<number | null>(null);

  /** Jede Regeländerung entwertet jede vorherige Messung. */
  const messungenVerwerfen = () => {
    for (const p of probes) retract(`probe:${p.id}`);
    setMessungen({});
    setGetroffen(null);
  };

  const geschuetzt = (regel: PerimeterRule, token: string): boolean => {
    if (!regel.critical) return false;
    setWarnung(regel.riskFeedback ?? `Die Regel „${regel.label}" ist betriebskritisch und darf nicht verändert werden.`);
    emit(`${token}-blocked:${regel.id}`);
    return true;
  };

  const einengen = (id: string) => {
    if (locked) return;
    const regel = reihen.find((r) => r.id === id);
    if (!regel?.narrowTo || geschuetzt(regel, 'narrow')) return;
    messungenVerwerfen();
    setReihen((prev) => prev.map((r) => (r.id === id ? { ...r, source: regel.narrowTo!, overlyBroad: false } : r)));
    setWarnung(null);
    emit(`narrow:${id}`);
  };

  const schalten = (id: string) => {
    if (locked) return;
    const regel = reihen.find((r) => r.id === id);
    if (!regel || geschuetzt(regel, regel.disabled ? 'enable' : 'disable')) return;
    messungenVerwerfen();
    const aus = !regel.disabled;
    setReihen((prev) => prev.map((r) => (r.id === id ? { ...r, disabled: aus } : r)));
    setWarnung(null);
    emit(`${aus ? 'disable' : 'enable'}:${id}`);
  };

  const verschieben = (id: string, richtung: -1 | 1) => {
    if (locked) return;
    const index = reihen.findIndex((r) => r.id === id);
    const ziel = index + richtung;
    if (index === -1 || ziel < 0 || ziel >= reihen.length) return;
    const regel = reihen[index];
    if (geschuetzt(regel, richtung === -1 ? 'moveup' : 'movedown')) return;
    // Auch die Regel, über die geschoben wird, kann geschützt sein: Wer die
    // Schlussregel nach oben verdrängt, ändert sie in der Sache.
    if (geschuetzt(reihen[ziel], richtung === -1 ? 'moveup' : 'movedown')) return;
    messungenVerwerfen();
    const naechste = [...reihen];
    naechste[index] = naechste[ziel];
    naechste[ziel] = regel;
    setReihen(naechste);
    setWarnung(null);
    emit(`${richtung === -1 ? 'moveup' : 'movedown'}:${id}`);
  };

  const messen = (probe: PerimeterProbe) => {
    if (locked) return;
    const ergebnis = pruefeVerkehr(reihen, probe);
    const text = ergebnis.regelNummer === null
      ? 'kein Treffer → VERWORFEN (Grundhaltung)'
      : `Treffer auf Regel ${ergebnis.regelNummer} („${ergebnis.regel?.label}") → ${ergebnis.zugelassen ? 'ZUGELASSEN' : 'VERWORFEN'}`;
    setMessungen((prev) => ({ ...prev, [probe.id]: text }));
    setGetroffen(ergebnis.regelNummer);
    setWarnung(null);
    emit(`probe:${probe.id}`);
  };

  return (
    <div className={styles.root}>
      <div className={styles.intro}>
        <span className={styles.shield} aria-hidden>🧱</span>
        <span className={styles.introText}>
          <span className={styles.introTitle}>Perimeter-Firewall — {applianceName}</span>
          <span className={styles.introSub}>Regelwerk und Verkehrsprüfung</span>
        </span>
      </div>

      {warnung && (
        <div className={styles.message}>
          <MessageBar intent="error" layout="multiline">
            <MessageBarBody>{warnung}</MessageBarBody>
          </MessageBar>
        </div>
      )}

      <div className={styles.section}>Regelwerk</div>
      <div className={styles.hinweis}>Die erste passende Regel von oben entscheidet.</div>

      {reihen.map((r, i) => (
        <div
          key={r.id}
          className={mergeClasses(styles.row, getroffen === i + 1 && styles.rowTraf)}
        >
          <span className={styles.nummer}>{i + 1}</span>
          <span className={styles.rowMain}>
            <span className={styles.labelLine}>
              <span
                className={mergeClasses(
                  styles.label,
                  r.overlyBroad && styles.labelBroad,
                  r.disabled && styles.labelAus,
                )}
              >
                {r.label}
                {r.overlyBroad && <span aria-hidden> ⚠</span>}
              </span>
              {r.disabled && <Badge appearance="outline" size="small">abgeschaltet</Badge>}
            </span>
            <span className={styles.spur}>{r.source} → {r.dest} : {r.service}</span>
            {r.critical && <span className={styles.managed}>🔒 betriebskritisch — geschützt</span>}
          </span>
          <span className={styles.control}>
            <span className={mergeClasses(styles.aktion, r.action === 'allow' ? styles.aktionAllow : styles.aktionDeny)}>
              {r.action === 'allow' ? 'ZULASSEN' : 'VERWERFEN'}
            </span>
            <Button size="small" appearance="subtle" disabled={locked || i === 0}
              aria-label={`Nach oben: ${r.label}`} onClick={() => verschieben(r.id, -1)}>▲</Button>
            <Button size="small" appearance="subtle" disabled={locked || i === reihen.length - 1}
              aria-label={`Nach unten: ${r.label}`} onClick={() => verschieben(r.id, 1)}>▼</Button>
            {r.narrowTo && r.source !== r.narrowTo && (
              <Button size="small" appearance="primary" disabled={locked}
                aria-label={`Quelle einengen: ${r.label}`} onClick={() => einengen(r.id)}>Einengen</Button>
            )}
            <Button size="small" appearance="secondary" disabled={locked}
              aria-label={`${r.disabled ? 'Einschalten' : 'Abschalten'}: ${r.label}`}
              onClick={() => schalten(r.id)}>{r.disabled ? 'Einschalten' : 'Abschalten'}</Button>
          </span>
        </div>
      ))}

      <div className={styles.section}>Verkehrsprüfung</div>
      <div className={styles.hinweis}>
        Der Testverkehr läuft durch dasselbe Regelwerk wie echter Verkehr und nennt die Regel, die gegriffen hat.
      </div>
      {probes.map((p) => (
        <div key={p.id} className={styles.probeZeile}>
          <span className={styles.rowMain}>
            <span className={styles.label}>{p.label}</span>
            <span className={styles.spur}>{p.source} → {p.dest} : {p.service}</span>
            {messungen[p.id] && (
              <span
                className={mergeClasses(
                  styles.ergebnis,
                  messungen[p.id].includes('ZUGELASSEN') ? styles.ergebnisAn : styles.ergebnisAus,
                )}
              >
                ⇒ {messungen[p.id]}
              </span>
            )}
          </span>
          <Button size="small" appearance="primary" disabled={locked}
            aria-label={`Testverkehr senden: ${p.label}`} onClick={() => messen(p)}>Senden</Button>
        </div>
      ))}
    </div>
  );
}
