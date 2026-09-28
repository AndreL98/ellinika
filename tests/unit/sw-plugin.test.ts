import { describe, expect, it } from 'vitest';
import { buildServiceWorkerSource, CACHE_PREFIX, computeCacheName } from '../../app/build/sw-plugin';

describe('service worker generation', () => {
  it('cache name changes when files change and ignores order', () => {
    const a = computeCacheName('0.0.1', ['assets/index-abc.js', 'icon.svg:1']);
    const b = computeCacheName('0.0.1', ['icon.svg:1', 'assets/index-abc.js']);
    const c = computeCacheName('0.0.1', ['assets/index-def.js', 'icon.svg:1']);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.startsWith(`${CACHE_PREFIX}0.0.1-`)).toBe(true);
  });

  it('embeds a de-duplicated precache list and the cache name', () => {
    const source = buildServiceWorkerSource(['./', 'index.html', 'index.html'], 'logos-test');
    expect(source).toContain('const CACHE_NAME = "logos-test"');
    expect(source).toContain('const PRECACHE = ["./","index.html"]');
  });
});
