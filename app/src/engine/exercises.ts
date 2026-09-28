import { pick, sample, shuffle, type Random } from './random';
import { sameTokens, tokenize } from './tokens';
import type {
  Answer,
  BuildExercise,
  BuildType,
  ChoiceExercise,
  ChoiceType,
  Exercise,
  ExerciseType,
  LearnItem,
  PairsExercise,
} from './types';

export const OPTION_COUNT = 4;
export const DISTRACTOR_TILES = 3;
export const MAX_PAIRS = 4;
/** Texts with at least this many words are practised by building sentences. */
export const SENTENCE_MIN_WORDS = 3;

export interface GeneratorOptions {
  random: Random;
  /** False if neither audio files nor a speech voice exist for the learning language. */
  canListen: boolean;
  /** Crowns already earned in the unit (0–3). Higher levels add production exercises. */
  crowns: number;
}

export function isSentence(item: LearnItem): boolean {
  return tokenize(item.text).length >= SENTENCE_MIN_WORDS;
}

/** Exercise types suited for an item at the given level. */
export function typesFor(item: LearnItem, options: Pick<GeneratorOptions, 'canListen' | 'crowns'>): ExerciseType[] {
  const advanced = options.crowns >= 1;
  if (isSentence(item)) {
    const types: BuildType[] = ['build_to_ui'];
    if (advanced) types.push('build_to_learn');
    if (options.canListen && advanced) types.push('listen_build');
    return types;
  }
  const types: ChoiceType[] = ['choose_meaning'];
  if (advanced) types.push('choose_translation');
  if (options.canListen) types.push('listen_choose');
  return types;
}

function distinctBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function createChoice(type: ChoiceType, item: LearnItem, pool: LearnItem[], random: Random): ChoiceExercise {
  // Options must differ in what the learner compares (text or meaning), otherwise two would be correct.
  const shown = (candidate: LearnItem) => (type === 'choose_meaning' ? candidate.meaning : candidate.text);
  const candidates = distinctBy(
    pool.filter((other) => other.id !== item.id && shown(other) !== shown(item) && !isSentence(other)),
    shown,
  );
  const options = shuffle([item, ...sample(candidates, OPTION_COUNT - 1, random)], random);
  return { type, item, options };
}

export function createBuild(type: BuildType, item: LearnItem, pool: LearnItem[], random: Random): BuildExercise {
  const inUiLanguage = type === 'build_to_ui';
  const textOf = (candidate: LearnItem) => (inUiLanguage ? candidate.meaning : candidate.text);
  const solution = tokenize(textOf(item));
  const used = new Set(solution.map((token) => token.toLowerCase()));
  const otherTokens = distinctBy(
    pool.filter((other) => other.id !== item.id).flatMap((other) => tokenize(textOf(other))),
    (token) => token.toLowerCase(),
  ).filter((token) => !used.has(token.toLowerCase()));
  const tiles = shuffle([...solution, ...sample(otherTokens, DISTRACTOR_TILES, random)], random);
  return { type, item, solution, tiles };
}

export function createPairs(items: LearnItem[], random: Random): PairsExercise {
  const chosen = sample(
    distinctBy(distinctBy(items, (item) => item.text), (item) => item.meaning),
    MAX_PAIRS,
    random,
  );
  return { type: 'match_pairs', items: chosen, right: shuffle(chosen, random) };
}

export function createExercise(type: ExerciseType, item: LearnItem, pool: LearnItem[], random: Random): Exercise {
  switch (type) {
    case 'choose_meaning':
    case 'choose_translation':
    case 'listen_choose':
      return createChoice(type, item, pool, random);
    case 'build_to_ui':
    case 'build_to_learn':
    case 'listen_build':
      return createBuild(type, item, pool, random);
    case 'match_pairs':
      return createPairs(pool, random);
  }
}

/** Checks an answer. Pairs count as correct when they were matched without a wrong attempt. */
export function checkAnswer(exercise: Exercise, answer: Answer): boolean {
  switch (exercise.type) {
    case 'choose_meaning':
    case 'choose_translation':
    case 'listen_choose':
      return answer.type === 'choice' && answer.itemId === exercise.item.id;
    case 'build_to_ui':
    case 'build_to_learn':
    case 'listen_build':
      return answer.type === 'build' && sameTokens(answer.tokens, exercise.solution);
    case 'match_pairs':
      return answer.type === 'pairs' && answer.wrongAttempts === 0;
  }
}

/** The correct solution as text, shown after a wrong answer. */
export function solutionText(exercise: Exercise): string {
  switch (exercise.type) {
    case 'choose_meaning':
      return exercise.item.meaning;
    case 'choose_translation':
    case 'listen_choose':
      return exercise.item.text;
    case 'build_to_ui':
    case 'build_to_learn':
    case 'listen_build':
      return exercise.solution.join(' ');
    case 'match_pairs':
      return exercise.items.map((item) => `${item.text} – ${item.meaning}`).join(', ');
  }
}

export const LESSON_SIZE = 8;

/**
 * Builds the exercises of one lesson for a unit.
 * `pool` holds all items of the pack, used for distractors.
 */
export function generateLesson(unitItems: LearnItem[], pool: LearnItem[], options: GeneratorOptions): Exercise[] {
  const { random } = options;
  if (unitItems.length === 0) return [];
  const distractorPool = pool.length > 0 ? pool : unitItems;

  const words = unitItems.filter((item) => !isSentence(item));
  const withPairs = words.length >= 3;
  const slots = withPairs ? LESSON_SIZE - 1 : LESSON_SIZE;

  // Every item once (shuffled), then repeat items until the lesson is full.
  const order: LearnItem[] = [];
  while (order.length < slots) order.push(...shuffle(unitItems, random));
  const exercises = order
    .slice(0, slots)
    .map((item) => createExercise(pick(typesFor(item, options), random), item, distractorPool, random));

  if (withPairs) {
    const position = Math.floor(random() * (exercises.length + 1));
    exercises.splice(position, 0, createPairs(words, random));
  }
  return exercises;
}
