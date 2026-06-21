// client/src/components/IntroScreen/index.tsx
import { useState, useEffect } from 'react';
import { LegalPages } from '../LegalPages';

interface IntroScreenProps {
  onEnter: () => void;
}

export function IntroScreen({ onEnter }: IntroScreenProps) {
  const [fadeIn, setFadeIn] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [legalPage, setLegalPage] = useState<'impressum' | 'datenschutz' | null>(null);

  useEffect(() => {
    // Fade in the image
    const fadeTimer = setTimeout(() => setFadeIn(true), 100);
    // Show the prompt after image fades in
    const promptTimer = setTimeout(() => setShowPrompt(true), 1500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(promptTimer);
    };
  }, []);

  // Handle click or key press to enter
  useEffect(() => {
    if (legalPage) return; // Don't handle keys when legal modal is open

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        onEnter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEnter, legalPage]);

  // Handle ESC to close legal modal
  useEffect(() => {
    if (!legalPage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLegalPage(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [legalPage]);

  // Handle click on main area (not footer links)
  const handleMainClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on footer links
    if ((e.target as HTMLElement).closest('.legal-footer')) return;
    onEnter();
  };

  return (
    <div
      className="fixed inset-0 bg-black cursor-pointer"
      onClick={handleMainClick}
    >
      {/* Background image */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          fadeIn ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <img
          src="/warm_start.png"
          alt="WARM - Kommunale Abfallwirtschaft"
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      </div>

      {/* Title and prompt */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-16">
        {/* Game title */}
        <div
          className={`text-center mb-8 transition-all duration-700 ${
            fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-wider mb-2">
            KRITIS ADMIN SIMULATOR
          </h1>
          <p className="text-terminal-green text-lg tracking-widest">
            Probezeit Edition
          </p>
        </div>

        {/* Enter prompt */}
        <div
          className={`transition-opacity duration-500 ${
            showPrompt ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="text-white/70 text-sm tracking-widest animate-pulse">
            [ KLICKEN ODER ENTER ZUM STARTEN ]
          </div>
        </div>
      </div>

      {/* Scanline effect for retro feel */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />

      {/* Legal footer */}
      <div className="legal-footer absolute bottom-4 left-0 right-0 flex justify-center gap-4 text-xs text-white/40">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setLegalPage('impressum');
          }}
          className="hover:text-white/70 underline"
        >
          Impressum
        </button>
        <span>|</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setLegalPage('datenschutz');
          }}
          className="hover:text-white/70 underline"
        >
          Datenschutz
        </button>
      </div>

      {/* Legal pages modal */}
      {legalPage && (
        <LegalPages
          initialPage={legalPage}
          onClose={() => setLegalPage(null)}
        />
      )}
    </div>
  );
}
