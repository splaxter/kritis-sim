import { useState } from 'react';
import { GuiContext } from '@kritis/shared';
import { guiLevelEvents } from '../../content/events/gui-levels';
import { blackoutEvents } from '../../content/events/blackout';
import { WindowsLevel } from './index';

const blk = (id: string): GuiContext | undefined =>
  blackoutEvents.find((e) => e.id === id)?.guiContext;

/**
 * ⚠️ DEV-ONLY preview harness for Windows GUI levels.
 *
 * Reachable at `/?preview=<id>` in dev mode only (gated by import.meta.env.DEV
 * in App.tsx). It renders a GuiContext directly so we can eyeball the Win11
 * look / Fluent integration without playing through RNG and game state.
 *
 * NOT production code — safe to delete once visual checks are done.
 */


/**
 * Kataster has no authored level yet (Phase C writes L2/L7), so its preview
 * carries its own sample state. Replace this with a `katasterEvents.find(...)`
 * lookup as soon as the first real level exists.
 */
const katasterSample: GuiContext = {
  app: 'kataster',
  title: 'Pflichtenkataster',
  hostname: 'warm-adm-01',
  briefing:
    'Vier Felder pro Zeile: Quelle, Pflicht, Aufpasser, Nachweis. Was keinen Aufpasser hat, ist rot.',
  state: {
    kataster: {
      title: 'Pflichtenkataster WARM — Stand 09/2026',
      entries: [
        {
          id: 'sla_bericht',
          source: 'SLA Komm.ONE §4',
          duty: 'Monatlichen Verfügbarkeitsbericht prüfen',
          sourceExcerpt:
            'Verfügbarkeit 99,5 % im Monatsmittel. Der Auftragnehmer stellt monatlich einen Verfügbarkeitsbericht bereit.',
        },
        {
          id: 'lizenznachweis',
          source: 'Rahmenvertrag Lizenzen §9',
          duty: 'Lizenzbelegung jährlich nachweisen',
          note: 'Vertrag vom Einkauf geschlossen',
        },
        {
          id: 'notfallhandbuch',
          source: 'Dienstvereinbarung Protokollierung §7',
          duty: 'Notfallhandbuch fortschreiben',
          sourceExcerpt:
            'Einzelheiten regelt das IT-Notfallhandbuch in seiner jeweils gültigen Fassung.',
        },
        {
          id: 'usv',
          source: 'Kalb-Ordner',
          duty: 'USV-Batterietausch',
          owner: 'henry',
          cycle: 'jaehrlich',
          evidenceId: 'usv_protokoll',
          locked: true,
        },
      ],
      people: [
        { id: 'henry', name: 'Henry Bartels', role: 'Systemtechnik' },
        { id: 'jens', name: 'Jens Adam', role: 'IT-Betrieb' },
        { id: 'bjorg', name: 'Bjorg Jörgensen', role: 'IT-Betrieb', unconfirmed: true },
        { id: 'einkauf', name: 'Frau Petersen', role: 'Einkauf' },
        { id: 'it_abteilung', name: 'IT-Abteilung', role: 'Sammelzuweisung', isGroup: true },
      ],
      evidence: [
        {
          id: 'bericht_07',
          label: 'Verfügbarkeitsbericht 07/2026',
          date: '05.08.2026',
          forEntry: 'sla_bericht',
        },
        { id: 'usv_protokoll', label: 'USV-Prüfprotokoll', date: '11.03.2026', forEntry: 'usv' },
      ],
      findings: [
        {
          id: 'info_postfach',
          source: 'Mailexport info@',
          duty: 'Sammelpostfach arbeitstäglich sichten',
          excerpt: 'Eingang vom 24.06.2026, ungelesen.',
        },
        {
          id: 'hersteller_flyer',
          source: 'Herstellerbroschüre Athos',
          duty: 'Quartalsweise Security-Reviews durchführen',
          excerpt: 'Wir empfehlen quartalsweise Reviews.',
          decoy: true,
          riskFeedback: 'Eine Empfehlung des Herstellers ist keine Pflicht.',
        },
      ],
    },
  },
  solutions: [
    {
      interactions: ['gap:notfallhandbuch'],
      allRequired: true,
      resultText: 'Lücke ehrlich vermerkt.',
      skillGain: { security: 4 },
    },
  ],
  hints: ['Welche Zeile hat keinen Aufpasser — und welche kann keinen haben?'],
};

