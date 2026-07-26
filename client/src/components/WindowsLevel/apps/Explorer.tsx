import { useEffect, useMemo, useRef, useState } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  MessageBar,
  MessageBarBody,
  mergeClasses,
} from '@fluentui/react-components';
import { AclEntry, ExplorerFileItem } from '@kritis/shared';

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
  crumb: {
    padding: '6px 16px 2px',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    fontFamily: tokens.fontFamilyMonospace,
  },
  preview: {
    margin: '0 16px 10px',
    padding: '10px 12px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'pre-wrap',
    maxHeight: '220px',
    overflowY: 'auto',
  },
  previewTitle: {
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: '6px',
    fontFamily: tokens.fontFamilyBase,
  },
});

interface ExplorerProps {
  shareName: string;
  sharePath: string;
  /** ACL mode rows (mode 'acl' / omitted). */
  entries: AclEntry[];
  /** File-browser rows (mode 'files'). */
  items?: ExplorerFileItem[];
  mode?: 'acl' | 'files';
  emit: (interaction: string) => void;
  locked: boolean;
}

export function Explorer(props: ExplorerProps) {
  if (props.mode === 'files') {
    return <ExplorerFiles {...props} />;
  }
  return <ExplorerAcl {...props} />;
}

// ── ACL mode (share permissions editor) — unchanged behaviour ───────────────

function ExplorerAcl({ shareName, sharePath, entries, emit, locked }: ExplorerProps) {
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

// ── Files mode (share browser with preview) ─────────────────────────────────
// Tokens: 'select:<id>' on click, 'openfolder:<id>' when entering a folder,
// 'open:<id>' when a FILE is opened (its `preview` renders inline) — the token
// guiSolutions match on.

function ExplorerFiles({ shareName, sharePath, items = [], emit, locked }: ExplorerProps) {
  const styles = useStyles();
  const [folder, setFolder] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState<ExplorerFileItem | null>(null);
  // Row refs by id, so navigation and folder entry can move real DOM focus.
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Focusable empty-state, so an empty folder is not a keyboard dead end.
  const emptyRef = useRef<HTMLDivElement>(null);
  // When set, focus the first row (or the empty state) after the next render.
  const focusFirstOnRender = useRef(false);

  const visible = useMemo(() => {
    const inFolder = items.filter((i) => i.parent === folder);
    // Folders first, stable within groups.
    return [...inFolder.filter((i) => i.kind === 'folder'), ...inFolder.filter((i) => i.kind === 'file')];
  }, [items, folder]);

  const crumb = folder ? items.find((i) => i.id === folder)?.name ?? folder : '';

  // After a folder change, hand keyboard focus to the first row of the new
  // listing — or, when the folder is empty, to the focusable empty state, so
  // arrow/Backspace navigation continues without a mouse (no dead end).
  useEffect(() => {
    if (!focusFirstOnRender.current) return;
    focusFirstOnRender.current = false;
    const first = visible[0];
    if (first) rowRefs.current.get(first.id)?.focus();
    else emptyRef.current?.focus();
  }, [visible]);

  const select = (id: string) => {
    if (locked) return;
    setSelected(id);
    emit(`select:${id}`);
  };

  const open = (item: ExplorerFileItem) => {
    if (locked) return;
    if (item.kind === 'folder') {
      focusFirstOnRender.current = true;
      setFolder(item.id);
      setSelected(null);
      setOpenFile(null);
      emit(`openfolder:${item.id}`);
      return;
    }
    setOpenFile(item);
    setSelected(item.id);
    emit(`open:${item.id}`);
  };

  const goUp = () => {
    if (locked || folder === undefined) return;
    const current = items.find((i) => i.id === folder);
    focusFirstOnRender.current = true;
    setFolder(current?.parent);
    setSelected(null);
    setOpenFile(null);
  };

  const focusRowAt = (index: number) => {
    const item = visible[index];
    if (!item) return;
    setSelected(item.id);
    rowRefs.current.get(item.id)?.focus();
  };

  const onRowKeyDown = (e: React.KeyboardEvent, item: ExplorerFileItem, index: number) => {
    if (locked) return;
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        open(item);
        break;
      case ' ':
        e.preventDefault();
        select(item.id);
        break;
      case 'ArrowDown':
        e.preventDefault();
        focusRowAt(Math.min(index + 1, visible.length - 1));
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
        focusRowAt(visible.length - 1);
        break;
      case 'Backspace':
        // Navigate up a folder (mirrors the Zurück button), keyboard-only.
        if (folder !== undefined) {
          e.preventDefault();
          goUp();
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.heading}>{shareName}</div>
        <div className={styles.subPath}>{sharePath}{crumb ? `\\${crumb}` : ''}</div>
      </div>

      <div className={styles.crumb}>
        {folder !== undefined ? `📁 ${crumb}` : '📁 Stammverzeichnis'}
      </div>

      {/* Live region: opening a file announces the preview to assistive tech. */}
      {openFile && (
        <div
          className={styles.preview}
          data-testid="explorer-preview"
          role="region"
          aria-live="polite"
          aria-label={`Vorschau: ${openFile.name}`}
          tabIndex={-1}
          ref={(el) => {
            // Move focus to the freshly opened preview so a screen reader lands
            // on the document content (the actual find).
            if (el && openFile) el.focus();
          }}
        >
          <div className={styles.previewTitle}>📄 {openFile.name}</div>
          {openFile.preview ?? '(Vorschau nicht verfügbar)'}
        </div>
      )}

      <div className={styles.headRow}>
        <span>Name</span>
        <span>Geändert am</span>
      </div>

      <div className={styles.list} role="listbox" aria-label="Dateien" aria-activedescendant={selected ?? undefined}>
        {visible.map((item, index) => (
          <div
            key={item.id}
            id={item.id}
            ref={(el) => {
              if (el) rowRefs.current.set(item.id, el);
              else rowRefs.current.delete(item.id);
            }}
            className={mergeClasses(styles.row, selected === item.id && styles.rowSelected)}
            onClick={() => select(item.id)}
            onDoubleClick={() => open(item)}
            onKeyDown={(e) => onRowKeyDown(e, item, index)}
            role="option"
            // Roving tabindex: the selected row (or the first when none) is the
            // single tab stop; arrows move focus within the listbox.
            tabIndex={locked ? -1 : (selected ?? visible[0]?.id) === item.id ? 0 : -1}
            aria-selected={selected === item.id}
          >
            <span className={styles.principal}>
              {item.kind === 'folder' ? '📁' : '📄'} {item.name}
            </span>
            <span className={styles.perm}>{item.modified ?? ''}</span>
          </div>
        ))}
        {visible.length === 0 && (
          // Focusable empty state: an empty folder must not trap the keyboard.
          // Backspace/Enter here navigate back up (mirrors the Zurück button).
          <div
            ref={emptyRef}
            className={styles.row}
            role="option"
            aria-selected={false}
            aria-label="Ordner ist leer"
            tabIndex={locked ? -1 : 0}
            onKeyDown={(e) => {
              if (locked) return;
              if (e.key === 'Backspace' || e.key === 'Enter') {
                e.preventDefault();
                goUp();
              }
            }}
          >
            <span className={styles.perm}>(Dieser Ordner ist leer — Zurück mit ⌫)</span>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <Button appearance="secondary" disabled={locked || folder === undefined} onClick={goUp}>
          Zurück
        </Button>
        <Button
          appearance="primary"
          disabled={!selected || locked}
          onClick={() => {
            const item = visible.find((i) => i.id === selected);
            if (item) open(item);
          }}
        >
          Öffnen
        </Button>
      </div>
    </div>
  );
}
