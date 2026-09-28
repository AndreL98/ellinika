import './styles.css';
import { createTranslator, directionOf, pickLanguage } from './i18n';
import { DEFAULT_LOCALE, locales } from './i18n/locales';
import { registerServiceWorker } from './sw-register';
import { renderShell } from './ui/shell';

const lang = pickLanguage(navigator.languages, Object.keys(locales), DEFAULT_LOCALE);
const t = createTranslator(lang, locales[lang] ?? {}, locales[DEFAULT_LOCALE]);

document.documentElement.lang = lang;
document.documentElement.dir = directionOf(lang);
document.title = t('app.name');

const root = document.getElementById('app');
if (root) {
  const shell = renderShell(root, t, __APP_VERSION__);
  if (import.meta.env.PROD) void registerServiceWorker(() => shell.markOfflineReady());
}
