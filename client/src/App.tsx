// client/src/App.tsx
import { useGame } from './hooks/useGame';
import { GameScreen } from './components/GameScreen';
import { allEvents } from './content/events';
import { selectNextEvent } from './engine/eventEngine';
import { selectNextScenario } from './engine/scenarioEngine';
import { getAllScenarios } from './content/packs';
import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useSaveLoad } from './hooks/useSaveLoad';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { GameModeId, getGameModeConfig, GameEvent, Scenario } from '@kritis/shared';
import { getNextStoryContent, isAtAuthoredStoryEnd, getLastCompletedAct, isAdventureModeComplete, calculateAdventureEnding, getEndingStats } from './engine/adventureEngine';
import { getActBreakBody } from './content/adventure/actBreaks';
import { EndingScreen } from './components/EndingScreen';
import { ADVENTURE_ENDINGS } from './content/adventure/endings';
import { adventureSidequests } from './content/adventure/sidequests';
import { adventureStoryEvents } from './content/adventure/story-events';
import { adventureSidequestEvents } from './content/adventure/sidequest-events';
import { IntroScreen } from './components/IntroScreen';
// Statically imported (not lazy): IntroScreen already pulls LegalPages into the
// eager bundle, so a dynamic import here only produces a Vite "both statically
// and dynamically imported" warning without any split benefit.
import { LegalPages } from './components/LegalPages';
import { StoryBackgroundProvider, useStoryBackground } from './contexts/StoryBackgroundContext';
import { StoryBackground } from './components/StoryBackground';
import { LearningHub } from './components/LearningHub';
import { getTrackOfLevel, getNextInTrack, isFinaleUnlocked } from './engine/learningPath';
import { useAutosave } from './hooks/useAutosave';
import { readAutosave, AutosaveEnvelope } from './engine/autosave';
import { buildRunSummary } from './engine/runSummary';
import { readMeta, recordRun, MetaProgress, TOTAL_STORY_ENDINGS } from './engine/metaProgress';
import { RunSummaryScreen } from './components/RunSummaryScreen';

// Lazy load modals - only needed when user opens them
const SaveLoadModal = lazy(() => import('./components/SaveLoadModal').then(m => ({ default: m.SaveLoadModal })));
const GameModeSelectModal = lazy(() => import('./components/GameModeSelectModal').then(m => ({ default: m.GameModeSelectModal })));
// ⚠️ DEV-ONLY preview harness — NOT for production. Lets us eyeball GUI levels at
// ?preview=<id> without fighting RNG/game-state. The import() lives inside the
// import.meta.env.DEV ternary so the chunk is fully eliminated from prod builds.
// Safe to delete (this line + the guarded block below + DevGuiPreview.tsx).
const DevGuiPreview = import.meta.env.DEV
  ? lazy(() => import('./components/WindowsLevel/DevGuiPreview').then(m => ({ default: m.DevGuiPreview })))
  : null;

// Get or create player ID from localStorage
function getPlayerId(): string {
  const stored = localStorage.getItem('kritis_player_id');
  if (stored) return stored;
  const newId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('kritis_player_id', newId);
  return newId;
}

