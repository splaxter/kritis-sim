import { ReactNode } from 'react';
import { makeStyles, tokens, mergeClasses } from '@fluentui/react-components';

const useStyles = makeStyles({
  window: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow64,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    width: '100%',
    maxWidth: '760px',
  },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    height: '40px',
    paddingLeft: '12px',
    backgroundColor: tokens.colorNeutralBackground3,
    userSelect: 'none',
  },
  titleText: {
    flex: 1,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightRegular,
  },
  controls: {
    display: 'flex',
    height: '100%',
  },
  control: {
    width: '46px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'default',
    fontSize: '10px',
    color: tokens.colorNeutralForeground2,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground4Hover,
    },
  },
  closeControl: {
    ':hover': {
      backgroundColor: '#c42b1c',
      color: '#ffffff',
    },
  },
  body: {
    flex: 1,
    backgroundColor: tokens.colorNeutralBackground1,
    minHeight: 0,
  },
});

interface WindowFrameProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  onClose?: () => void;
}

/** A minimal Windows 11-style window chrome (title bar + controls + body). */
export function WindowFrame({ title, icon, children, onClose }: WindowFrameProps) {
  const styles = useStyles();
  return (
    <div className={styles.window} role="dialog" aria-label={title}>
      <div className={styles.titleBar}>
        {icon && <span style={{ marginRight: 8, display: 'flex' }}>{icon}</span>}
        <span className={styles.titleText}>{title}</span>
        <div className={styles.controls}>
          <button className={styles.control} aria-label="Minimieren" tabIndex={-1}>
            &#x2013;
          </button>
          <button className={styles.control} aria-label="Maximieren" tabIndex={-1}>
            &#x25a1;
          </button>
          <button
            className={mergeClasses(styles.control, styles.closeControl)}
            aria-label="Schließen"
            onClick={onClose}
          >
            &#x2715;
          </button>
        </div>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
