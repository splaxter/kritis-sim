// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Minimal, fast (non-type-checked) ruleset over workspace sources.
// Type-aware rules are deliberately out (CI speed, YAGNI) — tsc --noEmit
// already runs in CI for client and server.
export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      // Pre-existing findings downgraded to warn on introduction (2026-07)
      // rather than rewriting working code. Don't add new ones.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-useless-assignment': 'warn',
      'no-case-declarations': 'warn',
      // Terminal game: regexes over ANSI/control characters are the domain
      // (xterm output, shell emulation) — this rule is pure noise here.
      'no-control-regex': 'off',
    },
  },
);
