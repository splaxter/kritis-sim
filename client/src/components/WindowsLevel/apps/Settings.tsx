import { useState } from 'react';
import {
  makeStyles,
  tokens,
  Switch,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { SecuritySetting } from '@kritis/shared';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'min(68vh, 560px)',
    overflowY: 'auto',
  },
  intro: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  shield: { fontSize: '24px' },
  introText: {
    display: 'flex',
    flexDirection: 'column',
  },
  introTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  introSub: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  category: {
    margin: '14px 16px 4px',
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '10px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralBackground2}`,
  },
  rowMain: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  label: { fontSize: tokens.fontSizeBase300, color: tokens.colorNeutralForeground1 },
  desc: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 },
  managed: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorPaletteYellowForeground2,
  },
  control: { display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 },
  status: { fontSize: tokens.fontSizeBase200, fontWeight: tokens.fontWeightSemibold },
  statusSecure: { color: tokens.colorPaletteGreenForeground1 },
  statusInsecure: { color: tokens.colorPaletteRedForeground1 },
  statusManaged: { color: tokens.colorNeutralForeground3 },
  message: { margin: '0 16px 10px' },
});

interface SettingsProps {
  settings: SecuritySetting[];
  /** Emit an interaction token to the level engine. */
  emit: (interaction: string) => void;
  /** Locks the UI once the level is solved. */
  locked: boolean;
}

/**
 * Windows-Sicherheit (Settings) app. Each protection is a Fluent `Switch`
 * (role="switch", aria-checked) grouped under its category header. Status is
 * derived from `enabled === recommended`, so a secure-when-off setting reads
 * green while disabled. Toggling a setting emits `enable:<id>` / `disable:<id>`.
 */
export function Settings({ settings, emit, locked }: SettingsProps) {
  const styles = useStyles();
  const [rows, setRows] = useState<SecuritySetting[]>(settings);
  const [warning, setWarning] = useState<string | null>(null);

  const toggle = (id: string, next: boolean) => {
    if (locked) return;
    const setting = rows.find((s) => s.id === id);
    if (!setting || setting.locked) return;

    setRows((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: next } : s)));
    emit(`${next ? 'enable' : 'disable'}:${id}`);

    // Surface the risk hint only when the player drives it INTO an insecure state.
    if (next !== setting.recommended && setting.riskFeedback) {
      setWarning(setting.riskFeedback);
    } else {
      setWarning(null);
    }
  };

  // Preserve first-seen category order.
  const categories: string[] = [];
  for (const s of rows) if (!categories.includes(s.category)) categories.push(s.category);

  const statusOf = (s: SecuritySetting) => {
    if (s.locked) return { text: 'Verwaltet', cls: styles.statusManaged };
    return s.enabled === s.recommended
      ? { text: 'Sicher', cls: styles.statusSecure }
      : { text: 'Aktion nötig', cls: styles.statusInsecure };
  };

  return (
    <div className={styles.root}>
      <div className={styles.intro}>
        <span className={styles.shield} aria-hidden>🛡️</span>
        <span className={styles.introText}>
          <span className={styles.introTitle}>Windows-Sicherheit</span>
          <span className={styles.introSub}>Schutz Ihres Geräts und Ihrer Daten</span>
        </span>
      </div>

      {warning && (
        <div className={styles.message}>
          <MessageBar intent="warning" layout="multiline">
            <MessageBarBody>{warning}</MessageBarBody>
          </MessageBar>
        </div>
      )}

      {categories.map((cat) => (
        <div key={cat}>
          <div className={styles.category}>{cat}</div>
          {rows
            .filter((s) => s.category === cat)
            .map((s) => {
              const status = statusOf(s);
              return (
                <div key={s.id} className={styles.row}>
                  <span className={styles.rowMain}>
                    <span className={styles.label}>{s.label}</span>
                    {s.description && <span className={styles.desc}>{s.description}</span>}
                    {s.locked && s.riskFeedback && (
                      <span className={styles.managed}>🔒 {s.riskFeedback}</span>
                    )}
                  </span>
                  <span className={styles.control}>
                    <span className={`${styles.status} ${status.cls}`}>{status.text}</span>
                    <Switch
                      checked={s.enabled}
                      disabled={locked || s.locked}
                      aria-label={s.label}
                      onChange={(_, data) => toggle(s.id, data.checked)}
                    />
                  </span>
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}
