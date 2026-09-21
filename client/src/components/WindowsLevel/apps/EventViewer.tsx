import { useMemo, useState, useRef } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  TabList,
  Tab,
  mergeClasses,
} from '@fluentui/react-components';
import { EventLogEntry, EventLevel } from '@kritis/shared';

const useStyles = makeStyles({
  /**
   * Eine Flex-Spalte, die ihre eigene Hoehenbegrenzung auch EINHAELT.
   *
   * Ohne `minHeight: 0` und ohne schrumpfbare Mitte schob die Detailansicht
   * (die erst beim Auswaehlen erscheint) die Fussleiste aus dem Fenster: im
   * Querformat lagen 24 der 32 Pixel des Meldeknopfs darunter, und weil der
   * Desktop `overflow: hidden` traegt, half auch Scrollen nicht. Die Liste und
   * die Detailansicht geben jetzt nach, die Fussleiste nie.
   */
  root: {
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'min(72vh, 620px)',
    minHeight: 0,
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },
  heading: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  count: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 },
  filterBar: {
    padding: '2px 8px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },
  headRow: {
    display: 'grid',
    gridTemplateColumns: '1.6fr 1.7fr 1.6fr 0.9fr',
    padding: '6px 16px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  // Mindesthoehe eine Zeile statt 120 px: im Querformat bleiben nach Kopf-,
  // Filter- und Fussleiste keine 120 px uebrig, und die harte Untergrenze war
  // genau das, was die Fussleiste hinausgedraengt hat.
  list: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    overflowY: 'auto',
    minHeight: '44px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1.6fr 1.7fr 1.6fr 0.9fr',
    padding: '7px 16px',
    alignItems: 'center',
    cursor: 'default',
    fontSize: tokens.fontSizeBase200,
    borderBottom: `1px solid ${tokens.colorNeutralBackground2}`,
    color: tokens.colorNeutralForeground2,
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
    ':focus-visible': {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '-2px',
    },
  },
  rowSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    ':hover': { backgroundColor: tokens.colorBrandBackground2Hover },
  },
  level: { display: 'flex', alignItems: 'center', gap: '6px' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  // Gibt nach, wenn es eng wird — sie ist der Teil, der zuletzt hinzukommt,
  // also auch der, der zuerst weichen muss. Der Inhalt bleibt ueber ihren
  // eigenen Scrollbereich erreichbar.
  details: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: '12px 16px',
    backgroundColor: tokens.colorNeutralBackground2,
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 'auto',
    minHeight: 0,
    maxHeight: 'min(150px, 30vh)',
    overflowY: 'auto',
  },
  detailsTitle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginBottom: '4px',
  },
  detailsBody: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    whiteSpace: 'pre-wrap',
    fontFamily: tokens.fontFamilyMonospace,
    lineHeight: tokens.lineHeightBase300,
  },
  // Nie schrumpfen, nie verdraengt werden: hier sitzt die einzige Handlung,
  // mit der sich das Level loesen laesst.
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '10px 16px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },
});

const LEVEL_COLOR: Record<EventLevel, string> = {
  Information: '#0078d4',
  Warnung: '#9d5d00',
  Fehler: '#c42b1c',
  Kritisch: '#c42b1c',
  'Überwachung erfolgreich': '#107c10',
  'Überwachung fehlgeschlagen': '#c42b1c',
};

const FILTERS: { key: string; label: string; match: (l: EventLevel) => boolean }[] = [
  { key: 'all', label: 'Alle', match: () => true },
  { key: 'fail', label: 'Überwachung fehlgeschlagen', match: (l) => l === 'Überwachung fehlgeschlagen' },
  { key: 'ok', label: 'Überwachung erfolgreich', match: (l) => l === 'Überwachung erfolgreich' },
  { key: 'err', label: 'Fehler/Warnung', match: (l) => l === 'Fehler' || l === 'Warnung' || l === 'Kritisch' },
];

interface EventViewerProps {
  logName: string;
  entries: EventLogEntry[];
  emit: (interaction: string) => void;
  locked: boolean;
}

