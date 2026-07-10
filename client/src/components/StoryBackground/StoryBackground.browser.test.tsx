import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { StoryBackground } from './index';
import { StoryBackgroundProvider, useStoryBackground } from '../../contexts/StoryBackgroundContext';
import { useEffect } from 'react';

function Setup({ image }: { image: string }) {
  const { setStoryMode, setBackgroundImage } = useStoryBackground();
  useEffect(() => {
    setStoryMode(true);
    setBackgroundImage(image);
  }, [setStoryMode, setBackgroundImage, image]);
  return <StoryBackground />;
}

describe('StoryBackground', () => {
  it('applies ken-burns animation to the active image', () => {
    const { container } = render(
      <StoryBackgroundProvider>
        <Setup image="/images/events/06_leitwarte-monitore-ausfall.webp" />
      </StoryBackgroundProvider>
    );
    const img = container.querySelector('img[src="/images/events/06_leitwarte-monitore-ausfall.webp"]');
    expect(img).not.toBeNull();
    expect(img!.className).toContain('animate-kenburns');
    expect(img!.className).toContain('motion-reduce:animate-none');
  });

  it('uses the lightened overlay gradient', () => {
    const { container } = render(
      <StoryBackgroundProvider>
        <Setup image="/images/events/06_leitwarte-monitore-ausfall.webp" />
      </StoryBackgroundProvider>
    );
    const overlay = container.querySelector('.bg-gradient-to-t');
    expect(overlay).not.toBeNull();
    expect(overlay!.className).toContain('from-black/85');
    expect(overlay!.className).toContain('via-black/45');
    expect(overlay!.className).toContain('to-black/15');
  });
});
