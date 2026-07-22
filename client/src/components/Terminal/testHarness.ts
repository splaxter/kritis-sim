// client/src/components/Terminal/testHarness.ts
// Shared mock-xterm for Terminal browser tests: captures every write/writeln
// into a buffer and drives input via emitData. Assertions are semantic
// (buffer.join('') .toContain(...)), never byte-exact escape sequences.
//
// The two `vi.mock('@xterm/...')` calls stay in each test file (Vitest hoists
// them); they reach this shared mock via an async `import('./testHarness')`
// inside the factory. That is why `terminalMock` is a plain module const here
// rather than a `vi.hoisted(...)` value — a hoisted binding cannot be exported.

type DataHandler = (data: string) => void;

export interface MockTerm {
  emitData: (data: string) => void;
  buffer: string[];
  cols: number;
}

export const terminalMock = {
  instances: [] as MockTerm[],
  Terminal: class {
    private handlers: DataHandler[] = [];
    buffer: string[] = [];
    cols = 80;
    constructor() {
      terminalMock.instances.push(this as unknown as MockTerm);
    }
    loadAddon() {}
    open() {}
    focus() {}
    write(data: string) { this.buffer.push(data); }
    writeln(data: string) { this.buffer.push(data + '\n'); }
    clear() {}
    dispose() {}
    onData(handler: DataHandler) {
      this.handlers.push(handler);
      return { dispose: () => {} };
    }
    emitData(data: string) { this.handlers.forEach((h) => h(data)); }
  },
  FitAddon: class { fit() {} },
};

export const type = (term: { emitData: (d: string) => void }, text: string) => {
  for (const char of text) term.emitData(char);
};
export const enter = (term: { emitData: (d: string) => void }, text: string) => {
  type(term, text);
  term.emitData('\r');
};
export const written = (term: { buffer: string[] }) => term.buffer.join('');
export const latestTerm = () => terminalMock.instances.at(-1)!;
export const resetTerms = () => { terminalMock.instances.length = 0; };
