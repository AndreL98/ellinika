import { describe, expect, it } from 'vitest';
import {
  checkAnswer, createBuild, createChoice, createPairs, generateLesson, isSentence, LESSON_SIZE, OPTION_COUNT,
  solutionText, typesFor,
} from '../../app/src/engine/exercises';
import { seededRandom, shuffle } from '../../app/src/engine/random';
import { sameTokens, tokenize } from '../../app/src/engine/tokens';
import { item, sentence, words } from './helpers';

const random = () => seededRandom(42);

describe('tokens', () => {
  it('splits words and drops punctuation incl. Greek ano teleia and question mark', () => {
    expect(tokenize('Είμαι από τη Γερμανία.')).toEqual(['Είμαι', 'από', 'τη', 'Γερμανία']);
    expect(tokenize('δὸς ἡμῖν σήμερον·')).toEqual(['δὸς', 'ἡμῖν', 'σήμερον']);
    expect(tokenize('Τι κάνεις;')).toEqual(['Τι', 'κάνεις']);
  });

  it('compares tiles case-insensitively and NFC-normalized', () => {
    expect(sameTokens(['Είμαι'], ['είμαι'])).toBe(true);
    expect(sameTokens(['ά'.normalize('NFD')], ['ά'])).toBe(true);
    expect(sameTokens(['a', 'b'], ['b', 'a'])).toBe(false);
  });
});

describe('random', () => {
  it('is deterministic for a seed and keeps all elements', () => {
    expect(shuffle([1, 2, 3, 4, 5], seededRandom(1))).toEqual(shuffle([1, 2, 3, 4, 5], seededRandom(1)));
    expect(shuffle([1, 2, 3, 4, 5], seededRandom(1)).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('exercise types', () => {
  it('uses build exercises for sentences and choice exercises for words', () => {
    expect(isSentence(sentence)).toBe(true);
    expect(isSentence(words[0]!)).toBe(false);
    expect(typesFor(words[0]!, { canListen: false, crowns: 0 })).toEqual(['choose_meaning']);
    expect(typesFor(sentence, { canListen: false, crowns: 0 })).toEqual(['build_to_ui']);
  });

  it('adds production and listening exercises with crowns and a voice', () => {
    expect(typesFor(words[0]!, { canListen: true, crowns: 1 })).toEqual(['choose_meaning', 'choose_translation', 'listen_choose']);
    expect(typesFor(sentence, { canListen: true, crowns: 2 })).toEqual(['build_to_ui', 'build_to_learn', 'listen_build']);
  });
});

describe('choice exercises', () => {
  it('has the item plus distinct distractors, never a sentence', () => {
    const ex = createChoice('choose_meaning', words[0]!, [...words, sentence], random());
    expect(ex.options).toHaveLength(OPTION_COUNT);
    expect(ex.options.map((o) => o.id)).toContain('w.morning');
    expect(ex.options.map((o) => o.id)).not.toContain('s.germany');
    expect(new Set(ex.options.map((o) => o.meaning)).size).toBe(OPTION_COUNT);
  });

  it('never offers two options with the same meaning', () => {
    const twin = item('w.morning2', 'καλημέρα σας', 'Guten Morgen');
    for (let seed = 0; seed < 20; seed++) {
      const ex = createChoice('choose_meaning', words[0]!, [...words, twin], seededRandom(seed));
      expect(ex.options.map((o) => o.id)).not.toContain('w.morning2');
    }
  });

  it('checks the selected item', () => {
    const ex = createChoice('choose_translation', words[1]!, words, random());
    expect(checkAnswer(ex, { type: 'choice', itemId: 'w.thanks' })).toBe(true);
    expect(checkAnswer(ex, { type: 'choice', itemId: 'w.yes' })).toBe(false);
    expect(solutionText(ex)).toBe('ευχαριστώ');
  });
});

describe('build exercises', () => {
  it('builds towards the UI language with distractor tiles', () => {
    const ex = createBuild('build_to_ui', sentence, [...words, sentence], random());
    expect(ex.solution).toEqual(['Ich', 'bin', 'aus', 'Deutschland']);
    expect(ex.tiles).toHaveLength(ex.solution.length + 3);
    expect(ex.tiles).toEqual(expect.arrayContaining(ex.solution));
  });

  it('builds towards the learning language', () => {
    const ex = createBuild('build_to_learn', sentence, [...words, sentence], random());
    expect(ex.solution).toEqual(['Είμαι', 'από', 'τη', 'Γερμανία']);
    expect(checkAnswer(ex, { type: 'build', tokens: ['είμαι', 'από', 'τη', 'Γερμανία'] })).toBe(true);
    expect(checkAnswer(ex, { type: 'build', tokens: ['από', 'Είμαι', 'τη', 'Γερμανία'] })).toBe(false);
  });
});

describe('pairs', () => {
  it('uses at most four distinct pairs and needs zero wrong attempts', () => {
    const ex = createPairs(words, random());
    expect(ex.items).toHaveLength(4);
    expect([...ex.right].sort((a, b) => a.id.localeCompare(b.id))).toEqual([...ex.items].sort((a, b) => a.id.localeCompare(b.id)));
    expect(checkAnswer(ex, { type: 'pairs', wrongAttempts: 0 })).toBe(true);
    expect(checkAnswer(ex, { type: 'pairs', wrongAttempts: 1 })).toBe(false);
  });
});

describe('generateLesson', () => {
  it('fills a lesson, covers every item and adds one pairs exercise', () => {
    const unit = [...words, sentence];
    const lesson = generateLesson(unit, unit, { random: random(), canListen: false, crowns: 0 });
    expect(lesson).toHaveLength(LESSON_SIZE);
    expect(lesson.filter((ex) => ex.type === 'match_pairs')).toHaveLength(1);
    const covered = new Set(lesson.flatMap((ex) => ('item' in ex ? [ex.item.id] : [])));
    for (const it of unit) expect(covered).toContain(it.id);
  });

  it('never creates listening exercises without a voice', () => {
    for (let seed = 0; seed < 20; seed++) {
      const lesson = generateLesson([...words, sentence], words, { random: seededRandom(seed), canListen: false, crowns: 3 });
      expect(lesson.some((ex) => ex.type.startsWith('listen'))).toBe(false);
    }
  });

  it('returns nothing for an empty unit', () => {
    expect(generateLesson([], words, { random: random(), canListen: false, crowns: 0 })).toEqual([]);
  });
});
