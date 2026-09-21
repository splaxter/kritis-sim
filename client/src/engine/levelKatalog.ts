import type { GameEvent, GameModeId, GuiContext, Scenario, TerminalContext } from '@kritis/shared';
import { allEvents } from '../content/events';
import { learningPathEvents } from '../content/events/learning-path';
import { blackoutEvents } from '../content/events/blackout';
import { nis2Events } from '../content/events/learning-path-nis2';
import { tutorialEvents } from '../content/events/tutorials';
import { guiLevelEvents } from '../content/events/gui-levels';
import { advancedLearningEvents } from '../content/events/learning-path-advanced';
import { LEARNING_TRACKS } from '../content/events/learning-tracks';
import { getCampaign } from '../content/campaigns';
import { getAllScenarios } from '../content/packs';
import { getAvailableScenarios } from './scenarioEngine';

/**
 * Jedes SPIELBARE Level des Spiels an einer Stelle — mit dem, was man beim
 * Bauen und Prüfen tatsächlich wissen will.
 *
 * Es gab bisher keine solche Liste. Ereignisse, Lernpfad, Kampagnen und Packs
 * registrieren sich getrennt; wer ein bestimmtes Level ansehen wollte, musste
 * es im Spiel erwürfeln — Szenarien kommen frühestens ab Woche 8 und dann
 * gewichtet aus einem Topf von 48. Genau daran ist das Durchspielen bisher
 * gescheitert.
 *
 * `alleTerminalLevel()` in terminalLevelRegistry.ts bleibt bestehen: Sie ist
 * die Grundlage der inhaltlichen Wächter und liefert absichtlich nur
 * Terminal-Level. Dieser Katalog ist die Autorenansicht und nimmt GUI-Level
 * und Zugangsdaten dazu.
 */

export type LevelArt = 'terminal-linux' | 'terminal-windows' | 'gui';

export type LevelQuelle = 'lernpfad' | 'kampagne' | 'pack' | 'ereignis';

/** Wie das Level gewonnen wird — der ehrliche Unterschied zwischen echt und gedost. */
export type Gewinnmodell = 'zustandsziele' | 'befehlsmuster' | 'gui-interaktionen' | 'unklar';

export interface KatalogLevel {
  id: string;
  titel: string;
  art: LevelArt;
  quelle: LevelQuelle;
  /** Track, Kampagne oder Pack, zu dem es gehört — für die Gruppierung. */
  gruppe: string;
  gewinnmodell: Gewinnmodell;
  /** Anzahl Zustandsziele bzw. Interaktionen, als Maß für die Tiefe. */
  bedingungen: number;
  /** Nur Szenarien: Schwierigkeit 1–5, zugleich das Zugangstor. */
  schwierigkeit?: number;
  /** Nur Szenarien: in welchen Modi sie überhaupt gezogen werden können. */
  modi?: GameModeId[];
  /** Nur Szenarien: ab welcher Woche im ersten dieser Modi. */
  abWoche?: number;
  /** Nur Ereignisse: welche Ereignisse vorher abgeschlossen sein müssen. */
  verlangt?: string[];
  /** Felder des Host-Zustands, die das Level sät (Dienste, Firewall, …). */
  hostZustand: string[];
  terminalContext?: TerminalContext;
  guiContext?: GuiContext;
}

const HOST_FELDER = ['services', 'journal', 'firewall', 'nft', 'listeners', 'connections', 'mailboxes'] as const;

const MODI: GameModeId[] = ['beginner', 'learning', 'intermediate', 'hard', 'kritis', 'story'];
const WOCHEN: Record<string, number> = {
  beginner: 12, learning: 12, intermediate: 12, hard: 12, kritis: 24, story: 12,
};

const leererStand = (gameMode: GameModeId, currentWeek: number) =>
  ({
    seed: 'K', runNumber: 1, gameMode, currentWeek, currentDay: 1,
    skills: {}, relationships: {}, stress: 0, budget: 0, compliance: 50,
    activeEvents: [], completedEvents: [], completedScenarios: [],
    flags: {}, unlockedCommands: [], terminalHistory: [], isStoryMode: false,
    decisions: [], pendingChainEvents: [],
  }) as never;

/** In welchen Modi und ab wann ein Szenario überhaupt gezogen werden kann. */
function zugang(s: Scenario, alle: Scenario[]): { modi: GameModeId[]; abWoche?: number } {
  const modi: GameModeId[] = [];
  let frueheste: number | undefined;
  for (const m of MODI) {
    for (let w = 1; w <= WOCHEN[m]; w++) {
      if (getAvailableScenarios(alle, leererStand(m, w)).some((x) => x.id === s.id)) {
        modi.push(m);
        if (frueheste === undefined) frueheste = w;
        break;
      }
    }
  }
  return { modi, abWoche: frueheste };
}

function hostZustandVon(ctx?: TerminalContext): string[] {
  if (!ctx) return [];
  const c = ctx as unknown as Record<string, unknown>;
  return HOST_FELDER.filter((f) => c[f] !== undefined);
}

