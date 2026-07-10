/**
 * Extended Linux Toolkit
 *
 * Commands common in SOC / incident-response work that build on the core set:
 * base64 (payload decoding), sha256sum/md5sum (IOC hash verification),
 * strings/xxd (inspecting dumps), tr/tee/nl/tac/rev (text plumbing),
 * stat/file (file metadata). All operate on the virtual filesystem.
 */

import { ShellCommand, ParsedArgs, ExecutionContext, CommandResult, Completion, CompletionContext } from '../../types';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Read a command's input: joined file contents, or stdin, or an error. */
function readInput(
  ctx: ExecutionContext,
  files: string[],
  cmd: string
): { content: string; error?: string } {
  if (files.length === 0) {
    return { content: ctx.stdin ?? '' };
  }
  let content = '';
  for (const file of files) {
    const result = ctx.vfs.readFile(file);
    if (!result.ok) {
      return { content: '', error: `${cmd}: ${file}: No such file or directory` };
    }
    content += result.value;
  }
  return { content };
}

export const toBytes = (s: string): Uint8Array => new TextEncoder().encode(s);
const fromBytes = (b: Uint8Array): string => new TextDecoder().decode(b);

// ---------------------------------------------------------------------------
// SHA-256 (FIPS 180-4) — verified against published test vectors in tests.
// ---------------------------------------------------------------------------

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256Hex(bytes: Uint8Array): string {
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const bitLen = bytes.length * 8;
  const withOne = bytes.length + 1;
  const pad = (56 - (withOne % 64) + 64) % 64;
  const total = withOne + pad + 8;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[bytes.length] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(total - 4, bitLen >>> 0);
  dv.setUint32(total - 8, Math.floor(bitLen / 0x100000000));

  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  const w = new Uint32Array(64);

  for (let off = 0; off < total; off += 64) {
    for (let j = 0; j < 16; j++) w[j] = dv.getUint32(off + j * 4);
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + SHA256_K[j] + w[j]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

// ---------------------------------------------------------------------------
// SHA-1 (FIPS 180-1) — verified against published test vectors in tests.
// Weak for real crypto, but still the dominant format in malware IOC feeds.
// ---------------------------------------------------------------------------

export function sha1Hex(bytes: Uint8Array): string {
  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;

  const bitLen = bytes.length * 8;
  const withOne = bytes.length + 1;
  const pad = (56 - (withOne % 64) + 64) % 64;
  const total = withOne + pad + 8;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[bytes.length] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(total - 4, bitLen >>> 0);
  dv.setUint32(total - 8, Math.floor(bitLen / 0x100000000));

  const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n));
  const w = new Uint32Array(80);

  for (let off = 0; off < total; off += 64) {
    for (let j = 0; j < 16; j++) w[j] = dv.getUint32(off + j * 4);
    for (let j = 16; j < 80; j++) w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let j = 0; j < 80; j++) {
      let f: number, k: number;
      if (j < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (j < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const t = (rotl(a, 5) + f + e + k + w[j]) >>> 0;
      e = d; d = c; c = rotl(b, 30) >>> 0; b = a; a = t;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  return [h0, h1, h2, h3, h4].map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

// ---------------------------------------------------------------------------
// MD5 (RFC 1321) — verified against published test vectors in tests.
// ---------------------------------------------------------------------------

const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const MD5_K = (() => {
  const k = new Uint32Array(64);
  for (let i = 0; i < 64; i++) k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0;
  return k;
})();

export function md5Hex(bytes: Uint8Array): string {
  const rotl = (x: number, c: number) => (x << c) | (x >>> (32 - c));
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

  const bitLen = bytes.length * 8;
  const withOne = bytes.length + 1;
  const pad = (56 - (withOne % 64) + 64) % 64;
  const total = withOne + pad + 8;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[bytes.length] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(total - 8, bitLen >>> 0, true);
  dv.setUint32(total - 4, Math.floor(bitLen / 0x100000000), true);

  const M = new Uint32Array(16);
  for (let off = 0; off < total; off += 64) {
    for (let j = 0; j < 16; j++) M[j] = dv.getUint32(off + j * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + MD5_K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + rotl(F, MD5_S[i])) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const hexLE = (n: number) => {
    let h = '';
    for (let i = 0; i < 4; i++) h += ((n >>> (i * 8)) & 0xff).toString(16).padStart(2, '0');
    return h;
  };
  return hexLE(a0) + hexLE(b0) + hexLE(c0) + hexLE(d0);
}

function makeHashCommand(name: string, hash: (b: Uint8Array) => string): ShellCommand {
  return {
    name,
    description: `Compute and check ${name.replace('sum', '').toUpperCase()} message digest`,
    usage: `${name} [FILE...]`,
    execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
      if (args.positional.length === 0) {
        if (ctx.stdin === undefined) return { output: '', exitCode: 0 };
        return { output: `${hash(toBytes(ctx.stdin))}  -`, exitCode: 0 };
      }
      const out: string[] = [];
      const errors: string[] = [];
      for (const file of args.positional) {
        const r = ctx.vfs.readFile(file);
        if (!r.ok) {
          errors.push(`${name}: ${file}: No such file or directory`);
          continue;
        }
        out.push(`${hash(toBytes(r.value))}  ${file}`);
      }
      return {
        output: out.join('\n'),
        exitCode: errors.length > 0 ? 1 : 0,
        error: errors.length > 0 ? errors.join('\n') : undefined,
      };
    },
    getCompletions(partial: string, ctx: CompletionContext): Completion[] {
      return ctx.vfs.getPathCompletions(partial);
    },
  };
}

export const sha256sumCommand = makeHashCommand('sha256sum', sha256Hex);
export const sha1sumCommand = makeHashCommand('sha1sum', sha1Hex);
export const md5sumCommand = makeHashCommand('md5sum', md5Hex);

/** Digest functions keyed by the algorithm names Get-FileHash accepts. */
export const HASHERS: Record<string, (b: Uint8Array) => string> = {
  SHA1: sha1Hex,
  SHA256: sha256Hex,
  MD5: md5Hex,
};

// ---------------------------------------------------------------------------
// base64
// ---------------------------------------------------------------------------

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Encode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < bytes.length ? B64[b2 & 63] : '=';
  }
  return out;
}

function base64Decode(input: string): Uint8Array | null {
  const clean = input.replace(/[\r\n\s]/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 !== 0) return null;
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = B64.indexOf(clean[i]);
    const c1 = B64.indexOf(clean[i + 1]);
    const c2 = clean[i + 2] === '=' ? 0 : B64.indexOf(clean[i + 2]);
    const c3 = clean[i + 3] === '=' ? 0 : B64.indexOf(clean[i + 3]);
    bytes.push((c0 << 2) | (c1 >> 4));
    if (clean[i + 2] !== '=') bytes.push(((c1 & 15) << 4) | (c2 >> 2));
    if (clean[i + 3] !== '=') bytes.push(((c2 & 3) << 6) | c3);
  }
  return new Uint8Array(bytes);
}

export const base64Command: ShellCommand = {
  name: 'base64',
  description: 'Base64 encode or decode data',
  usage: 'base64 [-d] [FILE]',
  options: [
    { short: 'd', long: 'decode', description: 'Decode data' },
    { short: 'w', long: 'wrap', description: 'Wrap encoded lines after COLS characters', takesValue: true },
  ],
  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const decode = !!(args.flags['d'] || args.flags['decode']);
    const input = readInput(ctx, args.positional, 'base64');
    if (input.error) return { output: '', exitCode: 1, error: input.error };

    if (decode) {
      const bytes = base64Decode(input.content);
      if (bytes === null) {
        return { output: '', exitCode: 1, error: 'base64: invalid input' };
      }
      return { output: fromBytes(bytes), exitCode: 0 };
    }

    let encoded = base64Encode(toBytes(input.content));
    // GNU base64 wraps at 76 columns by default; -w0 disables wrapping.
    const wrap = args.options['w'] ?? args.options['wrap'];
    const cols = wrap !== undefined ? parseInt(wrap, 10) : 76;
    if (cols > 0) {
      encoded = encoded.replace(new RegExp(`(.{${cols}})`, 'g'), '$1\n').replace(/\n$/, '');
    }
    return { output: encoded, exitCode: 0 };
  },
  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

// ---------------------------------------------------------------------------
// tr
// ---------------------------------------------------------------------------

/** Expand a tr SET: ranges (a-z), a few POSIX classes, and \n \t \\ escapes. */
function expandSet(set: string): string {
  const s = set
    .replace(/\[:upper:\]/g, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    .replace(/\[:lower:\]/g, 'abcdefghijklmnopqrstuvwxyz')
    .replace(/\[:digit:\]/g, '0123456789')
    .replace(/\[:alpha:\]/g, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
    .replace(/\[:space:\]/g, ' \t\n\r\f\v')
    .replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r').replace(/\\\\/g, '\\');
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i + 1] === '-' && i + 2 < s.length) {
      const start = s.charCodeAt(i);
      const end = s.charCodeAt(i + 2);
      for (let c = start; c <= end; c++) out += String.fromCharCode(c);
      i += 2;
    } else {
      out += s[i];
    }
  }
  return out;
}

