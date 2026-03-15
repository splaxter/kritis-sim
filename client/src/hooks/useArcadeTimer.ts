/**
 * Arcade Timer Hook
 * Countdown timer for arcade mode with auto-timeout handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseArcadeTimerOptions {
  /** Timer duration in seconds */
  duration: number;
  /** Whether the timer is enabled */
  enabled: boolean;
  /** Callback when timer expires */
  onTimeout: () => void;
  /** Whether to auto-start when enabled */
  autoStart?: boolean;
}

interface UseArcadeTimerReturn {
  /** Current remaining time in seconds */
  timeRemaining: number;
  /** Progress from 0 to 1 (1 = full, 0 = expired) */
  progress: number;
  /** Whether timer is currently running */
  isRunning: boolean;
  /** Whether timer has expired */
  isExpired: boolean;
  /** Start or restart the timer */
  start: () => void;
  /** Pause the timer */
  pause: () => void;
  /** Resume the timer */
  resume: () => void;
  /** Stop and reset the timer */
  reset: () => void;
}

export function useArcadeTimer({
  duration,
  enabled,
  onTimeout,
  autoStart = true,
}: UseArcadeTimerOptions): UseArcadeTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number | null>(null);

  // Keep callback ref up to date
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (!enabled) return;

    clearTimer();
    setTimeRemaining(duration);
    setIsExpired(false);
    setIsRunning(true);
    startTimeRef.current = Date.now();
    pausedTimeRef.current = null;

    intervalRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - (startTimeRef.current || 0)) / 1000;
      const remaining = Math.max(0, duration - elapsed);

      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearTimer();
        setIsRunning(false);
        setIsExpired(true);
        onTimeoutRef.current();
      }
    }, 100); // Update every 100ms for smooth progress
  }, [enabled, duration, clearTimer]);

  const pause = useCallback(() => {
    if (!isRunning) return;

    clearTimer();
    pausedTimeRef.current = timeRemaining;
    setIsRunning(false);
  }, [isRunning, timeRemaining, clearTimer]);

  const resume = useCallback(() => {
    if (!enabled || isExpired || isRunning) return;
    if (pausedTimeRef.current === null) return;

    const remainingDuration = pausedTimeRef.current;
    setIsRunning(true);
    startTimeRef.current = Date.now();

    intervalRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - (startTimeRef.current || 0)) / 1000;
      const remaining = Math.max(0, remainingDuration - elapsed);

      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearTimer();
        setIsRunning(false);
        setIsExpired(true);
        onTimeoutRef.current();
      }
    }, 100);

    pausedTimeRef.current = null;
  }, [enabled, isExpired, isRunning, clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setTimeRemaining(duration);
    setIsRunning(false);
    setIsExpired(false);
    startTimeRef.current = null;
    pausedTimeRef.current = null;
  }, [duration, clearTimer]);

  // Auto-start when enabled changes to true
  useEffect(() => {
    if (enabled && autoStart) {
      start();
    } else if (!enabled) {
      reset();
    }
  }, [enabled, autoStart, start, reset]);

  // Reset when duration changes
  useEffect(() => {
    if (enabled && autoStart) {
      start();
    }
  }, [duration]);

  const progress = duration > 0 ? timeRemaining / duration : 0;

  return {
    timeRemaining,
    progress,
    isRunning,
    isExpired,
    start,
    pause,
    resume,
    reset,
  };
}

/**
 * Format time remaining as "MM:SS" or "SS.s"
 */
export function formatArcadeTime(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Under 60 seconds, show with one decimal
  return seconds.toFixed(1);
}

/**
 * Get color class based on time remaining
 */
export function getTimerColor(progress: number): string {
  if (progress > 0.5) return 'timer-safe';      // Green - plenty of time
  if (progress > 0.25) return 'timer-warning';  // Yellow - getting low
  return 'timer-danger';                         // Red - critical
}
