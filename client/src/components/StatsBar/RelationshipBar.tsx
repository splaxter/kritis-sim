interface RelationshipBarProps {
  name: string;
  value: number;
  color?: string;
}

export function RelationshipBar({ name, value, color }: RelationshipBarProps) {
  const normalized = ((value + 100) / 200) * 100;
  const blocks = Math.floor(normalized / 10);
  const sign = value >= 0 ? '+' : '';

  const barColor = value < -30
    ? 'text-terminal-danger'
    : value > 30
      ? 'text-terminal-success'
      : 'text-terminal-green';

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