export const trCommand: ShellCommand = {
  name: 'tr',
  description: 'Translate or delete characters',
  usage: 'tr [OPTIONS] SET1 [SET2]',
  options: [
    { short: 'd', long: 'delete', description: 'Delete characters in SET1' },
    { short: 's', long: 'squeeze-repeats', description: 'Squeeze repeated characters in SET1' },
    { short: 'c', long: 'complement', description: 'Use the complement of SET1' },
  ],
  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const del = !!(args.flags['d'] || args.flags['delete']);
    const squeeze = !!(args.flags['s'] || args.flags['squeeze-repeats']);
    if (args.positional.length === 0) {
      return { output: '', exitCode: 1, error: "tr: missing operand" };
    }
    if (ctx.stdin === undefined) {
      return { output: '', exitCode: 1, error: 'tr: no input; tr reads from standard input' };
    }

    const set1 = expandSet(args.positional[0]);
    let content = ctx.stdin;

    if (del) {
      const drop = new Set(set1.split(''));
      content = content.split('').filter(ch => !drop.has(ch)).join('');
    } else if (args.positional[1] !== undefined) {
      const set2 = expandSet(args.positional[1]);
      const map = new Map<string, string>();
      for (let i = 0; i < set1.length; i++) {
        // Shorter SET2 repeats its last char, like real tr.
        map.set(set1[i], set2[Math.min(i, set2.length - 1)] ?? set1[i]);
      }
      content = content.split('').map(ch => map.get(ch) ?? ch).join('');
    }

    if (squeeze) {
      const squeezeSet = new Set(set1.split(''));
      let out = '';
      for (let i = 0; i < content.length; i++) {
        if (i > 0 && content[i] === content[i - 1] && squeezeSet.has(content[i])) continue;
        out += content[i];
      }
      content = out;
    }

    return { output: content, exitCode: 0 };
  },
};

