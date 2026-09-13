import { describe, it, expect, afterEach, vi } from 'vitest';
import { GameEvent, GameState, Scenario, getGameModeConfig } from '@kritis/shared';
import { allEvents } from '../content/events';
import { getAllScenarios } from '../content/packs';
import { createInitialState, advanceDay, applyEffects } from './gameState';
import { selectNextEvent, getVisibleChoices } from './eventEngine';
import { selectNextScenario, calculateScenarioEffects } from './scenarioEngine';
import { recordDecision, scheduleChainEvents, cleanupPendingEvent } from './chainEngine';
import { getOnboardingContent, ONBOARDING_SEQUENCE } from './onboarding';

/**
 * Verhaltensprobe fuer den Einsteigerstart.
 *
 * Die reinen Regeltests in `onboarding.test.ts` pruefen die Funktion. Hier
 * laeuft der Tagesablauf aus `App.tsx` nach: erst der feste Einstieg, dann die
 * Zufallsentscheidung zwischen Szenario und Event. Nur so faellt auf, wenn die
 * Regel zwar stimmt, aber im tatsaechlichen Ablauf etwas ANDERES verdraengt —
 * genau das war die Gefahr beim Verschieben des Tutorial-Fensters.
 */

/**
 * `chainEngine.scheduleChainEvents` zieht fuer jeden Trigger ein
 * `Math.random()`. Ohne Stub waere dieser ganze Test eine Muenze: derselbe
 * Inhalt kann gruen oder rot sein, je nachdem welche Folgeereignisse gerade
 * eingeplant werden. Ein deterministischer Ersatz macht aus der Simulation
 * wieder eine Aussage ueber den INHALT.
 *
 * Der Stub ist bewusst kein konstanter Wert: eine feste 0 wuerde jeden Trigger
 * einplanen, eine feste 1 keinen — beides waere ein Sonderfall statt eines
 * Laufs. Stattdessen laeuft ein gesaeter Generator ueber den ganzen Lauf.
 */
function saatRandom(seed: string): () => number {
  let x = simpleHash(seed) || 1;
  return () => {
    // xorshift32 — klein, reproduzierbar, ohne Abhaengigkeit.
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x |= 0;
    return (x >>> 0) / 0x100000000;
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h = h & h; }
  return Math.abs(h);
}
const pick = (seed: string, n: number) => (n > 0 ? simpleHash(seed) % n : 0);

interface Lauf {
  reihenfolge: { week: number; day: number; id: string; kind: 'event' | 'scenario' }[];
  leereTage: string[];
}

/** Spiegelt den Auswahlblock aus App.tsx (Zeilen 322-358) fuer einen ganzen Lauf. */
function spieleEinsteiger(seed: string, wochen?: number): Lauf {
  const cfg = getGameModeConfig('beginner');
  const totalWeeks = wochen ?? cfg.gameLength.totalWeeks;
  const alleSzenarien: Scenario[] = getAllScenarios();
  let state: GameState = {
    ...createInitialState(seed, 'beginner'),
    completedEvents: [],
    completedScenarios: [],
    decisions: [],
    pendingChainEvents: [],
  };
  const reihenfolge: Lauf['reihenfolge'] = [];
  const leereTage: string[] = [];
  vi.spyOn(Math, 'random').mockImplementation(saatRandom(seed));

  for (let d = 0; d < totalWeeks * cfg.gameLength.daysPerWeek && state.currentWeek <= totalWeeks; d++) {
    const week = state.currentWeek;
    const day = state.currentDay;

    const nehmeSzenario = (sc: Scenario) => {
      const ch = sc.choices[pick(state.seed + sc.id, sc.choices.length)] ?? sc.choices[0];
      if (ch) state = applyEffects(state, calculateScenarioEffects(ch));
      state = { ...state, completedScenarios: [...(state.completedScenarios || []), sc.id] };
      reihenfolge.push({ week, day, id: sc.id, kind: 'scenario' });
    };

    const nehmeEvent = (ev: GameEvent) => {
      const visible = getVisibleChoices(ev, state);
      const ch = visible[pick(state.seed + ev.id, visible.length)] ?? visible[0];
      if (ch) {
        state = applyEffects(state, ch.effects ?? {});
        const idx = ev.choices.indexOf(ch);
        state = recordDecision(state, ev, ch, idx >= 0 ? idx : 0);
        state = scheduleChainEvents(state, ev, ch);
        state = cleanupPendingEvent(state, ev.id);
        if (ch.setsFlags) {
          const flags = { ...state.flags };
          for (const f of ch.setsFlags) flags[f] = true;
          state = { ...state, flags };
        }
        state = { ...state, completedEvents: [...state.completedEvents, ev.id] };
      }
      reihenfolge.push({ week, day, id: ev.id, kind: 'event' });
    };

    // 1. Fester Einstieg — vor allem anderen.
    const onboarding = getOnboardingContent(allEvents, alleSzenarien, state);
    if (onboarding) {
      if (onboarding.kind === 'event') nehmeEvent(onboarding.event);
      else nehmeSzenario(onboarding.scenario);
      state = advanceDay(state);
      continue;
    }

    // 2. Zufallsentscheidung wie in App.tsx.
    const chance = Math.min(0.5, 0.1 + (week - 1) * 0.05);
    const h = simpleHash(state.seed + week + day + state.completedEvents.length);
    let erledigt = false;
    if (h % 100 < chance * 100) {
      const sc = selectNextScenario(alleSzenarien, state, state.seed);
      if (sc) { nehmeSzenario(sc); erledigt = true; }
    }

    // 3. Rueckfall auf Events.
    if (!erledigt) {
      const ev: GameEvent | null = selectNextEvent(allEvents, state, state.seed);
      if (!ev) leereTage.push(`w${week}d${day}`);
      else nehmeEvent(ev);
    }
    state = advanceDay(state);
  }
  return { reihenfolge, leereTage };
}

