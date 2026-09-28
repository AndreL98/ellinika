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
  it('contains every key used by the app shell', () => {
    const t = createTranslator('de', de);
    for (const key of ['app.name', 'app.tagline', 'a11y.skip_to_content', 'shell.status_title', 'shell.status_text', 'shell.offline_ready', 'shell.version']) {
      expect(t(key)).not.toBe(key);
    }
  });
});