// ---------------------------------------------------------------------------
// tee
// ---------------------------------------------------------------------------

export const teeCommand: ShellCommand = {
  name: 'tee',
  description: 'Read from stdin and write to both stdout and files',
  usage: 'tee [OPTIONS] [FILE...]',
  options: [
    { short: 'a', long: 'append', description: 'Append to files rather than overwriting' },
  ],
  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const append = !!(args.flags['a'] || args.flags['append']);
    const content = ctx.stdin ?? '';
    const errors: string[] = [];
    for (const file of args.positional) {
      const withNl = content.endsWith('\n') || content === '' ? content : content + '\n';
      const write = append ? ctx.vfs.appendFile(file, withNl) : ctx.vfs.writeFile(file, withNl);
      if (!write.ok) errors.push(`tee: ${file}: ${write.error}`);
    }
    // stdout gets the input unchanged so the pipeline continues.
    return {
      output: content,
      exitCode: errors.length > 0 ? 1 : 0,
      error: errors.length > 0 ? errors.join('\n') : undefined,
    };
  },
  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

// ---------------------------------------------------------------------------
// nl, tac, rev
// ---------------------------------------------------------------------------

export const nlCommand: ShellCommand = {
  name: 'nl',
  description: 'Number lines of files',
  usage: 'nl [OPTIONS] [FILE...]',
  options: [
    { short: 'b', description: 'Body numbering style (a=all, t=nonempty)', takesValue: true },
  ],
  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const input = readInput(ctx, args.positional, 'nl');
    if (input.error) return { output: '', exitCode: 1, error: input.error };
    const numberAll = (args.options['b'] ?? 't') === 'a';
    const lines = input.content.replace(/\n$/, '').split('\n');
    let n = 0;
    const out = lines.map(line => {
      if (!numberAll && line.trim() === '') return `       ${line}`;
      n++;
      return `${n.toString().padStart(6)}\t${line}`;
    });
    return { output: out.join('\n'), exitCode: 0 };
  },
  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

