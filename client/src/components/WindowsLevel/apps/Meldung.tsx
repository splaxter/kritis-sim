import { useState } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Input,
  Textarea,
  Radio,
  RadioGroup,
  Checkbox,
  Select,
  Field,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { MeldungFeld, MeldungState, Tristate } from '@kritis/shared';

/** Anzeigetexte der drei Tristate-Werte. Ids bleiben ASCII (Orthographie-Guard). */
const TRISTATE_LABELS: Record<Tristate, string> = {
  ja: 'ja',
  nein: 'nein',
  unbekannt: 'noch unbekannt',
};

/**
 * Reihenfolge der drei Werte im Formular.
 *
 * VERTRAG: „noch unbekannt" steht ZULETZT und ist NICHT vorausgewählt. Es darf
 * nicht wie die empfohlene Antwort aussehen — sonst nimmt das Formular dem
 * Spieler genau die Entscheidung ab, um die es geht. Alle drei Werte werden
 * identisch gerendert (siehe Vertragskommentar an `Tristate`).
 */
const TRISTATE_ORDER: Tristate[] = ['ja', 'nein', 'unbekannt'];

/** Der aktuelle Stand des Formulars: Feld-Id → Wert bzw. gewählte Optionen. */
export type MeldungValues = Record<string, string | string[]>;

/**
 * Welche Pflichtfelder sind noch leer? Rein, damit der Test sie ohne DOM prüfen
 * kann. Ein leerer String und eine leere Mehrfachauswahl gelten als „leer" —
 * ein Feld, in das jemand nichts eingetragen hat, ist nicht ausgefüllt.
 */
export function missingRequired(felder: MeldungFeld[], values: MeldungValues): string[] {
  return felder
    .filter((f) => f.required)
    .filter((f) => {
      const v = values[f.id];
      if (Array.isArray(v)) return v.length === 0;
      return !v || v.trim() === '';
    })
    .map((f) => f.id);
}

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 },
  header: {
    padding: '12px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    rowGap: '4px',
  },
  heading: { fontSize: tokens.fontSizeBase500, fontWeight: tokens.fontWeightSemibold },
  meta: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 },
  clock: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorPaletteDarkOrangeForeground1,
  },
  /**
   * Sticky, weil die Rückweisung sonst unsichtbar bleibt: der Absenden-Knopf
   * steht am UNTEREN Ende des scrollenden Formulars, die Meldung oben. Dieselbe
   * Falle wie im Kataster-Fundstapel — dort beim Durchspielen gefunden, hier
   * von vornherein vermieden. (Im jsdom-Test nicht prüfbar: getByText kennt
   * kein Scrolling.)
   */
  message: { position: 'sticky', top: 0, zIndex: 2, margin: '10px 16px 0' },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', rowGap: '14px' },
  vorbefund: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    rowGap: '4px',
    backgroundColor: tokens.colorNeutralBackground3,
  },
  vorbefundTitle: { fontSize: tokens.fontSizeBase200, fontWeight: tokens.fontWeightSemibold },
  vorbefundRow: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2 },
  hint: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 },
  multi: { display: 'flex', flexDirection: 'column' },
  // Eigene Beschriftung für die Mehrfachauswahl — siehe den Kommentar an der
  // Stelle, an der sie gerendert wird.
  gruppenLabel: {
    display: 'block',
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    marginBottom: '4px',
  },
  footer: {
    padding: '12px 16px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    justifyContent: 'flex-end',
  },
});

interface MeldungProps {
  state: MeldungState;
  /** Interaktions-Token an die Level-Engine melden. */
  emit: (interaction: string) => void;
  /**
   * Überholten Token zurücknehmen. Formularfelder sind ZUSTÄNDE, keine
   * Ereignisse: ohne dies zählte eine korrigierte Falschangabe weiter mit,
   * weil `performed` ein Verlauf ist (siehe useGuiLevel.retract).
   */
  retract: (interaction: string) => void;
  locked: boolean;
}

/**
 * Meldeformular nach § 32 BSIG — die GUI-Hälfte des Tracks „Pflicht & Nachweis".
 *
 * Das Formular urteilt NICHT. Es weist eine unvollständige Meldung zurück (weil
 * eine Meldung ohne Pflichtangaben schlicht keine Meldung ist), aber es sagt
 * nirgends, welcher Wert der richtige wäre. Ob „nein" belegt oder erfunden ist,
 * entscheidet allein die `GuiSolution` des Levels.
 */
