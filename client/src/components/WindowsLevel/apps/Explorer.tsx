import { useState } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  MessageBar,
  MessageBarBody,
  mergeClasses,
} from '@fluentui/react-components';
import { AclEntry } from '@kritis/shared';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'min(68vh, 560px)',
  },
  header: {
    padding: '12px 16px 6px',
  },
  heading: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  subPath: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    fontFamily: tokens.fontFamilyMonospace,
  },
  sectionLabel: {
    padding: '8px 16px 4px',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  headRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.2fr',
    padding: '6px 16px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  list: { flex: 1, overflowY: 'auto', minHeight: '80px' },
  row: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.2fr',
    padding: '8px 16px',
    alignItems: 'center',
    cursor: 'default',
    fontSize: tokens.fontSizeBase300,
    borderBottom: `1px solid ${tokens.colorNeutralBackground2}`,
    color: tokens.colorNeutralForeground1,
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '-2px' },
  },
  rowSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    ':hover': { backgroundColor: tokens.colorBrandBackground2Hover },
  },
  principal: { display: 'flex', alignItems: 'center', gap: '6px' },
  warn: { color: tokens.colorPaletteRedForeground1 },
  perm: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2 },
  message: { margin: '0 16px 10px' },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '10px 16px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

interface ExplorerProps {
  shareName: string;
  sharePath: string;
  entries: AclEntry[];
  emit: (interaction: string) => void;
  locked: boolean;
}

export function Explorer({ shareName, sharePath, entries, emit, locked }: ExplorerProps) {
  const styles = useStyles();
  const [rows, setRows] = useState<AclEntry[]>(entries);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const select = (id: string) => {
    if (locked) return;
    setSelected(id);
    setMessage(null);
    emit(`select:${id}`);
  };

  const remove = () => {
    if (locked || !selected) return;
    const entry = rows.find((e) => e.id === selected);
    if (!entry) return;

    if (entry.critical) {
      setMessage(
        entry.riskFeedback ??
          `„${entry.principal}" wird für den Betrieb benötigt und darf nicht entfernt werden.`
      );
      emit(`remove-blocked:${entry.id}`);
      return;
    }

    setRows((prev) => prev.filter((e) => e.id !== entry.id));
    setSelected(null);
    setMessage(null);
    emit(`remove:${entry.id}`);
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.heading}>Eigenschaften: {shareName}</div>
        <div className={styles.subPath}>{sharePath}</div>
      </div>

      <div className={styles.sectionLabel}>Sicherheit — Gruppen- und Benutzernamen:</div>

      {message && (
        <div className={styles.message}>
          <MessageBar intent="error" layout="multiline">
            <MessageBarBody>{message}</MessageBarBody>
          </MessageBar>
        </div>
      )}

      <div className={styles.headRow}>
        <span>Gruppe / Benutzer</span>
        <span>Berechtigung</span>
      </div>

      <div className={styles.list} role="listbox" aria-label="Berechtigungen">
        {rows.map((entry) => (
          <div
            key={entry.id}
            className={mergeClasses(styles.row, selected === entry.id && styles.rowSelected)}
            onClick={() => select(entry.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                select(entry.id);
              }
            }}
            role="option"
            tabIndex={locked ? -1 : 0}
            aria-selected={selected === entry.id}
          >
            <span className={mergeClasses(styles.principal, entry.overlyBroad && styles.warn)}>
              {entry.principal}
              {entry.overlyBroad && <span aria-hidden>⚠</span>}
            </span>
            <span className={mergeClasses(styles.perm, entry.overlyBroad && styles.warn)}>
              {entry.permission}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <Button appearance="primary" disabled={!selected || locked} onClick={remove}>
          Entfernen
        </Button>
      </div>
    </div>
  );
}
