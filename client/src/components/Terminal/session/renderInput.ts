// client/src/components/Terminal/session/renderInput.ts
// Pure ANSI: full-line redraw of the input area. Carriage-return to col 1,
// erase to end of line, write prompt+line, then reposition the cursor only
// when it is not already at the end. A full redraw yields the identical
// VISIBLE state, which is all the semantic browser tests observe.
export interface RenderInputState {
  prompt: string;
  line: string;
  cursor: number;
}

export function renderInput({ prompt, line, cursor }: RenderInputState): string {
  let out = '\r\x1b[K' + prompt + line;
  if (cursor < line.length) {
    out += '\x1b[' + (prompt.length + cursor + 1) + 'G';
  }
  return out;
}