export const tacCommand: ShellCommand = {
  name: 'tac',
  description: 'Concatenate and print files in reverse',
  usage: 'tac [FILE...]',
  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const input = readInput(ctx, args.positional, 'tac');
    if (input.error) return { output: '', exitCode: 1, error: input.error };
    const lines = input.content.replace(/\n$/, '').split('\n');
    return { output: lines.reverse().join('\n'), exitCode: 0 };
  },
  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

export const revCommand: ShellCommand = {
  name: 'rev',
  description: 'Reverse the characters of each line',
  usage: 'rev [FILE...]',
  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const input = readInput(ctx, args.positional, 'rev');
    if (input.error) return { output: '', exitCode: 1, error: input.error };
    const lines = input.content.replace(/\n$/, '').split('\n');
    return { output: lines.map(l => l.split('').reverse().join('')).join('\n'), exitCode: 0 };
  },
  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

// ---------------------------------------------------------------------------
// strings
// ---------------------------------------------------------------------------

export const stringsCommand: ShellCommand = {
  name: 'strings',
  description: 'Print the printable character sequences in files',
  usage: 'strings [-n MIN] [FILE...]',
  options: [
    { short: 'n', description: 'Minimum string length (default 4)', takesValue: true },
  ],
  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const input = readInput(ctx, args.positional, 'strings');
    if (input.error) return { output: '', exitCode: 1, error: input.error };
    const min = parseInt(args.options['n'] || '4', 10);
    // Runs of printable ASCII (and tab), at least `min` long.
    const matches = input.content.match(new RegExp(`[\\x20-\\x7e\\t]{${min},}`, 'g')) || [];
    return { output: matches.join('\n'), exitCode: 0 };
  },
  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

// ---------------------------------------------------------------------------
// xxd
// ---------------------------------------------------------------------------

export const xxdCommand: ShellCommand = {
  name: 'xxd',
  description: 'Make a hexdump',
  usage: 'xxd [FILE]',
  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const input = readInput(ctx, args.positional, 'xxd');
    if (input.error) return { output: '', exitCode: 1, error: input.error };
    const bytes = toBytes(input.content);
    const lines: string[] = [];
    for (let off = 0; off < bytes.length; off += 16) {
      const chunk = bytes.slice(off, off + 16);
      const hex: string[] = [];
      let ascii = '';
      for (let i = 0; i < 16; i++) {
        if (i < chunk.length) {
          hex.push(chunk[i].toString(16).padStart(2, '0'));
          ascii += chunk[i] >= 0x20 && chunk[i] <= 0x7e ? String.fromCharCode(chunk[i]) : '.';
        } else {
          hex.push('  ');
        }
      }
      // xxd groups hex in pairs of bytes.
      const grouped = hex.reduce<string[]>((acc, h, i) => {
        if (i % 2 === 0) acc.push(h);
        else acc[acc.length - 1] += h;
        return acc;
      }, []).join(' ');
      lines.push(`${off.toString(16).padStart(8, '0')}: ${grouped}  ${ascii}`);
    }
    return { output: lines.join('\n'), exitCode: 0 };
  },
  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

// ---------------------------------------------------------------------------
// stat
// ---------------------------------------------------------------------------

