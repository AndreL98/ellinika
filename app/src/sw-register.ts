/** Registers the generated service worker and reports when the app works offline. */
export async function registerServiceWorker(onOfflineReady: () => void): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js', { scope: './' });
    await navigator.serviceWorker.ready;
    onOfflineReady();
  } catch (error) {
    console.warn('Service worker registration failed', error);
  }
}
