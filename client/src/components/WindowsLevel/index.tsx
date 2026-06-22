import { GuiContext, Skills, GameModeId } from '@kritis/shared';
import { FluentProvider, webDarkTheme, makeStyles, tokens } from '@fluentui/react-components';
import { WindowFrame } from './WindowFrame';
import { TaskManager } from './apps/TaskManager';
import { EventViewer } from './apps/EventViewer';
import { UacPrompt } from './apps/UacPrompt';
import { Settings } from './apps/Settings';
import { Explorer } from './apps/Explorer';
import { CoreFirewall } from './apps/CoreFirewall';
import { useGuiLevel } from './useGuiLevel';

interface WindowsLevelProps {
  context: GuiContext;
  onSolved: (skillGain: Partial<Skills>, setsFlags?: string[]) => void;
  onCancel: () => void;
  gameMode?: GameModeId;
  /** Briefing resolved from briefingVariants against game flags (overrides context.briefing). */
  briefingOverride?: string;
}

const useStyles = makeStyles({
  desktop: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
    padding: '24px 16px',
    // Win11-ish bloom wallpaper, darkened to sit beside the terminal CRT look.
    backgroundImage:
      'radial-gradient(circle at 30% 20%, #1f3a5f 0%, #14233a 45%, #0a1320 100%)',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  briefing: {
    maxWidth: '760px',
    width: '100%',
    marginBottom: '16px',
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#e8eef6',
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    backdropFilter: 'blur(4px)',
  },
  hints: {
    maxWidth: '760px',
    width: '100%',
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  hint: {
    padding: '8px 12px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
    border: '1px solid rgba(255, 214, 0, 0.35)',
    color: '#ffe27a',
    fontSize: tokens.fontSizeBase200,
  },
  successOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 20, 12, 0.72)',
    backdropFilter: 'blur(2px)',
    zIndex: 10,
  },
  successCard: {
    maxWidth: '520px',
    padding: '24px 28px',
    borderRadius: '10px',
    backgroundColor: '#0f2a16',
    border: '1px solid #3fbf6b',
    color: '#d7ffe3',
    textAlign: 'center',
  },
});

const APP_ICONS: Record<string, string> = {
  taskmanager: '🗔',
  eventviewer: '📋',
  uac: '🛡️',
  explorer: '🗂️',
  settings: '⚙️',
  corefirewall: '🧱',
};

export function WindowsLevel({ context, onSolved, onCancel, briefingOverride }: WindowsLevelProps) {
  const styles = useStyles();
  const briefing = briefingOverride ?? context.briefing;
  const { emit, solved, resultText, hintsRemaining, visibleHints, showHint } = useGuiLevel({
    context,
    onSolved,
  });

  const renderApp = () => {
    switch (context.app) {
      case 'taskmanager':
        return (
          <TaskManager
            processes={context.state.taskManager?.processes ?? []}
            emit={emit}
            locked={solved}
          />
        );
      case 'eventviewer':
        return (
          <EventViewer
            logName={context.state.eventViewer?.logName ?? 'Sicherheit'}
            entries={context.state.eventViewer?.entries ?? []}
            emit={emit}
            locked={solved}
          />
        );
      case 'uac':
        return context.state.uac ? (
          <UacPrompt state={context.state.uac} emit={emit} locked={solved} />
        ) : null;
      case 'settings':
        return (
          <Settings
            settings={context.state.settings?.settings ?? []}
            emit={emit}
            locked={solved}
          />
        );
      case 'explorer':
        return (
          <Explorer
            shareName={context.state.explorer?.shareName ?? 'Freigabe'}
            sharePath={context.state.explorer?.sharePath ?? ''}
            entries={context.state.explorer?.entries ?? []}
            emit={emit}
            locked={solved}
          />
        );
      case 'corefirewall':
        return (
          <CoreFirewall
            zoneName={context.state.coreFirewall?.zoneName ?? 'KRITIS-FW-CORE'}
            rules={context.state.coreFirewall?.rules ?? []}
            subnets={context.state.coreFirewall?.subnets ?? []}
            emit={emit}
            locked={solved}
          />
        );
      default:
        return (
          <div style={{ padding: 24, color: tokens.colorNeutralForeground2 }}>
            App „{context.app}" ist noch nicht implementiert.
          </div>
        );
    }
  };

  return (
    <div className="border border-terminal-border h-full flex flex-col">
      {/* Header — mirrors the Terminal component */}
      <div className="flex justify-between items-center p-2 border-b border-terminal-border bg-terminal-bg-secondary">
        <span>
          {context.hostname} [Windows] — {context.title}
        </span>
        <button onClick={onCancel} className="text-terminal-danger hover:underline">
          [ESC] Abbrechen
        </button>
      </div>

      {/* GUI body, rendered inside Fluent's theme provider */}
      <FluentProvider theme={webDarkTheme} className="flex-1" style={{ background: 'transparent' }}>
        <div className={styles.desktop}>
          {briefing && <div className={styles.briefing}>{briefing}</div>}

          {/* UAC is a secure-desktop modal — no window chrome. Other apps run in a window. */}
          {context.app === 'uac' ? (
            renderApp()
          ) : (
            <WindowFrame
              title={context.title}
              icon={<span aria-hidden>{APP_ICONS[context.app] ?? '🗔'}</span>}
              onClose={onCancel}
            >
              {renderApp()}
            </WindowFrame>
          )}

          {visibleHints.length > 0 && (
            <div className={styles.hints}>
              {visibleHints.map((h, i) => (
                <div key={i} className={styles.hint}>
                  💡 {h}
                </div>
              ))}
            </div>
          )}

          {solved && (
            <div className={styles.successOverlay}>
              <div className={styles.successCard}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>✓ Aufgabe abgeschlossen</div>
                {resultText && <div style={{ opacity: 0.9 }}>{resultText}</div>}
              </div>
            </div>
          )}
        </div>
      </FluentProvider>

      {/* Footer — mirrors the Terminal component */}
      <div className="p-2 border-t border-terminal-border bg-terminal-bg-secondary flex justify-between text-sm">
        <button
          onClick={showHint}
          disabled={hintsRemaining === 0}
          className={hintsRemaining > 0 ? 'hover:underline' : 'text-terminal-green-muted'}
        >
          [H] Hinweis ({hintsRemaining} übrig)
        </button>
        <span className="text-terminal-green-muted">[ESC] Abbrechen</span>
      </div>
    </div>
  );
}
