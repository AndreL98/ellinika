import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

/** Prefix shared by all cache names, so old versions can be cleaned up safely. */
export const CACHE_PREFIX = 'logos-';

/**
 * Builds a cache name that changes whenever any precached file changes.
 * Bundled files already carry content hashes; public files are hashed by content.
 */
export function computeCacheName(version: string, fingerprints: string[]): string {
  const hash = createHash('sha256');
  for (const entry of [...fingerprints].sort()) hash.update(entry).update('\n');
  return `${CACHE_PREFIX}${version}-${hash.digest('hex').slice(0, 10)}`;
}

/** Returns the service worker source for the given precache list and cache name. */
export function buildServiceWorkerSource(precache: string[], cacheName: string): string {
  const files = JSON.stringify([...new Set(precache)].sort());
  return `// Generated at build time. Do not edit.
const CACHE_NAME = ${JSON.stringify(cacheName)};
const CACHE_PREFIX = ${JSON.stringify(CACHE_PREFIX)};
const PRECACHE = ${files};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Network first for pages, so updates arrive; cached shell when offline.
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request, { ignoreVary: true }).then((hit) => hit || caches.match('./', { ignoreVary: true }))
      )
    );
    return;
  }

  // Cache first for static assets (their file names contain content hashes).
  // ignoreVary: servers may send "Vary: Origin", which would miss module scripts.
  event.respondWith(caches.match(request, { ignoreVary: true }).then((hit) => hit || fetch(request)));
});
`;
}

function listFiles(dir: string): string[] {
  let out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(listFiles(full));
    else out.push(full);
  }
  return out;
}

/** Vite plugin that emits a versioned sw.js with a complete precache list. */
export function serviceWorkerPlugin(version: string): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'logos-service-worker',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    generateBundle(_options, bundle) {
      const bundled = Object.keys(bundle).filter((file) => !file.endsWith('.map'));
      const fingerprints = [...bundled];
      const publicFiles: string[] = [];

      if (config.publicDir) {
        for (const full of listFiles(config.publicDir)) {
          const rel = relative(config.publicDir, full).split(sep).join('/');
          publicFiles.push(rel);
          fingerprints.push(`${rel}:${createHash('sha256').update(readFileSync(full)).digest('hex')}`);
        }
      }

      // index.html is emitted by Vite after this hook, so it is listed explicitly.
      const precache = ['./', 'index.html', ...bundled, ...publicFiles];
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: buildServiceWorkerSource(precache, computeCacheName(version, fingerprints)),
      });
    },
  };
}
