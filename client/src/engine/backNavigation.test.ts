import { describe, it, expect } from 'vitest';
import { resolveBack, BackViewState } from './backNavigation';

const base: BackViewState = { anyModalOpen: false, phase: 'playing', isLearning: false, hasCurrentContent: false };
const v = (o: Partial<BackViewState>): BackViewState => ({ ...base, ...o });

describe('resolveBack', () => {
  it('returns null when any modal is open (guard wins over everything)', () => {
    expect(resolveBack(v({ anyModalOpen: true, phase: 'terminal' }))).toBeNull();
    expect(resolveBack(v({ anyModalOpen: true, phase: 'gameover' }))).toBeNull();
  });
  it('terminal (and GUI) → cancel-level', () => {
    expect(resolveBack(v({ phase: 'terminal' }))).toEqual({ kind: 'cancel-level', label: 'Level abbrechen' });
  });
  it('learning event/scenario card → learning-hub', () => {
    expect(resolveBack(v({ phase: 'playing', isLearning: true, hasCurrentContent: true })))
      .toEqual({ kind: 'learning-hub', label: 'Zum Lernpfad' });
  });
  it('learning hub (no content) → main-menu', () => {
    expect(resolveBack(v({ phase: 'playing', isLearning: true, hasCurrentContent: false })))
      .toEqual({ kind: 'main-menu', label: 'Zum Hauptmenü' });
  });
  it('standard/story active card → confirm-leave-run', () => {
    expect(resolveBack(v({ phase: 'playing', isLearning: false, hasCurrentContent: true })))
      .toEqual({ kind: 'confirm-leave-run', label: 'Zum Hauptmenü' });
  });
  it('gameover and storyEnding → main-menu', () => {
    expect(resolveBack(v({ phase: 'gameover' }))).toEqual({ kind: 'main-menu', label: 'Zum Hauptmenü' });
    expect(resolveBack(v({ phase: 'storyEnding' }))).toEqual({ kind: 'main-menu', label: 'Zum Hauptmenü' });
  });
  it('result stays forward-only → null', () => {
    expect(resolveBack(v({ phase: 'result' }))).toBeNull();
    expect(resolveBack(v({ phase: 'result', isLearning: true, hasCurrentContent: true }))).toBeNull();
  });
  it('menu and content-less standard playing → null', () => {
    expect(resolveBack(v({ phase: 'menu' }))).toBeNull();
    expect(resolveBack(v({ phase: 'playing', isLearning: false, hasCurrentContent: false }))).toBeNull();
  });
});
