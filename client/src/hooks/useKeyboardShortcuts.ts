/**
 * Keyboard Shortcuts Hook
 * Handles global keyboard shortcuts with stable event listener
 */
import { useEffect, useRef, useCallback } from 'react';

interface KeyboardShortcutsOptions {
  onSave: () => void;
  onLoad: () => void;
  onEscape: () => void;
  isEnabled: boolean;
  isModalOpen: boolean;
}

/**
 * Hook for handling global keyboard shortcuts
 * Uses refs to avoid re-registering event listeners on state changes
 */
export function useKeyboardShortcuts({
  onSave,
  onLoad,
  onEscape,
  isEnabled,
  isModalOpen,
}: KeyboardShortcutsOptions): void {
  // Use refs to always have access to current callback values
  // without needing to re-register the event listener
  const callbacksRef = useRef({ onSave, onLoad, onEscape });
  const stateRef = useRef({ isEnabled, isModalOpen });

  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = { onSave, onLoad, onEscape };
  }, [onSave, onLoad, onEscape]);

  // Update refs when state changes
  useEffect(() => {
    stateRef.current = { isEnabled, isModalOpen };
  }, [isEnabled, isModalOpen]);

  // Set up event listener once
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const { isEnabled, isModalOpen } = stateRef.current;
      const { onSave, onLoad, onEscape } = callbacksRef.current;

      // ESC to close modal
      if (e.key === 'Escape' && isModalOpen) {
        onEscape();
        return;
      }

      // Only allow save/load during gameplay
      if (!isEnabled) return;

      // S for save (Ctrl+S or just S)
      if (e.key === 's' || e.key === 'S') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
        }
        onSave();
      }

      // L for load
      if (e.key === 'l' || e.key === 'L') {
        onLoad();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Empty deps - only register once
}
