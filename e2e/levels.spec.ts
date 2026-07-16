import { test, expect, Page } from '@playwright/test';
import { learningPathEvents } from '../client/src/content/events/learning-path';
import { blackoutEvents } from '../client/src/content/events/blackout';
import { guiLevelEvents } from '../client/src/content/events/gui-levels';
import { LEARNING_TRACKS } from '../client/src/content/events/learning-tracks';
import type { GameEvent } from '@kritis/shared';

/**
 * Per-level e2e proof: every learning-track level (CLI, GUI, Blackout) can be
 * reached via the Learning Hub and solved with its intended interaction.
 *
 * Each test seeds an autosave where every OTHER level is complete, so the
 * target level is the unlocked "next" step of its track. It then plays the
 * level for real: hub → level card → Aufgabe starten → solve in xterm or the
 * Windows app → result screen → back to hub, and finally asserts the level id
 * landed in the persisted autosave's completedEvents.
 */

const PLAYER_ID = 'player-e2e-levels';

const eventById = new Map<string, GameEvent>(
  [...learningPathEvents, ...blackoutEvents, ...guiLevelEvents].map((e) => [e.id, e])
);

const ALL_LEVEL_IDS = LEARNING_TRACKS.flatMap((t) => t.levels.map((l) => l.eventId));

// ── CLI solution derivation ──────────────────────────────────────────────────
// Exact port of the beat matcher in useTerminal.ts:390-397 (first match wins,
// patternRegex preferred, else startsWith). Used to derive, per level, the
// command sequence a player types to solve it — and to fail loudly if a beat
// is shadowed.

type Beat = {
  pattern: string;
  patternRegex?: string;
  teachesCommand?: string;
  isSolution?: boolean;
};
type TerminalCtx = {
  commands?: Beat[];
  solutions?: { commands: string[]; allRequired?: boolean }[];
};

function matchBeat(beats: Beat[], trimmed: string): Beat | null {
  for (const cmd of beats) {
    const matches = cmd.patternRegex
      ? new RegExp(cmd.patternRegex).test(trimmed)
      : trimmed.startsWith(cmd.pattern) || trimmed === cmd.pattern;
    if (matches) return cmd;
  }
  return null;
}

function deriveCliSolution(ctx: TerminalCtx): string[] {
  const beats = ctx.commands ?? [];
  // Path A: a beat flagged isSolution — typing its pattern must route to it.
  for (const beat of beats.filter((b) => b.isSolution)) {
    if (matchBeat(beats, beat.pattern) === beat) return [beat.pattern];
  }
  // Path B: multi-step solutions[] — collect beats teaching each required command.
  for (const sol of ctx.solutions ?? []) {
    const typed: string[] = [];
    const teached = new Set<string>();
    let ok = true;
    for (const want of sol.commands) {
      const beat = beats.find((b) => b.pattern === want || b.teachesCommand === want);
      if (!beat || matchBeat(beats, beat.pattern) !== beat) { ok = false; break; }
      typed.push(beat.pattern);
      teached.add(beat.pattern);
      if (beat.teachesCommand) teached.add(beat.teachesCommand);
      if (!sol.allRequired) break;
    }
    const met = sol.allRequired
      ? sol.commands.every((c) => teached.has(c))
      : sol.commands.some((c) => teached.has(c));
    if (ok && met) return typed;
  }
  throw new Error('no reachable solution derived — beat shadowed or solutions unmatched');
}

// ── GUI interaction scripts ──────────────────────────────────────────────────
// One entry per GUI level: what to click inside the Windows app to solve it.
// row = click the row containing this exact text; button/switch = by role+name.

type GuiStep =
  | { row: string }
  | { button: RegExp }
  | { switch: string };

