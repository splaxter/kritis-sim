import type { GamePhase } from '../hooks/useGame';

export type BackActionKind = 'cancel-level' | 'learning-hub' | 'main-menu' | 'confirm-leave-run';
export interface BackAction { kind: BackActionKind; label: string }

export interface BackViewState {
  anyModalOpen: boolean;
  phase: GamePhase;
  isLearning: boolean;
  hasCurrentContent: boolean; // Event OR Scenario
}

// Ordered decision chain — mirrors the design's priority table. The modal
// guard wins first so an open overlay handles its own ESC (no double action).
export function resolveBack(v: BackViewState): BackAction | null {
  if (v.anyModalOpen) return null;
  if (v.phase === 'terminal') return { kind: 'cancel-level', label: 'Level abbrechen' };
  if (v.phase === 'playing') {
    if (v.isLearning) {
      return v.hasCurrentContent
        ? { kind: 'learning-hub', label: 'Zum Lernpfad' }
        : { kind: 'main-menu', label: 'Zum Hauptmenü' };
    }
    if (v.hasCurrentContent) return { kind: 'confirm-leave-run', label: 'Zum Hauptmenü' };
    return null;
  }
  if (v.phase === 'gameover' || v.phase === 'storyEnding') {
    return { kind: 'main-menu', label: 'Zum Hauptmenü' };
  }
  return null; // menu, result
}
