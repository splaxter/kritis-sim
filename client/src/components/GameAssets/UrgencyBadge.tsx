import { UrgencyLevel } from './types';

interface UrgencyBadgeProps {
  urgency: UrgencyLevel;
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

const URGENCY_CONFIG: Record<
  UrgencyLevel,
  { label: string; color: string; bgColor: string; icon: string; ascii: string }
> = {
  low: {
    label: 'Niedrig',
    color: 'text-terminal-green',
    bgColor: 'bg-terminal-green/10',
    icon: '●',
    ascii: '[OK]',
  },
  medium: {
    label: 'Mittel',
    color: 'text-terminal-warning',
    bgColor: 'bg-terminal-warning/10',
    icon: '◐',
    ascii: '[!!]',
  },
  high: {
    label: 'Hoch',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    icon: '◉',
    ascii: '[!!!]',
  },
  critical: {
    label: 'KRITISCH',
    color: 'text-terminal-danger',
    bgColor: 'bg-terminal-danger/10',
    icon: '⬤',
    ascii: '[XXX]',
  },
};

export function UrgencyBadge({
  urgency,
  showLabel = true,
  animated = true,
  className = '',
}: UrgencyBadgeProps) {
  const config = URGENCY_CONFIG[urgency];
  const pulseClass =
    animated && urgency === 'critical' ? 'animate-pulse' : '';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${config.color} ${config.bgColor} border-current/30 ${pulseClass} ${className}`}
    >
      <span className={urgency === 'critical' ? 'animate-pulse' : ''}>
        {config.icon}
      </span>
      {showLabel && <span className="text-xs font-mono">{config.label}</span>}
    </span>
  );
}

// Simple text-only version for use in terminal output
export function UrgencyText({ urgency }: { urgency: UrgencyLevel }) {
  const config = URGENCY_CONFIG[urgency];
  return <span className={config.color}>{config.ascii}</span>;
}
