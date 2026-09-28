import './styles.css';
import { bundledPacks } from './content/packs';
import { loadContent } from './content/loader';
import { toLocalDate, type Progress } from './engine/progress';
import { createTranslator, directionOf, pickLanguage } from './i18n';
import { DEFAULT_LOCALE, locales } from './i18n/locales';
import { Speaker } from './speech/speech';
import { loadProgress, saveProgress } from './storage/progress-store';
import { openBestStore } from './storage/store';
import { registerServiceWorker } from './sw-register';
import type { AppContext } from './ui/context';
import { renderLesson } from './ui/lesson-screen';
import { renderPath } from './ui/path-screen';
import { renderShell } from './ui/shell';

/** Learning language of the MVP; a language switch follows in phase 2. */
const LEARN_LANG = 'el';

async function start(root: HTMLElement): Promise<void> {
  const uiLang = pickLanguage(navigator.languages, Object.keys(locales), DEFAULT_LOCALE);
  const t = createTranslator(uiLang, locales[uiLang] ?? {}, locales[DEFAULT_LOCALE]);
  document.documentElement.lang = uiLang;
  document.documentElement.dir = directionOf(uiLang);
  document.title = t('app.name');

  const shell = renderShell(root, t, __APP_VERSION__);
  if (import.meta.env.PROD) void registerServiceWorker(() => shell.markOfflineReady());

  // Public builds show only approved texts; the dev server and the private review build also show drafts.
  const includeUnapproved = import.meta.env.DEV || import.meta.env.MODE === 'review';
  const content = loadContent(bundledPacks(), { learnLang: LEARN_LANG, uiLang, includeUnapproved });
  const store = await openBestStore();
  let progress: Progress = await loadProgress(store);
  const speaker = new Speaker();
  const today = () => toLocalDate(new Date());

  const ctx: AppContext = {
    t,
    uiLang,
    learnLang: LEARN_LANG,
    content,
    speaker,
    random: Math.random,
    includeUnapproved,
    getProgress: () => progress,
    async setProgress(next) {
      progress = next;
      shell.updateStats(progress, today());
      await saveProgress(store, progress);
    },
    today,
    navigate(hash) {
      if (location.hash === hash) route();
      else location.hash = hash;
    },
  };

  const route = () => {
    const match = /^#\/lesson\/([^/]+)\/([^/]+)$/.exec(location.hash);
    const unit = match ? content.units.find((candidate) => candidate.key === `${match[1]}/${match[2]}`) : undefined;
    shell.updateStats(progress, today());
    if (unit) renderLesson(shell.main, unit, ctx);
    else renderPath(shell.main, ctx);
  };

  window.addEventListener('hashchange', route);
  route();
  // Voices load in the background; listening exercises appear once a voice is known.
  void speaker.init();
}

const root = document.getElementById('app');
if (root) void start(root);
