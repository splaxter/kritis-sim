import { describe, it, expect } from 'vitest';
import { formatNarrativeText } from './formatNarrativeText';
import { storyWeek1to2Events } from '../content/events/story/story-week1-2';
import { learningPathEvents } from '../content/events/learning-path';

const ersterArbeitstag = storyWeek1to2Events.find((e) => e.id === 'evt_erster_arbeitstag');
const askColleague = ersterArbeitstag?.choices?.find((c) => c.id === 'ask_colleague');
const finalBoss = learningPathEvents.find((e) => e.id === 'learn_11_final_boss');
const finaleResult = finalBoss?.choices?.find((c) => c.id === 'start');

describe('player-token starter authoring', () => {
  it('the three authored spots carry {player}', () => {
    expect(ersterArbeitstag?.description).toContain('{player}');
    expect(askColleague?.resultText).toContain('{player}');
    expect(finaleResult?.resultText).toContain('{player}');
  });

  it('no rendered {player} leaks — each renders a name and drops the token', () => {
    const roles = { chef: 'Bert', player: 'Timo' };
    const authored = [
      ersterArbeitstag!.description,
      askColleague!.resultText!,
      finaleResult!.resultText!,
    ];
    for (const text of authored) {
      const out = formatNarrativeText(text, roles);
      expect(out).toContain('Timo');
      expect(out).not.toContain('{player}');
    }
  });
});
