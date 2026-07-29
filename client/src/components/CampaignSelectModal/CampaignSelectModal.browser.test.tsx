import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignSelectModal } from './index';
import { listVisibleCampaigns } from '../../content/campaigns';
import { trackCampaignUnlocked } from '../../engine/telemetry';

// The unlock is the one moment worth measuring — mocked here so the test asserts
// the call instead of a network POST.
vi.mock('../../engine/telemetry', () => ({ trackCampaignUnlocked: vi.fn() }));

const PLAYER = 'picker-player';
/** What the modal shows before anything is unlocked — just the open campaign. */
const visible = listVisibleCampaigns();

/** Types the secret code into the window, the way a player would. */
async function enterCode(user: ReturnType<typeof userEvent.setup>, code = 'trick17') {
  await user.keyboard(code);
}

function renderModal(props: Partial<Parameters<typeof CampaignSelectModal>[0]> = {}) {
  return render(
    <CampaignSelectModal
      playerId={PLAYER}
      onSelect={props.onSelect ?? vi.fn()}
      onClose={props.onClose ?? vi.fn()}
    />
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(trackCampaignUnlocked).mockClear();
});
afterEach(() => localStorage.clear());

describe('CampaignSelectModal', () => {
  it('lists every visible campaign with its own copy, first one preselected', () => {
    renderModal();

    expect(screen.getByRole('dialog', { name: 'Kampagne wählen' })).toHaveAttribute('aria-modal', 'true');
    for (const campaign of visible) {
      const option = screen.getByRole('button', { name: new RegExp(campaign.title) });
      // Copy is campaign-owned — the modal must not hold per-campaign text.
      expect(option).toHaveTextContent(campaign.menu.meta);
      expect(option).toHaveTextContent(campaign.menu.eyebrow);
    }
    const first = screen.getByRole('button', { name: new RegExp(visible[0].title) });
    expect(first).toHaveAttribute('aria-pressed', 'true');
    expect(first).toHaveFocus();
  });

  it('offers only Die Probezeit to a normal player — AUDIT TRAIL is not in the DOM', () => {
    renderModal();

    expect(visible.map((c) => c.id)).toEqual(['probation']);
    expect(screen.getByRole('button', { name: /Die Probezeit/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Audit Trail/ })).not.toBeInTheDocument();
    // Nothing may hint at the secret: no code, no "geheim", no teaser card.
    const dialog = screen.getByRole('dialog', { name: 'Kampagne wählen' });
    expect(dialog).not.toHaveTextContent(/trick17/i);
    expect(dialog).not.toHaveTextContent(/GEHEIM/i);
    expect(dialog).not.toHaveTextContent(/Audit/i);
  });

  it('typing the secret code reveals AUDIT TRAIL, selects it and confirms the unlock', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderModal({ onSelect });

    await enterCode(user);

    const auditTrail = await screen.findByRole('button', { name: /Audit Trail/ });
    expect(auditTrail).toHaveTextContent('GEHEIM');
    // The reveal hands over selection AND focus, so Enter starts it right away.
    expect(auditTrail).toHaveAttribute('aria-pressed', 'true');
    expect(auditTrail).toHaveFocus();
    expect(screen.getByText(/ACCESS GRANTED · AUDIT TRAIL ENTSPERRT/)).toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('audit-trail');
  });

  it('tolerates typos in front of the code, and ignores a wrong one silently', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.keyboard('quatsch');
    expect(screen.queryByRole('button', { name: /Audit Trail/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/ACCESS GRANTED/)).not.toBeInTheDocument();
    // Still nothing persisted — a wrong guess must not half-unlock anything.
    expect(localStorage.getItem(`kritis_unlocks_${PLAYER}`)).toBeNull();

    // The buffer matches on its end, so the stray keys above don't spoil it.
    await enterCode(user, 'TRICK17');
    expect(await screen.findByRole('button', { name: /Audit Trail/ })).toBeInTheDocument();
  });

  it('the unlock persists for that player and survives a remount', async () => {
    const user = userEvent.setup();
    const firstVisit = renderModal();
    await enterCode(user);
    await screen.findByRole('button', { name: /Audit Trail/ });
    firstVisit.unmount();

    renderModal();
    // Already unlocked: card is there without typing anything…
    expect(screen.getByRole('button', { name: /Audit Trail/ })).toBeInTheDocument();
    // …and the one-off confirmation line does NOT come back.
    expect(screen.queryByText(/ACCESS GRANTED/)).not.toBeInTheDocument();
    // Probation keeps the initial selection for the returning player.
    expect(screen.getByRole('button', { name: /Die Probezeit/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('reports the unlock exactly once — the find, not every later visit', async () => {
    const user = userEvent.setup();
    const firstVisit = renderModal();

    await enterCode(user);
    await screen.findByRole('button', { name: /Audit Trail/ });
    expect(trackCampaignUnlocked).toHaveBeenCalledExactlyOnceWith(PLAYER, 'audit-trail');

    // Re-typing a code the player already owns is not a new find…
    await enterCode(user);
    expect(trackCampaignUnlocked).toHaveBeenCalledOnce();

    // …and neither is coming back to the picker later.
    firstVisit.unmount();
    renderModal();
    await enterCode(user);
    expect(trackCampaignUnlocked).toHaveBeenCalledOnce();
  });

  it('does not report anything for a wrong code', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.keyboard('trick18');

    expect(trackCampaignUnlocked).not.toHaveBeenCalled();
  });

  it('the unlock belongs to one player only', async () => {
    const user = userEvent.setup();
    const firstVisit = renderModal();
    await enterCode(user);
    await screen.findByRole('button', { name: /Audit Trail/ });
    firstVisit.unmount();

    render(<CampaignSelectModal playerId="someone-else" onSelect={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /Audit Trail/ })).not.toBeInTheDocument();
  });

  it('starts the highlighted campaign with Enter', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderModal({ onSelect });

    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith('probation');
  });

  it('arrow keys move the selection and Enter starts THAT campaign', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderModal({ onSelect });
    await enterCode(user); // two cards to move between

    await user.keyboard('{ArrowDown}');
    const probation = screen.getByRole('button', { name: /Die Probezeit/ });
    expect(probation).toHaveFocus();
    expect(probation).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('probation');
  });

  it('arrow selection wraps around the list', async () => {
    const user = userEvent.setup();
    renderModal();
    await enterCode(user);
    const campaigns = ['Die Probezeit', 'Audit Trail'];

    // Start from the top of the list, wherever the reveal left the focus.
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: new RegExp(campaigns[0]) })).toHaveFocus();
    // Up from the first entry lands on the last one.
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('button', { name: new RegExp(campaigns[campaigns.length - 1]) })).toHaveFocus();
  });

  it('traps focus inside the modal', async () => {
    const user = userEvent.setup();
    renderModal();

    for (let i = 0; i < visible.length; i++) await user.tab();
    expect(screen.getByRole('button', { name: /Zurück/ })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: new RegExp(visible[0].title) })).toHaveFocus();
  });

  it('keeps focus and selection across a parent re-render', async () => {
    // onSelect/onClose are created inline by App, so every parent re-render
    // hands this component new callbacks. That must not reset the highlight
    // (and yank focus) back to the first campaign mid-interaction.
    const user = userEvent.setup();
    const { rerender } = renderModal();
    await enterCode(user);

    const auditTrail = screen.getByRole('button', { name: /Audit Trail/ });
    expect(auditTrail).toHaveFocus();

    rerender(<CampaignSelectModal playerId={PLAYER} onSelect={vi.fn()} onClose={vi.fn()} />);

    expect(auditTrail).toHaveFocus();
    expect(auditTrail).toHaveAttribute('aria-pressed', 'true');
  });

  it('the overlay scrolls instead of clipping tall content', () => {
    renderModal();

    const dialog = screen.getByRole('dialog', { name: 'Kampagne wählen' });
    // Scroll container…
    expect(dialog).toHaveClass('overflow-y-auto');
    // …centred by auto margins, NOT by items-center: auto margins collapse to
    // 0 when the card is taller than the viewport, keeping the top reachable.
    expect(dialog).not.toHaveClass('items-center');
    expect(dialog.firstElementChild).toHaveClass('m-auto');
  });

  it('goes back to the experience picker with Escape', () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
