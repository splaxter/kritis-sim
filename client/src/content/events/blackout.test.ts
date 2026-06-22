import { describe, it, expect } from 'vitest';
import { blackoutEvents } from './blackout';
import { allEvents } from './index';
import { LEARNING_TRACKS } from './learning-tracks';
import { GameEvent } from '@kritis/shared';

const byId = new Map(blackoutEvents.map((e) => [e.id, e]));
const get = (id: string): GameEvent => {
  const e = byId.get(id);
  if (!e) throw new Error(`missing blackout event ${id}`);
  return e;
};

// The intended linear order: each level requires the previous one; the first
// gates on the Foundations exit. This is the spine the hub walks.
const CHAIN: [string, string][] = [
  ['blk_c1_logread', 'learn_04_grep_hunter'],
  ['blk_c1_hunt_gui', 'blk_c1_logread'],
  ['blk_c1_hunt_cli', 'blk_c1_hunt_gui'],
  ['blk_c2_jumpserver', 'blk_c1_hunt_cli'],
  ['blk_c3_firewall', 'blk_c2_jumpserver'],
];

describe('Blackout track — structure & gating', () => {
  it('registers all five levels as a single track in order after the others', () => {
    const track = LEARNING_TRACKS.find((t) => t.id === 'blackout');
    expect(track, 'blackout track exists').toBeTruthy();
    expect(track!.levels.map((l) => l.eventId)).toEqual(CHAIN.map(([id]) => id));
    // Sits between the last core track and the finale.
    const finale = LEARNING_TRACKS.find((t) => t.isFinale)!;
    expect(track!.order).toBeLessThan(finale.order);
  });

  it('every level is a hands-on learning modality (terminal OR gui)', () => {
    for (const e of blackoutEvents) {
      expect(e.requiredModes, `${e.id} requiredModes`).toContain('learning');
      expect(!!e.terminalContext || !!e.guiContext, `${e.id} has a modality`).toBe(true);
    }
  });

  it('chains linearly: each level requires its predecessor (track-internal)', () => {
    for (const [id, prereq] of CHAIN) {
      expect(get(id).requires?.events ?? [], `${id} prereq`).toContain(prereq);
    }
  });
});

describe('Blackout track — flag flow', () => {
  it('C1 EventViewer: clean report sets blk_login_found, partial adds blk_sloppy', () => {
    const ev = get('blk_c1_logread');
    expect(ev.choices[0].setsFlags).toContain('blk_login_found');
    const sols = ev.guiContext!.solutions;
    const clean = sols.find((s) => s.interactions.includes('report:evt-proc-svch0st'));
    const partial = sols.find((s) => s.interactions.includes('report:evt-rdp-login'));
    expect(clean, 'clean solution exists').toBeTruthy();
    expect(partial?.setsFlags, 'partial solution flags blk_sloppy').toContain('blk_sloppy');
    // First-match-wins: the precise (clean) solution must precede the partial.
    expect(sols.indexOf(clean!)).toBeLessThan(sols.indexOf(partial!));
  });

  it('C1 Task-Manager: solves on the masqueraded process, real svchost stays critical', () => {
    const ev = get('blk_c1_hunt_gui');
    expect(ev.choices[0].setsFlags).toContain('blk_process_stopped');
    expect(ev.guiContext!.solutions[0].interactions).toContain('endtask:svch0st.exe');
    const procs = ev.guiContext!.state.taskManager!.processes;
    expect(procs.find((p) => p.name === 'svchost.exe')?.critical, 'real svchost protected').toBe(true);
    expect(procs.find((p) => p.name === 'svch0st.exe')?.critical, 'rogue is killable').toBeFalsy();
  });

  it('C1 PowerShell: solving requires removing persistence AND stopping the process', () => {
    const ev = get('blk_c1_hunt_cli');
    expect(ev.choices[0].setsFlags).toContain('blk_persistence_cleared');
    const sol = ev.terminalContext!.solutions[0];
    expect(sol.allRequired).toBe(true);
    expect(sol.commands).toEqual(expect.arrayContaining(['remove-persistence', 'stop-process']));
  });

  it('C2 Jump-Server: kills the attacker session, exposes source IP for C3', () => {
    const ev = get('blk_c2_jumpserver');
    expect(ev.choices[0].setsFlags).toEqual(
      expect.arrayContaining(['blk_attacker_cut', 'blk_source_ip_known'])
    );
    const sol = ev.terminalContext!.solutions[0];
    expect(sol.commands).toContain('kill-session');
  });

  it('C3 Core-Firewall: block + isolate sets solution_firewall_locked; criticals are guarded', () => {
    const ev = get('blk_c3_firewall');
    const gui = ev.guiContext!;
    expect(gui.app).toBe('corefirewall');
    const sol = gui.solutions[0];
    expect(sol.allRequired).toBe(true);
    expect(sol.interactions).toEqual(expect.arrayContaining(['block:atk-inbound', 'isolate:scada-net']));
    expect(sol.setsFlags).toContain('solution_firewall_locked');
    // The two traps: a critical rule and a critical subnet, each with feedback.
    const cf = gui.state.coreFirewall!;
    const critRule = cf.rules.find((r) => r.critical);
    const critSubnet = cf.subnets.find((s) => s.critical);
    expect(critRule?.riskFeedback, 'critical rule has riskFeedback').toBeTruthy();
    expect(critSubnet?.riskFeedback, 'critical subnet has riskFeedback').toBeTruthy();
    // The hostile rule and target subnet referenced by the solution must exist.
    expect(cf.rules.some((r) => r.id === 'atk-inbound' && r.hostile)).toBe(true);
    expect(cf.subnets.some((s) => s.id === 'scada-net')).toBe(true);
  });

  it('blk_sloppy (read by briefingVariants) is produced by a GUI solution upstream', () => {
    // Guards the reactive-framing contract: the firewall/hunt briefingVariants
    // key on blk_sloppy, which only the EventViewer partial solution can set.
    const setters = allEvents
      .filter((e) => e.guiContext)
      .flatMap((e) => e.guiContext!.solutions)
      .flatMap((s) => s.setsFlags ?? []);
    expect(setters).toContain('blk_sloppy');
  });
});
