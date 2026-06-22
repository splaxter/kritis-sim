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

// Map preview ids → a GuiContext. Pulls from real level content where possible.
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