function terminalModell(ctx: TerminalContext): { modell: Gewinnmodell; bedingungen: number } {
  const ziele = (ctx.solutions ?? []).flatMap((l) => l.stateGoals ?? []);
  if (ziele.length > 0) return { modell: 'zustandsziele', bedingungen: ziele.length };
  const befehle = (ctx.solutions ?? []).flatMap((l) => l.commands ?? []);
  if (befehle.length > 0) return { modell: 'befehlsmuster', bedingungen: befehle.length };
  return { modell: 'unklar', bedingungen: 0 };
}

function guiModell(ctx: GuiContext): { modell: Gewinnmodell; bedingungen: number } {
  const n = (ctx.solutions ?? []).flatMap((l) => l.interactions ?? []).length;
  return { modell: 'gui-interaktionen', bedingungen: n };
}

/** Track eines Lernpfad-Levels, sonst undefined. */
function trackVon(id: string): string | undefined {
  return LEARNING_TRACKS.find((t) => t.levels.some((l) => l.eventId === id))?.title;
}

function ausEreignis(e: GameEvent, quelle: LevelQuelle, gruppe: string): KatalogLevel[] {
  const raus: KatalogLevel[] = [];
  const track = trackVon(e.id);
  const basis = {
    id: e.id,
    titel: e.title,
    quelle: track ? ('lernpfad' as const) : quelle,
    gruppe: track ?? gruppe,
    verlangt: e.requires?.events,
  };
  if (e.terminalContext) {
    const m = terminalModell(e.terminalContext);
    raus.push({
      ...basis,
      art: e.terminalContext.type === 'windows' ? 'terminal-windows' : 'terminal-linux',
      gewinnmodell: m.modell,
      bedingungen: m.bedingungen,
      hostZustand: hostZustandVon(e.terminalContext),
      terminalContext: e.terminalContext,
    });
  }
  if (e.guiContext) {
    const m = guiModell(e.guiContext);
    raus.push({
      ...basis,
      art: 'gui',
      gewinnmodell: m.modell,
      bedingungen: m.bedingungen,
      hostZustand: [],
      guiContext: e.guiContext,
    });
  }
  return raus;
}

/**
 * Der ganze Bestand, entdoppelt und stabil sortiert.
 *
 * Entdoppelt nach `id` + `art`: Ein Ereignis kann ein Terminal UND eine
 * GUI-Aufgabe tragen, und mehrere Sammlungen enthalten dasselbe Ereignis.
 */
export function levelKatalog(): KatalogLevel[] {
  const ereignisse: KatalogLevel[] = [
    ...[...allEvents, ...learningPathEvents, ...advancedLearningEvents, ...blackoutEvents, ...nis2Events, ...tutorialEvents, ...guiLevelEvents]
      .flatMap((e) => ausEreignis(e, 'ereignis', 'Ereignisse')),
    ...(['probation', 'audit-trail', 'kataster'] as const).flatMap((id) => {
      const k = getCampaign(id);
      return [...k.storyEvents, ...k.sidequestEvents].flatMap((e) => ausEreignis(e, 'kampagne', k.title ?? id));
    }),
  ];

  const alleSzenarien = getAllScenarios();
  const szenarien: KatalogLevel[] = alleSzenarien.flatMap((s) => {
    const pack = s.id.split('-SC-')[0];
    const z = zugang(s, alleSzenarien);
    const raus: KatalogLevel[] = [];
    if (s.terminalContext) {
      const m = terminalModell(s.terminalContext);
      raus.push({
        id: s.id, titel: s.title, quelle: 'pack', gruppe: pack,
        art: s.terminalContext.type === 'windows' ? 'terminal-windows' : 'terminal-linux',
        gewinnmodell: m.modell, bedingungen: m.bedingungen,
        schwierigkeit: s.difficulty, modi: z.modi, abWoche: z.abWoche,
        hostZustand: hostZustandVon(s.terminalContext),
        terminalContext: s.terminalContext,
      });
    }
    if (s.guiContext) {
      const m = guiModell(s.guiContext);
      raus.push({
        id: s.id, titel: s.title, quelle: 'pack', gruppe: pack, art: 'gui',
        gewinnmodell: m.modell, bedingungen: m.bedingungen,
        schwierigkeit: s.difficulty, modi: z.modi, abWoche: z.abWoche,
        hostZustand: [], guiContext: s.guiContext,
      });
    }
    return raus;
  });

  const nachSchluessel = new Map<string, KatalogLevel>();
  for (const l of [...ereignisse, ...szenarien]) {
    const schluessel = `${l.id}|${l.art}`;
    if (!nachSchluessel.has(schluessel)) nachSchluessel.set(schluessel, l);
  }
  return [...nachSchluessel.values()].sort(
    (a, b) => a.gruppe.localeCompare(b.gruppe) || a.id.localeCompare(b.id)
  );
}
