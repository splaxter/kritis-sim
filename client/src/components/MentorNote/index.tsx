interface MentorNoteProps {
  note: string;
  isEnabled?: boolean;
}

export function MentorNote({ note, isEnabled = true }: MentorNoteProps) {
  if (!isEnabled || !note) {
    return null;
  }

  return (
    <div className="border border-terminal-info bg-terminal-bg-highlight/30 p-4 mb-6">
      <div className="flex items-center gap-2 text-terminal-info mb-2">
        <span className="text-lg">i</span>
        <span className="font-bold">MENTOR-MODUS</span>
      </div>
      <div className="text-terminal-green-dim leading-relaxed text-sm">
        {note}
      </div>
    </div>
  );
}
