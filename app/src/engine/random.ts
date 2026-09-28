/** Random source returning a float in [0, 1). Injected so tests are deterministic. */
export type Random = () => number;

/** Small seeded PRNG (mulberry32). */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns a shuffled copy (Fisher–Yates). */
export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

/** Picks up to `count` distinct elements. */
export function sample<T>(items: readonly T[], count: number, random: Random): T[] {
  return shuffle(items, random).slice(0, Math.max(0, count));
}

/** Picks one element; the list must not be empty. */
export function pick<T>(items: readonly T[], random: Random): T {
  if (items.length === 0) throw new Error('pick() needs a non-empty list');
  return items[Math.floor(random() * items.length)] as T;
}
