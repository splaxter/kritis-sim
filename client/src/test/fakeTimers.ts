// client/src/test/fakeTimers.ts
import { vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';

/**
 * File-level fake timers for GUI-level tests: removes the real 1.6 s
 * SOLVE_DELAY_MS dwell (useGuiLevel.ts) that made these suites time out
 * under full-suite parallel load. Call once at module scope, then create
 * users with fakeTimerUser() and advance with
 * `act(() => vi.advanceTimersByTime(SOLVE_DELAY_MS))`.
 */
export function installFakeTimers(): void {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    // @testing-library's act wrapper/waitFor only auto-advance fake timers
    // when they detect *Jest* (dom/dist/helpers.js jestFakeTimersAreEnabled:
    // `typeof jest !== 'undefined'` + setTimeout.clock). Without this stub,
    // user.click() awaits a faked setTimeout(0) that never fires and hangs.
    vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime.bind(vi) });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
}

/** userEvent wired to advance fake timers instead of sleeping for real. */
export const fakeTimerUser = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
