import { useState, useEffect, useRef } from 'react';
import { GameEvent, EventChoice, GameState } from '@kritis/shared';
import { getVisibleChoices } from '../../engine/eventEngine';
import { useStoryBackground } from '../../contexts/StoryBackgroundContext';
import { useTypewriter } from '../../hooks/useTypewriter';

interface EventCardProps {
  event: GameEvent;
  state: GameState;
  onChoice: (choice: EventChoice) => void;
  characters?: Record<string, string>;
}

export function EventCard({ event, state, onChoice, characters = {} }: EventCardProps) {
  const visibleChoices = getVisibleChoices(event, state);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { setBackgroundImage, isStoryMode } = useStoryBackground();

  const replaceCharacterNames = (text: string): string => {
    let result = text;
    for (const [role, name] of Object.entries(characters)) {
      result = result.replace(new RegExp(`\\{${role}\\}`, 'g'), name);
    }
    return result;
  };

  const description = replaceCharacterNames(event.description);
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const typewriter = useTypewriter(description, {
    charsPerSecond: 500,
    enabled: isStoryMode && !prefersReducedMotion,
  });

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
    if (visibleChoices.length === 0) return; // null-safety: nothing to drive

    const handleKeyDown = (e: KeyboardEvent) => {
      const num = parseInt(e.key);

      // First keypress (Enter or a valid digit) completes the typewriter text
      // instead of selecting — reveal now, choose on the next press.
      if (!typewriter.done && (e.key === 'Enter' || (num >= 1 && num <= visibleChoices.length))) {
        e.preventDefault();
        typewriter.skip();
        return;
      }

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
        const choice = visibleChoices[selectedIndex];
        if (choice) onChoice(choice);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visibleChoices, selectedIndex, onChoice, typewriter.done, typewriter.skip]);

  // Scroll selected button into view
  useEffect(() => {
    buttonRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndex]);

  // ── Card kinds ──────────────────────────────────────────────────────────
  // Classify how this event's actions should read:
  //  • hands-on  → a single terminal/GUI task → one prominent "Aufgabe starten" CTA
  //  • flavor    → a single non-decision click → interstitial "Weiter"
  //  • decision  → a real multi-option choice → the numbered list (default)
  // Consequence/result framing only applies when there is exactly one visible
  // action. Multi-choice chain events remain real decisions.
  const isSingleVisibleChoice = visibleChoices.length === 1;
  const isChainResult = !!event.isChainEvent && isSingleVisibleChoice;
  const handsOnChoice = visibleChoices.find((c) => c.terminalCommand || c.guiCommand);
  const cardKind: 'hands-on' | 'flavor' | 'decision' =
    isSingleVisibleChoice && handsOnChoice
      ? 'hands-on'
      : isSingleVisibleChoice
        ? 'flavor'
        : 'decision';

  // Renders the action area for a layout variant. Returns the numbered list for
  // 'decision', a single CTA for 'hands-on'/'flavor', and a safe fallback when
  // there are no visible choices.
  const renderActions = (variant: 'story' | 'standard') => {
    if (visibleChoices.length === 0) {
      return (
        <div className="text-terminal-green-muted text-sm italic">
          Keine verfügbaren Optionen.
        </div>
      );
    }

    if (cardKind !== 'decision') {
      const choice = visibleChoices[0];
      const isGui = !!choice.guiCommand;
      const label =
        cardKind === 'hands-on'
          ? isGui
            ? '🗔 Aufgabe starten'
            : '▶ Aufgabe starten'
          : 'Weiter ▶';
      const cta =
        variant === 'story'
          ? 'w-full text-center px-4 py-3 rounded bg-terminal-green/20 border border-terminal-green text-white hover:bg-terminal-green/30 transition-colors font-semibold'
          : 'w-full text-center p-3 border border-terminal-green hover:bg-terminal-bg-highlight text-terminal-green font-semibold';
      return (
        <button
          ref={(el) => { buttonRefs.current[0] = el; }}
          onClick={() => onChoice(choice)}
          className={cta}
        >
          {label}
        </button>
      );
    }

    // 'decision' — numbered list of real options.
    return visibleChoices.map((choice, index) => {
      const isRecommended =
        choice.requires &&
        state.skills[choice.requires.skill] >= choice.requires.threshold + 20;
      const isSelected = index === selectedIndex;

      if (variant === 'story') {
        return (
          <button
            key={choice.id}
            ref={(el) => { buttonRefs.current[index] = el; }}
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
              {choice.guiCommand && <span className="text-terminal-info mr-1">🗔</span>}
              {replaceCharacterNames(choice.text)}
            </span>
            {isRecommended && (
              <span className="text-terminal-success text-xs mt-1 shrink-0">[EMPFOHLEN]</span>
            )}
          </button>
        );
      }

      return (
        <button
          key={choice.id}
          ref={(el) => { buttonRefs.current[index] = el; }}
          onClick={() => onChoice(choice)}
          onMouseEnter={() => setSelectedIndex(index)}
          className={`w-full text-left p-2 border transition-colors flex justify-between items-center ${
            isSelected
              ? 'bg-terminal-bg-highlight border-terminal-green text-terminal-green'
              : 'border-terminal-border hover:bg-terminal-bg-highlight hover:border-terminal-green'
          }`}
        >
          <span>
            <span className={isSelected ? 'text-terminal-green' : 'text-terminal-green-dim'}>[{index + 1}]</span>{' '}
            {choice.terminalCommand && <span className="text-terminal-info">&gt; </span>}
            {choice.guiCommand && <span className="text-terminal-info">🗔 </span>}
            {replaceCharacterNames(choice.text)}
          </span>
          {isRecommended && (
            <span className="text-terminal-success text-sm">[EMPFOHLEN]</span>
          )}
        </button>
      );
    });
  };

  const cardKindBanner = (className: string) => {
    if (isChainResult) {
      return <div className={className}>⟳ Folge deiner Entscheidung</div>;
    }
    if (cardKind === 'flavor') {
      return <div className={className}>- Zwischenfall -</div>;
    }
    return null;
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
                {typewriter.text}
              </div>
            </div>

            {/* Choices */}
            <div
              className={`px-5 pb-4 space-y-2 transition-opacity duration-300 ${
                typewriter.done ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {cardKindBanner('text-terminal-info/80 text-xs uppercase tracking-widest mb-1')}
              {renderActions('story')}
            </div>

            {/* Footer hints */}
            <div className="px-5 py-2 border-t border-terminal-green/10 bg-black/30 text-xs text-terminal-green/40 flex justify-between">
              <span>{cardKind === 'decision' ? `[1-${visibleChoices.length}] Direkt   [Enter] Auswahl` : '[Enter] Weiter'}</span>
              <span>[S] Speichern</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard mode layout
  return (
    <div className="border border-terminal-border p-4 relative">
      <div className="text-terminal-green-dim mb-2 text-sm">
        - EREIGNIS -
      </div>

      <h2 className="text-xl mb-4">&gt; {event.title}</h2>

      <div className="whitespace-pre-wrap mb-6 text-terminal-green-dim leading-relaxed">
        {replaceCharacterNames(event.description)}
      </div>

      {cardKindBanner('text-terminal-info text-xs uppercase tracking-widest mb-2')}

      <div className="space-y-2">
        {renderActions('standard')}
      </div>

      <div className="mt-4 pt-2 border-t border-terminal-border text-sm text-terminal-green-muted">
        <span>{cardKind === 'decision' ? `[1-${visibleChoices.length}] / [Enter] Auswählen   [S] Speichern` : '[Enter] Weiter   [S] Speichern'}</span>
      </div>
    </div>
  );
}
