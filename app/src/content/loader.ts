import type { LearnItem, LearnUnit } from '../engine/types';
import type { ContentStatus, LanguageFile, PackCore, Source } from './types';
import { isAiSuggestion, isVisible, type VisibilityOptions } from './visibility';

export interface GlossEntry {
  meaning: string;
  note?: string;
  source: Source;
  status: ContentStatus;
}

export interface GlossFile {
  lang: string;
  units?: Record<string, { title: string }>;
  items: Record<string, GlossEntry>;
}

/** All content of one pack, as loaded from /content/packs/<pack>. */
export interface PackContent {
  core: PackCore;
  languages: Record<string, LanguageFile>;
  glosses: Record<string, GlossFile>;
}

export interface LoadOptions extends VisibilityOptions {
  learnLang: string;
  uiLang: string;
}

export interface LoadedContent {
  units: LearnUnit[];
  /** All usable items per pack (distractor pool). */
  pools: Record<string, LearnItem[]>;
}

/** Progress key of a unit; progress is kept per learning language. */
export function progressKeyOf(learnLang: string, pack: string, unitId: string): string {
  return `${learnLang}:${pack}/${unitId}`;
}

/** A language-specific note wins over the general note of the explanation. */
function noteOf(languageNote: Record<string, string> | undefined, glossNote: string | undefined, uiLang: string) {
  const note = languageNote?.[uiLang] ?? glossNote;
  return note ? { note } : {};
}

/** Preferred order in the language switch; other languages follow alphabetically. */
const LANGUAGE_ORDER = ['el', 'ru', 'cu'];

/** Learning languages that have at least one visible unit for this UI language. */
export function availableLearnLangs(packs: PackContent[], options: Omit<LoadOptions, 'learnLang'>): string[] {
  const langs = new Set(packs.flatMap((pack) => Object.keys(pack.languages)));
  const rank = (lang: string) => {
    const index = LANGUAGE_ORDER.indexOf(lang);
    return index === -1 ? LANGUAGE_ORDER.length : index;
  };
  return [...langs]
    .filter((learnLang) => loadContent(packs, { ...options, learnLang }).units.length > 0)
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** The weaker of two statuses, so a text counts as approved only if text and gloss are approved. */
function weakest(a: ContentStatus, b: ContentStatus): ContentStatus {
  const rank: Record<ContentStatus, number> = { draft: 0, reviewed: 1, approved: 2 };
  return rank[a] <= rank[b] ? a : b;
}

/**
 * Merges packs into learnable units for one learning language and UI language.
 * An item is usable only if both its text and its explanation may be shown.
 */
export function loadContent(packs: PackContent[], options: LoadOptions): LoadedContent {
  const units: LearnUnit[] = [];
  const pools: Record<string, LearnItem[]> = {};

  for (const { core, languages, glosses } of packs) {
    const language = languages[options.learnLang];
    const gloss = glosses[options.uiLang];
    if (!language || !gloss) continue;

    const items = new Map<string, LearnItem>();
    for (const coreItem of core.items) {
      const text = language.items[coreItem.id];
      const explanation = gloss.items[coreItem.id];
      if (!text || !explanation) continue;
      const status = weakest(text.status, explanation.status);
      if (!isVisible(status, options)) continue;
      items.set(coreItem.id, {
        id: coreItem.id,
        pack: core.pack,
        kind: coreItem.kind,
        tags: coreItem.tags ?? [],
        text: text.text,
        lang: language.lang,
        dir: language.dir,
        ...(text.translit ? { translit: text.translit } : {}),
        translitAi: isAiSuggestion(text.translit_status),
        ...(text.pron?.[options.uiLang] ? { pron: text.pron[options.uiLang] } : {}),
        pronAi: isAiSuggestion(text.pron_status),
        audio: text.audio ?? null,
        meaning: explanation.meaning,
        ...(noteOf(text.note, explanation.note, options.uiLang)),
        status,
        source: text.source,
      });
    }
    pools[core.pack] = [...items.values()];

    for (const unit of core.units) {
      const unitItems = unit.items.map((id) => items.get(id)).filter((item): item is LearnItem => !!item);
      if (unitItems.length === 0) continue;
      units.push({
        key: `${core.pack}/${unit.id}`,
        progressKey: progressKeyOf(language.lang, core.pack, unit.id),
        pack: core.pack,
        id: unit.id,
        ...(unit.icon ? { icon: unit.icon } : {}),
        order: unit.order,
        title: gloss.units?.[unit.id]?.title ?? unit.id,
        items: unitItems,
      });
    }
  }

  units.sort((a, b) => a.pack.localeCompare(b.pack) || a.order - b.order);
  return { units, pools };
}
