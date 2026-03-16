import { useState, useEffect, useRef } from 'react';
import { useStoryBackground } from '../../contexts/StoryBackgroundContext';

/**
 * Persistent background layer for story mode
 * Handles cross-fade transitions between background images
 */
export function StoryBackground() {
  const { currentImage, isStoryMode } = useStoryBackground();
  const [displayedImage, setDisplayedImage] = useState<string | null>(null);
  const [previousImage, setPreviousImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentImage && currentImage !== displayedImage) {
      // Start transition
      setPreviousImage(displayedImage);
      setDisplayedImage(currentImage);
      setIsTransitioning(true);

      // Clear any existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }

      // End transition after animation completes
      transitionTimeoutRef.current = window.setTimeout(() => {
        setIsTransitioning(false);
        setPreviousImage(null);
      }, 800); // Match CSS transition duration
    }

    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [currentImage, displayedImage]);

  // Don't render if not in story mode or no image
  if (!isStoryMode || !displayedImage) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* Previous image (fading out) */}
      {isTransitioning && previousImage && (
        <div
          className="absolute inset-0 transition-opacity duration-700 ease-out"
          style={{ opacity: 0 }}
        >
          <img
            src={previousImage}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Current image (fading in) */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-in ${
          isTransitioning ? 'opacity-0 animate-fade-in' : 'opacity-100'
        }`}
      >
        <img
          src={displayedImage}
          alt=""
          className="w-full h-full object-cover"
          loading="eager"
        />
      </div>

      {/* Dark overlay for readability - gradient from bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/50" />

      {/* Scanline effect */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 4px)',
        }}
      />

      {/* Vignette effect */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </div>
  );
}
