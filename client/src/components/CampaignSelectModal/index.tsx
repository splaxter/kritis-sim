import { useEffect, useRef, useState } from 'react';
import { CampaignId } from '@kritis/shared';
import { AsciiFrame } from '../TerminalUI';
import { listCampaigns } from '../../content/campaigns';

interface CampaignSelectModalProps {
  onSelect: (campaignId: CampaignId) => void;
  onClose: () => void;
}

/**
 * Step 2 of the story entry: pick the campaign. Content comes from the campaign
 * registry (title + campaign-owned menu copy), so adding a campaign needs no
 * change here. Keyboard-first like every other modal: arrows cycle, Enter
 * confirms, Escape goes back, Tab is trapped.
 */
export function CampaignSelectModal({ onSelect, onClose }: CampaignSelectModalProps) {
  const campaigns = listCampaigns();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedIndexRef = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectOption = (index: number, moveFocus = false) => {
    selectedIndexRef.current = index;
    setSelectedIndex(index);
    if (moveFocus) optionRefs.current[index]?.focus();
  };

  // onClose is created inline by the parent, so a parent re-render would give
  // this effect a new identity — re-running it would yank focus and the
  // selection back to the first campaign mid-interaction. Keep it mount-only
  // and read the latest callback through a ref.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    optionRefs.current[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const count = optionRefs.current.length;
        selectOption((selectedIndexRef.current - 1 + count) % count, true);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        selectOption((selectedIndexRef.current + 1) % optionRefs.current.length, true);
      } else if (event.key === 'Tab') {
        const buttons = Array.from(dialogRef.current?.querySelectorAll('button') ?? []);
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Kampagne wählen"
      className="fixed inset-0 z-50 flex overflow-y-auto overscroll-contain bg-black/85 p-4"
    >
      {/* m-auto (not items-center): auto margins collapse to 0 once the card is
          taller than the viewport, so the top stays scroll-reachable on phones. */}
      <div className="m-auto w-full min-w-0 max-w-2xl">
        <AsciiFrame title="NEUES SPIEL · KAMPAGNE" variant="info">
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between border-b border-terminal-border pb-3 text-xs tracking-[0.18em] text-terminal-green-dim">
              <span>KAMPAGNE AUSWÄHLEN</span>
              <span>SIM-BOOT / 02</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {campaigns.map((campaign, index) => {
                const selected = selectedIndex === index;
                return (
                  <button
                    key={campaign.id}
                    ref={(element) => { optionRefs.current[index] = element; }}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(campaign.id)}
                    onMouseEnter={() => selectOption(index)}
                    onFocus={() => selectOption(index)}
                    className={`group relative min-h-52 overflow-hidden border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-terminal-green focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                      selected
                        ? 'border-terminal-green bg-terminal-green/10'
                        : 'border-terminal-border bg-black/20 hover:border-terminal-info hover:bg-terminal-info/5'
                    }`}
                  >
                    <div className="absolute right-3 top-1 font-mono text-5xl font-bold text-terminal-green/10">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="relative flex h-full flex-col">
                      <div className="mb-5 text-[0.65rem] tracking-[0.2em] text-terminal-info">
                        {campaign.menu.eyebrow}
                      </div>
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <h2 className="text-lg font-bold text-terminal-green">
                          {selected ? '> ' : ''}{campaign.title}
                        </h2>
                        {campaign.menu.badge && (
                          <span className={`shrink-0 border px-1.5 py-0.5 text-[0.6rem] tracking-wider ${campaign.menu.badgeClass ?? ''}`}>
                            {campaign.menu.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed text-terminal-green-dim">
                        {campaign.menu.description}
                      </p>
                      <div className="mt-auto border-t border-terminal-border/70 pt-3 text-xs text-terminal-green-muted">
                        {campaign.menu.meta}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* flex-wrap + gap: on a phone the hint text and the [ESC] control
                don't fit on one line — without wrapping the button is pushed
                past the right edge and scrolls the page sideways. */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-terminal-border pt-3 text-xs text-terminal-green-dim">
              <span>[↑↓] Auswahl · [Enter] Bestätigen</span>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 border border-terminal-border px-3 py-1 hover:border-terminal-green focus-visible:ring-2 focus-visible:ring-terminal-green"
              >
                [ESC] Zurück
              </button>
            </div>
          </div>
        </AsciiFrame>
      </div>
    </div>
  );
}
