/**
 * Internationalization (i18n) Helper
 * Provides runtime language switching independent of Chrome's built-in i18n.
 * Languages can be selected manually in settings or auto-detected from the browser.
 *
 * Adding a new language:
 *   1. Create _locales/{code}/messages.json with all keys
 *   2. Add an entry to SUPPORTED_LANGUAGES below
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
];

const DEFAULT_LANGUAGE = 'en';

let currentMessages = null;
let fallbackMessages = null;
let currentLang = DEFAULT_LANGUAGE;
let initPromise = null;

/**
 * Initialize the i18n system.
 * Loads the appropriate message file based on user settings.
 * Safe to call multiple times — returns cached promise.
 * @returns {Promise<void>}
 */
export function initI18n() {
  if (initPromise) return initPromise;
  initPromise = _doInit();
  return initPromise;
}

/**
 * Internal initialization logic.
 */
async function _doInit() {
  try {
    // Read language setting from storage
    const result = await chrome.storage.sync.get({ language: 'auto' });
    let lang = result.language;

    if (lang === 'auto') {
      const browserLang = (navigator.language || 'en').substring(0, 2);
      const supported = SUPPORTED_LANGUAGES.find(l => l.code === browserLang);
      lang = supported ? browserLang : DEFAULT_LANGUAGE;
    }

    // Validate the language is supported
    if (!SUPPORTED_LANGUAGES.find(l => l.code === lang)) {
      lang = DEFAULT_LANGUAGE;
    }

    currentLang = lang;

    // Load messages for the selected language
    const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
    const response = await fetch(url);
    currentMessages = await response.json();

    // Load English as fallback if not already English
    if (lang !== DEFAULT_LANGUAGE) {
      const fallbackUrl = chrome.runtime.getURL(`_locales/${DEFAULT_LANGUAGE}/messages.json`);
      const fallbackResponse = await fetch(fallbackUrl);
      fallbackMessages = await fallbackResponse.json();
    } else {
      fallbackMessages = null;
    }
  } catch (err) {
    console.error('[GitSyncMarks] Failed to initialize i18n:', err);
  }
}

/**
 * Get a translated message by key.
 * @param {string} key - Message key from messages.json
 * @param {(string|number)[]} [substitutions] - Values to replace $1, $2, etc.
 * @returns {string} Translated message, or the key itself as fallback
 */
export function getMessage(key, substitutions = []) {
  const entry = currentMessages?.[key] || fallbackMessages?.[key];
  if (!entry) return key;

  let msg = entry.message;

  // Replace $1, $2, ... with substitution values
  if (substitutions.length > 0) {
    substitutions.forEach((sub, i) => {
      msg = msg.replace(`$${i + 1}`, String(sub));
    });
  }

  return msg;
}

/**
 * Apply translations to all elements with data-i18n attributes in the DOM.
 * Supports:
 *   data-i18n="key"             → sets textContent
 *   data-i18n-html="key"        → sets innerHTML (for trusted content with HTML tags)
 *   data-i18n-placeholder="key" → sets placeholder attribute
 *   data-i18n-title="key"       → sets title attribute
 */
export function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const msg = getMessage(key);
    if (msg && msg !== key) el.textContent = msg;
  });

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    const msg = getMessage(key);
    if (msg && msg !== key) {
      // Safely insert translated content as text to avoid interpreting it as HTML
      el.textContent = msg;
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const msg = getMessage(key);
    if (msg && msg !== key) el.placeholder = msg;
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const msg = getMessage(key);
    if (msg && msg !== key) el.title = msg;
  });
}

/**
 * Get the currently active language code.
 * @returns {string}
 */
export function getLanguage() {
  return currentLang;
}

/**
 * Re-initialize with a (potentially new) language.
 * Call this after the user changes the language setting in options.
 * @returns {Promise<void>}
 */
export function reloadI18n() {
  initPromise = null;
  currentMessages = null;
  fallbackMessages = null;
  return initI18n();
}
