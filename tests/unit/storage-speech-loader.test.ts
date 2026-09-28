import { describe, expect, it, vi } from 'vitest';
import { loadContent, type PackContent } from '../../app/src/content/loader';
import { applyLesson, emptyProgress } from '../../app/src/engine/progress';
import { findVoice, Speaker } from '../../app/src/speech/speech';
import { exportProgress, importProgress, loadProgress, parseProgress, saveProgress } from '../../app/src/storage/progress-store';
import { createLocalStorageStore, createMemoryStore } from '../../app/src/storage/store';
import core from '../fixtures/packs-e2e/demo/core.json';
import el from '../fixtures/packs-e2e/demo/el.json';
import gloss from '../fixtures/packs-e2e/demo/gloss/de.json';

const pack = { core, languages: { el }, glosses: { de: gloss } } as unknown as PackContent;

describe('progress storage', () => {
  const progress = applyLesson(emptyProgress(), 'demo/greetings', { exercises: 8, mistakes: 0, perfect: true }, '2026-09-28');

  it('saves and loads progress', async () => {
    const store = createMemoryStore();
    expect(await loadProgress(store)).toEqual(emptyProgress());
    await saveProgress(store, progress);
    expect(await loadProgress(store)).toEqual(progress);
  });

  it('falls back to empty progress for broken data', async () => {
    const store = createMemoryStore();
    await store.set('progress', '{broken');
    expect(await loadProgress(store)).toEqual(emptyProgress());
    expect(parseProgress({ version: 2 })).toBeNull();
  });

  it('works with localStorage under a prefix', async () => {
    const data = new Map<string, string>();
    const fake = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) } as Storage;
    const store = createLocalStorageStore(fake);
    await saveProgress(store, progress);
    expect([...data.keys()]).toEqual(['logos:progress']);
    expect(await loadProgress(store)).toEqual(progress);
  });

  it('round-trips export and import and rejects foreign files', () => {
    const file = exportProgress(progress, new Date('2026-09-28T20:00:00Z'));
    expect(importProgress(file)).toEqual(progress);
    expect(() => importProgress('nope')).toThrow('not-json');
    expect(() => importProgress('{"format":"other"}')).toThrow('wrong-format');
    expect(() => importProgress('{"format":"logos-progress","progress":{}}')).toThrow('invalid-progress');
  });
});

describe('speech', () => {
  const voice = (lang: string) => ({ lang, name: lang }) as SpeechSynthesisVoice;

  it('prefers an exact voice, then the same primary language', () => {
    expect(findVoice([voice('el'), voice('el-GR')], 'el-GR')?.lang).toBe('el-GR');
    expect(findVoice([voice('en-US'), voice('el-GR')], 'el')?.lang).toBe('el-GR');
    expect(findVoice([voice('en-US')], 'el')).toBeUndefined();
  });

  it('uses audio first, then a voice, then reports none', async () => {
    const play = vi.fn(() => Promise.resolve());
    const speak = vi.fn();
    const synth = { getVoices: () => [voice('el-GR')], speak, cancel: vi.fn() } as unknown as SpeechSynthesis;
    const speaker = new Speaker({
      synth,
      createAudio: () => ({ play }) as unknown as HTMLAudioElement,
      createUtterance: (text) => ({ text }) as SpeechSynthesisUtterance,
    });
    await speaker.init();
    expect(speaker.speak('ναι', 'el', 'audio/el/yes.mp3')).toBe('audio');
    expect(play).toHaveBeenCalledOnce();
    expect(speaker.speak('ναι', 'el', null)).toBe('tts');
    expect(speak).toHaveBeenCalledOnce();
    expect(speaker.speak('да', 'ru', null)).toBe('none');
    expect(speaker.hasVoice('ru')).toBe(false);
  });

  it('reports none without any speech support', async () => {
    const speaker = new Speaker({});
    await speaker.init();
    expect(speaker.canSpeak('el', null)).toBe(false);
    expect(speaker.speak('ναι', 'el', null)).toBe('none');
  });
});

describe('loadContent', () => {
  it('shows only approved texts in public builds', () => {
    const { units, pools } = loadContent([pack], { learnLang: 'el', uiLang: 'de', includeUnapproved: false });
    expect(units).toHaveLength(1);
    expect(units[0]?.title).toBe('Begrüßung');
    expect(units[0]?.key).toBe('demo/greetings');
    expect(units[0]?.items.map((i) => i.id)).not.toContain('greetings.hidden');
    expect(pools['demo']).toHaveLength(5);
  });

  it('includes drafts in the developer view', () => {
    const { units } = loadContent([pack], { learnLang: 'el', uiLang: 'de', includeUnapproved: true });
    expect(units[0]?.items.map((i) => i.id)).toContain('greetings.hidden');
    expect(units[0]?.items.find((i) => i.id === 'greetings.hidden')?.status).toBe('draft');
  });

  it('merges text, transliteration flag and meaning', () => {
    const { units } = loadContent([pack], { learnLang: 'el', uiLang: 'de', includeUnapproved: false });
    const morning = units[0]?.items.find((i) => i.id === 'greetings.morning');
    expect(morning).toMatchObject({ text: 'καλημέρα', translit: 'kaliméra', translitAi: true, meaning: 'Guten Morgen', lang: 'el' });
  });

  it('skips packs without the learning or UI language', () => {
    expect(loadContent([pack], { learnLang: 'ru', uiLang: 'de', includeUnapproved: true }).units).toEqual([]);
    expect(loadContent([pack], { learnLang: 'el', uiLang: 'es', includeUnapproved: true }).units).toEqual([]);
  });
});

describe('openBestStore', () => {
  it('falls back to memory when no browser storage exists', async () => {
    const { openBestStore } = await import('../../app/src/storage/store');
    expect((await openBestStore()).kind).toBe('memory');
  });

  it('falls back when IndexedDB never answers', async () => {
    const { openBestStore } = await import('../../app/src/storage/store');
    const hanging = { open: () => ({}) } as unknown as IDBFactory;
    vi.stubGlobal('indexedDB', hanging);
    try {
      expect((await openBestStore(50)).kind).toBe('memory');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
