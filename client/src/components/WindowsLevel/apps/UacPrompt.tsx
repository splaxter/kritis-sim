import { useState } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { UacPromptState } from '@kritis/shared';

const useStyles = makeStyles({
  card: {
    width: '440px',
    maxWidth: '92vw',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow64,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  header: {
    padding: '16px 20px',
    backgroundColor: tokens.colorNeutralBackground3,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  headerTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  question: {
    padding: '18px 20px 8px',
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
  },
  detailRow: {
    display: 'flex',
    gap: '12px',
    padding: '12px 20px',
    alignItems: 'flex-start',
  },
  appIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    flexShrink: 0,
  },
  detailText: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  program: { fontSize: tokens.fontSizeBase300, color: tokens.colorNeutralForeground1 },
  meta: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 },
  publisherVerified: { color: tokens.colorPaletteGreenForeground1 },
  publisherUnverified: { color: tokens.colorPaletteRedForeground1, fontWeight: tokens.fontWeightSemibold },
  message: { margin: '0 20px 8px' },
  prompt: {
    padding: '8px 20px 18px',
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
  },
  actions: {
    display: 'flex',
    gap: '8px',
    padding: '14px 20px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  spacer: { flex: 1 },
});

interface UacPromptProps {
  state: UacPromptState;
  emit: (interaction: string) => void;
  locked: boolean;
}

export function UacPrompt({ state, emit, locked }: UacPromptProps) {
  const styles = useStyles();
  const [warned, setWarned] = useState(false);

  const allow = () => {
    if (locked) return;
    emit('answer:uac:yes');
    // Allowing an unverified publisher is the risky action → surface a warning.
    if (!state.verifiedPublisher) setWarned(true);
  };

  const deny = () => {
    if (locked) return;
    emit('answer:uac:no');
  };

  return (
    <div className={styles.card} role="dialog" aria-label="Benutzerkontensteuerung">
      <div className={styles.header}>
        <span className={styles.headerTitle}>Benutzerkontensteuerung</span>
      </div>

      <div className={styles.question}>
        Möchten Sie zulassen, dass durch diese App Änderungen an Ihrem Gerät vorgenommen werden?
      </div>

      <div className={styles.detailRow}>
        <div className={styles.appIcon} aria-hidden>
          {state.verifiedPublisher ? '🛡️' : '⚠️'}
        </div>
        <div className={styles.detailText}>
          <span className={styles.program}>{state.program}</span>
          <span className={styles.meta}>
            Verifizierter Herausgeber:{' '}
            <span className={state.verifiedPublisher ? styles.publisherVerified : styles.publisherUnverified}>
              {state.verifiedPublisher ? state.publisher : `Unbekannt (${state.publisher})`}
            </span>
          </span>
          <span className={styles.meta}>Dateiursprung: {state.fileOrigin ?? state.programPath}</span>
        </div>
      </div>

      {warned && state.riskFeedback && (
        <div className={styles.message}>
          <MessageBar intent="warning" layout="multiline">
            <MessageBarBody>{state.riskFeedback}</MessageBarBody>
          </MessageBar>
        </div>
      )}

      <div className={styles.prompt}>Soll diese App ausgeführt werden?</div>

      <div className={styles.actions}>
        <div className={styles.spacer} />
        <Button appearance="primary" disabled={locked} onClick={allow}>
          Ja
        </Button>
        <Button appearance="secondary" disabled={locked} onClick={deny}>
          Nein
        </Button>
      </div>
    </div>
  );
}
