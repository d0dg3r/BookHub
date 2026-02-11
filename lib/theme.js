/**
 * Theme (Dark Mode) Support
 * Applies light/dark theme based on user preference or system setting.
 * - auto: follows prefers-color-scheme
 * - light: force light
 * - dark: force dark
 */

const STORAGE_KEY = 'theme';

let mediaQueryListener = null;

function resolveIsDark(theme) {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function apply(isDark) {
  document.documentElement.classList.toggle('dark', isDark);
}

export async function initTheme() {
  const result = await chrome.storage.sync.get({ [STORAGE_KEY]: 'auto' });
  const theme = result[STORAGE_KEY];
  const isDark = resolveIsDark(theme);
  apply(isDark);

  if (mediaQueryListener) {
    window.matchMedia('(prefers-color-scheme: dark)').removeListener(mediaQueryListener);
    mediaQueryListener = null;
  }

  if (theme === 'auto') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryListener = () => apply(resolveIsDark('auto'));
    mq.addEventListener('change', mediaQueryListener);
  }
}

export function applyTheme(theme) {
  const isDark = resolveIsDark(theme);
  apply(isDark);

  if (mediaQueryListener) {
    window.matchMedia('(prefers-color-scheme: dark)').removeListener(mediaQueryListener);
    mediaQueryListener = null;
  }

  if (theme === 'auto') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryListener = () => apply(resolveIsDark('auto'));
    mq.addEventListener('change', mediaQueryListener);
  }
}
