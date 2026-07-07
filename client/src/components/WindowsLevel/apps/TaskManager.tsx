import { useState } from 'react';
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

export function TaskManager({ processes, emit, locked }: TaskManagerProps) {
  const styles = useStyles();
  const [rows, setRows] = useState<GuiProcess[]>(processes);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<{ intent: 'warning' | 'error'; text: string } | null>(null);

  const select = (name: string) => {
    if (locked) return;
    setSelected(name);
    setMessage(null);
    emit(`select:${name}`);
  };

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

      <div className={styles.headRow}>
        <span>Name</span>
        <span style={{ textAlign: 'right' }}>PID</span>
        <span style={{ textAlign: 'right' }}>CPU</span>
        <span style={{ textAlign: 'right' }}>Arbeitsspeicher</span>
      </div>

      <div className={styles.tableWrap} role="listbox" aria-label="Prozesse">
        {rows.map((proc) => (
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
