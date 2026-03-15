/**
 * System Message Components
 * Styled notifications and system messages with terminal aesthetic
 */

import { ReactNode } from 'react';

interface SystemMessageProps {
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  children: ReactNode;
  timestamp?: string;
  dismissable?: boolean;
  onDismiss?: () => void;
}

const TYPE_STYLES = {
  info: {
    prefix: '[INFO]',
    color: 'text-terminal-info',
    border: 'border-terminal-info',
    bg: 'bg-terminal-info/5',
  },
  success: {
    prefix: '[OK]',
    color: 'text-terminal-green',
    border: 'border-terminal-green',
    bg: 'bg-terminal-green/5',
  },
  warning: {
    prefix: '[WARNUNG]',
    color: 'text-terminal-warning',
    border: 'border-terminal-warning',
    bg: 'bg-terminal-warning/5',
  },
  error: {
    prefix: '[FEHLER]',
    color: 'text-terminal-danger',
    border: 'border-terminal-danger',
    bg: 'bg-terminal-danger/5',
  },
  system: {
    prefix: '[SYSTEM]',
    color: 'text-terminal-green-dim',
    border: 'border-terminal-border',
    bg: 'bg-terminal-bg-secondary',
  },
};

export function SystemMessage({
  type,
  children,
  timestamp,
  dismissable,
  onDismiss,
}: SystemMessageProps) {
  const style = TYPE_STYLES[type];

  return (
    <div
      className={`font-mono border-l-2 ${style.border} ${style.bg} p-2 flex items-start gap-2`}
    >
      <span className={`${style.color} font-bold whitespace-nowrap`}>
        {style.prefix}
      </span>
      <div className="flex-1 text-terminal-green-dim">{children}</div>
      {timestamp && (
        <span className="text-terminal-green-muted text-sm">{timestamp}</span>
      )}
      {dismissable && (
        <button
          onClick={onDismiss}
          className="text-terminal-green-muted hover:text-terminal-green"
        >
          [×]
        </button>
      )}
    </div>
  );
}

// Log-style message stream
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  source?: string;
  message: string;
}

interface LogStreamProps {
  entries: LogEntry[];
  maxHeight?: string;
  showTimestamps?: boolean;
}

const LOG_LEVEL_STYLES = {
  debug: 'text-terminal-green-muted',
  info: 'text-terminal-green',
  warn: 'text-terminal-warning',
  error: 'text-terminal-danger',
};

export function LogStream({
  entries,
  maxHeight = '300px',
  showTimestamps = true,
}: LogStreamProps) {
  return (
    <div
      className="font-mono text-sm bg-terminal-bg border border-terminal-border overflow-auto"
      style={{ maxHeight }}
    >
      {entries.map((entry, i) => (
        <div key={i} className="px-2 py-0.5 hover:bg-terminal-bg-highlight">
          {showTimestamps && (
            <span className="text-terminal-green-muted mr-2">
              [{entry.timestamp}]
            </span>
          )}
          <span className={`mr-2 ${LOG_LEVEL_STYLES[entry.level]}`}>
            {entry.level.toUpperCase().padEnd(5)}
          </span>
          {entry.source && (
            <span className="text-terminal-info mr-2">{entry.source}:</span>
          )}
          <span className="text-terminal-green-dim">{entry.message}</span>
        </div>
      ))}
    </div>
  );
}

// Progress indicator
interface ProgressIndicatorProps {
  label: string;
  progress: number; // 0-100
  status?: 'active' | 'complete' | 'error';
  showPercentage?: boolean;
}

export function ProgressIndicator({
  label,
  progress,
  status = 'active',
  showPercentage = true,
}: ProgressIndicatorProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const filledBlocks = Math.floor(clampedProgress / 5);
  const emptyBlocks = 20 - filledBlocks;

  const statusColors = {
    active: 'text-terminal-green',
    complete: 'text-terminal-green',
    error: 'text-terminal-danger',
  };

  const statusIndicators = {
    active: '⟳',
    complete: '✓',
    error: '✗',
  };

  return (
    <div className="font-mono flex items-center gap-2">
      <span className={statusColors[status]}>{statusIndicators[status]}</span>
      <span className="text-terminal-green-dim w-32 truncate">{label}</span>
      <span className={statusColors[status]}>
        [{'█'.repeat(filledBlocks)}{'░'.repeat(emptyBlocks)}]
      </span>
      {showPercentage && (
        <span className="text-terminal-green-muted w-12 text-right">
          {clampedProgress}%
        </span>
      )}
    </div>
  );
}

// Notification badge (for header/status bar)
interface NotificationBadgeProps {
  count: number;
  type?: 'default' | 'warning' | 'danger';
}

export function NotificationBadge({
  count,
  type = 'default',
}: NotificationBadgeProps) {
  if (count === 0) return null;

  const colors = {
    default: 'text-terminal-info border-terminal-info',
    warning: 'text-terminal-warning border-terminal-warning',
    danger: 'text-terminal-danger border-terminal-danger animate-pulse',
  };

  return (
    <span className={`font-mono text-xs px-1 border ${colors[type]}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
