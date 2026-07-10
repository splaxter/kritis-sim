import { describe, it, expect, beforeEach } from 'vitest';
import { soundEngine, cueForEvent, SOUND_PREF_KEY } from './soundEngine';

describe('soundEngine', () => {
  beforeEach(() => {
    localStorage.clear();
    soundEngine._resetForTests();
  });

  it('is muted by default (opt-in)', () => {
    expect(soundEngine.isEnabled()).toBe(false);
  });

  it('toggle persists to localStorage', () => {
    soundEngine.toggle();
    expect(soundEngine.isEnabled()).toBe(true);
    expect(localStorage.getItem(SOUND_PREF_KEY)).toBe('on');
    soundEngine.toggle();
    expect(soundEngine.isEnabled()).toBe(false);
    expect(localStorage.getItem(SOUND_PREF_KEY)).toBe('off');
  });

  it('restores enabled state from localStorage', () => {
    localStorage.setItem(SOUND_PREF_KEY, 'on');
    soundEngine._resetForTests();
    expect(soundEngine.isEnabled()).toBe(true);
  });

  it('one-shots never throw without WebAudio (jsdom)', () => {
    soundEngine.toggle(); // an
    expect(() => {
      soundEngine.tick();
      soundEngine.confirm();
      soundEngine.stinger();
    }).not.toThrow();
  });
});

describe('cueForEvent', () => {
  it('returns stinger for incident/compromise tags', () => {
    expect(cueForEvent(['story', 'incident'])).toBe('stinger');
    expect(cueForEvent(['chapter3', 'compromise'])).toBe('stinger');
  });
  it('returns null otherwise', () => {
    expect(cueForEvent(['story', 'orientation'])).toBeNull();
    expect(cueForEvent([])).toBeNull();
    expect(cueForEvent(undefined)).toBeNull();
  });
});
