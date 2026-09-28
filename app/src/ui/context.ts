import type { LoadedContent } from '../content/loader';
import type { Random } from '../engine/random';
import type { Progress } from '../engine/progress';
import type { TranslateFn } from '../i18n';
import type { Speaker } from '../speech/speech';

/** Everything the screens need. Created once in main.ts. */
export interface AppContext {
  t: TranslateFn;
  uiLang: string;
  learnLang: string;
  /** Learning languages with visible content, in display order. */
  learnLangs: string[];
  setLearnLang(lang: string): Promise<void>;
  content: LoadedContent;
  speaker: Speaker;
  random: Random;
  includeUnapproved: boolean;
  getProgress(): Progress;
  setProgress(progress: Progress): Promise<void>;
  today(): string;
  navigate(hash: string): void;
}

/** Language name in the UI language, e.g. "el" → "Griechisch". */
export function languageName(code: string, uiLang: string): string {
  try {
    return new Intl.DisplayNames([uiLang], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}
