import { useMemo, useRef, useState } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MessageBar,
  MessageBarBody,
  mergeClasses,
} from '@fluentui/react-components';
import {
  KatasterCycle,
  KatasterEntry,
  KatasterEvidence,
  KatasterFinding,
  KatasterPerson,
} from '@kritis/shared';

/** Display labels for the ASCII cycle ids (orthography guard keeps ids plain). */
const CYCLE_LABELS: Record<KatasterCycle, string> = {
  monatlich: 'monatlich',
  quartalsweise: 'quartalsweise',
  halbjaehrlich: 'halbjährlich',
  jaehrlich: 'jährlich',
  zweijaehrlich: 'zweijährlich',
  dreijaehrlich: 'dreijährlich',
  anlassbezogen: 'anlassbezogen',
};

const CYCLE_ORDER: KatasterCycle[] = [
  'monatlich',
  'quartalsweise',
  'halbjaehrlich',
  'jaehrlich',
  'zweijaehrlich',
  'dreijaehrlich',
  'anlassbezogen',
];

/** The four states of a row, derived — never seeded. */
export type RowState = 'gap' | 'orphan' | 'claimed' | 'proven';

/**
 * Derive a row's traffic light.
 *
 * Order matters: an explicitly flagged gap stays a gap even after someone is
 * pencilled in, because "we know this is open" is the honest state the
 * campaign rewards.
 *
 * NOTE: this deliberately does NOT look at the assigned person. A group
 * ('IT-Abteilung') or someone who never agreed produces a 🟩 exactly like a
 * real owner — see the contract comment on `KatasterPerson.isGroup`.
 */
export function deriveRowState(entry: KatasterEntry): RowState {
  if (entry.gap) return 'gap';
  if (!entry.owner) return 'orphan';
  if (!entry.evidenceId || !entry.cycle) return 'claimed';
  return 'proven';
}

const STATE_LABELS: Record<RowState, string> = {
  gap: '🟨 LÜCKE',
  orphan: '🟥 VERWAIST',
  claimed: '🟨 BEHAUPTET',
  proven: '🟩 BELEGT',
};

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'min(68vh, 560px)',
    overflowY: 'auto',
    minWidth: 0,
  },
  header: {
    padding: '14px 16px 10px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  heading: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  counters: {
    marginTop: '4px',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    fontFamily: tokens.fontFamilyMonospace,
  },
  countWarn: { color: tokens.colorPaletteRedForeground1, fontWeight: tokens.fontWeightSemibold },
  /**
   * Sticky, weil die Warnung sonst unsichtbar bleibt: der Fundstapel steht am
   * UNTEREN Ende des scrollenden Containers, die Meldung oben. Wer dort einen
   * Köder aufnehmen will, scrollt nicht zurück — er sieht gar nichts und hält
   * die Ablehnung für einen kaputten Button. Die Lektion ("eine Empfehlung ist
   * keine Pflicht") steckt in dieser Meldung; sie muss sichtbar sein, egal wo
   * geklickt wurde. (Im jsdom-Test nicht prüfbar — getByText kennt kein
   * Scrolling; gefunden beim Durchspielen.)
   */
  message: {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    margin: '10px 16px 0',
  },
  section: {
    margin: '14px 16px 4px',
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  list: { display: 'flex', flexDirection: 'column' },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '10px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralBackground2}`,
    cursor: 'pointer',
    ':focus-visible': { outline: `2px solid ${tokens.colorBrandStroke1}`, outlineOffset: '-2px' },
  },
  rowSelected: { backgroundColor: tokens.colorNeutralBackground1Selected },
  rowLocked: { opacity: 0.65, cursor: 'default' },
  rowTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
  duty: { fontSize: tokens.fontSizeBase300, color: tokens.colorNeutralForeground1, minWidth: 0 },
  source: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    fontFamily: tokens.fontFamilyMonospace,
  },
  note: { fontSize: tokens.fontSizeBase200, color: tokens.colorPaletteYellowForeground2 },
  state: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  stateGap: { color: tokens.colorPaletteYellowForeground2 },
  stateOrphan: { color: tokens.colorPaletteRedForeground1 },
  stateClaimed: { color: tokens.colorPaletteYellowForeground2 },
  stateProven: { color: tokens.colorPaletteGreenForeground1 },
  cells: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' },
  detail: {
    margin: '10px 16px',
    padding: '10px 12px',
    borderLeft: `3px solid ${tokens.colorBrandStroke1}`,
    backgroundColor: tokens.colorNeutralBackground2,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    fontStyle: 'italic',
  },
  findingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '8px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralBackground2}`,
  },
});

interface KatasterProps {
  title: string;
  entries: KatasterEntry[];
  people: KatasterPerson[];
  findings?: KatasterFinding[];
  evidence?: KatasterEvidence[];
  /** Emit an interaction token to the level engine. */
  emit: (interaction: string) => void;
  /** Locks the UI once the level is solved. */
  locked: boolean;
}

