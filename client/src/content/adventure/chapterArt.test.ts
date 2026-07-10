import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAPTER_ART, CINEMATIC_EVENTS } from './chapterArt';
import { adventureChapters } from './chapters';
import { adventureStoryEvents } from './story-events';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '../../../public');

describe('chapterArt', () => {
  it('has art for every chapter', () => {
    for (const ch of adventureChapters) {
      expect(CHAPTER_ART[ch.id], `missing art for ${ch.id}`).toBeTruthy();
    }
  });
  it('all referenced images exist on disk', () => {
    const all = [...Object.values(CHAPTER_ART), ...Object.values(CINEMATIC_EVENTS)];
    for (const img of all) {
      expect(existsSync(join(publicDir, img)), `missing file ${img}`).toBe(true);
    }
  });
  it('cinematic event ids exist in the story', () => {
    const ids = new Set(adventureStoryEvents.map((e) => e.id));
    for (const id of Object.keys(CINEMATIC_EVENTS)) {
      expect(ids.has(id), `unknown event ${id}`).toBe(true);
    }
  });
});
