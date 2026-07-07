import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LegalPages } from './index';

// ⚠️ GUARD TEST — deliberately marked `it.fails` because LEGAL_OWNER in
// ./index.tsx still ships TODO placeholders and this plan must not invent
// real personal data. The site owner must:
//   1. fill real data into LEGAL_OWNER (index.tsx),
//   2. then these it.fails specs start ERRORING ("expected to fail"),
//   3. flip `it.fails` → `it` so the guard becomes permanent.
// Until then the Impressum is NOT legally compliant (§ 5 TMG).
function pageText(initialPage: 'impressum' | 'datenschutz'): string {
  const { container } = render(
    <LegalPages initialPage={initialPage} onClose={() => {}} />,
  );
  return container.textContent ?? '';
}

function expectNoPlaceholders(text: string) {
  expect(text).not.toMatch(/TODO/i);
  expect(text).not.toMatch(/XXX/);
  expect(text).not.toMatch(/BITTE AUSFÜLLEN/);
  expect(text).not.toMatch(/example\.com/);
}

describe('LegalPages — no placeholder data may ship', () => {
  it.fails('Impressum contains no TODO/XXX placeholder data', () => {
    expectNoPlaceholders(pageText('impressum'));
  });

  it.fails('Datenschutz contains no TODO/XXX placeholder data', () => {
    expectNoPlaceholders(pageText('datenschutz'));
  });
});
