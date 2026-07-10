import { useEffect } from 'react';
import { useTypewriter } from '../../hooks/useTypewriter';

interface ChapterCardProps {
  /** Z.B. "KAPITEL 3" oder leer für Kino-Events. */
  kicker: string;
  title: string;
  image: string;
  onDone: () => void;
}

const AUTO_DISMISS_MS = 2500;
const TITLE_CPS = 25;

/**
 * Vollbild-Kino-Beat: Artwork + getippter Titel. Schließt nach 2,5s
 * oder bei beliebiger Taste/Klick.
 */
export function ChapterCard({ kicker, title, image, onDone }: ChapterCardProps) {
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const typed = useTypewriter(title, { charsPerSecond: TITLE_CPS, enabled: !prefersReducedMotion });

  useEffect(() => {
    const t = window.setTimeout(onDone, AUTO_DISMISS_MS);
    const onKey = () => onDone();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-30 cursor-pointer" onClick={onDone}>
      <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover animate-kenburns motion-reduce:animate-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        {kicker && (
          <div className="text-terminal-green/70 text-sm tracking-[0.4em] uppercase mb-3">{kicker}</div>
        )}
        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-widest">
          {typed.text}
          {!typed.done && <span className="animate-pulse">▌</span>}
        </h1>
      </div>
    </div>
  );
}
