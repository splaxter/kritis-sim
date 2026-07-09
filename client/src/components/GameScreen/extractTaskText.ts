/**
 * Pull the "**Deine Aufgabe:**" block out of an event description / scenario
 * flavor text so the terminal can keep the quest visible while playing.
 * Returns plain text (markdown emphasis and backticks stripped) or undefined
 * if there is no task block.
 */
export function extractTaskText(markdown?: string): string | undefined {
  if (!markdown) return undefined;
  const marker = /\*\*Deine Aufgabe:?\*\*:?/i.exec(markdown);
  if (!marker) return undefined;
  let text = markdown.slice(marker.index + marker[0].length);
  // Stop at the next bold heading or code fence
  const stop = text.search(/\n\s*(\*\*|```)/);
  if (stop >= 0) text = text.slice(0, stop);
  return text.replace(/[*`]/g, '').trim() || undefined;
}
