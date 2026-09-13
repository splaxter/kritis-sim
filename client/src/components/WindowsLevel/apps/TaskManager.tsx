import { useMemo, useState } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  MessageBar,
  MessageBarBody,
  mergeClasses,
} from '@fluentui/react-components';
import { GuiProcess } from '@kritis/shared';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    // Size to content so a short process list is fully visible without
    // scrolling (the target shouldn't hide below the fold); long lists scroll.
    maxHeight: 'min(68vh, 560px)',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  heading: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  tableWrap: {
    flex: 1,
    overflowY: 'auto',
  },
  headRow: {
    display: 'grid',
    gridTemplateColumns: '2.4fr 0.8fr 1fr 1fr',
    padding: '6px 16px',
    position: 'sticky',
    top: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  headButton: {
    // Sieht aus wie der Spaltenkopf, ist aber ein echter Button: Tastatur und
    // Screenreader bekommen dieselbe Sortierung wie die Maus.
    background: 'none',
    border: 'none',
    padding: 0,
    font: 'inherit',
    color: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    columnGap: '4px',
    ':hover': { color: tokens.colorNeutralForeground1 },
  },
  headButtonRight: { justifyContent: 'flex-end' },
  sortMark: { fontSize: tokens.fontSizeBase100 },
  row: {
    display: 'grid',
    gridTemplateColumns: '2.4fr 0.8fr 1fr 1fr',
    padding: '8px 16px',
    alignItems: 'center',
    cursor: 'default',
    borderBottom: `1px solid ${tokens.colorNeutralBackground2}`,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    ':focus-visible': {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '-2px',
    },
  },
  rowSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },
  name: {
    display: 'flex',
    flexDirection: 'column',
  },
  nameMain: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
  },
  nameSub: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  metric: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    textAlign: 'right',
  },
  metricHot: {
    color: tokens.colorPaletteRedForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '10px 16px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  message: {
    margin: '0 16px 10px',
  },
});

interface TaskManagerProps {
  processes: GuiProcess[];
  /** Emit an interaction token to the level engine. */
  emit: (interaction: string) => void;
  /** Locks the UI once the level is solved. */
  locked: boolean;
}

const fmtCpu = (cpu: number) => `${cpu.toFixed(0)} %`;
const fmtMem = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`);

type SortKey = 'name' | 'pid' | 'cpu' | 'memoryMb';
type SortState = { key: SortKey; dir: 'asc' | 'desc' } | null;

const COLUMNS: Array<{ key: SortKey; label: string; numeric: boolean }> = [
  { key: 'name', label: 'Name', numeric: false },
  { key: 'pid', label: 'PID', numeric: true },
  { key: 'cpu', label: 'CPU', numeric: true },
  { key: 'memoryMb', label: 'Arbeitsspeicher', numeric: true },
];

export function TaskManager({ processes, emit, locked }: TaskManagerProps) {
  const styles = useStyles();
  const [rows, setRows] = useState<GuiProcess[]>(processes);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<{ intent: 'warning' | 'error'; text: string } | null>(null);
  /**
   * Sortierung ist ANSICHT, nicht Zustand.
   *
   * `rows` bleibt die Wahrheit (endTask entfernt daraus), sortiert wird nur zum
   * Rendern. Anfangs bewusst `null`: die gelieferte Reihenfolge bleibt stehen,
   * damit der auffaellige Prozess nicht schon beim Oeffnen obenauf liegt. Nach
   * CPU zu sortieren ist der erste Griff eines Admins — das soll der Spieler
   * TUN, nicht geschenkt bekommen.
   */
  const [sort, setSort] = useState<SortState>(null);

  const select = (name: string) => {
    if (locked) return;
    setSelected(name);
    setMessage(null);
    emit(`select:${name}`);
  };

  const toggleSort = (key: SortKey) => {
    // Bewusst KEIN emit: Sortieren ist eine Blickrichtung, keine Entscheidung.
    // Das Token-Modell der Level bleibt unangetastet.
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : // Zahlen zuerst absteigend (der grosse Wert ist der interessante),
          // Namen zuerst aufsteigend — wie im echten Task-Manager.
          { key, dir: COLUMNS.find((c) => c.key === key)!.numeric ? 'desc' : 'asc' }
    );
  };

  const visibleRows = useMemo(() => {
    if (!sort) return rows;
    const faktor = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * faktor;
      return String(x).localeCompare(String(y), 'de') * faktor;
    });
  }, [rows, sort]);

  const endTask = () => {
    if (locked || !selected) return;
    const proc = rows.find((p) => p.name === selected);
    if (!proc) return;

    if (proc.critical) {
      setMessage({
        intent: 'error',
        text: `„${proc.name}" ist ein kritischer Windows-Prozess und kann nicht beendet werden.`,
      });
      emit(`endtask-blocked:${proc.name}`);
      return;
    }

    setRows((prev) => prev.filter((p) => p.name !== proc.name));
    setSelected(null);
    setMessage(null);
    emit(`endtask:${proc.name}`);
  };

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <span className={styles.heading}>Prozesse</span>
        <span style={{ fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 }}>
          {rows.length} aktiv
        </span>
      </div>

      {message && (
        <div className={styles.message}>
          <MessageBar intent={message.intent} layout="multiline">
            <MessageBarBody>{message.text}</MessageBarBody>
          </MessageBar>
        </div>
      )}

      <div className={styles.headRow} role="row">
        {COLUMNS.map((col) => {
          const aktiv = sort?.key === col.key;
          return (
            <div
              key={col.key}
              role="columnheader"
              aria-sort={aktiv ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <button
                type="button"
                className={mergeClasses(styles.headButton, col.numeric && styles.headButtonRight)}
                onClick={() => toggleSort(col.key)}
              >
                {col.label}
                <span className={styles.sortMark} aria-hidden>
                  {aktiv ? (sort!.dir === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <div className={styles.tableWrap} role="listbox" aria-label="Prozesse">
        {visibleRows.map((proc) => (
          <div
            key={proc.name}
            className={mergeClasses(styles.row, selected === proc.name && styles.rowSelected)}
            onClick={() => select(proc.name)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                select(proc.name);
              }
            }}
            role="option"
            tabIndex={locked ? -1 : 0}
            aria-selected={selected === proc.name}
          >
            <span className={styles.name}>
              <span className={styles.nameMain}>{proc.name}</span>
              {proc.description && <span className={styles.nameSub}>{proc.description}</span>}
            </span>
            <span className={styles.metric}>{proc.pid}</span>
            <span className={mergeClasses(styles.metric, proc.cpu >= 80 && styles.metricHot)}>
              {fmtCpu(proc.cpu)}
            </span>
            <span className={styles.metric}>{fmtMem(proc.memoryMb)}</span>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <Button appearance="primary" disabled={!selected || locked} onClick={endTask}>
          Task beenden
        </Button>
      </div>
    </div>
  );
}
