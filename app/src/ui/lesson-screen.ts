import { checkAnswer, generateLesson, solutionText } from '../engine/exercises';
import { Lesson, type LessonSummary } from '../engine/lesson';
import { applyLesson, crownsOf, xpForLesson } from '../engine/progress';
import type { Answer, LearnUnit } from '../engine/types';
import type { AppContext } from './context';
import { button, el } from './dom';
import { renderExercise } from './exercise-view';

function solutionNode(text: string, inLearningLanguage: boolean, unit: LearnUnit, ctx: AppContext): HTMLElement {
  const first = unit.items[0];
  return inLearningLanguage && first
    ? el('strong', { textContent: text, lang: first.lang, dir: first.dir })
    : el('strong', { textContent: text, lang: ctx.uiLang });
}

function renderResult(root: HTMLElement, unit: LearnUnit, summary: LessonSummary, ctx: AppContext): void {
  const { t } = ctx;
  const back = button(t('result.back'), () => ctx.navigate('#/'), 'btn btn-primary');
  root.replaceChildren(
    el('section', { className: 'card result', dataset: { screen: 'result' } }, [
      el('h2', { textContent: t('result.title'), tabIndex: -1 }),
      el('p', { className: 'result-xp', textContent: t('result.xp', { count: xpForLesson(summary) }) }),
      el('p', {
        textContent: summary.perfect ? t('result.perfect') : t('result.mistakes', { count: summary.mistakes }),
      }),
      el('p', { textContent: t('result.crowns', { count: crownsOf(ctx.getProgress(), unit.progressKey) }) }),
      back,
    ]),
  );
  back.focus();
}

/** Runs a lesson for a unit inside `root`. */
export function renderLesson(root: HTMLElement, unit: LearnUnit, ctx: AppContext): void {
  const { t } = ctx;
  const exercises = generateLesson(unit.items, ctx.content.pools[unit.pack] ?? unit.items, {
    random: ctx.random,
    canListen: ctx.speaker.hasVoice(ctx.learnLang),
    crowns: crownsOf(ctx.getProgress(), unit.progressKey),
  });
  if (exercises.length === 0) {
    root.replaceChildren(el('p', { textContent: t('lesson.empty') }));
    return;
  }
  const lesson = new Lesson(exercises);

  const showStep = () => {
    const exercise = lesson.current;
    if (!exercise) {
      const summary = lesson.summary();
      // Progress is updated in memory at once; saving runs in the background.
      void ctx.setProgress(applyLesson(ctx.getProgress(), unit.progressKey, summary, ctx.today()));
      renderResult(root, unit, summary, ctx);
      return;
    }

    const { current, total } = lesson.step;
    let answer: Answer | null = null;
    const feedback = el('div', { className: 'feedback', attrs: { role: 'status', 'aria-live': 'polite' } });
    const action = button(t('lesson.check'), () => undefined, 'btn btn-primary');
    action.disabled = true;

    const view = renderExercise(exercise, ctx, (next) => {
      answer = next;
      action.disabled = next === null;
    });

    let checked = false;
    action.addEventListener('click', () => {
      if (checked) {
        showStep();
        return;
      }
      if (!answer) return;
      checked = true;
      const correct = checkAnswer(exercise, answer);
      lesson.submit(correct);
      view.lock();
      feedback.className = `feedback ${correct ? 'is-correct' : 'is-wrong'}`;
      const inLearning = exercise.type !== 'choose_meaning' && exercise.type !== 'build_to_ui';
      feedback.replaceChildren(
        correct
          ? el('p', { textContent: t('lesson.correct') })
          : el('p', {}, [`${t('lesson.wrong')} `, solutionNode(solutionText(exercise), inLearning && exercise.type !== 'match_pairs', unit, ctx)]),
      );
      const note = 'item' in exercise ? exercise.item.note : undefined;
      if (note) feedback.append(el('p', { className: 'feedback-note', textContent: note, lang: ctx.uiLang }));
      action.textContent = t('lesson.continue');
      action.focus();
    });

    const bar = el('progress', { max: total, value: current - 1, className: 'lesson-progress' });
    bar.setAttribute('aria-label', t('lesson.progress', { current, total }));

    root.replaceChildren(
      el('div', { className: 'lesson', dataset: { screen: 'lesson' } }, [
        el('div', { className: 'lesson-top' }, [
          button(`✕ ${t('lesson.close')}`, () => ctx.navigate('#/'), 'btn btn-secondary btn-small'),
          el('span', { className: 'lesson-step', textContent: t('lesson.progress', { current, total }) }),
          lesson.isRetry ? el('span', { className: 'retry-badge', textContent: t('lesson.retry') }) : null,
        ]),
        bar,
        view.element,
        feedback,
        el('div', { className: 'lesson-actions' }, [action]),
      ]),
    );
    root.querySelector<HTMLElement>('.instruction')?.focus();
  };

  showStep();
}
