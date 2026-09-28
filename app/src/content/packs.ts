import type { PackContent, GlossFile } from './loader';
import type { LanguageFile, PackCore } from './types';

// "@content" points to /content/packs (or to test fixtures in e2e mode, see vite.config.ts).
const cores = import.meta.glob<PackCore>('@content/*/core.json', { eager: true, import: 'default' });
const languages = import.meta.glob<LanguageFile>(['@content/*/*.json', '!@content/*/core.json'], {
  eager: true,
  import: 'default',
});
const glosses = import.meta.glob<GlossFile>('@content/*/gloss/*.json', { eager: true, import: 'default' });

function packOf(path: string, depth: number): string {
  const parts = path.split('/');
  return parts[parts.length - 1 - depth] ?? '';
}

const fileLang = (path: string) => path.replace(/^.*\/([^/]+)\.json$/, '$1');

/** All packs bundled into the app. */
export function bundledPacks(): PackContent[] {
  const packs = new Map<string, PackContent>();
  for (const [path, core] of Object.entries(cores)) {
    packs.set(packOf(path, 1), { core, languages: {}, glosses: {} });
  }
  for (const [path, file] of Object.entries(languages)) {
    const pack = packs.get(packOf(path, 1));
    if (pack) pack.languages[fileLang(path)] = file;
  }
  for (const [path, file] of Object.entries(glosses)) {
    const pack = packs.get(packOf(path, 2));
    if (pack) pack.glosses[fileLang(path)] = file;
  }
  return [...packs.values()];
}
