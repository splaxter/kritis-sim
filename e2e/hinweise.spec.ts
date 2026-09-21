import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { levelKatalog } from '../client/src/engine/levelKatalog';
import { alleTerminalLevel } from '../client/src/engine/terminalLevelRegistry';

/**
 * Das Hinweissystem, durchgeklickt.
 *
 * Es ist das einzige Hilfsmittel, das ein steckengebliebener Spieler hat — und
 * es ist nie im echten Browser durchprobiert worden. Geprueft wird das, was
 * beim Spielen auffallen wuerde: Erscheint jeder Hinweis? Stimmt der Zaehler?
 * Steht am Ende „0 uebrig", statt in den Minusbereich zu laufen?
 */

const eventById = new Map(alleTerminalLevel().map((e) => [e.id, e]));

const proben = levelKatalog()
  .filter((l) => l.art !== 'gui' && (eventById.get(l.id)?.terminalContext?.hints?.length ?? 0) >= 1);

test('Hinweise lassen sich bis zum letzten abrufen @sichtung', async ({ page }) => {
  test.setTimeout(25 * 60 * 1000);
  const bericht: string[] = [];
  const kaputt: string[] = [];

  for (const l of proben) {
    const hinweise = eventById.get(l.id)!.terminalContext!.hints!;
    await page.goto('/?level');
    await page.getByLabel('Suche').fill(l.id);
    await page.getByRole('button', { name: `Öffnen: ${l.id}` }).click();
    await page.locator('.xterm').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(300);

    const knopf = page.getByRole('button', { name: /Hinweis/ });
    const start = await knopf.innerText();
    const erwartetStart = `[?] Hinweis (${hinweise.length} übrig)`;
    if (!start.includes(`${hinweise.length} übrig`)) {
      kaputt.push(`${l.id}: Zaehler startet bei „${start}", erwartet „${erwartetStart}"`);
    }

    // Alle Hinweise abrufen — und einen mehr, als es gibt.
    for (let i = 0; i < hinweise.length + 1; i++) {
      if (await knopf.isEnabled()) await knopf.click();
      await page.waitForTimeout(200);
    }

    const ende = await knopf.innerText().catch(() => '(weg)');
    if (/-\d/.test(ende)) kaputt.push(`${l.id}: Zaehler laeuft ins Minus: „${ende}"`);
    if (!/0 übrig/.test(ende) && ende !== '(weg)') {
      kaputt.push(`${l.id}: Zaehler endet bei „${ende}" statt „0 übrig"`);
    }

    // Steht der letzte Hinweis auch wirklich auf dem Schirm?
    const sicht = await page.locator('.xterm').innerText();
    const letzter = hinweise[hinweise.length - 1].replace(/^🤖 [^:]+: /, '').slice(0, 30);
    if (!sicht.includes(letzter.slice(0, 20))) {
      kaputt.push(`${l.id}: letzter Hinweis nicht im Terminal sichtbar (gesucht: „${letzter.slice(0, 20)}…")`);
    }
    bericht.push(`${l.id}: Start „${start}" → Ende „${ende}" (${hinweise.length} Hinweise)`);
  }

  writeFileSync('/tmp/hinweise.txt', [...bericht, '', ...kaputt].join('\n'));
  expect(kaputt, `${kaputt.length} Auffaelligkeiten — siehe /tmp/hinweise.txt`).toEqual([]);
});
