import type { TranslateFn } from '../i18n';

export interface Shell {
  /** Shows the "available offline" badge once the service worker is active. */
  markOfflineReady(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

/** Renders the empty app shell. All visible text comes from i18n keys. */
export function renderShell(root: HTMLElement, t: TranslateFn, version: string): Shell {
  const badge = el('span', { className: 'badge', hidden: true, textContent: t('shell.offline_ready') });
  badge.setAttribute('role', 'status');

  root.replaceChildren(
    el('a', { className: 'skip-link', href: '#main', textContent: t('a11y.skip_to_content') }),
    el('header', { className: 'app-header' }, [
      el('h1', { textContent: t('app.name') }),
      el('p', { className: 'tagline', textContent: t('app.tagline') }),
    ]),
    el('main', { id: 'main', tabIndex: -1 }, [
      el('section', { className: 'card' }, [
        el('h2', { textContent: t('shell.status_title') }),
        el('p', { textContent: t('shell.status_text') }),
      ]),
    ]),
    el('footer', { className: 'app-footer' }, [
      el('span', { textContent: t('shell.version', { version }) }),
      badge,
    ]),
  );

  return {
    markOfflineReady() {
      badge.hidden = false;
    },
  };
}