function AppContent() {
  const game = useGame();
  const [playerId] = useState(getPlayerId);
  // Autosave found at boot → offered as "Weiter spielen?" on the menu.
  // Read exactly once; readAutosave never throws and discards corrupt data.
  const [resumeSave, setResumeSave] = useState<AutosaveEnvelope | null>(
    () => readAutosave(playerId)
  );
  const [showIntro, setShowIntro] = useState(true);
  // Cross-run meta (endings seen, runs played). Read once; updated when a run ends.
  const [meta, setMeta] = useState<MetaProgress>(() => readMeta(playerId));
  const [saveLoadModal, setSaveLoadModal] = useState<{ show: boolean; mode: 'save' | 'load' }>({
    show: false,
    mode: 'save',
  });
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);
  const [legalPage, setLegalPage] = useState<'impressum' | 'datenschutz' | null>(null);
  const { loadGame } = useSaveLoad();
  const [characters] = useState({
    chef: 'Bert',
    gf: 'Dr. Müller',
    kaemmerer: 'Herr Schmidt',
    athos: 'Frau Weber',
    kollege: 'Bjorg',
  });
  const { setStoryMode } = useStoryBackground();

  // Sync story mode state with context
  useEffect(() => {
    setStoryMode(game.state.isStoryMode);
  }, [game.state.isStoryMode, setStoryMode]);

  // Get all available scenarios
  const allScenarios = useMemo(() => getAllScenarios(), []);

  // Write autosave on every meaningful transition; clear on run end.
  useAutosave(playerId, game.state, game.phase);

  // Record the run into cross-run meta the moment it ends. Reads live state
  // (not the autosave, which useAutosave clears on the same transition), and
  // recordRun dedupes on the run seed so repeat renders count it exactly once.
  useEffect(() => {
    if (game.phase !== 'gameover' && game.phase !== 'storyEnding') return;
    const s = game.state;
    const storyComplete = s.isStoryMode && isAdventureModeComplete(s);
    const ending = storyComplete ? calculateAdventureEnding(s) : undefined;
    const score = storyComplete ? getEndingStats(s).score : undefined;
    setMeta(recordRun(playerId, { mode: s.gameMode, seed: s.seed, ending, score }));
  }, [game.phase, game.state, playerId]);

  // Handle load game
  const handleLoadGame = useCallback((state: import('@kritis/shared').GameState) => {
    game.loadState(state);
    setSaveLoadModal({ show: false, mode: 'load' });
  }, [game]);

  // Resume the run offered as "Weiter spielen?" on the menu.
  const handleResume = useCallback(() => {
    if (!resumeSave) return;
    game.loadState(resumeSave.gameState);
    setResumeSave(null); // consumed; the running game re-autosaves from here
  }, [game, resumeSave]);

  // Keyboard shortcuts for save/load
  useKeyboardShortcuts({
    onSave: useCallback(() => setSaveLoadModal({ show: true, mode: 'save' }), []),
    onLoad: useCallback(() => setSaveLoadModal({ show: true, mode: 'load' }), []),
    onEscape: useCallback(() => setSaveLoadModal(prev => ({ ...prev, show: false })), []),
    isEnabled: game.phase === 'playing' || game.phase === 'result',
    isModalOpen: saveLoadModal.show,
  });

  // Select next content (event or scenario) when needed
  useEffect(() => {
    if (game.phase === 'playing' && !game.currentEvent && !game.currentScenario) {
      // Adventure mode: use story-driven content selection
      if (game.state.isStoryMode && game.state.storyState) {
        const combinedEvents = [...allEvents, ...adventureStoryEvents, ...adventureSidequestEvents];

        // Campaign fully played → real ending screen. Must run BEFORE the
        // act-break check: after ch12 the engine would otherwise re-serve beat 0
        // of the final chapter forever.
        if (isAdventureModeComplete(game.state)) {
          game.endStoryAct();
          return;
        }

        // Entered a chapter that isn't fully authored → act-break "Fortsetzung
        // folgt" ending, BEFORE serving any of its (possibly partial) content and
        // instead of empty day-skips to a false victory.
        if (isAtAuthoredStoryEnd(game.state, combinedEvents, allScenarios)) {
          game.endStoryAct();
          return;
        }

        const result = getNextStoryContent(game.state, combinedEvents, allScenarios);

        if (result.content) {
          // Check if it's an event or scenario by looking for 'choices' vs 'steps'
          if ('choices' in result.content) {
            game.setEvent(result.content as GameEvent);
          } else if ('steps' in result.content) {
            game.setScenario(result.content as Scenario);
          }
        } else {
          // No adventure content available - advance to next day
          console.warn('No adventure content available, advancing to next day');
          game.skipToNextDay();
        }
        return;
      }

      // Check if we're in CLI-only mode (learning mode)
      const modeConfig = getGameModeConfig(game.state.gameMode);
      const cliOnly = modeConfig.features.cliOnly === true;

      // Learning mode: NEVER auto-serve a level. The Learning Hub renders
      // instead and the player explicitly picks their next lesson.
      if (cliOnly) {
        return;
      }

      // Standard mode: probabilistic content selection
      // Use scenarios ~30% of the time after week 1, increasing with progression
      // Skip scenarios entirely in CLI-only mode
      if (!cliOnly) {
        const scenarioChance = Math.min(0.5, 0.1 + (game.state.currentWeek - 1) * 0.05);
        const hash = simpleHash(game.state.seed + game.state.currentWeek + game.state.currentDay + game.state.completedEvents.length);
        const useScenario = (hash % 100) < (scenarioChance * 100);

        if (useScenario && allScenarios.length > 0) {
          const nextScenario = selectNextScenario(allScenarios, game.state, game.state.seed);
          if (nextScenario) {
            game.setScenario(nextScenario);
            return;
          }
        }
      }

      // Fall back to events
      const nextEvent = selectNextEvent(allEvents, game.state, game.state.seed);
      if (nextEvent) {
        game.setEvent(nextEvent);
        return;
      }

      // No content available - advance to next day to prevent infinite loop
      // This can happen if all events/scenarios have been completed for this week
      console.warn('No content available for this day, advancing to next day');
      game.skipToNextDay();
    }
  }, [game.phase, game.currentEvent, game.currentScenario, game.state, allScenarios]);

  function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // Learning mode: player picked a level in the hub. Remember its track (so the
  // hub's recommendation stays within it) then serve that level.
  const handlePickLearningLevel = useCallback((level: GameEvent) => {
    const trackId = getTrackOfLevel(level.id)?.id;
    if (trackId) game.setLearningTrack(trackId);
    game.setEvent(level);
  }, [game]);

  // Learning result-screen CTAs: continue within the track, return to the hub,
  // or jump into the finale. State timing: the just-completed level is already
  // in completedEvents by the time the result renders (closeTerminal/makeChoice
  // record it), so getNextInTrack/isFinaleUnlocked read the post-completion state.
  const handleNextLesson = useCallback((next: GameEvent) => {
    const trackId = getTrackOfLevel(next.id)?.id;
    if (trackId) game.setLearningTrack(trackId);
    game.setEvent(next);
  }, [game]);

  const handleBackToHub = useCallback(() => {
    game.clearCurrentContent();
  }, [game]);

  const handleStartFinale = useCallback(() => {
    const finale = allEvents.find((e) => e.id === 'learn_11_final_boss');
    if (finale) {
      const trackId = getTrackOfLevel(finale.id)?.id;
      if (trackId) game.setLearningTrack(trackId);
      game.setEvent(finale);
    }
  }, [game]);

  // Handle mode selection and start game
  const handleModeSelect = useCallback((mode: GameModeId) => {
    setShowModeSelect(false);
    game.startNewGame(undefined, mode);
  }, [game]);

  // Main menu keyboard navigation ('continue' only when an autosave exists)
  const menuItems: readonly ('continue' | 'new' | 'load')[] = resumeSave
    ? ['continue', 'new', 'load']
    : ['new', 'load'];

  useEffect(() => {
    if (game.phase !== 'menu' || showModeSelect || saveLoadModal.show || showIntro || legalPage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMenuIndex(prev => (prev - 1 + menuItems.length) % menuItems.length);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMenuIndex(prev => (prev + 1) % menuItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = menuItems[menuIndex % menuItems.length];
        if (item === 'continue') {
          handleResume();
        } else if (item === 'new') {
          setShowModeSelect(true);
        } else {
          setSaveLoadModal({ show: true, mode: 'load' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game.phase, showModeSelect, saveLoadModal.show, menuIndex, showIntro, legalPage, menuItems, handleResume]);

  // ESC to close legal modal
  useEffect(() => {
    if (!legalPage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLegalPage(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [legalPage]);

  // ⚠️ DEV-ONLY: GUI level preview harness (?preview=<id>). Not shipped to prod.
  if (import.meta.env.DEV && DevGuiPreview) {
    const previewId = new URLSearchParams(window.location.search).get('preview');
    if (previewId) {
      return (
        <Suspense fallback={<div className="p-8 text-terminal-green">Preview wird geladen…</div>}>
          <DevGuiPreview previewId={previewId} />
        </Suspense>
      );
    }
  }

  // Show intro screen on first load
  if (showIntro) {
    return <IntroScreen onEnter={() => setShowIntro(false)} />;
  }

  if (game.phase === 'menu') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="border border-terminal-border p-8 text-center max-w-lg">
          <h1 className="text-3xl mb-2">KRITIS ADMIN SIMULATOR</h1>
          <div className="text-terminal-green-dim mb-6">v1.0 - Probezeit Edition</div>

          <div className="text-left mb-6 text-terminal-green-dim text-sm">
            <p className="mb-2">Du bist der neue Sysadmin bei einer kommunalen Abfallwirtschaft.</p>
            <p className="mb-2">12 Wochen Probezeit. Drucker reparieren. Server retten. Überleben.</p>
            <p>Deine IT-Skills entscheiden, ob du bleibst oder fliegst.</p>
          </div>

          {resumeSave && (
            <button
              onClick={handleResume}
              onMouseEnter={() => setMenuIndex(menuItems.indexOf('continue'))}
              className={`w-full p-4 border transition-colors text-lg mb-2 ${
                menuIndex === menuItems.indexOf('continue')
                  ? 'border-terminal-green bg-terminal-bg-highlight'
                  : 'border-terminal-border hover:border-terminal-green'
              }`}
            >
              {menuIndex === menuItems.indexOf('continue') ? '> ' : '  '}[ WEITER SPIELEN ]
              <div className="text-xs text-terminal-green-dim mt-1">
                Woche {resumeSave.gameState.currentWeek}, Tag {resumeSave.gameState.currentDay}
                {' — '}{getGameModeConfig(resumeSave.gameState.gameMode).name}
              </div>
            </button>
          )}
          <button
            onClick={() => setShowModeSelect(true)}
            onMouseEnter={() => setMenuIndex(menuItems.indexOf('new'))}
            className={`w-full p-4 border transition-colors text-lg mb-2 ${
              menuIndex === menuItems.indexOf('new')
                ? 'border-terminal-green bg-terminal-bg-highlight'
                : 'border-terminal-border hover:border-terminal-green'
            }`}
          >
            {menuIndex === menuItems.indexOf('new') ? '> ' : '  '}[ NEUES SPIEL STARTEN ]
          </button>
          <button
            onClick={() => setSaveLoadModal({ show: true, mode: 'load' })}
            onMouseEnter={() => setMenuIndex(menuItems.indexOf('load'))}
            className={`w-full p-3 border transition-colors ${
              menuIndex === menuItems.indexOf('load')
                ? 'border-terminal-info bg-terminal-bg-highlight text-terminal-green'
                : 'border-terminal-border text-terminal-green-dim hover:border-terminal-info'
            }`}
          >
            {menuIndex === menuItems.indexOf('load') ? '> ' : '  '}[ SPIEL LADEN ]
          </button>

          <div className="text-terminal-green-dim text-xs mt-4">
            [↑↓] Navigieren  [Enter] Auswählen
          </div>

          {meta.runsCompleted > 0 && (
            <div className="text-terminal-green-muted text-xs mt-3">
              Durchläufe: {meta.runsCompleted} · Story-Enden: {meta.endingsSeen.length}/{TOTAL_STORY_ENDINGS}
            </div>
          )}

          {/* Legal footer */}
          <div className="mt-6 pt-4 border-t border-terminal-border flex justify-center gap-4 text-xs text-terminal-green-muted">
            <button
              onClick={() => setLegalPage('impressum')}
              className="hover:text-terminal-green underline"
            >
              Impressum
            </button>
            <span>|</span>
            <button
              onClick={() => setLegalPage('datenschutz')}
              className="hover:text-terminal-green underline"
            >
              Datenschutz
            </button>
          </div>
        </div>

        {/* Legal Pages Modal */}
        <Suspense fallback={null}>
          {legalPage && (
            <LegalPages
              initialPage={legalPage}
              onClose={() => setLegalPage(null)}
            />
          )}
        </Suspense>

        {/* Game Mode Selection Modal */}
        <Suspense fallback={null}>
          {showModeSelect && (
            <GameModeSelectModal
              onSelect={handleModeSelect}
              onClose={() => setShowModeSelect(false)}
            />
          )}
        </Suspense>

        {/* Save/Load Modal */}
        <Suspense fallback={null}>
          {saveLoadModal.show && (
            <SaveLoadModal
              mode={saveLoadModal.mode}
              playerId={playerId}
              currentState={game.state}
              onLoad={handleLoadGame}
              onClose={() => setSaveLoadModal({ ...saveLoadModal, show: false })}
            />
          )}
        </Suspense>
      </div>
    );
  }

  if (game.phase === 'storyEnding') {
    const menuModal = (
      <Suspense fallback={null}>
        {showModeSelect && (
          <GameModeSelectModal
            onSelect={handleModeSelect}
            onClose={() => setShowModeSelect(false)}
          />
        )}
      </Suspense>
    );

    // Campaign fully completed → real stats-driven ending screen.
    if (isAdventureModeComplete(game.state)) {
      const ending = calculateAdventureEnding(game.state);
      const completedSq = game.state.storyState?.completedSidequests ?? [];
      const storyPath = getEndingStats(game.state).storyPath;
      const replay = {
        endingsSeen: meta.endingsSeen.length,
        totalEndings: TOTAL_STORY_ENDINGS,
        otherEndingTitles: (Object.keys(ADVENTURE_ENDINGS) as (keyof typeof ADVENTURE_ENDINGS)[])
          .filter((k) => k !== ending)
          .map((k) => ADVENTURE_ENDINGS[k].title),
        missedSidequests: adventureSidequests
          .filter((sq) => !completedSq.includes(sq.id))
          .map((sq) => sq.title),
        untakenForkHint:
          storyPath === 'official'
            ? 'Du bist den offiziellen Weg gegangen — es gab auch den Alleingang.'
            : storyPath === 'underground'
              ? 'Du hast im Alleingang ermittelt — es gab auch den offiziellen Weg.'
              : undefined,
      };
      return (
        <>
          <EndingScreen
            ending={ending}
            stats={getEndingStats(game.state)}
            onBackToMenu={() => setShowModeSelect(true)}
            replay={replay}
          />
          {menuModal}
        </>
      );
    }

    // Otherwise: an unauthored future chapter → act-break "Fortsetzung folgt".
    const completedAct = getLastCompletedAct(game.state);
    const body = getActBreakBody(completedAct);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="border border-terminal-green/50 p-8 max-w-2xl w-full">
          <div className="text-center text-terminal-green text-xl font-bold mb-6 tracking-widest">
            AKT {completedAct} — ENDE
          </div>
          <div className="text-terminal-green-dim leading-relaxed space-y-4 text-[15px]">
            {body.map((p, i) => (
              <p
                key={i}
                className={
                  p.tagline
                    ? 'text-center text-terminal-green tracking-widest py-2 whitespace-pre-line'
                    : p.emphasis
                      ? 'text-terminal-green font-semibold whitespace-pre-line'
                      : p.note
                        ? 'text-sm text-terminal-green-muted whitespace-pre-line'
                        : 'whitespace-pre-line'
                }
              >
                {p.text}
              </p>
            ))}
          </div>
          <button
            onClick={() => setShowModeSelect(true)}
            className="w-full mt-8 p-3 border border-terminal-green hover:bg-terminal-bg-highlight"
          >
            [ ZURÜCK ZUM MENÜ ]
          </button>
        </div>
        {menuModal}
      </div>
    );
  }

  if (game.phase === 'gameover') {
    const modeConfig = getGameModeConfig(game.state.gameMode);
    const summary = buildRunSummary(game.state, game.gameOverReason);
    // On a defeat, nudge toward the low-pressure learning mode.
    const learningTip = !summary.survived && game.state.gameMode !== 'learning';

    return (
      <>
        <RunSummaryScreen
          summary={summary}
          modeName={modeConfig.name}
          modeIcon={modeConfig.icon}
          meta={meta}
          learningTip={learningTip}
          onRetry={() => setShowModeSelect(true)}
        />
        {/* Game Mode Selection Modal */}
        <Suspense fallback={null}>
          {showModeSelect && (
            <GameModeSelectModal
              onSelect={handleModeSelect}
              onClose={() => setShowModeSelect(false)}
            />
          )}
        </Suspense>
      </>
    );
  }

  // Learning mode (cliOnly): when no level is active, render the hub instead of
  // GameScreen's "no content" fallback. The player picks their next lesson here;
  // we never auto-serve in learning mode.
  const learningCliOnly = getGameModeConfig(game.state.gameMode).features.cliOnly === true;

  // Learning result-screen CTAs. Only in learning mode, on the result of a level.
  // Computed against the post-completion state: the just-finished level is
  // already recorded in completedEvents by makeChoice/closeTerminal, but we build
  // `stateAfter` explicitly (idempotent) so getNextInTrack/isFinaleUnlocked never
  // depend on subtle ordering of when completion lands in state.
  let learningResultCtas: import('./components/ResultScreen').LearningResultCtas | undefined;
  if (learningCliOnly && game.phase === 'result' && game.currentEvent) {
    const completedId = game.currentEvent.id;
    const stateAfter = game.state.completedEvents.includes(completedId)
      ? game.state
      : { ...game.state, completedEvents: [...game.state.completedEvents, completedId] };

    const track = getTrackOfLevel(completedId);
    const next = track ? getNextInTrack(track, stateAfter, allEvents) : null;

    const finaleEvent = allEvents.find((e) => e.id === 'learn_11_final_boss');
    const finaleDone = finaleEvent ? stateAfter.completedEvents.includes(finaleEvent.id) : true;
    const offerFinale =
      isFinaleUnlocked(stateAfter) && completedId !== 'learn_11_final_boss' && !finaleDone;

    learningResultCtas = {
      onNextLesson: next ? () => handleNextLesson(next) : undefined,
      nextLessonTrackTitle: next ? getTrackOfLevel(next.id)?.title : undefined,
      onBackToHub: handleBackToHub,
      onStartFinale: offerFinale ? handleStartFinale : undefined,
    };
  }
  if (
    game.phase === 'playing' &&
    learningCliOnly &&
    !game.currentEvent &&
    !game.currentScenario
  ) {
    return (
      <>
        <StoryBackground />
        <LearningHub state={game.state} onPick={handlePickLearningLevel} />
      </>
    );
  }

  return (
    <>
      {/* Persistent story mode background */}
      <StoryBackground />

      <GameScreen
        state={game.state}
        phase={game.phase}
        contentType={game.contentType}
        currentEvent={game.currentEvent}
        currentScenario={game.currentScenario}
        learningResultCtas={learningResultCtas}
        lastChoice={game.lastChoice}
        lastScenarioChoice={game.lastScenarioChoice}
        characters={characters}
        onChoice={(choice) => {
          const opensTerminal = choice.terminalCommand && game.currentEvent?.terminalContext;
          const opensGui = choice.guiCommand && game.currentEvent?.guiContext;
          if (opensTerminal || opensGui) {
            game.openTerminal(choice);
          } else {
            game.makeChoice(choice);
          }
        }}
        onScenarioChoice={(choice) => {
          const opensTerminal = choice.terminalCommand && game.currentScenario?.terminalContext;
          const opensGui = choice.guiCommand && game.currentScenario?.guiContext;
          if (opensTerminal || opensGui) {
            game.openScenarioTerminal(choice);
          } else {
            game.makeScenarioChoice(choice);
          }
        }}
        onContinue={game.continueGame}
        onTerminalSolved={(skillGain, setsFlags) => game.closeTerminal(true, skillGain, setsFlags)}
        onTerminalCancel={() => game.closeTerminal(false)}
        onSave={() => setSaveLoadModal({ show: true, mode: 'save' })}
        onLoad={() => setSaveLoadModal({ show: true, mode: 'load' })}
      />

      {/* Save/Load Modal */}
      <Suspense fallback={null}>
        {saveLoadModal.show && (
          <SaveLoadModal
            mode={saveLoadModal.mode}
            playerId={playerId}
            currentState={game.state}
            onLoad={handleLoadGame}
            onClose={() => setSaveLoadModal({ ...saveLoadModal, show: false })}
          />
        )}
      </Suspense>
    </>
  );
}

// Main App wrapper with providers
function App() {
  return (
    <StoryBackgroundProvider>
      <AppContent />
    </StoryBackgroundProvider>
  );
}

export default App;