export const statCommand: ShellCommand = {
  name: 'stat',
  description: 'Display file or file system status',
  usage: 'stat [FILE...]',
  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.positional.length === 0) {
      return { output: '', exitCode: 1, error: "stat: missing operand" };
    }
    const out: string[] = [];
    const errors: string[] = [];
    for (const file of args.positional) {
      const st = ctx.vfs.stat(file);
      if (!st.ok) {
        errors.push(`stat: cannot statx '${file}': No such file or directory`);
        continue;
      }
      const node = st.value;
      const typeName = node.type === 'directory' ? 'directory' : node.type === 'symlink' ? 'symbolic link' : 'regular file';
      const p = node.permissions;
      const octal = (perm: { read: boolean; write: boolean; execute: boolean }) =>
        (perm.read ? 4 : 0) + (perm.write ? 2 : 0) + (perm.execute ? 1 : 0);
      const mode = `0${octal(p.owner)}${octal(p.group)}${octal(p.other)}`;
      const symbolic =
        (node.type === 'directory' ? 'd' : node.type === 'symlink' ? 'l' : '-') +
        (p.owner.read ? 'r' : '-') + (p.owner.write ? 'w' : '-') + (p.owner.execute ? 'x' : '-') +
        (p.group.read ? 'r' : '-') + (p.group.write ? 'w' : '-') + (p.group.execute ? 'x' : '-') +
        (p.other.read ? 'r' : '-') + (p.other.write ? 'w' : '-') + (p.other.execute ? 'x' : '-');
      // Deterministic fake inode so repeated runs are stable.
      let inode = 0;
      for (const ch of file) inode = (inode * 31 + ch.charCodeAt(0)) >>> 0;
      const fmt = (d: Date) => `${d.toISOString().slice(0, 19).replace('T', ' ')}.000000000 +0000`;
      out.push(
        `  File: ${node.name}`,
        `  Size: ${node.size.toString().padEnd(15)}Blocks: ${Math.ceil(node.size / 512)}          IO Block: 4096   ${typeName}`,
        `Device: 802h/2050d\tInode: ${inode % 10000000}\tLinks: 1`,
        `Access: (${mode}/${symbolic})  Uid: (    0/${node.owner})   Gid: (    0/${node.group})`,
        `Access: ${fmt(node.modified)}`,
        `Modify: ${fmt(node.modified)}`,
        `Change: ${fmt(node.modified)}`,
      );
    }
    return {
      output: out.join('\n'),
      exitCode: errors.length > 0 ? 1 : 0,
      error: errors.length > 0 ? errors.join('\n') : undefined,
    };
  },
  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

// ---------------------------------------------------------------------------
// file
// ---------------------------------------------------------------------------

export const fileCommand: ShellCommand = {
  name: 'file',
  description: 'Determine file type',
  usage: 'file [FILE...]',
  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.positional.length === 0) {
      return { output: '', exitCode: 1, error: 'file: missing operand' };
    }
    const out: string[] = [];
    for (const path of args.positional) {
      if (ctx.vfs.isDirectory(ctx.vfs.resolvePath(path))) {
        out.push(`${path}: directory`);
        continue;
      }
      const r = ctx.vfs.readFile(path);
      if (!r.ok) {
        out.push(`${path}: cannot open (No such file or directory)`);
        continue;
      }
      out.push(`${path}: ${guessType(path, r.value)}`);
    }
    return { output: out.join('\n'), exitCode: 0 };
  },
  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

function guessType(path: string, content: string): string {
  if (content === '') return 'empty';
  // Content sniffing first, then extension hints.
  if (/^\x7fELF/.test(content)) return 'ELF 64-bit LSB executable';
  if (/^#!\s*\/.*(bash|sh)\b/.test(content)) return 'Bourne-Again shell script, ASCII text executable';
  if (/^#!\s*\/.*python/.test(content)) return 'Python script, ASCII text executable';
  if (/^\x1f\x8b/.test(content)) return 'gzip compressed data';
  if (/^PK\x03\x04/.test(content)) return 'Zip archive data';
  if (/^\{[\s\S]*\}\s*$/.test(content.trim()) || /^\[[\s\S]*\]\s*$/.test(content.trim())) return 'JSON data';
  // Any non-printable byte → treat as binary data.
   
  if (/[\x00-\x08\x0e-\x1f]/.test(content)) return 'data';
  if (path.endsWith('.csv')) return 'CSV text';
  return 'ASCII text';
}

export const extendedCommands: ShellCommand[] = [
  sha256sumCommand,
  sha1sumCommand,
  md5sumCommand,
  base64Command,
  trCommand,
  teeCommand,
  nlCommand,
  tacCommand,
  revCommand,
  stringsCommand,
  xxdCommand,
  statCommand,
  fileCommand,
];
