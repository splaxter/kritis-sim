import { useState, useEffect, useRef } from 'react';
import { GameEvent, EventChoice, GameState } from '@kritis/shared';
import { getVisibleChoices } from '../../engine/eventEngine';
import { formatArcadeTime } from '../../hooks/useArcadeTimer';
import { formatScore, getMultiplier } from '../../engine/arcadeScoring';
import { useStoryBackground } from '../../contexts/StoryBackgroundContext';

interface ArcadeState {
  enabled: boolean;
  timeRemaining: number;
  progress: number;
  totalTime: number;
  score: number;
  streak: number;
  lastScorePopup?: {
    points: number;
    multiplier: number;
    message?: string;
  };
}

interface EventCardProps {
  event: GameEvent;
  state: GameState;
  onChoice: (choice: EventChoice) => void;
  characters?: Record<string, string>;
  arcade?: ArcadeState;
}

export function EventCard({ event, state, onChoice, characters = {}, arcade }: EventCardProps) {
  const visibleChoices = getVisibleChoices(event, state);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { setBackgroundImage, isStoryMode } = useStoryBackground();

  // Report image to background context when event changes
  useEffect(() => {
    if (isStoryMode) {
      setBackgroundImage(event.image || null);
    }
  }, [event.id, event.image, isStoryMode, setBackgroundImage]);

  // Reset selection when event changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [event.id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= visibleChoices.length) {
        onChoice(visibleChoices[num - 1]);
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + visibleChoices.length) % visibleChoices.length);
      } else if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % visibleChoices.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onChoice(visibleChoices[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visibleChoices, selectedIndex, onChoice]);

  // Scroll selected button into view
  useEffect(() => {
    buttonRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndex]);

  const replaceCharacterNames = (text: string): string => {
    let result = text;
    for (const [role, name] of Object.entries(characters)) {
      result = result.replace(new RegExp(`\\{${role}\\}`, 'g'), name);
    }
    return result;
  };

  const getTimerBarColor = () => {
    if (!arcade) return 'bg-terminal-green';
    if (arcade.progress > 0.5) return 'bg-terminal-green';
    if (arcade.progress > 0.25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Story mode layout - floating card over persistent background
  if (isStoryMode) {
    return (
      <div className="relative z-10 min-h-screen flex flex-col justify-end p-4 pb-8">
        {/* Spacer to push content to bottom third */}
        <div className="flex-1 min-h-[30vh]" />

        {/* Event content card */}
        <div className="max-w-3xl mx-auto w-full">
          {/* Chapter/Event indicator */}
          {state.storyState?.currentChapter && (
            <div className="text-terminal-green/50 text-xs uppercase tracking-widest mb-2 ml-1">
              {/* Extract chapter number from ID like ch01_first_day */}
              Kapitel {parseInt(state.storyState.currentChapter.match(/ch(\d+)/)?.[1] || '1')}
            </div>
          )}

          {/* Main card */}
          <div className="bg-black/85 backdrop-blur-md border border-terminal-green/40 rounded-lg overflow-hidden shadow-2xl">
            {/* Title bar */}
            <div className="px-5 py-3 border-b border-terminal-green/20 bg-black/50">
              <h2 className="text-xl text-white font-semibold">{event.title}</h2>
            </div>

            {/* Description */}
            <div className="px-5 py-4">
              <div className="whitespace-pre-wrap text-gray-200 leading-relaxed text-[15px] max-h-[35vh] overflow-auto pr-2">
                {replaceCharacterNames(event.description)}
              </div>
            </div>

            {/* Choices */}
            <div className="px-5 pb-4 space-y-2">
              {visibleChoices.map((choice, index) => {
                const isRecommended = choice.requires &&
                  state.skills[choice.requires.skill] >= choice.requires.threshold + 20;
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={choice.id}
                    ref={el => { buttonRefs.current[index] = el; }}
                    onClick={() => onChoice(choice)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full text-left px-4 py-3 rounded border-l-4 transition-all duration-150 flex justify-between items-start gap-3 ${
                      isSelected
                        ? 'bg-terminal-green/20 border-l-terminal-green text-white'
                        : 'bg-black/40 border-l-transparent hover:bg-terminal-green/10 hover:border-l-terminal-green/50 text-gray-300'
                    }`}
                  >
                    <span className="flex-1">
                      <span className={`inline-block w-6 ${isSelected ? 'text-terminal-green' : 'text-terminal-green/50'}`}>
                        {index + 1}.
                      </span>
                      {choice.terminalCommand && <span className="text-terminal-info mr-1">&gt;</span>}
                      {replaceCharacterNames(choice.text)}
                    </span>
                    {isRecommended && (
                      <span className="text-terminal-success text-xs mt-1 shrink-0">[EMPFOHLEN]</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer hints */}
            <div className="px-5 py-2 border-t border-terminal-green/10 bg-black/30 text-xs text-terminal-green/40 flex justify-between">
              <span>[1-{visibleChoices.length}] Direkt   [Enter] Auswahl</span>
              <span>[S] Speichern</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard/Arcade mode layout
  return (
    <div className="border border-terminal-border p-4 relative">
      {/* Arcade Header */}
      {arcade?.enabled && (
        <div className="mb-4 pb-3 border-b border-terminal-border">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-4">
              <span className="text-terminal-info text-lg font-bold">
                SCORE: {formatScore(arcade.score)}
              </span>
              {arcade.streak > 0 && (
                <span className="text-yellow-400 text-sm">
                  x{getMultiplier(arcade.streak)} ({arcade.streak} STREAK)
                </span>
              )}
            </div>
            <div className={`text-2xl font-mono ${arcade.progress <= 0.25 ? 'text-red-500 animate-pulse' : 'text-terminal-green'}`}>
              {formatArcadeTime(arcade.timeRemaining)}
            </div>
          </div>

          <div className="h-2 bg-terminal-bg-dark rounded-full overflow-hidden">
            <div
              className={`h-full ${getTimerBarColor()} transition-all duration-100 ease-linear`}
              style={{ width: `${arcade.progress * 100}%` }}
            />
          </div>

          {arcade.lastScorePopup && (
            <div className="absolute top-12 right-4 animate-bounce text-right">
              <div className={`text-xl font-bold ${arcade.lastScorePopup.points >= 0 ? 'text-terminal-success' : 'text-red-500'}`}>
                {arcade.lastScorePopup.points >= 0 ? '+' : ''}{formatScore(arcade.lastScorePopup.points)}
              </div>
              {arcade.lastScorePopup.multiplier > 1 && (
                <div className="text-yellow-400 text-sm">
                  x{arcade.lastScorePopup.multiplier}
                </div>
              )}
              {arcade.lastScorePopup.message && (
                <div className="text-yellow-300 text-lg font-bold animate-pulse">
                  {arcade.lastScorePopup.message}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="text-terminal-green-dim mb-2 text-sm">
        {arcade?.enabled ? '- ARCADE EREIGNIS -' : '- EREIGNIS -'}
      </div>

      <h2 className="text-xl mb-4">&gt; {event.title}</h2>

      <div className="whitespace-pre-wrap mb-6 text-terminal-green-dim leading-relaxed">
        {replaceCharacterNames(event.description)}
      </div>

      <div className="space-y-2">
        {visibleChoices.map((choice, index) => {
          const isRecommended = choice.requires &&
            state.skills[choice.requires.skill] >= choice.requires.threshold + 20;
          const isSelected = index === selectedIndex;

          return (
            <button
              key={choice.id}
              ref={el => { buttonRefs.current[index] = el; }}
              onClick={() => onChoice(choice)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full text-left p-2 border transition-colors flex justify-between items-center ${
                isSelected
                  ? 'bg-terminal-bg-highlight border-terminal-green text-terminal-green'
                  : 'border-terminal-border hover:bg-terminal-bg-highlight hover:border-terminal-green'
              } ${arcade?.enabled && arcade.progress <= 0.25 ? 'hover:border-red-500' : ''}`}
            >
              <span>
                <span className={isSelected ? 'text-terminal-green' : 'text-terminal-green-dim'}>[{index + 1}]</span>{' '}
                {choice.terminalCommand && <span className="text-terminal-info">&gt; </span>}
                {replaceCharacterNames(choice.text)}
              </span>
              {isRecommended && (
                <span className="text-terminal-success text-sm">[EMPFOHLEN]</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-2 border-t border-terminal-border text-sm text-terminal-green-muted">
        {arcade?.enabled ? (
          <span>[1-{visibleChoices.length}] Schnell auswahlen!</span>
        ) : (
          <span>[1-{visibleChoices.length}] / [Enter] Auswahlen   [S] Speichern</span>
        )}
      </div>
    </div>
  );
}
