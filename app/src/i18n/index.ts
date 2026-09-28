/**
 * Minimal translator for i18next JSON v4 files (Weblate compatible):
 * nested keys, {{var}} interpolation and plural suffixes (_one, _other, ...).
 * Kept dependency-free on purpose; can be swapped for i18next later.
 */

export interface Messages {
  [key: string]: string | Messages;
}

export type Direction = 'ltr' | 'rtl';
export type Vars = Record<string, string | number>;
export type TranslateFn = (key: string, vars?: Vars) => string;

/** Primary subtags of languages written right-to-left. */
const RTL_LANGUAGES = new Set(['ar', 'arc', 'syr', 'he', 'fa', 'ur', 'ps', 'yi', 'dv', 'ckb']);

export function directionOf(lang: string): Direction {
  const primary = lang.toLowerCase().split('-')[0] ?? '';
  return RTL_LANGUAGES.has(primary) ? 'rtl' : 'ltr';
}

/** Picks the first preferred language that is available, matching on the primary subtag. */
export function pickLanguage(
  preferred: readonly string[],
  available: readonly string[],
  fallback: string,
): string {
  for (const wanted of preferred) {
    const exact = available.find((lang) => lang.toLowerCase() === wanted.toLowerCase());
    if (exact) return exact;
    const primary = wanted.toLowerCase().split('-')[0];
    const loose = available.find((lang) => lang.toLowerCase().split('-')[0] === primary);
    if (loose) return loose;
  }
  return fallback;
}

function lookup(messages: Messages | undefined, key: string): string | undefined {
  let node: string | Messages | undefined = messages;
  for (const part of key.split('.')) {
    if (node === undefined || typeof node === 'string') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(template: string, vars: Vars | undefined): string {
  if (!vars) return template;
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/**
 * Creates a translate function. Missing keys fall back to the fallback messages,
 * then to the key itself, so gaps are visible but never crash the UI.
 */
export function createTranslator(lang: string, messages: Messages, fallback?: Messages): TranslateFn {
  const plural = new Intl.PluralRules(lang);
  const find = (key: string) => lookup(messages, key) ?? lookup(fallback, key);

  return (key, vars) => {
    let template: string | undefined;
    const count = vars?.['count'];
    if (typeof count === 'number') {
      template = find(`${key}_${plural.select(count)}`) ?? find(`${key}_other`);
    }
    template ??= find(key);
    return template === undefined ? key : interpolate(template, vars);
  };
}
