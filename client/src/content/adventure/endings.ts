import { EndingType } from '@kritis/shared';

export interface AdventureEndingText {
  id: string;
  title: string; // Der Held / Gerade so / Pech gehabt
  paragraphs: string[]; // Konferenzraum-Szene + Konsequenzen
  epilogue: string; // "Drei Monate später…" Coda
}

export const ADVENTURE_ENDINGS: Record<EndingType, AdventureEndingText> = {
  good: {
    id: 'ending_good',
    title: 'Der Held',
    paragraphs: [
      'Der Chef legt eine Mappe auf den Tisch und schiebt sie dir zu. "Unbefristet", sagt er. "Und eine Gehaltserhöhung, über die wir nicht diskutieren, weil ich sie sonst rechtfertigen müsste — und das könnte ich nicht ohne rot zu werden." Er meint es ernst. Zum ersten Mal seit deinem ersten Tag wirkt Chef Bert wie jemand, der weiß, was er an dir hat.',
      'Frau Dr. Reinhardt vom BSI schiebt dir wortlos eine Visitenkarte über den Tisch. "Falls Sie es irgendwann eine Nummer größer wollen." Bjorg, der neben dir sitzt und aussieht, als hätte er drei Tage in einem Serverraum gelebt (hat er auch), grinst breit und boxt dir gegen die Schulter.',
      'Der Bürgermeister hält eine kleine Rede vor der Presse und nennt dich öffentlich "unser IT-Held" — wobei er das W in WLAN falsch ausspricht und "Weh-Lahn" sagt. Niemand korrigiert ihn. Es ist zu schön, um es kaputtzumachen.',
      'FENRIS\' Infrastruktur wurde vom BSI zerlegt, Server um Server, Land um Land. Viktor Brandt, der freundliche Drucker-Mensch, sitzt in Untersuchungshaft. Die präparierten Daten und Stefans lückenlose Dokumentation machen aus dem Fall einen, an dem sich Anwälte die Zähne ausbeißen werden.',
      'Die Müllabfuhr fährt. Das Wasser läuft. Das Licht brennt. Und niemand da draußen weiß, wie knapp es war — was vielleicht die eigentliche Definition eines gelungenen Krisenmanagements ist: Es passiert nichts, und keiner merkt, dass fast alles passiert wäre.',
    ],
    epilogue:
      'Drei Monate später: Stefan arbeitet wieder — zwei Büros weiter, mit einer Kaffeetasse, auf der "Paranoia ist auch nur Erfahrung" steht. Auf deinem Schreibtisch liegt ein Ordner mit der Aufschrift "PROJEKT_X — abgeschlossen". Und um 23:47 ist im Netzwerk: nichts. Einfach nichts. Ein sauberer, ruhiger, wunderbar ereignisloser Log-Eintrag. So soll es sein.',
  },
  neutral: {
    id: 'ending_neutral',
    title: 'Gerade so',
    paragraphs: [
      'Der Chef räuspert sich und schaut auf seine Hände. "Wir verlängern Ihre Probezeit. Um drei Monate." Pause. "Es gibt einiges aufzuarbeiten." Es ist keine Absage. Aber es ist auch kein Sieg. Es ist das Geräusch von jemandem, der noch nicht weiß, was er von dir halten soll.',
      'Die Systeme laufen wieder, die Müllabfuhr fährt, die Angreifer sind zurückgeschlagen. Aber die Narben sind da: ein paar Datenstände, die für immer fehlen. Ein paar Brücken, die angekokelt sind und Zeit brauchen werden. Ein Bürgermeister, der sich nicht ganz sicher ist, ob er dich loben oder etwas suchen soll, das man dir ankreiden kann.',
      'Brandt wurde gefasst, aber ein Teil von FENRIS ist im Nebel verschwunden. Der Fall ist gelöst, nicht abgeschlossen — so wie das meiste im echten Leben.',
      'Bjorg findet dich abends am Automaten, beide zu müde für große Worte. Er drückt dir einen Kaffee in die Hand. "Hey", sagt er. "Wir leben. Die Müllabfuhr fährt. Und beim nächsten Mal sind wir schneller." Es klingt nicht nach Trost. Es klingt nach einem Versprechen.',
    ],
    epilogue:
      'Drei Monate später: Die Verlängerung ist längst vergessen, dein Vertrag läuft weiter, und in der Schublade liegt eine Liste mit Dingen, die "beim nächsten Mal" anders laufen. Offline-Backups stehen ganz oben. Um 23:47 wirfst du manchmal noch einen Blick auf die Logs. Alte Gewohnheit. Meistens ist da nichts. Meistens.',
  },
  bad: {
    id: 'ending_bad',
    title: 'Pech gehabt',
    paragraphs: [
      '"Wir müssen uns leider trennen." Der Chef sagt es leise, ohne dir in die Augen zu sehen. "Mangelnde Eignung." Es ist eine Formulierung aus einem Formular, und ihr wisst beide, dass sie nicht die ganze Wahrheit ist — aber sie ist die, die ins Protokoll passt.',
      'Der Schaden war zu groß, das Vertrauen zu klein, zu viele Türen wurden zugeschlagen, als sie hätten offen bleiben müssen. Ob Lösegeld floss oder Schuld weitergereicht wurde oder einfach niemand mehr mit dir reden wollte — am Ende steht ein Karton auf deinem Schreibtisch und ein Amt, das lieber neu anfängt.',
      'Du packst deine Sachen. Die Kaffeetasse. Das USB-Kabel, das dir keiner nachträgt. Der Serverraum, in dem du drei Wochen praktisch gewohnt hast, ist plötzlich nur noch ein Raum.',
      'An der Tür wartet Bjorg. Er hilft dir tragen, ohne dass du fragen musst. "Weißt du", sagt er, "du weißt jetzt Dinge über KRITIS, die die meisten nie lernen, weil sie nie so nah dran waren. Irgendwo da draußen wartet ein Laden, der genau das braucht." Er drückt dir die Hand. "Und die suchen keine Zeugnisse. Die suchen Leute, die schon mal im Feuer standen."',
    ],
    epilogue:
      'Drei Monate später: Der Karton steht ausgepackt in einem neuen Büro, in einer anderen Stadt, bei einem Laden, der genau wusste, was er an einer Person hat, die eine echte Krise überlebt hat. Das Amt hinter dir hat aus nichts gelernt — aber du aus allem. Das Wissen nimmt dir keiner mehr. Und um 23:47 schläfst du inzwischen wieder durch.',
  },
};