/**
 * Pflichtenkataster — the register app for DAS KATASTER.
 *
 * Rows are a roving-tabindex listbox (same pattern as Explorer's file mode):
 * ArrowUp/Down/Home/End move, Enter selects and opens the source excerpt.
 * Each row's cells are Fluent menus (Aufpasser / Turnus / Nachweis) plus the
 * two honest actions — mark as gap, queue for escalation.
 *
 * The traffic light is DERIVED (see `deriveRowState`), so the register can
 * never be seeded into a lie; and it deliberately cannot see whether an owner
 * is a group or never agreed. That blindness is the level design.
 */
export function Kataster({
  title,
  entries,
  people,
  findings = [],
  evidence = [],
  emit,
  locked,
}: KatasterProps) {
  const styles = useStyles();
  const [rows, setRows] = useState<KatasterEntry[]>(entries);
  const [openFindings, setOpenFindings] = useState<KatasterFinding[]>(findings);
  const [selected, setSelected] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const evidenceById = useMemo(() => new Map(evidence.map((e) => [e.id, e])), [evidence]);

  const counts = useMemo(() => {
    const states = rows.map(deriveRowState);
    return {
      total: rows.length,
      orphan: states.filter((s) => s === 'orphan').length,
      unproven: states.filter((s) => s === 'claimed').length,
    };
  }, [rows]);

  /** Mutate one row and emit its token. Locked rows and a locked level are inert. */
  const update = (id: string, patch: Partial<KatasterEntry>, token: string) => {
    if (locked) return;
    const row = rows.find((r) => r.id === id);
    if (!row || row.locked) return;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setWarning(null);
    emit(token);
  };

  const fileFinding = (finding: KatasterFinding) => {
    if (locked) return;
    // A recommendation is not an obligation — the decoy never becomes a row.
    if (finding.decoy) {
      setWarning(
        finding.riskFeedback ??
          `„${finding.source}" ist eine Empfehlung, keine Pflicht. Ins Kataster gehört nur, was jemand schuldet.`
      );
      return;
    }
    setOpenFindings((prev) => prev.filter((f) => f.id !== finding.id));
    setRows((prev) => [
      ...prev,
      {
        id: finding.id,
        source: finding.source,
        duty: finding.duty,
        sourceExcerpt: finding.excerpt,
      },
    ]);
    setWarning(null);
    emit(`add:${finding.id}`);
  };

  const focusRowAt = (index: number) => {
    const row = rows[index];
    if (!row) return;
    setSelected(row.id);
    rowRefs.current.get(row.id)?.focus();
  };

  const onRowKeyDown = (e: React.KeyboardEvent, entry: KatasterEntry, index: number) => {
    if (locked) return;
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setSelected(entry.id);
        emit(`select:${entry.id}`);
        break;
      case 'ArrowDown':
        e.preventDefault();
        focusRowAt(Math.min(index + 1, rows.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusRowAt(Math.max(index - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        focusRowAt(0);
        break;
      case 'End':
        e.preventDefault();
        focusRowAt(rows.length - 1);
        break;
      default:
        break;
    }
  };

  const selectedEntry = rows.find((r) => r.id === selected);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.heading}>{title}</div>
        <div className={styles.counters}>
          {counts.total} Pflichten ·{' '}
          <span className={counts.orphan > 0 ? styles.countWarn : undefined}>
            {counts.orphan} ohne Aufpasser
          </span>{' '}
          ·{' '}
          <span className={counts.unproven > 0 ? styles.countWarn : undefined}>
            {counts.unproven} ohne Nachweis
          </span>
        </div>
      </div>

      {warning && (
        <div className={styles.message}>
          <MessageBar intent="warning" layout="multiline">
            <MessageBarBody>{warning}</MessageBarBody>
          </MessageBar>
        </div>
      )}

      <div className={styles.list} role="listbox" aria-label="Pflichtenkataster">
        {rows.map((entry, index) => {
          const state = deriveRowState(entry);
          const owner = entry.owner ? peopleById.get(entry.owner) : undefined;
          const proof = entry.evidenceId ? evidenceById.get(entry.evidenceId) : undefined;
          const isSelected = selected === entry.id;
          return (
            <div
              key={entry.id}
              ref={(el) => {
                if (el) rowRefs.current.set(entry.id, el);
                else rowRefs.current.delete(entry.id);
              }}
              role="option"
              aria-selected={isSelected}
              aria-label={`${entry.duty} — ${STATE_LABELS[state]}`}
              tabIndex={locked ? -1 : (selected ?? rows[0]?.id) === entry.id ? 0 : -1}
              className={mergeClasses(
                styles.row,
                isSelected && styles.rowSelected,
                entry.locked && styles.rowLocked
              )}
              onClick={() => {
                if (locked) return;
                setSelected(entry.id);
                emit(`select:${entry.id}`);
              }}
              onKeyDown={(e) => onRowKeyDown(e, entry, index)}
            >
              <div className={styles.rowTop}>
                <span className={styles.duty}>{entry.duty}</span>
                <span
                  className={mergeClasses(
                    styles.state,
                    state === 'gap' && styles.stateGap,
                    state === 'orphan' && styles.stateOrphan,
                    state === 'claimed' && styles.stateClaimed,
                    state === 'proven' && styles.stateProven
                  )}
                >
                  {STATE_LABELS[state]}
                </span>
              </div>
              <span className={styles.source}>{entry.source}</span>
              {entry.note && <span className={styles.note}>ℹ {entry.note}</span>}

              <div className={styles.cells} onClick={(e) => e.stopPropagation()}>
                <Menu>
                  <MenuTrigger disableButtonEnhancement>
                    <Button size="small" disabled={locked || entry.locked}>
                      Aufpasser: {owner ? owner.name : '—'}
                    </Button>
                  </MenuTrigger>
                  <MenuPopover>
                    <MenuList>
                      {people.map((p) => (
                        <MenuItem
                          key={p.id}
                          onClick={() =>
                            update(entry.id, { owner: p.id }, `owner:${entry.id}:${p.id}`)
                          }
                        >
                          {p.name} — {p.role}
                        </MenuItem>
                      ))}
                      {entry.owner && (
                        <MenuItem
                          onClick={() =>
                            update(entry.id, { owner: undefined }, `clearowner:${entry.id}`)
                          }
                        >
                          Aufpasser entfernen
                        </MenuItem>
                      )}
                    </MenuList>
                  </MenuPopover>
                </Menu>

                <Menu>
                  <MenuTrigger disableButtonEnhancement>
                    <Button size="small" disabled={locked || entry.locked}>
                      Turnus: {entry.cycle ? CYCLE_LABELS[entry.cycle] : '—'}
                    </Button>
                  </MenuTrigger>
                  <MenuPopover>
                    <MenuList>
                      {CYCLE_ORDER.map((c) => (
                        <MenuItem
                          key={c}
                          onClick={() => update(entry.id, { cycle: c }, `cycle:${entry.id}:${c}`)}
                        >
                          {CYCLE_LABELS[c]}
                        </MenuItem>
                      ))}
                    </MenuList>
                  </MenuPopover>
                </Menu>

                <Menu>
                  <MenuTrigger disableButtonEnhancement>
                    <Button size="small" disabled={locked || entry.locked}>
                      Nachweis: {proof ? `${proof.label} (${proof.date})` : '—'}
                    </Button>
                  </MenuTrigger>
                  <MenuPopover>
                    <MenuList>
                      {evidence.length === 0 && <MenuItem disabled>Kein Beleg vorhanden</MenuItem>}
                      {evidence.map((ev) => (
                        <MenuItem
                          key={ev.id}
                          onClick={() =>
                            update(
                              entry.id,
                              { evidenceId: ev.id },
                              `evidence:${entry.id}:${ev.id}`
                            )
                          }
                        >
                          {ev.label} — {ev.date}
                        </MenuItem>
                      ))}
                    </MenuList>
                  </MenuPopover>
                </Menu>

                <Button
                  size="small"
                  appearance={entry.gap ? 'primary' : 'secondary'}
                  disabled={locked || entry.locked}
                  aria-label={`Als Lücke melden: ${entry.duty}`}
                  onClick={() => update(entry.id, { gap: true }, `gap:${entry.id}`)}
                >
                  {entry.gap ? 'Lücke gemeldet' : 'Lücke melden'}
                </Button>

                <Button
                  size="small"
                  appearance={entry.escalated ? 'primary' : 'secondary'}
                  disabled={locked || entry.locked}
                  aria-label={`Eskalieren: ${entry.duty}`}
                  onClick={() => update(entry.id, { escalated: true }, `escalate:${entry.id}`)}
                >
                  {entry.escalated ? 'Eskaliert' : 'Eskalieren'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedEntry?.sourceExcerpt && (
        <div className={styles.detail} role="region" aria-label="Quellentext">
          „{selectedEntry.sourceExcerpt}"
        </div>
      )}

      {openFindings.length > 0 && (
        <>
          <div className={styles.section}>Fundstapel</div>
          {openFindings.map((f) => (
            <div key={f.id} className={styles.findingRow}>
              <span className={styles.duty}>
                {f.duty}
                <br />
                <span className={styles.source}>{f.source}</span>
              </span>
              <Button
                size="small"
                appearance="primary"
                disabled={locked}
                aria-label={`Ins Kataster aufnehmen: ${f.duty}`}
                onClick={() => fileFinding(f)}
              >
                Aufnehmen
              </Button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
