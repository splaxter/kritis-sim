interface BackButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
}

// Shared hierarchical back control. The label comes from resolveBack so ESC and
// this button always describe the same destination. min-h-11 = 44px touch target.
export function BackButton({ label, onClick, className = '' }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 shrink-0 items-center text-terminal-danger hover:underline ${className}`}
    >
      [ESC] {label}
    </button>
  );
}
