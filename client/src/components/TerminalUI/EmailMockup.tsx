/**
 * Email Mockup Component
 * Displays emails in a terminal-aesthetic style
 */

interface EmailMockupProps {
  from: string;
  to?: string;
  subject: string;
  date?: string;
  body: string;
  priority?: 'normal' | 'high' | 'urgent';
  attachments?: string[];
  className?: string;
}

const PRIORITY_STYLES = {
  normal: { indicator: '', color: 'text-terminal-green' },
  high: { indicator: '[!] ', color: 'text-terminal-warning' },
  urgent: { indicator: '[!!!] ', color: 'text-terminal-danger' },
};

export function EmailMockup({
  from,
  to,
  subject,
  date,
  body,
  priority = 'normal',
  attachments,
  className = '',
}: EmailMockupProps) {
  const priorityStyle = PRIORITY_STYLES[priority];

  return (
    <div
      className={`font-mono border border-terminal-border bg-terminal-bg ${className}`}
    >
      {/* Email header */}
      <div className="border-b border-terminal-border p-2 space-y-1 text-sm">
        <div className="flex">
          <span className="text-terminal-green-muted w-20">Von:</span>
          <span className="text-terminal-info">{from}</span>
        </div>
        {to && (
          <div className="flex">
            <span className="text-terminal-green-muted w-20">An:</span>
            <span>{to}</span>
          </div>
        )}
        <div className="flex">
          <span className="text-terminal-green-muted w-20">Betreff:</span>
          <span className={priorityStyle.color}>
            {priorityStyle.indicator}
            {subject}
          </span>
        </div>
        {date && (
          <div className="flex">
            <span className="text-terminal-green-muted w-20">Datum:</span>
            <span className="text-terminal-green-dim">{date}</span>
          </div>
        )}
      </div>

      {/* Email body */}
      <div className="p-3 whitespace-pre-wrap text-terminal-green-dim">
        {body}
      </div>

      {/* Attachments */}
      {attachments && attachments.length > 0 && (
        <div className="border-t border-terminal-border p-2 text-sm">
          <span className="text-terminal-green-muted">Anhänge: </span>
          {attachments.map((att, i) => (
            <span key={i} className="text-terminal-info">
              [{att}]
              {i < attachments.length - 1 && ' '}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact email preview (for inbox view)
interface EmailPreviewProps {
  from: string;
  subject: string;
  preview: string;
  time: string;
  unread?: boolean;
  priority?: 'normal' | 'high' | 'urgent';
  onClick?: () => void;
}

export function EmailPreview({
  from,
  subject,
  preview,
  time,
  unread = false,
  priority = 'normal',
  onClick,
}: EmailPreviewProps) {
  const priorityStyle = PRIORITY_STYLES[priority];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left font-mono p-2 border border-terminal-border hover:bg-terminal-bg-highlight transition-colors ${unread ? 'border-l-2 border-l-terminal-info' : ''}`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {unread && <span className="text-terminal-info">●</span>}
            <span className={unread ? 'font-bold' : ''}>{from}</span>
          </div>
          <div className={`truncate ${priorityStyle.color}`}>
            {priorityStyle.indicator}
            {subject}
          </div>
          <div className="text-terminal-green-muted text-sm truncate">
            {preview}
          </div>
        </div>
        <span className="text-terminal-green-dim text-sm whitespace-nowrap">
          {time}
        </span>
      </div>
    </button>
  );
}
