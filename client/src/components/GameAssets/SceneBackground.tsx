import { useState } from 'react';
import { SceneId } from './types';

interface SceneBackgroundProps {
  sceneId: SceneId;
  opacity?: number;
  children?: React.ReactNode;
  className?: string;
}

// ASCII art backgrounds for fallback (much simpler, just atmospheric)
const ASCII_SCENES: Record<SceneId, string> = {
  'server-room': `
╔════════════════════════════════════════════════╗
║ ▓▓▓ ▓▓▓ ▓▓▓ ▓▓▓   SERVER ROOM   ▓▓▓ ▓▓▓ ▓▓▓ ▓▓▓║
║ ███ ███ ███ ███                 ███ ███ ███ ███║
║ ░░░ ░░░ ░░░ ░░░   [KRITIS-SRV]  ░░░ ░░░ ░░░ ░░░║
║ ▓▓▓ ▓▓▓ ▓▓▓ ▓▓▓                 ▓▓▓ ▓▓▓ ▓▓▓ ▓▓▓║
╚════════════════════════════════════════════════╝`,
  office: `
╔════════════════════════════════════════════════╗
║  ┌──────┐  ┌──────┐    IT-BÜRO    ┌──────┐    ║
║  │ ████ │  │ ████ │               │ ████ │    ║
║  │ ████ │  │ ████ │   ☕ ═══      │ ████ │    ║
║  └──────┘  └──────┘               └──────┘    ║
╚════════════════════════════════════════════════╝`,
  'meeting-room': `
╔════════════════════════════════════════════════╗
║      BESPRECHUNGSRAUM          [PROJECTOR]     ║
║  ┌────────────────────────────────────────┐    ║
║  │ ○   ○   ○   ○   ○   ○   ○   ○   ○   ○ │    ║
║  └────────────────────────────────────────┘    ║
╚════════════════════════════════════════════════╝`,
  helpdesk: `
╔════════════════════════════════════════════════╗
║     HELPDESK        Ticket #4712    [RING!]    ║
║  ┌─────────────┐   ┌─────────────────────┐     ║
║  │  WARTENR: 42│   │ ☎ ☎ ☎ ☎ ☎ ☎ ☎ ☎ ☎ │     ║
║  └─────────────┘   └─────────────────────┘     ║
╚════════════════════════════════════════════════╝`,
  datacenter: `
╔════════════════════════════════════════════════╗
║     RECHENZENTRUM        [BIOMETRIC ACCESS]    ║
║  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   ║
║  ████████████████████████████████████████████  ║
║  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
╚════════════════════════════════════════════════╝`,
  'vendor-office': `
╔════════════════════════════════════════════════╗
║  AMSE IT SOLUTIONS GMBH    "Ihr Partner für"   ║
║  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   ║
║  │SOPHOS ★│ │MS PART│ │CISCO  │ │ISO9001│   ║
║  └────────┘ └────────┘ └────────┘ └────────┘   ║
╚════════════════════════════════════════════════╝`,
};

const SCENE_NAMES: Record<SceneId, string> = {
  'server-room': 'Serverraum',
  office: 'IT-Büro',
  'meeting-room': 'Besprechungsraum',
  helpdesk: 'Helpdesk',
  datacenter: 'Rechenzentrum',
  'vendor-office': 'AMSE IT Büro',
};

export function SceneBackground({
  sceneId,
  opacity = 0.15,
  children,
  className = '',
}: SceneBackgroundProps) {
  const [imageError, setImageError] = useState(false);
  const imagePath = `/assets/images/scenes/${sceneId}.png`;

  return (
    <div className={`relative ${className}`}>
      {/* Background layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {!imageError ? (
          <img
            src={imagePath}
            alt={SCENE_NAMES[sceneId]}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
            style={{ opacity }}
          />
        ) : (
          /* ASCII fallback */
          <pre
            className="text-[8px] leading-[8px] text-terminal-green font-mono whitespace-pre absolute inset-0 flex items-center justify-center"
            style={{ opacity: opacity * 2 }}
          >
            {ASCII_SCENES[sceneId]}
          </pre>
        )}
      </div>

      {/* Content layer */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Simple location indicator (text only)
export function LocationIndicator({ sceneId }: { sceneId: SceneId }) {
  return (
    <span className="text-terminal-green-dim text-xs">
      📍 {SCENE_NAMES[sceneId]}
    </span>
  );
}
