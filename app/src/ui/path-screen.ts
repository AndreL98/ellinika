import { crownsOf, MAX_CROWNS } from '../engine/progress';
import type { LearnUnit } from '../engine/types';
import { languageName, type AppContext } from './context';
import { button, el } from './dom';

function packTitle(pack: string, ctx: AppContext): string {
  const key = `pack.${pack}`;
  const title = ctx.t(key);
  return title === key ? pack : title;
}

function crownRow(count: number): HTMLElement {
  return el(
    'span',
    { className: 'crowns', attrs: { 'aria-hidden': 'true' } },
    Array.from({ length: MAX_CROWNS }, (_, i) => el('span', { className: i < count ? 'crown on' : 'crown', textContent: '♛' })),
  );
}

function unitCard(unit: LearnUnit, ctx: AppContext): HTMLElement {
  const crowns = crownsOf(ctx.getProgress(), unit.progressKey);
  return el('li', { className: 'card unit', dataset: { unit: unit.key } }, [
    el('div', { className: 'unit-head' }, [
      unit.icon ? el('span', { className: 'unit-icon', textContent: unit.icon, attrs: { 'aria-hidden': 'true' } }) : null,
      el('h4', { textContent: unit.title }),
    ]),
    el('p', { className: 'unit-meta' }, [
      crownRow(crowns),
      el('span', { textContent: ctx.t('path.crowns', { count: crowns }) }),
      ' · ',
      el('span', { textContent: ctx.t('path.items', { count: unit.items.length }) }),
    ]),
    button(
      crowns >= MAX_CROWNS ? ctx.t('path.practice') : ctx.t('path.start'),
      () => ctx.navigate(`#/lesson/${unit.key}`),
      'btn btn-primary',
    ),
  ]);
}

/** Radio group to choose the learning language; only shown if there is more than one. */
function languageSwitch(ctx: AppContext): HTMLElement | null {
  if (ctx.learnLangs.length < 2) return null;
  const name = 'learn-lang';
  return el('fieldset', { className: 'lang-switch' }, [
    el('legend', { textContent: ctx.t('path.choose_lang') }),
    ...ctx.learnLangs.map((lang) => {
      const input = el('input', { type: 'radio', name, value: lang, checked: lang === ctx.learnLang });
      input.addEventListener('change', () => void ctx.setLearnLang(lang));
      return el('label', { className: 'lang-option' }, [input, el('span', { textContent: languageName(lang, ctx.uiLang) })]);
    }),
  ]);
}

/** Learning path: all units grouped by pack. */
export function renderPath(root: HTMLElement, ctx: AppContext): void {
  const { t, content } = ctx;
  const packs = [...new Set(content.units.map((unit) => unit.pack))];
  root.replaceChildren(
    el('section', { className: 'path', dataset: { screen: 'path' } }, [
      el('h2', { textContent: t('path.title'), tabIndex: -1 }),
      languageSwitch(ctx) ??
        el('p', { className: 'muted', textContent: t('path.learning', { lang: languageName(ctx.learnLang, ctx.uiLang) }) }),
      ctx.includeUnapproved ? el('p', { className: 'notice', textContent: t('path.dev_notice') }) : null,
      packs.length === 0 ? el('p', { className: 'card', textContent: t('path.empty') }) : null,
      ...packs.map((pack) =>
        el('div', { className: 'pack' }, [
          el('h3', { textContent: packTitle(pack, ctx) }),
          el('ol', { className: 'units' }, content.units.filter((unit) => unit.pack === pack).map((unit) => unitCard(unit, ctx))),
        ]),
      ),
    ]),
  );
}
