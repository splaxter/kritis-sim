import { describe, it, expect } from 'vitest';
import { KATASTER_DOMAINS, KatasterDomain } from './domains';
import { KATASTER_ENDING_TEXTS, DOMAIN_LINES, buildKatasterEpilogue } from './endings';

const ALL: KatasterDomain[] = ['K1', 'K2', 'K3', 'K4', 'K5'];

function flagsFor(domains: KatasterDomain[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const d of domains) {
    const cond = KATASTER_DOMAINS[d].condition;
    const positive = typeof cond === 'string' ? [cond] : (cond.all ?? []);
    for (const f of positive) out[f] = true;
  }
  return out;
}

const GOOD = flagsFor(['K1', 'K2', 'K3', 'K4']);

describe('Ending-Texte', () => {
  it('jedes Ending hat Titel und Szene', () => {
    for (const id of ['gruene_liste', 'ordner', 'aufpasser']) {
      const t = KATASTER_ENDING_TEXTS[id];
      expect(t, id).toBeDefined();
      expect(t.title.length, id).toBeGreaterThan(0);
      expect(t.paragraphs.length, id).toBeGreaterThanOrEqual(3);
    }
  });

  it('„Der Aufpasser" hat KEINEN statischen Epilog — er wird komponiert', () => {
    expect(KATASTER_ENDING_TEXTS.aufpasser.epilogue).toBe('');
    expect(buildKatasterEpilogue(GOOD).length).toBeGreaterThan(0);
  });
});

describe('buildKatasterEpilogue — behauptet nur, was ein Flag belegt', () => {
  /**
   * Die zentrale Ehrlichkeitsprüfung: für JEDE Domäne muss gelten, dass ihr
   * Satz verschwindet, sobald die Domäne nicht mehr hält. Sonst behauptet der
   * Abspann einen Zustand, den der Lauf nicht hergibt.
   */
  it('bei allen fünf Domänen steht jeder Satz genau einmal', () => {
    const full = buildKatasterEpilogue(flagsFor(ALL));
    for (const d of ALL) {
      expect(full.includes(DOMAIN_LINES[d]), `${d}: Satz fehlt, obwohl die Domäne hält`).toBe(true);
    }
  });

  /**
   * K1, K3, K5 sind einzeln verzichtbar — ohne sie hält der gute Abspann, nur
   * ihr Satz fällt weg. Das ist die eigentliche Ehrlichkeitsprüfung: der Text
   * behauptet keine Domäne, die der Lauf nicht hergibt.
   */
  it.each<KatasterDomain>(['K1', 'K3', 'K5'])(
    'ohne %s: nur dieser Satz verschwindet, die anderen bleiben',
    (dropped) => {
      const rest = ALL.filter((x) => x !== dropped);
      const text = buildKatasterEpilogue(flagsFor(rest));

      expect(text.includes(DOMAIN_LINES[dropped]), `${dropped}: Satz steht trotz fehlender Domäne`).toBe(false);
      for (const other of rest) {
        expect(text.includes(DOMAIN_LINES[other]), `${other} muss bleiben`).toBe(true);
      }
    }
  );

  /**
   * K2 und K4 sind NICHT verzichtbar: ohne sie gibt es kein „Der Aufpasser"
   * mehr (domains.ts §5.3), also auch keinen komponierten Abspann. Der Lauf
   * fällt auf die Bilanz-Variante zurück — vier von fünf Domänen kaufen den
   * guten Schluss nicht, wenn Zurechenbarkeit oder Ehrlichkeit fehlen.
   */
  it.each<KatasterDomain>(['K2', 'K4'])(
    'ohne %s fällt der Abspann auf die Bilanz-Variante zurück',
    (dropped) => {
      const text = buildKatasterEpilogue(flagsFor(ALL.filter((x) => x !== dropped)));
      for (const d of ALL) {
        expect(text.includes(DOMAIN_LINES[d]), `${d}: kein Domänensatz im Ordner-Abspann`).toBe(false);
      }
      expect(text).toMatch(/Was steht:/);
      expect(text).toMatch(new RegExp(`Was fehlt:.*${KATASTER_DOMAINS[dropped].label}`));
    }
  );

  it('K5 behauptet NICHT, dass die Lücken geschlossen sind', () => {
    const text = buildKatasterEpilogue(flagsFor(ALL));
    expect(text).toMatch(/nicht geschlossen/);
    expect(text).not.toMatch(/Lücken (sind|wurden) geschlossen/);
  });

  it('K2 behauptet Kenntnis, nicht Erledigung', () => {
    const text = buildKatasterEpilogue(flagsFor(['K1', 'K2', 'K3', 'K4']));
    expect(text).toMatch(/weiß die Person davon/);
    expect(text).not.toMatch(/(abgearbeitet|erledigt|erfüllt worden)/);
  });

  it('der automatische Fristenreport erscheint NUR mit kat_reminder_live', () => {
    expect(buildKatasterEpilogue(GOOD)).not.toMatch(/Report/);
    expect(buildKatasterEpilogue({ ...GOOD, kat_reminder_live: true })).toMatch(/Report/);
  });

  it('der gute Abspann endet auf den Schlusssatz der Kampagne', () => {
    expect(buildKatasterEpilogue(GOOD).trimEnd()).toMatch(
      /Ein Audit, das nichts findet, was Sie nicht schon wussten, ist ein gutes Audit\."$/
    );
  });

  it('„Die grüne Liste" nutzt ihren statischen Abspann', () => {
    const text = buildKatasterEpilogue({ ...flagsFor(ALL), kat_owner_fabricated: true });
    expect(text).toBe(KATASTER_ENDING_TEXTS.gruene_liste.epilogue);
    expect(text).toMatch(/Es war alles grün/);
  });

  it('0 Domänen → statischer Ordner-Abspann; 2–3 Domänen → Bilanz-Variante', () => {
    expect(buildKatasterEpilogue({})).toBe(KATASTER_ENDING_TEXTS.ordner.epilogue);

    const partial = buildKatasterEpilogue(flagsFor(['K1', 'K3']));
    expect(partial).toMatch(/Was steht: Vollständigkeit, Nachweisfähigkeit/);
    expect(partial).toMatch(/Was fehlt: Zurechenbarkeit, Ehrlichkeit, Eskalation/);
  });
});
