import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignSelectModal } from './index';
import { listCampaigns } from '../../content/campaigns';

const campaigns = listCampaigns();

describe('CampaignSelectModal', () => {
  it('lists every registered campaign with its own copy, first one preselected', () => {
    render(<CampaignSelectModal onSelect={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Kampagne wählen' })).toHaveAttribute('aria-modal', 'true');
    for (const campaign of campaigns) {
      const option = screen.getByRole('button', { name: new RegExp(campaign.title) });
      // Copy is campaign-owned — the modal must not hold per-campaign text.
      expect(option).toHaveTextContent(campaign.menu.meta);
      expect(option).toHaveTextContent(campaign.menu.eyebrow);
    }
    const first = screen.getByRole('button', { name: new RegExp(campaigns[0].title) });
    expect(first).toHaveAttribute('aria-pressed', 'true');
    expect(first).toHaveFocus();
  });

  it('offers both WARM campaigns — the second one is AUDIT TRAIL', () => {
    render(<CampaignSelectModal onSelect={vi.fn()} onClose={vi.fn()} />);

    expect(campaigns.map((c) => c.id)).toEqual(['probation', 'audit-trail']);
    expect(screen.getByRole('button', { name: /Die Probezeit/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Audit Trail/ })).toBeInTheDocument();
  });

  it('starts the highlighted campaign with Enter', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<CampaignSelectModal onSelect={onSelect} onClose={vi.fn()} />);

    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith('probation');
  });

  it('arrow keys move the selection and Enter starts THAT campaign', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<CampaignSelectModal onSelect={onSelect} onClose={vi.fn()} />);

    await user.keyboard('{ArrowDown}');
    const auditTrail = screen.getByRole('button', { name: /Audit Trail/ });
    expect(auditTrail).toHaveFocus();
    expect(auditTrail).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('audit-trail');
  });

  it('arrow selection wraps around the list', async () => {
    const user = userEvent.setup();
    render(<CampaignSelectModal onSelect={vi.fn()} onClose={vi.fn()} />);

    // Up from the first entry lands on the last one.
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('button', { name: new RegExp(campaigns[campaigns.length - 1].title) })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: new RegExp(campaigns[0].title) })).toHaveFocus();
  });

  it('traps focus inside the modal', async () => {
    const user = userEvent.setup();
    render(<CampaignSelectModal onSelect={vi.fn()} onClose={vi.fn()} />);

    for (let i = 0; i < campaigns.length; i++) await user.tab();
    expect(screen.getByRole('button', { name: /Zurück/ })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: new RegExp(campaigns[0].title) })).toHaveFocus();
  });

  it('goes back to the experience picker with Escape', () => {
    const onClose = vi.fn();
    render(<CampaignSelectModal onSelect={vi.fn()} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