const GUI_ACTIONS: Record<string, GuiStep[]> = {
  gui_taskmanager_rogue: [{ row: 'xmr-stak-rx.exe' }, { button: /Task beenden/i }],
  gui_taskmanager_doppelganger: [{ row: 'scvhost.exe' }, { button: /Task beenden/i }],
  gui_eventviewer_bruteforce: [
    { row: '21.06.2026 03:17:42' },
    { button: /Als Vorfall melden/i },
  ],
  gui_eventviewer_persistence: [
    { row: '21.06.2026 03:23:55' },
    { button: /Als Vorfall melden/i },
  ],
  gui_eventviewer_cert_expiry: [
    { row: '22.06.2026 06:00:03' },
    { button: /Als Vorfall melden/i },
  ],
  gui_uac_unsigned_exe: [{ button: /^Nein$/ }],
  gui_uac_legit_install: [{ button: /^Ja$/ }],
  gui_settings_reharden: [
    { switch: 'Echtzeitschutz' },
    { switch: 'Domänennetzwerk-Firewall' },
    { switch: 'Manipulationsschutz' },
  ],
  gui_explorer_open_share: [{ row: 'Jeder' }, { button: /Entfernen/i }],
  gui_explorer_auth_users: [
    { row: 'Authentifizierte Benutzer' },
    { button: /Entfernen/i },
  ],
  blk_c1_logread: [{ row: '23.06.2026 01:16:02' }, { button: /Als Vorfall melden/i }],
  blk_c1_hunt_gui: [{ row: 'svch0st.exe' }, { button: /Task beenden/i }],
  blk_c3_firewall: [
    { button: /Blockieren: SSH\/RDP von extern/ },
    { button: /Isolieren: SCADA/ },
  ],
};

// ── App driving helpers ──────────────────────────────────────────────────────

async function seedLearningSave(page: Page, completedEvents: string[]) {
  const envelope = {
    version: 1,
    updatedAt: '2026-07-16T10:00:00.000Z',
    gameState: {
      currentWeek: 1,
      currentDay: 1,
      // High skills so no choice is gated/hidden by skill requirements.
      skills: {
        netzwerk: 60, linux: 60, windows: 60,
        security: 60, troubleshooting: 60, softSkills: 60,
      },
      relationships: { chef: 10, gf: 0, kaemmerer: 0, fachabteilung: 0, kollegen: 15 },
      stress: 10,
      budget: 15000,
      compliance: 50,
      activeEvents: [],
      completedEvents,
      completedScenarios: [],
      flags: {},
      unlockedCommands: ['help', 'ls', 'cd', 'pwd'],
      terminalHistory: [],
      seed: 'KRITIS-E2E',
      runNumber: 1,
      gameMode: 'learning',
      isStoryMode: false,
      learningState: {},
      decisions: [],
      pendingChainEvents: [],
      mentorModeEnabled: true,
    },
  };
  await page.addInitScript(
    ([id, env]) => {
      localStorage.setItem('kritis_player_id', id);
      localStorage.setItem('kritis_seen_intro', '1');
      localStorage.setItem('kritis_name_skipped', '1');
      localStorage.setItem(`kritis_autosave_${id}`, env);
    },
    [PLAYER_ID, JSON.stringify(envelope)] as const
  );
}

/** Menu → resume → hub → open the target level's event card → start the task. */
async function openLevelTask(page: Page, ev: GameEvent) {
  await page.goto('/');
  await page.getByText('WEITER SPIELEN').click();
  await expect(page.getByText('Lernpfad').first()).toBeVisible({ timeout: 5000 });

  // The recommended-CTA button also contains the title — exclude it.
  const levelButton = page
    .getByRole('button')
    .filter({ hasText: ev.title })
    .filter({ hasNotText: 'empfohlene' })
    .first();
  await levelButton.click();

  // Hands-on cards render a single "Aufgabe starten" CTA; decision cards
  // render the numbered choice list — accept either.
  const task = ev.choices?.find((c) => c.terminalCommand || (c as { guiCommand?: boolean }).guiCommand);
  const start = page
    .getByRole('button', { name: 'Aufgabe starten' })
    .or(page.getByRole('button', { name: (task?.text ?? '').slice(0, 30) }))
    .first();
  await start.click({ timeout: 10000 });
}

