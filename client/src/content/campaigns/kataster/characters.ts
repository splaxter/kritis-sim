/**
 * DAS KATASTER cast. The known WARM faces in their established roles, plus the
 * two new ones the campaign needs: the external ISB who asks the questions, and
 * the predecessor who never appears.
 *
 * Campaign-owned (like AUDIT TRAIL's) so App holds no hardcoded cast.
 */
import { StoryCharacter } from '../types';

export const KATASTER_CHARACTERS: StoryCharacter[] = [
  {
    id: 'bert',
    name: 'Bert',
    role: 'IT-Leitung',
    description:
      'Technisch fit, unterstützend, kein Bremser. Er ist hier der, der die Frage des ISB nicht beantworten kann — und das offen zugibt.',
    arcPotential:
      'Reagiert auf Schriftliches. Wer ihm Lücken mit Datum gibt, macht sie zu seinem Thema statt zu seinem Vorwurf.',
  },
  {
    id: 'bjorg',
    name: 'Bjorg',
    role: 'IT-Betrieb',
    description:
      'Lauter Delegierer, Flurhumor, hat alles „im Kopf". Beansprucht vier Katastereinträge und liefert zu keinem einen Nachweis.',
    arcPotential:
      'Nicht bösartig, sondern unverbindlich — was in einem Pflichtenkataster derselbe Schaden ist. Der Konflikt ist Verbindlichkeit, nicht Ton.',
  },
  {
    id: 'jens',
    name: 'Jens',
    role: 'IT-Betrieb, fachlicher Anker',
    description:
      'Die Mentor-Stimme in den Hints. Ordnet ein, entscheidet nichts für dich.',
    arcPotential:
      'Sein Satz vor dem großen Kataster-Level ist die einzige Vorwarnung vor der Fabrication-Falle.',
  },
  {
    id: 'henry',
    name: 'Henry',
    role: 'Systemtechnik',
    description: 'Realitätscheck. Der einzige, der einen Nachweis wirklich liefert — ungefragt.',
    arcPotential: 'Zeigt, wie eine belegte Zeile aussieht, bevor der Spieler eine bauen muss.',
  },
  {
    id: 'gf',
    name: 'Dr. Müller',
    role: 'Geschäftsführung',
    description: 'Zwei Auftritte in Akt 3 — dieselbe Frage in zwei Tonlagen.',
    arcPotential:
      'Ob die Lücke gemeldet oder kaschiert wurde, entscheidet, ob sie fragt „Zeigen Sie mir das" oder „Sie wussten das?".',
  },
  {
    id: 'isb',
    name: 'Jakob Michael',
    role: 'Externer ISB, zwei Tage im Monat',
    description:
      'Kein Feind, kein Verbündeter: er fragt und schreibt mit. „Mich interessiert nicht, ob es läuft. Mich interessiert, wer es merkt, wenn es nicht mehr läuft."',
    arcPotential:
      'Trägt den ganzen Bogen — Kick-off in Akt 1, Stichprobe in Akt 4. Grenzt sich vom ISB in AUDIT TRAIL ab: dort Beweisführung, hier Zuständigkeit.',
  },
  {
    id: 'petersen',
    name: 'Frau Petersen',
    role: 'Zentraler Einkauf',
    description:
      'Hat die Rahmenverträge geschlossen und wusste bis zum Kataster nicht, welche Pflichten daran hängen. Reagiert auf Schriftliches sofort.',
    arcPotential:
      'Der Beleg dafür, dass eine Pflicht bei der Stelle, die sie erfüllen kann, mehr wert ist als bei der, die sie bemerkt hat.',
  },
  {
    id: 'kalb',
    name: 'Reinhard Kalb',
    role: 'Vorgänger, seit drei Wochen in Rente',
    description:
      'Tritt nie auf. Hinterlässt einen halb leeren Ordner und ist genau einmal telefonisch erreichbar: „Das lief immer. Fragen Sie Bjorg."',
    arcPotential:
      'Kein Bösewicht, kein Geheimnis. Die Kampagne handelt von einem Zustand, nicht von einer Schuld.',
  },
];
