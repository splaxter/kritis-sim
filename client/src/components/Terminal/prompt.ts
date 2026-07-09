// client/src/components/Terminal/prompt.ts
// Single source of truth for the shell prompt, shaped like real bash/PS:
// bash abbreviates $HOME to ~ and gives root a # instead of $.

export interface PromptOptions {
  type: 'linux' | 'windows';
  username: string;
  hostname: string;
  path: string;
  home?: string;
}

export function buildPrompt(opts: PromptOptions): string {
  if (opts.type === 'linux') {
    let path = opts.path;
    if (opts.home && (path === opts.home || path.startsWith(opts.home + '/'))) {
      path = '~' + path.slice(opts.home.length);
    }
    const promptChar = opts.username === 'root' ? '#' : '$';
    return `${opts.username}@${opts.hostname}:${path}${promptChar} `;
  }
  return `PS ${opts.path}> `;
}
