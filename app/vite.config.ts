import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { serviceWorkerPlugin } from './build/sw-plugin.ts';

const appDir = fileURLToPath(new URL('.', import.meta.url));
const rootDir = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig(({ mode }) => {
  // e2e mode bundles a small approved test pack instead of the real content.
  const e2e = mode === 'e2e';
  return {
    root: appDir,
    // Relative base: the build works on GitHub Pages under any repository name.
    base: './',
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        '@content': fileURLToPath(new URL(e2e ? '../tests/fixtures/packs-e2e' : '../content/packs', import.meta.url)),
      },
    },
    server: {
      // Allow importing /locales and /content from the repository root.
      fs: { allow: [rootDir] },
    },
    build: {
      outDir: e2e ? 'dist-e2e' : mode === 'review' ? 'dist-review' : 'dist',
      emptyOutDir: true,
    },
    plugins: [serviceWorkerPlugin(pkg.version)],
    test: {
      root: rootDir,
      include: ['tests/unit/**/*.test.ts'],
      environment: 'node',
    },
  };
});
