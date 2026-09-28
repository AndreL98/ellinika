import { describe, expect, it } from 'vitest';
import type { ItemText } from '../../app/src/content/types';
import { isAiSuggestion, isVisible, visibleItems } from '../../app/src/content/visibility';

const item = (status: ItemText['status']): ItemText => ({ text: 'x', source: { title: 'Test' }, status });

describe('visibility', () => {
  it('public builds show only approved texts', () => {
    const pub = { includeUnapproved: false };
    expect(isVisible('approved', pub)).toBe(true);
    expect(isVisible('reviewed', pub)).toBe(false);
    expect(isVisible('draft', pub)).toBe(false);
  });

  it('developer view may include unapproved texts', () => {
    expect(isVisible('draft', { includeUnapproved: true })).toBe(true);
  });

  it('filters items and keeps IDs', () => {
    const items = { 'a.1': item('approved'), 'a.2': item('draft') };
    expect(Object.keys(visibleItems(items, { includeUnapproved: false }))).toEqual(['a.1']);
  });

  it('treats transliteration as AI suggestion until verified', () => {
    expect(isAiSuggestion(undefined)).toBe(true);
    expect(isAiSuggestion('ai_suggestion')).toBe(true);
    expect(isAiSuggestion('verified')).toBe(false);
  });
});
