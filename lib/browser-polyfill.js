/**
 * Browser Compatibility Shim
 * Detects the browser environment and provides helpers for cross-browser differences.
 *
 * Firefox MV3 supports the chrome.* namespace as a compatibility layer,
 * so most code can use chrome.* directly. This module handles the few
 * remaining edge cases.
 */

/**
 * Detect if running in Firefox (Gecko engine).
 * Firefox exposes the `browser` global with native Promise-based APIs.
 * @type {boolean}
 */
export const isFirefox = typeof globalThis.browser !== 'undefined'
  && typeof globalThis.browser.runtime !== 'undefined'
  && typeof globalThis.browser.runtime.id !== 'undefined';

/**
 * Detect if running in Chrome/Chromium.
 * @type {boolean}
 */
export const isChrome = !isFirefox
  && typeof globalThis.chrome !== 'undefined'
  && typeof globalThis.chrome.runtime !== 'undefined';

/**
 * Get the browser name string.
 * @returns {'firefox' | 'chrome'}
 */
export function getBrowserName() {
  return isFirefox ? 'firefox' : 'chrome';
}