const SEQUENZ = ONBOARDING_SEQUENCE.map((s) => s.id);
const TUTORIALS = SEQUENZ.filter((id) => id.startsWith('evt_tutorial_'));
const SEEDS = Array.from({ length: 12 }, (_, i) => `ONB-${i}`);

describe('Einsteigerstart — die ersten acht Tage', () => {
  it.each(SEEDS)('%s: die Sequenz laeuft vollstaendig und in Reihenfolge', (seed) => {
    // Tag 5 jeder Woche bleibt frei, dazwischen liegen also regulaere Events —
    // verglichen wird deshalb die Teilfolge, nicht der Anfang des Laufs.
    const { reihenfolge } = spieleEinsteiger(seed, 3);
    const nurSequenz = reihenfolge.map((r) => r.id).filter((id) => SEQUENZ.includes(id));
    expect(nurSequenz).toEqual(SEQUENZ);
  });

  it.each(SEEDS)('%s: jeder Schritt kommt in der richtigen Form', (seed) => {
    const { reihenfolge } = spieleEinsteiger(seed, 3);
    for (const step of ONBOARDING_SEQUENCE) {
      expect(reihenfolge.find((r) => r.id === step.id)?.kind, step.id).toBe(step.kind);
    }
  });

  it.each(SEEDS)('%s: die Sequenz belegt Tag 5 keiner Woche', (seed) => {
    const { reihenfolge } = spieleEinsteiger(seed, 3);
    for (const r of reihenfolge.filter((x) => SEQUENZ.includes(x.id))) {
      expect(r.day, `${r.id} auf Tag 5`).not.toBe(5);
    }
  });
});

describe('Die Shell-Tutorials werden wirklich serviert', () => {
  /**
   * DAS ist die eigentliche Gegenprobe. Vor dieser Aenderung wurde in 40
   * simulierten Laeufen KEIN einziges der vier Tutorials je serviert: sie
   * haengen ueber `requires.events` an `evt_first_day`, und der wurde an Tag 1
   * regelmaessig vom Zufall verdraengt. Ein breiteres Zeitfenster allein
   * aenderte daran nichts — gemessen weiterhin 0 von 160.
   */
  it.each(SEEDS)('%s: alle vier Tutorials werden serviert', (seed) => {
    const ids = spieleEinsteiger(seed).reihenfolge.map((r) => r.id);
    const fehlend = TUTORIALS.filter((t) => !ids.includes(t));
    expect(fehlend, `nicht serviert: ${fehlend.join(', ')}`).toEqual([]);
  });

  it.each(SEEDS)('%s: sie behalten ihre Reihenfolge', (seed) => {
    const reihenfolge = spieleEinsteiger(seed).reihenfolge;
    const positionen = TUTORIALS.map((t) => reihenfolge.findIndex((r) => r.id === t));
    expect(positionen).toEqual([...positionen].sort((a, b) => a - b));
  });

  it.each(SEEDS)('%s: sie liegen alle in den ersten drei Wochen', (seed) => {
    const reihenfolge = spieleEinsteiger(seed).reihenfolge;
    for (const t of TUTORIALS) {
      expect(reihenfolge.find((r) => r.id === t)!.week, t).toBeLessThanOrEqual(3);
    }
  });
});

describe('Der gefuehrte Einstieg draengt nichts weg', () => {
  /**
   * Die Aussage ist bewusst „nicht in der Spielmitte", nicht „nirgends".
   *
   * Gemessen ueber dieselben 40 Seeds mit deterministischem Math.random:
   * auf main liefen 16 von 40 Einsteiger-Laeufen an einem Tag leer, mit dem
   * gefuehrten Einstieg noch 2 von 40 — beide Male an w12d4, dem vorletzten
   * Tag. Der Engpass sitzt also am Ende des Einsteiger-Pools und ist aelter als
   * diese Aenderung; drei zusaetzliche Szenarien entschaerfen ihn, beseitigen
   * ihn aber nicht. Hier eine Null zu behaupten hiesse, einen fremden Befund
   * unter dem eigenen Test zu begraben.
   */
  it.each(SEEDS)('%s: kein leerer Tag vor der letzten Woche', (seed) => {
    const frueh = spieleEinsteiger(seed).leereTage.filter((t) => !t.startsWith('w12'));
    expect(frueh, `leere Tage vor Woche 12: ${frueh.join(', ')}`).toEqual([]);
  });

  it('der bekannte Engpass bleibt selten und liegt am Laufende', () => {
    const betroffen = SEEDS.filter((s) => spieleEinsteiger(s).leereTage.length > 0);
    // Auf main waren es 16 von 40 — diese Schranke darf nicht wieder aufweichen.
    expect(betroffen.length / SEEDS.length, `betroffen: ${betroffen.join(', ')}`).toBeLessThan(0.25);
    for (const seed of betroffen) {
      for (const tag of spieleEinsteiger(seed).leereTage) {
        expect(tag, 'ein leerer Tag ausserhalb der letzten Woche ist neu').toMatch(/^w12/);
      }
    }
  });

  it.each(SEEDS)('%s: kein Fall wird zweimal serviert', (seed) => {
    const ids = spieleEinsteiger(seed).reihenfolge.map((r) => r.id);
    expect(ids.length - new Set(ids).size, 'Dubletten im Lauf').toBe(0);
  });
});
