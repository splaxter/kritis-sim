import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { levelKatalog } from '../client/src/engine/levelKatalog';

/**
 * Trägt jedes Bedienelement einen Namen — und ist jede ID einmalig?
 *
 * Beim Probespielen gefunden: Im Meldeformular teilten sich drei
 * Auswahlkästchen dieselbe `id`, weil Fluents `Field` seine Beschriftung an
 * JEDES Kind weiterreicht. Das erste wurde dadurch als „Betroffene Dienste und
 * Systeme" angesagt statt als „Dateiserver Disposition", die anderen beiden
 * hatten gar keinen Namen.
 *
 * Für einen Spieler mit Hilfstechnik heisst das: Er hört die Frage dreimal und
 * die Antworten nie. Beides ist billig zu pruefen und fällt sonst niemandem
 * auf.
 */

const gui = levelKatalog().filter((l) => l.art === 'gui');

test('jedes Bedienelement hat einen Namen, jede ID ist einmalig @sichtung', async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);
  const kaputt: string[] = [];
  const bericht: string[] = [];

  for (const l of gui) {
    await page.goto('/?level');
    await page.getByLabel('Suche').fill(l.id);
    await page.getByRole('button', { name: `Öffnen: ${l.id}` }).click();
    await page.waitForTimeout(900);

    const befund = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('[id]')).map((e) => e.id);
      const doppelt = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];

      const name = (el: HTMLElement) => {
        const ausId = (attr: string) =>
          (el.getAttribute(attr) ?? '')
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.innerText ?? '')
            .join(' ')
            .trim();
        return (
          (el.getAttribute('aria-label') ?? '').trim() ||
          ausId('aria-labelledby') ||
          ((el as HTMLInputElement).labels?.[0]?.innerText ?? '').trim() ||
          (el.innerText ?? '').trim() ||
          ((el as HTMLInputElement).placeholder ?? '').trim()
        );
      };

      const ohneNamen: string[] = [];
      for (const el of Array.from(document.querySelectorAll('input, select, textarea, button, [role="option"]'))) {
        const he = el as HTMLElement;
        if (he.offsetParent === null) continue;
        if ((he as HTMLButtonElement).disabled) continue;
        if (!name(he)) ohneNamen.push(`${he.tagName}${(he as HTMLInputElement).type ? `[${(he as HTMLInputElement).type}]` : ''}`);
      }
      return { doppelt, ohneNamen };
    });

    if (befund.doppelt.length > 0) {
      kaputt.push(`${l.id} (${l.guiContext?.app}): doppelte IDs ${befund.doppelt.slice(0, 4).join(', ')}`);
    }
    if (befund.ohneNamen.length > 0) {
      kaputt.push(`${l.id} (${l.guiContext?.app}): ${befund.ohneNamen.length} Bedienelemente ohne Namen (${[...new Set(befund.ohneNamen)].join(', ')})`);
    }
    bericht.push(`${befund.doppelt.length + befund.ohneNamen.length === 0 ? 'ok  ' : 'NEIN'} ${l.id} (${l.guiContext?.app})`);
  }

  writeFileSync('/tmp/bedien.txt', [...bericht, '', `${gui.length} GUI-Level, ${kaputt.length} auffaellig`, ...kaputt].join('\n'));
  expect(kaputt, 'siehe /tmp/bedien.txt').toEqual([]);
});
