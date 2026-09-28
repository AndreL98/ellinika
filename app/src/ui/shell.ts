import { currentStreak, todayXp, type Progress } from '../engine/progress';
import type { TranslateFn } from '../i18n';
import { el } from './dom';

export interface Shell {
  /** Container for the current screen. */
  main: HTMLElement;
  /** Shows the "available offline" badge once the service worker is active. */
  markOfflineReady(): void;
  updateStats(progress: Progress, today: string): void;
}

/** Renders the app frame. All visible text comes from i18n keys. */
export function renderShell(root: HTMLElement, t: TranslateFn, version: string): Shell {
  const badge = el('span', { className: 'badge', hidden: true, textContent: t('shell.offline_ready') });
  badge.setAttribute('role', 'status');

  const xp = el('span', { className: 'stat stat-xp' });
  const streak = el('span', { className: 'stat stat-streak' });
  const goalText = el('span', { className: 'stat-goal-text' });
  const goal = el('progress', { className: 'goal' });
  const main = el('main', { id: 'main', tabIndex: -1 });

  root.replaceChildren(
    el('a', { className: 'skip-link', href: '#main', textContent: t('a11y.skip_to_content') }),
    el('header', { className: 'app-header' }, [
      el('div', { className: 'brand' }, [
        el('h1', { textContent: t('app.name') }),
        el('p', { className: 'tagline', textContent: t('app.tagline') }),
      ]),
      el('div', { className: 'stats', attrs: { role: 'group', 'aria-label': t('stats.label') } }, [
        xp,
        streak,
        el('label', { className: 'stat-goal' }, [goalText, goal]),
      ]),
    ]),
    main,
    el('footer', { className: 'app-footer' }, [el('span', { textContent: t('shell.version', { version }) }), badge]),
  );

  return {
    main,
    markOfflineReady() {
      badge.hidden = false;
    },
    updateStats(progress, today) {
      const earned = todayXp(progress, today);
      xp.textContent = `⭐ ${t('stats.xp', { count: progress.xp })}`;
      streak.textContent = `🔥 ${t('stats.streak', { count: currentStreak(progress, today) })}`;
      goalText.textContent = t('stats.goal', { xp: Math.min(earned, progress.dailyGoal), goal: progress.dailyGoal });
      goal.max = progress.dailyGoal;
      goal.value = Math.min(earned, progress.dailyGoal);
    },
  };
}
