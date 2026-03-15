/**
 * Phone Call Mockup Component
 * Displays incoming/active phone calls in terminal aesthetic
 */

interface PhoneCallProps {
  caller: string;
  callerRole?: string;
  status: 'incoming' | 'active' | 'ended' | 'missed';
  duration?: string;
  onAnswer?: () => void;
  onDecline?: () => void;
  onHangup?: () => void;
}

const STATUS_CONFIG = {
  incoming: {
    icon: '📞',
    label: 'Eingehender Anruf',
    color: 'text-terminal-warning',
    animation: 'animate-pulse',
  },
  active: {
    icon: '🔊',
    label: 'Verbunden',
    color: 'text-terminal-green',
    animation: '',
  },
  ended: {
    icon: '📵',
    label: 'Beendet',
    color: 'text-terminal-green-muted',
    animation: '',
  },
  missed: {
    icon: '📵',
    label: 'Verpasst',
    color: 'text-terminal-danger',
    animation: '',
  },
};

export function PhoneCall({
  caller,
  callerRole,
  status,
  duration,
  onAnswer,
  onDecline,
  onHangup,
}: PhoneCallProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={`font-mono border-2 ${config.color.replace('text-', 'border-')} bg-terminal-bg p-4 ${config.animation}`}
    >
      {/* Header */}
      <div className="text-center mb-3">
        <div className={`text-2xl ${config.color}`}>{config.icon}</div>
        <div className={`text-sm ${config.color}`}>{config.label}</div>
      </div>

      {/* Caller info */}
      <div className="text-center mb-4">
        <div className="text-lg">{caller}</div>
        {callerRole && (
          <div className="text-terminal-green-muted text-sm">{callerRole}</div>
        )}
      </div>

      {/* Duration (if active/ended) */}
      {duration && (
        <div className="text-center text-terminal-green-dim mb-4">
          {duration}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-center gap-4">
        {status === 'incoming' && (
          <>
            <button
              onClick={onAnswer}
              className="px-4 py-2 bg-terminal-green/20 border border-terminal-green text-terminal-green hover:bg-terminal-green/30 transition-colors"
            >
              [Annehmen]
            </button>
            <button
              onClick={onDecline}
              className="px-4 py-2 bg-terminal-danger/20 border border-terminal-danger text-terminal-danger hover:bg-terminal-danger/30 transition-colors"
            >
              [Ablehnen]
            </button>
          </>
        )}
        {status === 'active' && (
          <button
            onClick={onHangup}
            className="px-4 py-2 bg-terminal-danger/20 border border-terminal-danger text-terminal-danger hover:bg-terminal-danger/30 transition-colors"
          >
            [Auflegen]
          </button>
        )}
      </div>
    </div>
  );
}

// Phone call notification (smaller, for status bar)
interface CallNotificationProps {
  caller: string;
  onClick?: () => void;
}

export function CallNotification({ caller, onClick }: CallNotificationProps) {
  return (
    <button
      onClick={onClick}
      className="font-mono flex items-center gap-2 px-2 py-1 bg-terminal-warning/10 border border-terminal-warning text-terminal-warning animate-pulse hover:bg-terminal-warning/20 transition-colors"
    >
      <span>📞</span>
      <span className="text-sm">Anruf: {caller}</span>
    </button>
  );
}

// Dialogue bubble for NPC speech during calls/conversations
interface DialogueBubbleProps {
  speaker: string;
  text: string;
  isNpc?: boolean;
}

export function DialogueBubble({
  speaker,
  text,
  isNpc = true,
}: DialogueBubbleProps) {
  return (
    <div
      className={`font-mono p-3 border ${isNpc ? 'border-terminal-info bg-terminal-info/5 border-l-2' : 'border-terminal-green bg-terminal-green/5 border-r-2 ml-8'}`}
    >
      <div className={`text-sm font-bold mb-1 ${isNpc ? 'text-terminal-info' : 'text-terminal-green'}`}>
        {speaker}:
      </div>
      <div className="text-terminal-green-dim italic">"{text}"</div>
    </div>
  );
}
