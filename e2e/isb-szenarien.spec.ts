import { test, expect, Page } from '@playwright/test';
import { getAllScenarios } from '../client/src/content/packs';

/**
 * Die fünf umgebauten KRITIS-Fälle WIRKLICH GESPIELT.
 *
 * Die Motor-Prüfungen fahren den Zustand: Sie führen Befehle gegen die echte
 * Shell aus und fragen die Gewinnbedingung. Was sie NICHT sehen, ist alles
 * dazwischen — ob die Szenariokarte den Fall überhaupt anbietet, ob der
 * richtige Knopf ein Terminal öffnet, ob der Aufgabentext auf dem Schirm
 * lesbar ist, ob xterm die Eingabe annimmt und ob der Abschluss ankommt und
 * gespeichert wird.
 *
 * Hier wird deshalb gespielt: gespeicherter Stand → „WEITER SPIELEN" →
 * Szenariokarte → Auswahl → Terminal → tippen → Ergebnisschirm.
 */

const PLAYER_ID = 'player-isb';

/** Jeder Fall: welche Auswahl das Terminal öffnet, und was der Spieler tippt. */
const FAELLE: { id: string; wahl: RegExp; zeilen: string[]; erwartet: RegExp }[] = [
  {
    id: 'KRITIS-SC-013',
    wahl: /Die Kopplung zur echten Grenze machen/,
    zeilen: [
      'sudo nft -a list ruleset',
      'sudo nft add rule inet filter forward drop',
      'sudo nft delete rule inet filter forward handle 6',
    ],
    erwartet: /Die Kette hat jetzt einen Boden/,
  },
  {
    id: 'KRITIS-SC-014',
    wahl: /Rückspielprobe fahren und den Server abriegeln/,
    zeilen: [
      'cat /srv/backup/sha256sums.txt',
      'sudo openssl enc -d -aes-256-cbc -pbkdf2 -in /srv/backup/dispo-2026-09-17.tar.enc -out /tmp/dispo-2026-09-17.tar -pass file:/etc/backup/keys/backup.key',
      'sha256sum /tmp/dispo-2026-09-17.tar',
      'sudo ufw default deny incoming',
      'sudo ufw allow from 10.10.0.40 to any port 22',
      'sudo ufw enable',
    ],
    erwartet: /Zurückgespielt und nachgerechnet/,
  },
  {
    id: 'KRITIS-SC-015',
    wahl: /Einzelzugänge einrichten/,
    zeilen: [
      'cat /srv/vertrag/wartungsvertrag.txt',
      'grep marek /home/dienstleister/.ssh/authorized_keys > /home/ext-marek/.ssh/authorized_keys',
      'sudo rm -f /home/dienstleister/.ssh/authorized_keys',
      "sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config",
      "sudo sed -i 's/^#LogLevel INFO/LogLevel VERBOSE/' /etc/ssh/sshd_config",
      'sudo systemctl restart ssh',
    ],
    erwartet: /Jetzt steht im Protokoll, wer/,
  },
  {
    id: 'KRITIS-SC-001',
    wahl: /Logs analysieren und Zugriff nachverfolgen/,
    zeilen: [
      'cat /opt/scada/logs/operations.log',
      'cat /opt/scada/config/access.log',
      'echo "quelle: 10.0.0.99" > /home/operator/befund.md',
      'echo "konto: maintenance" >> /home/operator/befund.md',
      'echo "angriff: nein" >> /home/operator/befund.md',
      'echo "fehlend: anmeldung" >> /home/operator/befund.md',
    ],
    erwartet: /Sauber hergeleitet/,
  },
  {
    id: 'KRITIS-SC-012',
    wahl: /Problem systematisch analysieren/,
    zeilen: [
      'systemctl status bind9',
      'ss -tulpen',
      'sudo ufw status',
      'journalctl -u ufw',
      'sudo ufw allow 53',
    ],
    erwartet: /Gefunden und behoben/,
  },
];

/** Stand, in dem genau dieser eine Fall noch offen ist. */
async function seedStand(page: Page, zielId: string) {
  const alle = getAllScenarios().map((s) => s.id);
  const env = {
    version: 1,
    updatedAt: '2026-09-18T10:00:00.000Z',
    gameState: {
      seed: 'ISB-1', runNumber: 1, gameMode: 'intermediate', currentWeek: 10, currentDay: 1,
      skills: { netzwerk: 60, linux: 60, windows: 60, security: 60, troubleshooting: 60, softSkills: 60 },
      relationships: { chef: 10, gf: 0, kaemmerer: 0, fachabteilung: 0, kollegen: 10 },
      stress: 10, budget: 15000, compliance: 60, activeEvents: [], completedEvents: [],
      completedScenarios: alle.filter((id) => id !== zielId),
      flags: {}, unlockedCommands: ['help'], terminalHistory: [],
      isStoryMode: false, decisions: [], pendingChainEvents: [],
    },
  };
  await page.addInitScript(([id, e]) => {
    localStorage.setItem('kritis_player_id', id);
    localStorage.setItem('kritis_seen_intro', '1');
    localStorage.setItem('kritis_name_skipped', '1');
    localStorage.setItem(`kritis_autosave_${id}`, e);
  }, [PLAYER_ID, JSON.stringify(env)] as const);
}

for (const fall of FAELLE) {
  const szenario = getAllScenarios().find((s) => s.id === fall.id)!;

  test(`${fall.id} — gespielt, vom Kartentext bis zum Ergebnis`, async ({ page }) => {
    await seedStand(page, fall.id);
    await page.goto('/');
    await page.getByText(/WEITER SPIELEN/).click();

    // 1. Der Fall wird überhaupt angeboten.
    await expect(page.getByText(szenario.title)).toBeVisible({ timeout: 15000 });

    // 2. Die richtige Auswahl öffnet ein Terminal.
    await page.getByRole('button', { name: fall.wahl }).click();
    const term = page.locator('.xterm');
    await expect(term).toBeVisible({ timeout: 10000 });

    // 3. Der Auftragstext steht auf dem Schirm — nicht nur im Datenmodell.
    const aufgabe = page.getByTestId('aufgabentext');
    await expect(aufgabe).toBeVisible();
    const sichtbar = await aufgabe.evaluate((el) => el.textContent?.trim() ?? '');
    expect(sichtbar.length, 'Aufgabenfeld ist leer').toBeGreaterThan(40);

    // 4. Gespielt.
    await term.click();
    for (const zeile of fall.zeilen) {
      await page.keyboard.type(zeile);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
    }

    // 5. Der Abschluss kommt an.
    await expect(page.getByText(/AUFGABE ABGESCHLOSSEN/i)).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Enter');
    await expect(page.getByText(fall.erwartet)).toBeVisible({ timeout: 10000 });
  });
}
