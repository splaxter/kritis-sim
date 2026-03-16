import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';

interface StoryBackgroundContextType {
  currentImage: string | null;
  setBackgroundImage: (image: string | null) => void;
  isStoryMode: boolean;
  setStoryMode: (enabled: boolean) => void;
}

const StoryBackgroundContext = createContext<StoryBackgroundContextType | null>(null);

// Default ambient background for story mode when no specific image
const DEFAULT_STORY_BG = '/images/events/evt_erster_arbeitstag.webp';

export function StoryBackgroundProvider({ children }: { children: ReactNode }) {
  const [isStoryMode, setStoryMode] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const lastImageRef = useRef<string | null>(null);

  const setBackgroundImage = useCallback((image: string | null) => {
    if (image) {
      // New image provided - use it and remember it
      lastImageRef.current = image;
      setCurrentImage(image);
    } else if (lastImageRef.current) {
      // No image but we have a previous one - keep showing it
      setCurrentImage(lastImageRef.current);
    } else {
      // No image and no previous - use default
      setCurrentImage(DEFAULT_STORY_BG);
    }
  }, []);

  // Reset when story mode is disabled
  useEffect(() => {
    if (!isStoryMode) {
      setCurrentImage(null);
      lastImageRef.current = null;
    }
  }, [isStoryMode]);

  return (
    <StoryBackgroundContext.Provider
      value={{
        currentImage: isStoryMode ? currentImage : null,
        setBackgroundImage,
        isStoryMode,
        setStoryMode,
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
