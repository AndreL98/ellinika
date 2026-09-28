import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createTranslator, directionOf, pickLanguage } from '../../app/src/i18n';
import de from '../../locales/de.json';

describe('createTranslator', () => {
  const messages = {
    greeting: 'Hallo {{name}}',
    lesson: { done_one: '{{count}} Lektion fertig', done_other: '{{count}} Lektionen fertig' },
  };

  it('resolves nested keys and interpolates variables', () => {
    const t = createTranslator('de', messages);
    expect(t('greeting', { name: 'Anna' })).toBe('Hallo Anna');
  });

  it('uses i18next v4 plural suffixes', () => {
    const t = createTranslator('de', messages);
    expect(t('lesson.done', { count: 1 })).toBe('1 Lektion fertig');
    expect(t('lesson.done', { count: 3 })).toBe('3 Lektionen fertig');
  });

  it('falls back to fallback messages, then to the key', () => {
    const t = createTranslator('es', {}, messages);
    expect(t('greeting', { name: 'Ana' })).toBe('Hallo Ana');
    expect(t('does.not.exist')).toBe('does.not.exist');
  });

  it('keeps unknown placeholders visible', () => {
    const t = createTranslator('de', messages);
    expect(t('greeting')).toBe('Hallo {{name}}');
  });
});

describe('pickLanguage', () => {
  it('matches exact and primary subtags, else falls back', () => {
    expect(pickLanguage(['es-ES', 'de'], ['de', 'es'], 'de')).toBe('es');
    expect(pickLanguage(['fr'], ['de', 'en'], 'de')).toBe('de');
    expect(pickLanguage(['EN-us'], ['en-US'], 'de')).toBe('en-US');
  });
});

describe('directionOf', () => {
  it('detects right-to-left languages including Syriac', () => {
    expect(directionOf('ar')).toBe('rtl');
    expect(directionOf('syr')).toBe('rtl');
    expect(directionOf('el')).toBe('ltr');
    expect(directionOf('ru-RU')).toBe('ltr');
  });
});

describe('locales/de.json', () => {
  const lookup = (key: string): unknown =>
    key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], de);
  const exists = (key: string) => typeof lookup(key) === 'string' || typeof lookup(`${key}_other`) === 'string';

  it('contains every literal key used in the app source', () => {
    const dir = fileURLToPath(new URL('../../app/src', import.meta.url));
    const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts'));
    const keys = new Set<string>();
    for (const file of files) {
      const source = readFileSync(join(dir, file), 'utf8');
      for (const match of source.matchAll(/\bt\('([a-z_]+\.[a-z_.]+)'/g)) keys.add(match[1]!);
    }
    expect(keys.size).toBeGreaterThan(20);
    expect([...keys].filter((key) => !exists(key))).toEqual([]);
  });

  it('contains an instruction for every exercise type', () => {
    const types = ['choose_meaning', 'choose_translation', 'listen_choose', 'build_to_ui', 'build_to_learn', 'listen_build', 'match_pairs'];
    expect(types.filter((type) => !exists(`exercise.${type}`))).toEqual([]);
  });
});
