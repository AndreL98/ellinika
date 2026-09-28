import type { Answer, BuildExercise, ChoiceExercise, Exercise, LearnItem, PairsExercise } from '../engine/types';
import { languageName, type AppContext } from './context';
import { el } from './dom';
import { draftBadge, learnSpan, listenControls, translitLine, uiSpan } from './learn-text';

export interface ExerciseView {
  element: HTMLElement;
  /** Disables all inputs after the answer was checked. */
  lock(): void;
}

/** Called with the current answer, or null while the answer is incomplete. */
export type AnswerListener = (answer: Answer | null) => void;

function instruction(exercise: Exercise, ctx: AppContext): string {
  const lang =
    exercise.type === 'build_to_ui' ? languageName(ctx.uiLang, ctx.uiLang) : languageName(ctx.learnLang, ctx.uiLang);
  return ctx.t(`exercise.${exercise.type}`, { lang });
}

/** Prompt block showing a text in the learning language. */
function learnPrompt(item: LearnItem, ctx: AppContext): HTMLElement {
  return el('div', { className: 'prompt', dataset: { prompt: '' } }, [
    el('p', { className: 'prompt-text' }, [learnSpan(item), ' ', draftBadge(item, ctx)]),
    translitLine(item, ctx),
    ctx.speaker.canSpeak(item.lang, item.audio) ? listenControls(item, ctx) : null,
  ]);
}

function uiPrompt(text: string, ctx: AppContext): HTMLElement {
  return el('div', { className: 'prompt', dataset: { prompt: '' } }, [
    el('p', { className: 'prompt-text' }, [uiSpan(text, ctx)]),
  ]);
}

function renderChoice(exercise: ChoiceExercise, ctx: AppContext, onAnswer: AnswerListener): ExerciseView {
  const { item, type } = exercise;
  const prompt =
    type === 'choose_meaning'
      ? learnPrompt(item, ctx)
      : type === 'choose_translation'
        ? uiPrompt(item.meaning, ctx)
        : el('div', { className: 'prompt', dataset: { prompt: '' } }, [listenControls(item, ctx, true)]);

  const buttons: HTMLButtonElement[] = [];
  const list = el('div', { className: 'options', attrs: { role: 'group', 'aria-label': ctx.t('exercise.options') } });
  for (const option of exercise.options) {
    const label = type === 'choose_meaning' ? uiSpan(option.meaning, ctx) : learnSpan(option);
    const node = el('button', { type: 'button', className: 'option', attrs: { 'aria-pressed': 'false' } }, [label]);
    node.addEventListener('click', () => {
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === node));
      onAnswer({ type: 'choice', itemId: option.id });
    });
    buttons.push(node);
    list.append(node);
  }
  return {
    element: el('div', {}, [prompt, list]),
    lock: () => buttons.forEach((node) => (node.disabled = true)),
  };
}

function renderBuild(exercise: BuildExercise, ctx: AppContext, onAnswer: AnswerListener): ExerciseView {
  const { item, type } = exercise;
  const prompt =
    type === 'build_to_ui'
      ? learnPrompt(item, ctx)
      : type === 'build_to_learn'
        ? uiPrompt(item.meaning, ctx)
        : el('div', { className: 'prompt', dataset: { prompt: '' } }, [listenControls(item, ctx, true)]);

  const tileLang = type === 'build_to_ui' ? { lang: ctx.uiLang } : { lang: item.lang, dir: item.dir };
  const answerArea = el('div', { className: 'tiles tiles-answer', attrs: { role: 'group', 'aria-label': ctx.t('exercise.answer') } });
  const bank = el('div', { className: 'tiles tiles-bank', attrs: { role: 'group', 'aria-label': ctx.t('exercise.tiles') } });
  const all: HTMLButtonElement[] = [];

  const emit = () => {
    const tokens = [...answerArea.querySelectorAll('button')].map((node) => node.textContent ?? '');
    onAnswer(tokens.length > 0 ? { type: 'build', tokens } : null);
  };

  exercise.tiles.forEach((token) => {
    const source = el('button', { type: 'button', className: 'tile', textContent: token, ...tileLang });
    source.addEventListener('click', () => {
      source.disabled = true;
      source.classList.add('used');
      const placed = el('button', { type: 'button', className: 'tile', textContent: token, ...tileLang });
      placed.addEventListener('click', () => {
        placed.remove();
        source.disabled = false;
        source.classList.remove('used');
        source.focus();
        emit();
      });
      all.push(placed);
      answerArea.append(placed);
      emit();
    });
    all.push(source);
    bank.append(source);
  });

  return {
    element: el('div', {}, [prompt, answerArea, bank]),
    lock: () => all.forEach((node) => (node.disabled = true)),
  };
}

function renderPairs(exercise: PairsExercise, ctx: AppContext, onAnswer: AnswerListener): ExerciseView {
  let wrongAttempts = 0;
  let matched = 0;
  let selected: { side: 'left' | 'right'; id: string; node: HTMLButtonElement } | null = null;
  const all: HTMLButtonElement[] = [];

  const makeColumn = (side: 'left' | 'right', items: LearnItem[]) =>
    el(
      'div',
      { className: 'pairs-column' },
      items.map((item) => {
        const label = side === 'left' ? learnSpan(item) : uiSpan(item.meaning, ctx);
        const node = el('button', { type: 'button', className: 'option pair', attrs: { 'aria-pressed': 'false' } }, [label]);
        node.addEventListener('click', () => {
          if (!selected || selected.side === side) {
            if (selected) selected.node.setAttribute('aria-pressed', 'false');
            selected = { side, id: item.id, node };
            node.setAttribute('aria-pressed', 'true');
            return;
          }
          const other = selected;
          selected = null;
          other.node.setAttribute('aria-pressed', 'false');
          if (other.id === item.id) {
            for (const done of [node, other.node]) {
              done.disabled = true;
              done.classList.add('matched');
            }
            matched += 1;
            if (matched === exercise.items.length) onAnswer({ type: 'pairs', wrongAttempts });
          } else {
            wrongAttempts += 1;
            for (const miss of [node, other.node]) {
              miss.classList.add('miss');
              setTimeout(() => miss.classList.remove('miss'), 600);
            }
          }
        });
        all.push(node);
        return node;
      }),
    );

  return {
    element: el('div', { className: 'pairs' }, [makeColumn('left', exercise.items), makeColumn('right', exercise.right)]),
    lock: () => all.forEach((node) => (node.disabled = true)),
  };
}

/** Renders one exercise with its instruction. */
export function renderExercise(exercise: Exercise, ctx: AppContext, onAnswer: AnswerListener): ExerciseView {
  let view: ExerciseView;
  switch (exercise.type) {
    case 'match_pairs':
      view = renderPairs(exercise, ctx, onAnswer);
      break;
    case 'build_to_ui':
    case 'build_to_learn':
    case 'listen_build':
      view = renderBuild(exercise, ctx, onAnswer);
      break;
    default:
      view = renderChoice(exercise, ctx, onAnswer);
  }

  const element = el('section', { className: 'exercise', dataset: { exercise: exercise.type } }, [
    el('h2', { className: 'instruction', textContent: instruction(exercise, ctx), tabIndex: -1 }),
    view.element,
  ]);
  return { element, lock: view.lock };
}
