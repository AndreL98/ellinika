import type { ContentStatus, Source } from '../content/types';

/** One learnable item, merged from core.json, <lang>.json and gloss/<ui-lang>.json. */
export interface LearnItem {
  id: string;
  pack: string;
  kind: string;
  tags: string[];
  /** Text in the learning language. */
  text: string;
  lang: string;
  dir: 'ltr' | 'rtl';
  translit?: string;
  translitAi: boolean;
  pron?: string;
  pronAi: boolean;
  audio: string | null;
  /** Meaning in the UI language. */
  meaning: string;
  note?: string;
  status: ContentStatus;
  source: Source;
}

export interface LearnUnit {
  /** Unique across packs: "<pack>/<unit-id>". */
  key: string;
  pack: string;
  id: string;
  icon?: string;
  order: number;
  title: string;
  items: LearnItem[];
}

export type ChoiceType = 'choose_meaning' | 'choose_translation' | 'listen_choose';
export type BuildType = 'build_to_ui' | 'build_to_learn' | 'listen_build';
export type ExerciseType = ChoiceType | BuildType | 'match_pairs';

export interface ChoiceExercise {
  type: ChoiceType;
  item: LearnItem;
  /** Shuffled options, including the item itself. */
  options: LearnItem[];
}

export interface BuildExercise {
  type: BuildType;
  item: LearnItem;
  /** Tiles in the correct order. */
  solution: string[];
  /** Shuffled tiles: solution plus distractors. */
  tiles: string[];
}

export interface PairsExercise {
  type: 'match_pairs';
  /** Left column (learning language), in display order. */
  items: LearnItem[];
  /** Right column (meanings), shuffled independently. */
  right: LearnItem[];
}

export type Exercise = ChoiceExercise | BuildExercise | PairsExercise;

export type Answer =
  | { type: 'choice'; itemId: string }
  | { type: 'build'; tokens: string[] }
  | { type: 'pairs'; wrongAttempts: number };
