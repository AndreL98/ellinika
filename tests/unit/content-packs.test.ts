import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadContent, type PackContent } from '../../app/src/content/loader';
import { generateLesson, isSentence } from '../../app/src/engine/exercises';
import { seededRandom } from '../../app/src/engine/random';
import { tokenize } from '../../app/src/engine/tokens';

const packsDir = fileURLToPath(new URL('../../content/packs', import.meta.url));
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

/** Loads the real packs from disk, like content/packs.ts does in the browser. */
function realPacks(): PackContent[] {
  return readdirSync(packsDir).map((name) => {
    const dir = join(packsDir, name);
    const languages: PackContent['languages'] = {};
    const glosses: PackContent['glosses'] = {};
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'core.json')) {
      languages[file.replace('.json', '')] = read(join(dir, file));
    }
    if (existsSync(join(dir, 'gloss'))) {
      for (const file of readdirSync(join(dir, 'gloss'))) glosses[file.replace('.json', '')] = read(join(dir, 'gloss', file));
    }
    return { core: read(join(dir, 'core.json')), languages, glosses };
  });
}

describe.each(['el', 'ru'])('real content: general/%s with German explanations', (learnLang) => {
  const { units, pools } = loadContent(realPacks(), { learnLang, uiLang: 'de', includeUnapproved: true });
  const general = units.filter((unit) => unit.pack === 'general');

  it('has units with titles and enough words and sentences for every exercise type', () => {
    expect(general.length).toBeGreaterThanOrEqual(6);
    for (const unit of general) {
      expect(unit.title).not.toBe(unit.id);
      expect(unit.items.filter((item) => !isSentence(item)).length, unit.key).toBeGreaterThanOrEqual(3);
      expect(unit.items.filter(isSentence).length, unit.key).toBeGreaterThanOrEqual(1);
    }
  });

  it('marks transliteration and pronunciation as AI suggestion and has a German pronunciation hint', () => {
    for (const item of pools['general'] ?? []) {
      expect(item.translit, item.id).toBeTruthy();
      expect(item.pron, item.id).toBeTruthy();
      expect(item.translitAi && item.pronAi, item.id).toBe(true);
    }
  });

  it('has no two items with the same text or meaning', () => {
    const pool = pools['general'] ?? [];
    expect(new Set(pool.map((item) => item.text)).size).toBe(pool.length);
    expect(new Set(pool.map((item) => item.meaning.toLowerCase())).size).toBe(pool.length);
  });

  it('public builds contain only approved items', () => {
    const pub = loadContent(realPacks(), { learnLang, uiLang: 'de', includeUnapproved: false });
    const items = pub.units.flatMap((unit) => unit.items);
    for (const item of items) expect(item.status, item.id).toBe('approved');
    // Greek was approved on 2026-09-28; Russian stays hidden until it is approved.
    expect(items.length).toBe(learnLang === 'el' ? 63 : 0);
  });

  it('uses its own script', () => {
    const script = learnLang === 'ru' ? /\p{Script=Cyrillic}/u : /\p{Script=Greek}/u;
    for (const item of pools['general'] ?? []) expect(item.text, item.id).toMatch(script);
  });

  it('generates playable lessons for every unit, level and voice setting', () => {
    for (const unit of general) {
      for (let seed = 0; seed < 10; seed++) {
        for (const crowns of [0, 1, 3]) {
          for (const canListen of [false, true]) {
            const lesson = generateLesson(unit.items, pools['general'] ?? [], { random: seededRandom(seed), canListen, crowns });
            expect(lesson).toHaveLength(8);
            for (const ex of lesson) {
              if ('options' in ex) expect(ex.options.length, `${unit.key} ${ex.type}`).toBeGreaterThanOrEqual(3);
              if ('solution' in ex) {
                expect(ex.solution.length).toBeGreaterThanOrEqual(3);
                expect(ex.tiles.length).toBeGreaterThan(ex.solution.length);
                const text = ex.type === 'build_to_ui' ? ex.item.meaning : ex.item.text;
                expect(ex.solution).toEqual(tokenize(text));
              }
            }
          }
        }
      }
    }
  });
});
