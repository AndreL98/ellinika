import type { Messages } from './index';

/** Default UI language; German is written first (see APP.md). */
export const DEFAULT_LOCALE = 'de';

const files = import.meta.glob<Messages>('../../../locales/*.json', { eager: true, import: 'default' });

/** All UI locales found in /locales, keyed by language code (file name). */
export const locales: Record<string, Messages> = Object.fromEntries(
  Object.entries(files).map(([path, messages]) => [path.replace(/^.*\/(.+)\.json$/, '$1'), messages]),
);