export function EventViewer({ logName, entries, emit, locked }: EventViewerProps) {
  const styles = useStyles();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);

  const activeFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const visible = useMemo(
    () => entries.filter((e) => activeFilter.match(e.level)),
    [entries, activeFilter]
  );
  const selectedEntry = entries.find((e) => e.id === selected) ?? null;

  const select = (id: string) => {
    if (locked) return;
    setSelected(id);
    emit(`select:${id}`);
  };

  const report = () => {
    if (locked || !selected) return;
    emit(`report:${selected}`);
  };

  /**
   * Pfeilnavigation in der Ereignisliste — beim Probespielen gefunden: Die
   * Liste traegt `role="listbox"`, die Pfeiltasten taten aber nichts. Im
   * Explorer und im Kataster tun sie es; fuer den Spieler fuehlt sich der
   * Unterschied an, als waere hier die Tastatur kaputt.
   */
  const zeilenRefs = useRef(new Map<string, HTMLDivElement>());

  const fokussiereZeile = (index: number) => {
    const ziel = visible[index];
    if (!ziel) return;
    select(ziel.id);
    zeilenRefs.current.get(ziel.id)?.focus();
  };

  const onZeileKeyDown = (ev: React.KeyboardEvent, id: string, index: number) => {
    if (locked) return;
    switch (ev.key) {
      case 'Enter':
      case ' ':
        ev.preventDefault();
        select(id);
        break;
      case 'ArrowDown':
        ev.preventDefault();
        fokussiereZeile(Math.min(index + 1, visible.length - 1));
        break;
      case 'ArrowUp':
        ev.preventDefault();
        fokussiereZeile(Math.max(index - 1, 0));
        break;
      case 'Home':
        ev.preventDefault();
        fokussiereZeile(0);
        break;
      case 'End':
        ev.preventDefault();
        fokussiereZeile(visible.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <span className={styles.heading}>Ereignisanzeige — {logName}</span>
        <span className={styles.count}>{visible.length} Ereignisse</span>
      </div>

      <div className={styles.filterBar}>
        <TabList
          selectedValue={filter}
          onTabSelect={(_, d) => {
            setFilter(d.value as string);
            emit(`filter:${d.value}`);
          }}
          size="small"
        >
          {FILTERS.map((f) => (
            <Tab key={f.key} value={f.key}>
              {f.label}
            </Tab>
          ))}
        </TabList>
      </div>

      <div className={styles.headRow}>
        <span>Ebene</span>
        <span>Datum und Uhrzeit</span>
        <span>Quelle</span>
        <span style={{ textAlign: 'right' }}>Ereignis-ID</span>
      </div>

      <div className={styles.list} role="listbox" aria-label={`Ereignisse — ${logName}`}>
        {visible.map((e, index) => (
          <div
            key={e.id}
            ref={(el) => {
              if (el) zeilenRefs.current.set(e.id, el);
              else zeilenRefs.current.delete(e.id);
            }}
            className={mergeClasses(styles.row, selected === e.id && styles.rowSelected)}
            onClick={() => select(e.id)}
            onKeyDown={(ev) => onZeileKeyDown(ev, e.id, index)}
            role="option"
            // Rovender Tabstopp wie im Explorer: EIN Tabstopp, Pfeile bewegen
            // innerhalb der Liste. Vorher war jede Zeile ein eigener Tabstopp
            // und die Pfeiltasten taten nichts — was eine „listbox" verspricht.
            tabIndex={locked ? -1 : (selected ?? visible[0]?.id) === e.id ? 0 : -1}
            aria-selected={selected === e.id}
          >
            <span className={styles.level}>
              <span className={styles.dot} style={{ backgroundColor: LEVEL_COLOR[e.level] }} />
              {e.level}
            </span>
            <span>{e.dateTime}</span>
            <span>{e.source}</span>
            <span style={{ textAlign: 'right' }}>{e.eventId}</span>
          </div>
        ))}
      </div>

      {selectedEntry && (
        <div className={styles.details}>
          <div className={styles.detailsTitle}>
            Ereignis {selectedEntry.eventId}, {selectedEntry.source} — {selectedEntry.dateTime}
          </div>
          <div className={styles.detailsBody}>{selectedEntry.message}</div>
        </div>
      )}

      <div className={styles.footer}>
        <Button appearance="primary" disabled={!selected || locked} onClick={report}>
          Als Vorfall melden
        </Button>
      </div>
    </div>
  );
}
