import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { serviceWorkerPlugin } from './build/sw-plugin.ts';

const appDir = fileURLToPath(new URL('.', import.meta.url));
const rootDir = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig({
  root: appDir,
  // Relative base: the build works on GitHub Pages under any repository name.
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    // Allow importing /locales and /content from the repository root.
    fs: { allow: [rootDir] },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [serviceWorkerPlugin(pkg.version)],
  test: {
    root: rootDir,
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