export function Meldung({ state, emit, retract, locked }: MeldungProps) {
  const styles = useStyles();
  const [values, setValues] = useState<MeldungValues>({});
  const [warning, setWarning] = useState<string | null>(null);

  const tokenFor = (feldId: string, wert: string) => `set:${feldId}:${wert}`;

  /**
   * Jede Änderung am Formular macht ein früheres Absenden ungültig.
   *
   * `submit` ist ein EREIGNIS, kein Zustand — und `performed` ist ein Verlauf.
   * Ohne diese Rücknahme blieb ein einmal abgeschicktes `submit` für immer
   * stehen: eine spätere Feldänderung konnte das Level dann ohne erneutes
   * Absenden lösen, im schlimmsten Fall mit einem inzwischen LEEREN
   * Pflichtfeld. Man wurde also für etwas bewertet, das man nie abgeschickt hat.
   *
   * Fachlich ist das genau richtig: wer nach dem Absenden noch etwas ändert,
   * hat eine andere Meldung — und die muss er abschicken.
   */
  const invalidateSubmit = () => retract('submit');

  /** Einwertiges Feld: neuer Wert ersetzt den alten, der alte Token fällt weg. */
  const setSingle = (feld: MeldungFeld, wert: string) => {
    if (locked) return;
    const alt = values[feld.id];
    invalidateSubmit();
    if (typeof alt === 'string' && alt && alt !== wert) retract(tokenFor(feld.id, alt));
    setValues((prev) => ({ ...prev, [feld.id]: wert }));
    setWarning(null);
    if (wert) emit(tokenFor(feld.id, wert));
  };

  /** Mehrfachauswahl: jede Option ist ihr eigener Token, Abwahl nimmt ihn zurück. */
  const toggleMulti = (feld: MeldungFeld, optionId: string, checked: boolean) => {
    if (locked) return;
    invalidateSubmit();
    setValues((prev) => {
      const cur = Array.isArray(prev[feld.id]) ? (prev[feld.id] as string[]) : [];
      return { ...prev, [feld.id]: checked ? [...cur, optionId] : cur.filter((o) => o !== optionId) };
    });
    setWarning(null);
    if (checked) emit(tokenFor(feld.id, optionId));
    else retract(tokenFor(feld.id, optionId));
  };

  const submit = () => {
    if (locked) return;
    const fehlend = missingRequired(state.felder, values);
    if (fehlend.length > 0) {
      const namen = state.felder.filter((f) => fehlend.includes(f.id)).map((f) => f.label);
      // Bewusst KEIN emit: eine unvollständige Meldung ist kein Lösungsversuch.
      setWarning(
        `Die Meldestelle nimmt das so nicht an. Ohne diese Angaben ist die Frist nicht prüfbar: ${namen.join(', ')}.`
      );
      return;
    }
    setWarning(null);
    emit('submit');
  };

  const renderFeld = (feld: MeldungFeld) => {
    const v = values[feld.id];
    switch (feld.kind) {
      case 'tristate':
        return (
          <Field key={feld.id} label={feld.label} hint={feld.hint}>
            <RadioGroup
              layout="horizontal"
              value={typeof v === 'string' ? v : ''}
              onChange={(_e, data) => setSingle(feld, data.value)}
              disabled={locked}
            >
              {TRISTATE_ORDER.map((t) => (
                <Radio key={t} value={t} label={TRISTATE_LABELS[t]} />
              ))}
            </RadioGroup>
          </Field>
        );
      case 'select':
        return (
          <Field key={feld.id} label={feld.label} hint={feld.hint}>
            <Select
              value={typeof v === 'string' ? v : ''}
              onChange={(_e, data) => setSingle(feld, data.value)}
              disabled={locked}
            >
              <option value="">— bitte wählen —</option>
              {(feld.options ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        );
      case 'multiselect':
        // KEIN `Field` um die Mehrfachauswahl.
        //
        // `Field` reicht seine `id` und seine Beschriftung an sein Kind weiter
        // — das ist für EIN Bedienelement gedacht. Bei drei Kästchen bekamen
        // alle drei dieselbe `id`, und das erste wurde dadurch als
        // „Betroffene Dienste und Systeme" angesagt statt als „Dateiserver
        // Disposition". Beim Probespielen aufgefallen: doppelte IDs im
        // Dokument, zwei Kästchen ganz ohne Namen.
        //
        // Stattdessen eine echte Gruppe mit eigener Beschriftung; jedes
        // Kästchen behält seinen eigenen Namen.
        return (
          <div key={feld.id} role="group" aria-labelledby={`${feld.id}-gruppe`}>
            <span id={`${feld.id}-gruppe`} className={styles.gruppenLabel}>
              {feld.label}
            </span>
            {feld.hint && <span className={styles.hint}>{feld.hint}</span>}
            <div className={styles.multi}>
              {(feld.options ?? []).map((o) => (
                <Checkbox
                  key={o.id}
                  label={o.label}
                  disabled={locked}
                  checked={Array.isArray(v) && v.includes(o.id)}
                  onChange={(_e, data) => toggleMulti(feld, o.id, !!data.checked)}
                />
              ))}
            </div>
          </div>
        );
      case 'longtext':
        return (
          <Field key={feld.id} label={feld.label} hint={feld.hint}>
            <Textarea
              value={typeof v === 'string' ? v : ''}
              disabled={locked}
              onChange={(_e, data) => setSingle(feld, data.value)}
            />
          </Field>
        );
      default:
        return (
          <Field key={feld.id} label={feld.label} hint={feld.hint}>
            <Input
              type={feld.kind === 'datetime' ? 'datetime-local' : 'text'}
              value={typeof v === 'string' ? v : ''}
              disabled={locked}
              onChange={(_e, data) => setSingle(feld, data.value)}
            />
          </Field>
        );
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.heading}>{state.rechtsgrundlage}</div>
        <div className={styles.meta}>Meldestelle: {state.meldestelle}</div>
        <div className={styles.clock}>Kenntnis seit {state.kenntnisSeit}</div>
      </div>

      {warning && (
        <div className={styles.message}>
          <MessageBar intent="warning" layout="multiline">
            <MessageBarBody>{warning}</MessageBarBody>
          </MessageBar>
        </div>
      )}

      <div className={styles.body}>
        {state.vorbefund && state.vorbefund.length > 0 && (
          <div className={styles.vorbefund}>
            <div className={styles.vorbefundTitle}>Das habt ihr bereits gemeldet</div>
            {state.vorbefund.map((z) => (
              <div key={z.label} className={styles.vorbefundRow}>
                {z.label}: {z.value}
              </div>
            ))}
          </div>
        )}
        {state.felder.map(renderFeld)}
      </div>

      <div className={styles.footer}>
        <Button appearance="primary" onClick={submit} disabled={locked}>
          Meldung absenden
        </Button>
      </div>
    </div>
  );
}
