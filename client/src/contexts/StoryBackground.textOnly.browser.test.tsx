import { describe, it, expect } from 'vitest';
import { useEffect } from 'react';
import { render, act } from '@testing-library/react';
import { StoryBackgroundProvider, useStoryBackground } from './StoryBackgroundContext';
import { StoryBackground } from '../components/StoryBackground';

/**
 * Real-rendering guard for the text-only requirement: a null event image on a
 * text-only campaign must NOT fall back to the probation default artwork or a
 * previous image — StoryBackground must render nothing.
 */
function Controller({ art, image }: { art: string | null; image: string | null }) {
  const { setStoryMode, setCampaignArt, setBackgroundImage } = useStoryBackground();
  useEffect(() => {
    setStoryMode(true);
    setCampaignArt(art);
    setBackgroundImage(image);
  }, [art, image, setStoryMode, setCampaignArt, setBackgroundImage]);
  return null;
}

function renderBg(art: string | null, image: string | null) {
  const result = render(
    <StoryBackgroundProvider>
      <Controller art={art} image={image} />
      <StoryBackground />
    </StoryBackgroundProvider>,
  );
  return result.container;
}

describe('StoryBackground — text-only campaign renders no artwork', () => {
  it('a text-only campaign (art=null) with a null image renders NO image', () => {
    let container!: HTMLElement;
    act(() => { container = renderBg(null, null); });
    expect(container.querySelector('img')).toBeNull();
  });

  it('a text-only campaign never falls back to the probation default background', () => {
    let container!: HTMLElement;
    act(() => { container = renderBg(null, null); });
    expect(container.innerHTML).not.toContain('evt_erster_arbeitstag');
  });

  it('an art campaign (probation default) DOES fall back to its default image', () => {
    let container!: HTMLElement;
    act(() => { container = renderBg('/images/events/evt_erster_arbeitstag.webp', null); });
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/images/events/evt_erster_arbeitstag.webp');
  });
});
