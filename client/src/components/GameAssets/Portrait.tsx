import { useState } from 'react';
import { NpcId, NpcEmotion, NPC_DISPLAY_NAMES } from './types';

interface PortraitProps {
  npcId: NpcId;
  emotion?: NpcEmotion;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
  lg: 'w-32 h-32',
};

// ASCII art fallbacks for each NPC (displayed when no image exists)
const ASCII_PORTRAITS: Record<NpcId, string> = {
  chef: `
┌─────────┐
│  ◠ _ ◠  │
│   ═══   │
│  ┌───┐  │
│  │IT │  │
└──┴───┴──┘`,
  gf: `
┌─────────┐
│  ◠ ◠    │
│   ─── G │
│ ╔═════╗ │
│ ║CHEF ║ │
└─╚═════╝─┘`,
  kaemmerer: `
┌─────────┐
│ □ _ □   │
│  ───    │
│ €€€€€€€ │
│ BUDGET  │
└─────────┘`,
  fachabteilung: `
┌─────────┐
│  ? ? ?  │
│   ───   │
│ HELP!!! │
│ printer │
└─────────┘`,
  kollegen: `
┌─────────┐
│ ◠◠ ◡◡  │
│ ── ──  │
│ [TEAM] │
│ ☕ ☕   │
└─────────┘`,
  marco: `
┌─────────┐
│ ◉_◉ 📱  │
│  ───    │
│[AMSE IT]│
│*on call*│
└─────────┘`,
  stefan: `
┌─────────┐
│ $ _ $   │
│  ═══    │
│PARTNER! │
│💼 📊 💰│
└─────────┘`,
  thomas: `
┌─────────┐
│ ◉ _ ◉   │
│  ───    │
│[TELEKOM]│
│ 📞 📡  │
└─────────┘`,
  sabine: `
┌─────────┐
│ ◡ _ ◡   │
│  ═══    │
│MAGENTA! │
│ 📊 💼  │
└─────────┘`,
  kevin: `
┌─────────┐
│ ◠ _ ◠ 🎧│
│  ───    │
│ CLOUD☁ │
│ AZURE  │
└─────────┘`,
  martin: `
┌─────────┐
│ □ _ □   │
│  ═══    │
│ M365 💰│
│LICENSES│
└─────────┘`,
};

// Emotion indicators
const EMOTION_INDICATORS: Partial<Record<NpcEmotion, string>> = {
  happy: '😊',
  angry: '😠',
  stressed: '😰',
  disappointed: '😞',
  confused: '😕',
  grateful: '🙏',
  defensive: '🛡️',
  selling: '💼',
};

export function Portrait({
  npcId,
  emotion = 'neutral',
  size = 'md',
  showName = true,
  className = '',
}: PortraitProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Construct image path
  const imagePath = `/assets/images/portraits/${npcId}${emotion !== 'neutral' ? `-${emotion}` : ''}.png`;
  const fallbackPath = `/assets/images/portraits/${npcId}.png`;

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const displayName = NPC_DISPLAY_NAMES[npcId];
  const emotionIndicator = EMOTION_INDICATORS[emotion];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        className={`${SIZE_CLASSES[size]} relative border border-terminal-border bg-terminal-bg-secondary flex items-center justify-center overflow-hidden`}
      >
        {!imageError ? (
          <>
            {/* Actual image */}
            <img
              src={imagePath}
              alt={displayName}
              onError={(e) => {
                // Try fallback (neutral emotion) before showing ASCII
                if (!imagePath.includes('-neutral')) {
                  (e.target as HTMLImageElement).src = fallbackPath;
                } else {
                  handleImageError();
                }
              }}
              onLoad={handleImageLoad}
              className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity`}
            />
            {/* Loading state */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-terminal-green-dim animate-pulse">...</span>
              </div>
            )}
          </>
        ) : (
          /* ASCII fallback */
          <pre className="text-[6px] leading-[6px] text-terminal-green font-mono whitespace-pre">
            {ASCII_PORTRAITS[npcId]}
          </pre>
        )}

        {/* Emotion indicator overlay */}
        {emotionIndicator && (
          <span className="absolute bottom-0 right-0 text-xs bg-terminal-bg px-1">
            {emotionIndicator}
          </span>
        )}
      </div>

      {/* Name label */}
      {showName && (
        <span className="text-xs text-terminal-green-dim mt-1 text-center">
          {displayName}
        </span>
      )}
    </div>
  );
}
