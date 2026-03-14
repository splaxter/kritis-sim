interface SkillBarProps {
  name: string;
  value: number;
  maxValue?: number;
}

export function SkillBar({ name, value, maxValue = 100 }: SkillBarProps) {
  const percentage = (value / maxValue) * 100;
  const blocks = Math.floor(percentage / 10);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-28 text-terminal-green-dim">{name}</span>
      <div className="flex-1 flex items-center gap-1">
        <span className="font-mono">
          {'█'.repeat(blocks)}
          {'░'.repeat(10 - blocks)}
        </span>
        <span className="w-8 text-right">{value}</span>
      </div>
    </div>
  );
}
