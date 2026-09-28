import type { ContentStatus, ItemText, ReviewFlag } from './types';

export interface VisibilityOptions {
  /** Show draft and reviewed texts (local developer view only, never in public builds). */
  includeUnapproved: boolean;
}

/** Public builds show only approved texts (APP.md, section 6). */
export function isVisible(status: ContentStatus, options: VisibilityOptions): boolean {
  return status === 'approved' || options.includeUnapproved;
}

/** Returns only the items that may be shown, keeping their IDs. */
export function visibleItems(
  items: Record<string, ItemText>,
  options: VisibilityOptions,
): Record<string, ItemText> {
  return Object.fromEntries(Object.entries(items).filter(([, item]) => isVisible(item.status, options)));
}

/** Transliteration and pronunciation count as AI suggestions until a native speaker verified them. */
export function isAiSuggestion(flag: ReviewFlag | undefined): boolean {
  return flag !== 'verified';
}
