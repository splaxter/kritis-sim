import { relationshipBand, BAND_CLASS } from './bands';

interface RelationshipBarProps {
  name: string;
  value: number;
  color?: string;
  /** Pre-computed band class (chef uses its lose-condition band); falls back to the generic band. */
  valueColorClass?: string;
}

export function RelationshipBar({ name, value, color, valueColorClass }: RelationshipBarProps) {
  const normalized = ((value + 100) / 200) * 100;
  const blocks = Math.floor(normalized / 10);
  const sign = value >= 0 ? '+' : '';

  const barColor = valueColorClass ?? BAND_CLASS[relationshipBand(value)];

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-24 text-terminal-green-dim" style={{ color }}>{name}</span>
      <div className={`flex-1 flex items-center gap-1 ${barColor}`}>
        <span className="font-mono">
          {'█'.repeat(blocks)}
          {'░'.repeat(10 - blocks)}
        </span>
        <span className="w-10 text-right">{sign}{value}</span>
      </div>
    </div>
  );
}
