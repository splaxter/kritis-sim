import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';

interface StoryBackgroundContextType {
  currentImage: string | null;
  setBackgroundImage: (image: string | null) => void;
  isStoryMode: boolean;
  setStoryMode: (enabled: boolean) => void;
  /** Configure the run's campaign art. `defaultImage: null` means the campaign
   *  is text-only — a null background NEVER falls back to a default or the
   *  previous image (so no other campaign's artwork can leak in). */
  setCampaignArt: (defaultImage: string | null) => void;
}

const StoryBackgroundContext = createContext<StoryBackgroundContextType | null>(null);

// Fallback ambient background for the probation campaign when an event declares
// no specific image. A text-only campaign passes null via setCampaignArt.
const DEFAULT_STORY_BG = '/images/events/evt_erster_arbeitstag.webp';

export function StoryBackgroundProvider({ children }: { children: ReactNode }) {
  const [isStoryMode, setStoryMode] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const lastImageRef = useRef<string | null>(null);
  // The campaign's fallback image; null = text-only (no fallback ever).
  const defaultImageRef = useRef<string | null>(DEFAULT_STORY_BG);

  const setBackgroundImage = useCallback((image: string | null) => {
    if (image) {
      // New image provided - use it and remember it
      lastImageRef.current = image;
      setCurrentImage(image);
    } else if (defaultImageRef.current === null) {
      // Text-only campaign: no image, and no fallback allowed → stay blank so
      // no probation/other-campaign artwork leaks in.
      setCurrentImage(null);
    } else if (lastImageRef.current) {
      // No image but we have a previous one - keep showing it
      setCurrentImage(lastImageRef.current);
    } else {
      // No image and no previous - use the campaign default
      setCurrentImage(defaultImageRef.current);
    }
  }, []);

  const setCampaignArt = useCallback((defaultImage: string | null) => {
    defaultImageRef.current = defaultImage;
    // A text-only campaign must also drop any remembered image + current art.
    if (defaultImage === null) {
      lastImageRef.current = null;
      setCurrentImage(null);
    }
  }, []);

  // Reset when story mode is disabled.
  // Gate on a real true->false transition so the reset does not fire on
  // initial mount, where it could clobber a background set in the same tick.
  const prevStoryMode = useRef(false);
  useEffect(() => {
    if (!isStoryMode && prevStoryMode.current) {
      setCurrentImage(null);
      lastImageRef.current = null;
    }
    prevStoryMode.current = isStoryMode;
  }, [isStoryMode]);

  return (
    <StoryBackgroundContext.Provider
      value={{
        currentImage: isStoryMode ? currentImage : null,
        setBackgroundImage,
        isStoryMode,
        setStoryMode,
        setCampaignArt,
      }}
    >
      {children}
    </StoryBackgroundContext.Provider>
  );
}

export function useStoryBackground() {
  const context = useContext(StoryBackgroundContext);
  if (!context) {
    throw new Error('useStoryBackground must be used within StoryBackgroundProvider');
  }
  return context;
}
