import { describe, it, expect } from 'vitest';
import { guiLevelEvents } from '../content/events/gui-levels';
import { allEvents } from '../content/events';
import { getAvailableEvents } from './eventEngine';
import { createInitialState } from './gameState';
import { GameState } from '@kritis/shared';

/**
 * gui_eventviewer_cert_expiry: a detect-and-report Event Viewer level. The
 * server is up (no service-crash event), monitoring is green, but a TLS cert
 * expires tonight. The skill is reading CN/expiry and reporting the right
 * event — not chasing the loud red error or the unrelated second warning.
 */
const ID = 'gui_eventviewer_cert_expiry';
const level = guiLevelEvents.find((e) => e.id === ID)!;

describe(`GUI level: ${ID}`, () => {
  it('is a learning Event Viewer level gated on the DNS split-brain lesson', () => {
    expect(level, `${ID} must be authored in gui-levels.ts`).toBeDefined();
    expect(level.requiredModes).toContain('learning');
    expect(level.requires?.events).toContain('learn_adv_dns_splitbrain');
    expect(level.guiContext?.app).toBe('eventviewer');
  });

  it('wins only by reporting the cert-expiry event', () => {
    const sol = level.guiContext!.solutions[0];
    expect(sol.interactions).toEqual(['report:evt-cert-expiry']);
    expect(sol.allRequired).toBe(true);
  });

  it('the reported entry is the cert warning; there is no service-crash decoy that is also a warning', () => {
    const entries = level.guiContext!.state.eventViewer!.entries;
    const answer = entries.find((e) => e.id === 'evt-cert-expiry')!;
    expect(answer, 'the cert-expiry entry must exist').toBeDefined();
    expect(answer.level).toBe('Warnung');
    expect(answer.source).toContain('CertificateServicesClient');
    expect(answer.message).toContain('portal.stadt.local');

    // The puzzle needs real decoys: at least one loud error and a SECOND
    // warning, so "report the only warning" can't brute-force it.
    expect(entries.some((e) => e.level === 'Fehler')).toBe(true);
    const warnings = entries.filter((e) => e.level === 'Warnung');
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });

  it('the first hint does not name the answer host + report action', () => {
    const first = level.guiContext!.hints[0];
    const givesItAway = /portal\.stadt\.local/.test(first) && /melde/i.test(first);
    expect(givesItAway, `first hint gives away the answer: "${first}"`).toBe(false);
  });

  it('is reachable in learning mode only after the DNS split-brain lesson', () => {
    const base = createInitialState('SEED', 'learning');
    // Not yet unlocked: the DNS split-brain prereq (learn_adv_dns_splitbrain) is missing.
    const before: GameState = {
      ...base,
      completedEvents: ['learn_04_grep_hunter', 'learn_08_network_recon'],
    };
    expect(getAvailableEvents(allEvents, before).map((e) => e.id)).not.toContain(ID);
    // Full transitive chain: learn_04_grep_hunter ← learn_08_network_recon ← learn_adv_dns_splitbrain.
    const after: GameState = {
      ...base,
      completedEvents: ['learn_04_grep_hunter', 'learn_08_network_recon', 'learn_adv_dns_splitbrain'],
    };
    expect(getAvailableEvents(allEvents, after).map((e) => e.id)).toContain(ID);
  });
});
