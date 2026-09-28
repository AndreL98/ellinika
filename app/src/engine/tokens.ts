/** Punctuation that is not part of a word tile (incl. Greek ano teleia and question mark). */
const PUNCTUATION = /[.,;:!?·\u0387\u037e«»"„“”'’()[\]\u2013\u2014-]+/gu;

/** Splits a sentence into word tiles without punctuation. */
export function tokenize(text: string): string[] {
  return text
    .normalize('NFC')
    .split(/\s+/u)
    .map((word) => word.replace(PUNCTUATION, ''))
    .filter((word) => word.length > 0);
}

/** Normalizes a tile for comparison: NFC and locale-independent lower case. */
export function normalizeToken(token: string): string {
  return token.normalize('NFC').toLowerCase();
}

/** True if both tile sequences are equal, ignoring case. */
export function sameTokens(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((token, i) => normalizeToken(token) === normalizeToken(b[i] ?? ''));
}
