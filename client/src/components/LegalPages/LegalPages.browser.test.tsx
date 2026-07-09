import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LegalPages } from './index';

// ⚠️ GUARD TEST — armed. Real operator data lives in config/legal.ts.
// These specs fail the build if any TODO/XXX/example.com placeholder ever
// leaks back into the shipped Impressum/Datenschutz (§ 5 TMG / Art. 13 DSGVO).
// Do NOT weaken the assertions — reintroducing placeholder data must break CI.
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
  it('Impressum contains no TODO/XXX placeholder data', () => {
    expectNoPlaceholders(pageText('impressum'));
  });

  it('Datenschutz contains no TODO/XXX placeholder data', () => {
    expectNoPlaceholders(pageText('datenschutz'));
  });
});
