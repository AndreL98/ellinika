import type { LearnItem } from '../engine/types';
import type { AppContext } from './context';
import { button, el } from './dom';

/** Text in the learning language with correct lang/dir attributes. */
export function learnSpan(item: LearnItem, className = 'learn-text'): HTMLSpanElement {
  return el('span', { className, textContent: item.text, lang: item.lang, dir: item.dir });
}

/** Text in the UI language. */
export function uiSpan(text: string, ctx: AppContext, className = 'ui-text'): HTMLSpanElement {
  return el('span', { className, textContent: text, lang: ctx.uiLang });
}

/** Marks AI suggestions (transliteration, pronunciation) as required by the content rules. */
function aiMark(ctx: AppContext): HTMLElement {
  return el('abbr', { className: 'ai-mark', title: ctx.t('exercise.ai_suggestion'), textContent: ctx.t('exercise.ai_short') });
}

/** Transliteration line, if present. */
export function translitLine(item: LearnItem, ctx: AppContext): HTMLElement | null {
  if (!item.translit) return null;
  return el('p', { className: 'translit' }, [
    el('span', { className: 'visually-hidden', textContent: `${ctx.t('exercise.translit')}: ` }),
    el('span', { textContent: item.translit, lang: `${item.lang}-Latn` }),
    item.translitAi ? ' ' : null,
    item.translitAi ? aiMark(ctx) : null,
  ]);
}

export function draftBadge(item: LearnItem, ctx: AppContext): HTMLElement | null {
  return item.status === 'approved' ? null : el('span', { className: 'draft-badge', textContent: ctx.t('exercise.draft') });
}

/** Listen buttons (normal and slow), or a notice if no voice exists. */
export function listenControls(item: LearnItem, ctx: AppContext, autoplay = false): HTMLElement {
  if (!ctx.speaker.canSpeak(item.lang, item.audio)) {
    return el('p', { className: 'notice', textContent: ctx.t('exercise.no_voice') });
  }
  const play = (rate: number) => ctx.speaker.speak(item.text, item.lang, item.audio, rate);
  if (autoplay) setTimeout(() => play(1), 150);
  return el('div', { className: 'listen' }, [
    button(`🔊 ${ctx.t('exercise.listen')}`, () => play(1), 'btn btn-listen'),
    button(ctx.t('exercise.listen_slow'), () => play(0.6), 'btn btn-secondary'),
  ]);
}
