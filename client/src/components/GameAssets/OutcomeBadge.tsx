import { OutcomeType } from './types';
import { ScenarioOutcome } from '@kritis/shared';

interface OutcomeBadgeProps {
  outcome: ScenarioOutcome | OutcomeType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

// Normalize ScenarioOutcome to OutcomeType
function normalizeOutcome(outcome: ScenarioOutcome | OutcomeType): OutcomeType {
  const mapping: Record<string, OutcomeType> = {
    PERFECT: 'perfect',
    PERFECT_ALTERNATIVE: 'perfect',
    SUCCESS: 'success',
    PARTIAL_SUCCESS: 'partial-success',
    FAIL: 'fail',
    CRITICAL_FAIL: 'critical-fail',
    // Already normalized
    perfect: 'perfect',
    success: 'success',
    'partial-success': 'partial-success',
    fail: 'fail',
    'critical-fail': 'critical-fail',
  };
  return mapping[outcome] || 'fail';
}

const OUTCOME_CONFIG: Record<
  OutcomeType,
  { label: string; color: string; bgColor: string; icon: string; ascii: string }
> = {
  perfect: {
    label: 'PERFEKT',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    icon: '★',
    ascii: '[***]',
  },
  success: {
    label: 'Erfolg',
    color: 'text-terminal-green',
    bgColor: 'bg-terminal-green/10',
    icon: '✓',
    ascii: '[OK]',
  },
  'partial-success': {
    label: 'Teilerfolg',
    color: 'text-terminal-warning',
    bgColor: 'bg-terminal-warning/10',
    icon: '◐',
    ascii: '[~]',
  },
  fail: {
    label: 'Fehlschlag',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    icon: '✗',
    ascii: '[X]',
  },
  'critical-fail': {
    label: 'KRITISCH',
    color: 'text-terminal-danger',
    bgColor: 'bg-terminal-danger/10',
    icon: '☠',
    ascii: '[XXX]',
  },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function OutcomeBadge({
  outcome,
  size = 'md',
  showLabel = true,
  className = '',
}: OutcomeBadgeProps) {
  const normalizedOutcome = normalizeOutcome(outcome);
  const config = OUTCOME_CONFIG[normalizedOutcome];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border ${config.color} ${config.bgColor} border-current/30 font-mono ${SIZE_CLASSES[size]} ${className}`}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

// ASCII-only version
export function OutcomeText({
  outcome,
}: {
  outcome: ScenarioOutcome | OutcomeType;
}) {
  const normalizedOutcome = normalizeOutcome(outcome);
  const config = OUTCOME_CONFIG[normalizedOutcome];
  return <span className={config.color}>{config.ascii}</span>;
}
