/**
 * IT Ticket Mockup Component
 * Displays helpdesk tickets in terminal aesthetic
 */

interface TicketMockupProps {
  ticketId: string;
  title: string;
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  requester: string;
  assignee?: string;
  created: string;
  description: string;
  className?: string;
}

const STATUS_STYLES = {
  open: { label: 'OFFEN', color: 'text-terminal-info', bg: 'bg-terminal-info/10' },
  in_progress: { label: 'IN BEARBEITUNG', color: 'text-terminal-warning', bg: 'bg-terminal-warning/10' },
  waiting: { label: 'WARTET', color: 'text-orange-400', bg: 'bg-orange-400/10' },
  resolved: { label: 'GELÖST', color: 'text-terminal-green', bg: 'bg-terminal-green/10' },
  closed: { label: 'GESCHLOSSEN', color: 'text-terminal-green-muted', bg: 'bg-terminal-green-muted/10' },
};

const PRIORITY_STYLES = {
  low: { label: 'Niedrig', color: 'text-terminal-green-dim', icon: '○' },
  medium: { label: 'Mittel', color: 'text-terminal-warning', icon: '◐' },
  high: { label: 'Hoch', color: 'text-orange-500', icon: '◉' },
  critical: { label: 'KRITISCH', color: 'text-terminal-danger', icon: '⬤' },
};

export function TicketMockup({
  ticketId,
  title,
  status,
  priority,
  requester,
  assignee,
  created,
  description,
  className = '',
}: TicketMockupProps) {
  const statusStyle = STATUS_STYLES[status];
  const priorityStyle = PRIORITY_STYLES[priority];

  return (
    <div
      className={`font-mono border border-terminal-border bg-terminal-bg ${className}`}
    >
      {/* Ticket header */}
      <div className="flex justify-between items-center p-2 border-b border-terminal-border bg-terminal-bg-secondary">
        <div className="flex items-center gap-3">
          <span className="text-terminal-green-muted">#{ticketId}</span>
          <span className={`px-2 py-0.5 text-xs ${statusStyle.color} ${statusStyle.bg} border ${statusStyle.color.replace('text-', 'border-')}/30`}>
            {statusStyle.label}
          </span>
        </div>
        <span className={`flex items-center gap-1 ${priorityStyle.color}`}>
          {priorityStyle.icon} {priorityStyle.label}
        </span>
      </div>

      {/* Ticket title */}
      <div className="p-2 border-b border-terminal-border">
        <h3 className="text-lg">{title}</h3>
      </div>

      {/* Ticket metadata */}
      <div className="p-2 border-b border-terminal-border text-sm grid grid-cols-2 gap-2">
        <div>
          <span className="text-terminal-green-muted">Ersteller: </span>
          <span>{requester}</span>
        </div>
        <div>
          <span className="text-terminal-green-muted">Erstellt: </span>
          <span className="text-terminal-green-dim">{created}</span>
        </div>
        {assignee && (
          <div>
            <span className="text-terminal-green-muted">Zugewiesen: </span>
            <span className="text-terminal-info">{assignee}</span>
          </div>
        )}
      </div>

      {/* Ticket description */}
      <div className="p-3 whitespace-pre-wrap text-terminal-green-dim">
        {description}
      </div>
    </div>
  );
}

// Ticket list item for overview
interface TicketListItemProps {
  ticketId: string;
  title: string;
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  requester: string;
  age: string;
  onClick?: () => void;
}

export function TicketListItem({
  ticketId,
  title,
  status,
  priority,
  requester,
  age,
  onClick,
}: TicketListItemProps) {
  const priorityStyle = PRIORITY_STYLES[priority];
  const statusStyle = STATUS_STYLES[status];

  return (
    <button
      onClick={onClick}
      className="w-full text-left font-mono p-2 border border-terminal-border hover:bg-terminal-bg-highlight transition-colors flex items-center gap-3"
    >
      <span className={priorityStyle.color}>{priorityStyle.icon}</span>
      <span className="text-terminal-green-muted w-16">#{ticketId}</span>
      <span className={`w-24 text-xs ${statusStyle.color}`}>[{statusStyle.label}]</span>
      <span className="flex-1 truncate">{title}</span>
      <span className="text-terminal-green-dim text-sm">{requester}</span>
      <span className="text-terminal-green-muted text-sm w-16 text-right">{age}</span>
    </button>
  );
}
