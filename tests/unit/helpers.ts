import type { LearnItem } from '../../app/src/engine/types';

/** Test item with sensible defaults. */
export function item(id: string, text: string, meaning: string, extra: Partial<LearnItem> = {}): LearnItem {
  return {
    id, pack: 'demo', kind: 'word', tags: [], text, lang: 'el', dir: 'ltr',
    translitAi: true, pronAi: true, audio: null, meaning, status: 'approved',
    source: { title: 'Test' }, ...extra,
  };
}

export const words = [
  item('w.morning', 'καλημέρα', 'Guten Morgen'),
  item('w.thanks', 'ευχαριστώ', 'Danke'),
  item('w.yes', 'ναι', 'Ja'),
  item('w.no', 'όχι', 'Nein'),
  item('w.water', 'νερό', 'Wasser'),
];

export const sentence = item('s.germany', 'Είμαι από τη Γερμανία.', 'Ich bin aus Deutschland.', { kind: 'sentence' });