// Map preview ids → a GuiContext. Pulls from real level content where possible.
/** Vorschau der Meldung: die Erstmeldung aus L2, mit der echten Feldliste. */
const meldungSample: GuiContext = {
  app: 'meldung',
  title: 'Meldung an die Meldestelle',
  hostname: 'warm-adm-01',
  briefing:
    'Erstmeldung nach § 32 Abs. 1 BSIG. Sie ist absichtlich niedrigschwellig — „noch unbekannt" ist eine zulässige Antwort.',
  state: {
    meldung: {
      stufe: 'erst',
      kenntnisSeit: '03:14 h',
      empfaenger: 'Gemeinsame Meldestelle des BSI und des BBK',
      rechtsgrundlage: '§ 32 Abs. 1 BSIG — Erstmeldung',
      felder: [
        {
          id: 'kenntnis',
          label: 'Zeitpunkt der Kenntnisnahme',
          kind: 'text',
          required: true,
          hint: 'Der Moment, in dem IHR es wusstet — nicht der Beginn des Vorfalls.',
        },
        {
          id: 'art',
          label: 'Art des Vorfalls',
          kind: 'select',
          required: true,
          options: [
            { id: 'ransomware', label: 'Verschlüsselung / Ransomware' },
            { id: 'ausfall', label: 'Ausfall ohne erkennbare Fremdeinwirkung' },
            { id: 'unbefugt', label: 'Unbefugter Zugriff' },
          ],
        },
        {
          id: 'systeme',
          label: 'Betroffene Dienste und Systeme',
          kind: 'multiselect',
          required: true,
          options: [
            { id: 'fs_dispo', label: 'Dateiserver Disposition' },
            { id: 'waage', label: 'Waagensteuerung' },
            { id: 'mail', label: 'Mailserver' },
          ],
        },
        {
          id: 'boeswillig',
          label: 'Verdacht auf rechtswidrige oder böswillige Handlung',
          kind: 'tristate',
          required: true,
        },
        {
          id: 'grenz',
          label: 'Grenzüberschreitende Auswirkungen',
          kind: 'tristate',
          required: true,
        },
        {
          id: 'dienstleistung',
          label: 'Betroffene kritische Dienstleistung (§ 32 Abs. 3)',
          kind: 'select',
          options: [
            { id: 'entsorgung', label: 'Abfallentsorgung — Disposition' },
            { id: 'keine', label: 'keine kritische Dienstleistung betroffen' },
          ],
        },
        { id: 'bewertung', label: 'Erstbewertung', kind: 'longtext' },
      ],
    },
  },
  solutions: [
    {
      interactions: ['submit'],
      allRequired: true,
      resultText: 'Vorschau: abgesendet.',
      skillGain: { security: 5 },
    },
  ],
  hints: ['Was weißt du nach drei Stunden wirklich — und was nimmst du nur an?'],
};

const PREVIEWS: Record<string, GuiContext | undefined> = {
  taskmanager: guiLevelEvents.find((e) => e.guiContext?.app === 'taskmanager')?.guiContext,
  eventviewer: guiLevelEvents.find((e) => e.guiContext?.app === 'eventviewer')?.guiContext,
  uac: guiLevelEvents.find((e) => e.guiContext?.app === 'uac')?.guiContext,
  settings: guiLevelEvents.find((e) => e.guiContext?.app === 'settings')?.guiContext,
  explorer: guiLevelEvents.find((e) => e.guiContext?.app === 'explorer')?.guiContext,
  // Blackout track GUI levels (the new core-firewall app + its EventViewer/Task-Manager beats).
  blk_logread: blk('blk_c1_logread'),
  blk_hunt_gui: blk('blk_c1_hunt_gui'),
  corefirewall: blk('blk_c3_firewall'),
  kataster: katasterSample,
  meldung: meldungSample,
};

export function DevGuiPreview({ previewId }: { previewId: string }) {
  const [solvedAt, setSolvedAt] = useState<string | null>(null);
  const context = PREVIEWS[previewId];

  if (!context) {
    return (
      <div className="min-h-screen p-8 text-terminal-green font-mono">
        <div className="mb-2">Unbekannte Preview-ID: „{previewId}".</div>
        <div className="text-terminal-green-muted">
          Verfügbar:{' '}
          {Object.entries(PREVIEWS)
            .filter(([, v]) => v)
            .map(([k]) => `?preview=${k}`)
            .join('  ·  ') || '(keine)'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-yellow-900/40 border-b border-yellow-500/50 text-yellow-200 text-xs px-3 py-1 font-mono">
        ⚠️ DEV PREVIEW — „{previewId}" — nicht produktiv. {solvedAt && `Gelöst: ${solvedAt}`}
      </div>
      <div className="flex-1 p-4">
        <WindowsLevel
          context={context}
          onSolved={(skillGain) => setSolvedAt(JSON.stringify(skillGain))}
          onCancel={() => setSolvedAt('(abgebrochen)')}
          briefingOverride={
            // DEV: preview a flag-dependent briefing variant via ?flag=<name>.
            context.briefingVariants?.find(
              (v) => v.flag === new URLSearchParams(window.location.search).get('flag')
            )?.briefing
          }
        />
      </div>
    </div>
  );
}
