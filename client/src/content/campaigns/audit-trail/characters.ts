/**
 * AUDIT TRAIL cast. Known WARM identities are reused as the starting situation,
 * but this campaign carries its OWN relationship/flag state — nothing is imported
 * from "Die Probezeit". Only the ISB and M. are new to this campaign.
 */
import { StoryCharacter } from '../types';

export const AUDIT_TRAIL_CHARACTERS: StoryCharacter[] = [
  {
    id: 'bjorg',
    name: 'Bjorg',
    role: 'Kollege & politischer Gegenspieler',
    description: 'Kommentiert Tickets, statt sie zu lösen. Charmant im Flur, giftig im Chat. Seine PAM-Appliance „BASTION-01" steht seit 14 Monaten unkonfiguriert im Rack — die Begründung wechselt je nach Nachfrage.',
    arcPotential: 'Seine Ausweichhaltung bekommt in AUDIT TRAIL erstmals belastbare organisatorische Konsequenzen. Ob sie ihn treffen, hängt davon ab, wie sauber du dokumentierst.',
  },
  {
    id: 'bert',
    name: 'Bert',
    role: 'IT-Leitung (Freigabe & Eskalation)',
    description: 'Die formale Freigabe- und Eskalationsstelle. Vorsichtig und konfliktmeidend, aber nicht blind. Eine dokumentierte Bringschuld kann er nicht ignorieren.',
    arcPotential: 'Vom zögernden Vorgesetzten zum Rückhalt — wenn du ihm die Belege lieferst, mit denen er handeln kann.',
  },
  {
    id: 'jens',
    name: 'Jens',
    role: 'Fachlicher Vertrauensanker',
    description: 'Sagt wenig, weiß viel. Hilft dir beim Einordnen, nimmt dir aber keine Auditentscheidung ab.',
    arcPotential: 'Mentor im Hintergrund; sein Rat ist Orientierung, nicht Abkürzung.',
  },
  {
    id: 'henry',
    name: 'Henry',
    role: 'Technischer Realitätscheck',
    description: 'Der Macher. Besonders bei BASTION und der Frage, was tatsächlich betriebsbereit ist, redet er Klartext.',
    arcPotential: 'Verbündeter auf der technischen Seite der Inbetriebnahme.',
  },
  {
    id: 'mueller',
    name: 'Dr. Müller',
    role: 'Geschäftsführung',
    description: 'Die oberste interne Eskalationsebene. Erscheint, wenn es formal wird.',
    arcPotential: 'Die Instanz, vor der Doku zählt und Bauchgefühl nicht.',
  },
  {
    id: 'isb',
    name: 'Der neue ISB',
    role: 'Informationssicherheitsbeauftragter',
    description: 'Erscheint in Akt 4. Stellt genau die Fragen, auf die nur gute Dokumentation antworten kann. Kein Bosskampf mit dem Schwert, sondern mit Fragen.',
    arcPotential: 'Der Prüfstein: seine fünf Fragen entscheiden, wie die Kampagne endet.',
  },
  {
    id: 'm',
    name: 'M.',
    role: 'Abwesende Führungskraft',
    description: 'Krankheitsbedingt abwesend, niemand redet gern darüber. Das Postfach ist aktiver, als es sein sollte — Folge fehlender Zurechenbarkeit, nicht eines Angriffs.',
    arcPotential: 'Kein Opfer und kein Täter: der Systemzustand, den die Kampagne sichtbar macht.',
  },
];
