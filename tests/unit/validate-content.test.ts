import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateContent } from '../../scripts/validate-content.mjs';

const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));

describe('validateContent', () => {
  it('accepts the real content packs in the repository', () => {
    const { errors, stats } = validateContent();
    expect(errors).toEqual([]);
    expect(stats.packs).toBeGreaterThanOrEqual(2);
  });

  it('accepts a valid demo pack', () => {
    const { errors, stats } = validateContent({ packsDir: fixture('packs-valid') });
    expect(errors).toEqual([]);
    expect(stats).toEqual({ packs: 1, items: 2, texts: 2, glosses: 1 });
  });

  it('reports every rule violation in an invalid pack', () => {
    const { errors } = validateContent({ packsDir: fixture('packs-invalid') });
    const text = errors.join('\n');
    expect(text).toContain('does not match folder');
    expect(text).toContain('duplicate item id greetings.morning');
    expect(text).toContain('references unknown item greetings.missing');
    expect(text).toContain('unknown item greetings.unknown');
    expect(text).toContain('approved but reviewed_by is empty');
    expect(text).toContain('demo/ru.json');
    expect(text).toContain('demo/gloss/de.json');
  });
});
