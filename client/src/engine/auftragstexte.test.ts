import { describe, it, expect } from 'vitest';
import { alleTerminalLevel } from './terminalLevelRegistry';
import { befehleImText, LINUX_BEFEHLE } from './wissensbilanz';
import { fahreZeilen } from './sollpfadFahrer';

/**
 * Die zehn Faelle, die ihre Anforderung erst im Hinweis nannten.
 *
 * Sie stehen jetzt im Auftragstext — dem Feld, das waehrend des Spielens
 * sichtbar bleibt. Dieser Test haelt zwei Dinge fest, die dabei leicht
 * auseinanderlaufen:
 *
 * 1. Das im Auftrag genannte Werkzeug muss das Level WIRKLICH loesen. Ein
 *    Auftragstext, der ein falsches Werkzeug nennt, ist schlimmer als einer,
 *    der gar keines nennt — er schickt den Spieler in die Irre und sieht dabei
 *    hilfreich aus.
 * 2. Die Nennung darf nicht wieder verschwinden. Die Wissensbilanz prueft das
 *    ueber ihre (jetzt leere) Ratsche; hier steht es zusaetzlich namentlich,
 *    damit beim Umformulieren auffaellt, WELCHES Wort traegt.
 */

const level = (id: string) => {
  const e = alleTerminalLevel().find((x) => x.id === id);
  if (!e?.terminalContext) throw new Error(`${id} nicht gefunden — Test veraltet?`);
  return e;
};

const PW = 'sonnenblume23';

interface Weg {
  id: string;
  /** Woerter, die der Auftragstext nennen muss. */
  nennt: string[];
  zeilen: { cmd: string; antworten?: string[] }[];
}

/** Der Weg, den der Auftragstext ansagt — gegen die echte Shell gefahren. */
const WEGE: Weg[] = [
  {
    id: 'learn_nis2_01_schwelle',
    nennt: ['cat', 'echo', '>'],
    zeilen: [
      { cmd: 'cat /srv/meldungen/VF-2026-032.txt' },
      { cmd: 'cat /srv/meldungen/VF-2026-033.txt' },
      { cmd: 'echo "meldepflichtig: VF-2026-032, VF-2026-033" > /home/timo/einstufung.md' },
    ],
  },
  {
    id: 'learn_ssh_01_first_key',
    nennt: ['ssh-keygen', 'ssh-copy-id', 'ssh'],
    zeilen: [
      { cmd: 'ssh-keygen -t ed25519' },
      { cmd: 'ssh-copy-id admin@web01', antworten: [PW] },
      { cmd: 'ssh admin@web01' },
    ],
  },
  {
    id: 'learn_ssh_02_open_door',
    nennt: ['ssh', 'sed', 'systemctl'],
    zeilen: [
      { cmd: 'ssh admin@web01' },
      { cmd: "sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config" },
      { cmd: "sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config" },
      { cmd: 'sudo systemctl restart ssh' },
    ],
  },
  {
    id: 'learn_net_01_open_doors',
    nennt: ['ss', 'kill'],
    zeilen: [{ cmd: 'ss -tulpen' }, { cmd: 'sudo kill 6666' }],
  },
  {
    id: 'learn_net_02_backchannel',
    nennt: ['ss', 'cp', 'sed'],
    zeilen: [
      { cmd: 'ss -tp' },
      { cmd: 'cat /etc/hosts' },
      { cmd: 'sudo cp /etc/hosts /root/incident/hosts.bak' },
      { cmd: "sudo sed -i '/91.203.5.77/d' /etc/hosts" },
    ],
  },
  {
    id: 'learn_ans_01_inventory',
    nennt: ['ansible-playbook', 'ssh', 'cat'],
    zeilen: [
      { cmd: 'ansible-playbook motd.yml --check' },
      { cmd: 'ansible-playbook motd.yml' },
      { cmd: 'ssh web01' },
      { cmd: 'cat /etc/motd' },
    ],
  },
  {
    id: 'at_l8_bastion_live',
    nennt: ['ufw'],
    // Der vollstaendige angesagte Weg: absperren, pruefen, und dann den Beweis
    // antreten, dass die Schleuse wirklich traegt — genau die Reihenfolge, die
    // der Auftragstext nennt.
    zeilen: [
      { cmd: 'cat bastion-zugang.txt' },
      { cmd: 'ssh admin@waage01', antworten: ['wiegeschein-42'] },
      { cmd: 'sudo ufw allow from 10.0.30.10 to any port 22' },
      { cmd: 'sudo ufw default deny incoming' },
      { cmd: 'sudo ufw enable' },
      { cmd: 'sudo ufw delete allow 22' },
      { cmd: 'sudo ufw status' },
      { cmd: 'exit' },
      { cmd: 'ssh admin@bastion01', antworten: ['schleuse-blau-9'] },
      { cmd: 'ssh admin@waage01', antworten: ['wiegeschein-42'] },
    ],
  },
];

describe('Der Auftragstext nennt das Werkzeug', () => {
  it.each(WEGE.map((w) => [w.id, w] as const))('%s nennt es im Aufgabenfeld', (_id, weg) => {
    const ctx = level(weg.id).terminalContext!;
    const auftrag = ctx.taskText ?? '';
    const genannt = befehleImText(auftrag, LINUX_BEFEHLE);
    for (const wort of weg.nennt) {
      expect(
        genannt.has(wort),
        `„${wort}" fehlt im Auftragstext von ${weg.id} — es stuende dann wieder nur im Hinweis:\n${auftrag}`
      ).toBe(true);
    }
  });

  /**
   * Gefahren wird durch die SITZUNG, nicht an ihr vorbei.
   *
   * Der erste Anlauf rief `shell.execute` direkt auf und pruefte am Ende die
   * `stateGoals`. Das umgeht die Erfolgserkennung — und bestaetigt damit auch
   * einen Auftragstext, dessen letzte Schritte im Spiel gar nicht mehr zur
   * Ausfuehrung kommen. Genau das ist passiert: Der Ansible-Auftrag verlangte
   * eine Kontrolle per ssh, das Level war aber schon nach dem Ausrollen
   * geloest; wer danach weitertippt, bestaetigt nur noch den Abschluss.
   */
  it.each(WEGE.map((w) => [w.id, w] as const))(
    '%s wird durch den angesagten Weg geloest — und zwar durch den GANZEN',
    (_id, weg) => {
      const ctx = level(weg.id).terminalContext!;
      const fahrt = fahreZeilen(ctx, weg.zeilen);

      expect(
        fahrt.geloestNachZeile,
        `der im Auftrag angesagte Weg loest ${weg.id} nicht:\n  ${weg.zeilen.map((z) => z.cmd).join('\n  ')}`
      ).not.toBeNull();

      // Ein Auftrag, der nach dem Erfolg noch Schritte ansagt, verspricht eine
      // Kontrolle, die das Spiel nie entgegennimmt: Nach dem Erfolg wartet die
      // Sitzung auf das bestaetigende Enter.
      expect(
        fahrt.geloestNachZeile,
        `${weg.id} ist schon nach Zeile ${fahrt.geloestNachZeile} von ${weg.zeilen.length} geloest — ` +
          'die restlichen angesagten Schritte kommen im Spiel nie zur Ausfuehrung'
      ).toBe(weg.zeilen.length);
    }
  );
});