/** Type the solution commands into xterm, then Enter through to the result screen. */
async function solveCli(page: Page, commands: string[]) {
  const term = page.locator('.xterm');
  await expect(term).toBeVisible({ timeout: 5000 });
  await term.click();
  for (const cmd of commands) {
    await page.keyboard.type(cmd);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600); // let scripted output finish streaming
  }
  // Solved terminal waits for a confirming Enter; extra Enters on an empty
  // prompt are no-ops, so poll until the result screen's CTA appears.
  const backToHub = page.getByRole('button', { name: /Zurück zum Lernpfad/i });
  for (let i = 0; i < 20; i++) {
    if (await backToHub.isVisible().catch(() => false)) return;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  }
  await expect(backToHub).toBeVisible();
}

/** Click through the Windows-app interaction script until the success overlay fires. */
async function solveGui(page: Page, steps: GuiStep[]) {
  for (const step of steps) {
    if ('row' in step) {
      // Listbox apps (TaskManager/Explorer) expose rows as options whose
      // accessible name includes suffixes (permission, ⚠); EventViewer rows
      // are plain cells — match whichever exists.
      await page
        .getByRole('option', { name: step.row })
        .or(page.getByText(step.row, { exact: true }))
        .first()
        .click({ timeout: 10000 });
    } else if ('button' in step) {
      await page.getByRole('button', { name: step.button }).first().click({ timeout: 10000 });
    } else {
      await page.getByRole('switch', { name: step.switch }).click({ timeout: 10000 });
    }
  }
  await expect(page.getByText(/Aufgabe abgeschlossen/i)).toBeVisible({ timeout: 5000 });
  // Success overlay auto-advances to the result screen after ~1.6s.
  const backToHub = page.getByRole('button', { name: /Zurück zum Lernpfad/i });
  await expect(backToHub).toBeVisible({ timeout: 10000 });
}

/** Return to the hub and assert the level landed in the persisted autosave. */
async function assertCompleted(page: Page, levelId: string) {
  await page.getByRole('button', { name: /Zurück zum Lernpfad/i }).click();
  await expect(page.getByText('Lernpfad').first()).toBeVisible({ timeout: 5000 });
  await expect
    .poll(
      async () =>
        page.evaluate((id) => {
          const raw = localStorage.getItem(`kritis_autosave_${id}`);
          if (!raw) return [];
          return JSON.parse(raw).gameState.completedEvents as string[];
        }, PLAYER_ID),
      { timeout: 5000 }
    )
    .toContain(levelId);
}

// ── The suite: one test per learning-track level ─────────────────────────────

for (const track of LEARNING_TRACKS) {
  test.describe(`Track ${track.id}`, () => {
    for (const lvl of track.levels) {
      const ev = eventById.get(lvl.eventId);
      test(`${lvl.eventId} — solvable end-to-end`, async ({ page }) => {
        expect(ev, `event ${lvl.eventId} missing from content`).toBeTruthy();
        const event = ev as GameEvent;

        // All other levels done → target is the unlocked next step everywhere
        // (satisfies Foundations gate, per-level requires, finale unlock).
        await seedLearningSave(page, ALL_LEVEL_IDS.filter((id) => id !== lvl.eventId));
        await openLevelTask(page, event);

        const terminalCtx = (event as unknown as { terminalContext?: TerminalCtx }).terminalContext;
        if (terminalCtx) {
          await solveCli(page, deriveCliSolution(terminalCtx));
        } else {
          const steps = GUI_ACTIONS[lvl.eventId];
          expect(steps, `no GUI script for ${lvl.eventId}`).toBeTruthy();
          await solveGui(page, steps);
        }

        await assertCompleted(page, lvl.eventId);
      });
    }
  });
}
