/**
 * Options Page Logic
 * Handles tab navigation, settings, token validation, language selection,
 * and bookmark/settings import/export.
 */

import { GitHubAPI } from './lib/github-api.js';
import { initI18n, applyI18n, getMessage, reloadI18n, getLanguage, SUPPORTED_LANGUAGES } from './lib/i18n.js';
import { initTheme, applyTheme } from './lib/theme.js';
import { serializeToJson, deserializeFromJson } from './lib/bookmark-serializer.js';
import { replaceLocalBookmarks, SYNC_PRESETS } from './lib/sync-engine.js';
import { encryptToken, decryptToken, migrateTokenIfNeeded } from './lib/crypto.js';

const STORAGE_KEYS = {
  GITHUB_TOKEN: 'githubToken',
  REPO_OWNER: 'repoOwner',
  REPO_NAME: 'repoName',
  BRANCH: 'branch',
  FILE_PATH: 'filePath',
  AUTO_SYNC: 'autoSync',
  SYNC_INTERVAL: 'syncInterval',
  SYNC_ON_STARTUP: 'syncOnStartup',
  SYNC_ON_FOCUS: 'syncOnFocus',
  SYNC_PROFILE: 'syncProfile',
  DEBOUNCE_DELAY: 'debounceDelay',
  LANGUAGE: 'language',
  THEME: 'theme',
};

// ---- DOM elements: Settings Tab ----
const tokenInput = document.getElementById('token');
const toggleTokenBtn = document.getElementById('toggle-token');
const ownerInput = document.getElementById('owner');
const repoInput = document.getElementById('repo');
const branchInput = document.getElementById('branch');
const filepathInput = document.getElementById('filepath');
const autoSyncInput = document.getElementById('auto-sync');
const syncProfileSelect = document.getElementById('sync-profile');
const syncCustomFields = document.getElementById('sync-custom-fields');
const syncIntervalInput = document.getElementById('sync-interval');
const debounceDelayInput = document.getElementById('debounce-delay');
const syncOnStartupInput = document.getElementById('sync-on-startup');
const syncOnFocusInput = document.getElementById('sync-on-focus');
const validateBtn = document.getElementById('validate-btn');
const validationResult = document.getElementById('validation-result');
const saveGitHubBtn = document.getElementById('save-github-btn');
const saveSyncBtn = document.getElementById('save-sync-btn');
const saveGitHubResult = document.getElementById('save-github-result');
const saveSyncResult = document.getElementById('save-sync-result');
const languageSelect = document.getElementById('language-select');
const themeButtons = document.querySelectorAll('.theme-icon-btn');

// ---- DOM elements: Import/Export Tab ----
const exportBookmarksBtn = document.getElementById('export-bookmarks-btn');
const importBookmarksFile = document.getElementById('import-bookmarks-file');
const importBookmarksTrigger = document.getElementById('import-bookmarks-trigger');
const importBookmarksFilename = document.getElementById('import-bookmarks-filename');
const importBookmarksBtn = document.getElementById('import-bookmarks-btn');
const exportBookmarksResult = document.getElementById('export-bookmarks-result');
const importBookmarksResult = document.getElementById('import-bookmarks-result');

const exportSettingsBtn = document.getElementById('export-settings-btn');
const importSettingsFile = document.getElementById('import-settings-file');
const importSettingsTrigger = document.getElementById('import-settings-trigger');
const importSettingsFilename = document.getElementById('import-settings-filename');
const importSettingsBtn = document.getElementById('import-settings-btn');
const exportSettingsResult = document.getElementById('export-settings-result');
const importSettingsResult = document.getElementById('import-settings-result');

// ==============================
// Tab Navigation
// ==============================

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Deactivate all tabs
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    // Activate clicked tab
    btn.classList.add('active');
    const tabId = `tab-${btn.dataset.tab}`;
    document.getElementById(tabId).classList.add('active');
  });
});

// ==============================
// Initialization
// ==============================

document.addEventListener('DOMContentLoaded', async () => {
  await initTheme();
  await initI18n();
  populateLanguageDropdown();
  applyI18n();
  document.title = `BookHub – ${getMessage('options_subtitle')}`;
  await loadSettings();

  // Show version from manifest
  const versionEl = document.getElementById('app-version');
  if (versionEl) {
    versionEl.textContent = chrome.runtime.getManifest().version;
  }
});

// ==============================
// Settings Tab: Language
// ==============================

function detectSyncProfile(interval, debounceMs) {
  const intervalNum = parseInt(interval, 10) || 15;
  const debounceNum = debounceMs ?? 5000;
  for (const [key, preset] of Object.entries(SYNC_PRESETS)) {
    if (key === 'custom') continue;
    if (preset.interval === intervalNum && preset.debounceMs === debounceNum) return key;
  }
  return 'custom';
}

function getEffectiveSyncInterval() {
  const profile = syncProfileSelect.value;
  if (profile === 'custom') return parseInt(syncIntervalInput.value, 10) || 15;
  const preset = SYNC_PRESETS[profile];
  return preset?.interval ?? 15;
}

function getEffectiveDebounceMs() {
  const profile = syncProfileSelect.value;
  if (profile === 'custom') return (parseInt(debounceDelayInput.value, 10) || 5) * 1000;
  const preset = SYNC_PRESETS[profile];
  return preset?.debounceMs ?? 5000;
}

function populateLanguageDropdown() {
  languageSelect.innerHTML = '';

  const autoOption = document.createElement('option');
  autoOption.value = 'auto';
  autoOption.textContent = getMessage('options_langAuto');
  languageSelect.appendChild(autoOption);

  for (const lang of SUPPORTED_LANGUAGES) {
    const option = document.createElement('option');
    option.value = lang.code;
    option.textContent = lang.name;
    languageSelect.appendChild(option);
  }
}

async function loadSettings() {
  // Migrate legacy plain-text token from sync to encrypted local storage
  await migrateTokenIfNeeded();

  const syncDefaults = {
    [STORAGE_KEYS.REPO_OWNER]: '',
    [STORAGE_KEYS.REPO_NAME]: '',
    [STORAGE_KEYS.BRANCH]: 'main',
    [STORAGE_KEYS.FILE_PATH]: 'bookmarks',
    [STORAGE_KEYS.AUTO_SYNC]: true,
    [STORAGE_KEYS.SYNC_INTERVAL]: 15,
    [STORAGE_KEYS.SYNC_ON_STARTUP]: false,
    [STORAGE_KEYS.SYNC_ON_FOCUS]: false,
    [STORAGE_KEYS.SYNC_PROFILE]: 'normal',
    [STORAGE_KEYS.DEBOUNCE_DELAY]: 5000,
    [STORAGE_KEYS.LANGUAGE]: 'auto',
    [STORAGE_KEYS.THEME]: 'auto',
  };

  const settings = await chrome.storage.sync.get(syncDefaults);

  // Load encrypted token from local storage
  const localData = await chrome.storage.local.get({ [STORAGE_KEYS.GITHUB_TOKEN]: '' });
  const token = await decryptToken(localData[STORAGE_KEYS.GITHUB_TOKEN]);

  tokenInput.value = token;
  ownerInput.value = settings[STORAGE_KEYS.REPO_OWNER];
  repoInput.value = settings[STORAGE_KEYS.REPO_NAME];
  branchInput.value = settings[STORAGE_KEYS.BRANCH];
  filepathInput.value = settings[STORAGE_KEYS.FILE_PATH];
  autoSyncInput.checked = settings[STORAGE_KEYS.AUTO_SYNC];
  syncIntervalInput.value = settings[STORAGE_KEYS.SYNC_INTERVAL];
  debounceDelayInput.value = Math.round((settings[STORAGE_KEYS.DEBOUNCE_DELAY] ?? 5000) / 1000);
  const profile = detectSyncProfile(
    settings[STORAGE_KEYS.SYNC_INTERVAL],
    settings[STORAGE_KEYS.DEBOUNCE_DELAY]
  );
  syncProfileSelect.value = profile;
  syncCustomFields.style.display = profile === 'custom' ? 'block' : 'none';
  syncOnStartupInput.checked = settings[STORAGE_KEYS.SYNC_ON_STARTUP] === true;
  syncOnFocusInput.checked = settings[STORAGE_KEYS.SYNC_ON_FOCUS] === true;
  languageSelect.value = settings[STORAGE_KEYS.LANGUAGE];
  const theme = settings[STORAGE_KEYS.THEME] || 'auto';
  themeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

syncProfileSelect.addEventListener('change', () => {
  const isCustom = syncProfileSelect.value === 'custom';
  syncCustomFields.style.display = isCustom ? 'block' : 'none';
  if (!isCustom) {
    const preset = SYNC_PRESETS[syncProfileSelect.value];
    if (preset) {
      syncIntervalInput.value = preset.interval;
      debounceDelayInput.value = Math.round(preset.debounceMs / 1000);
    }
  }
});

themeButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    const newTheme = btn.dataset.theme;
    await chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: newTheme });
    applyTheme(newTheme);
    themeButtons.forEach(b => b.classList.toggle('active', b.dataset.theme === newTheme));
  });
});

languageSelect.addEventListener('change', async () => {
  const newLang = languageSelect.value;
  await chrome.storage.sync.set({ [STORAGE_KEYS.LANGUAGE]: newLang });
  await reloadI18n();
  populateLanguageDropdown();
  languageSelect.value = newLang;
  applyI18n();
  document.title = `BookHub – ${getMessage('options_subtitle')}`;
});

// ==============================
// Settings Tab: Token Validation
// ==============================

toggleTokenBtn.addEventListener('click', () => {
  tokenInput.type = tokenInput.type === 'password' ? 'text' : 'password';
});

validateBtn.addEventListener('click', async () => {
  const token = tokenInput.value.trim();
  const owner = ownerInput.value.trim();
  const repo = repoInput.value.trim();
  const branch = branchInput.value.trim() || 'main';

  if (!token) {
    showValidation(getMessage('options_pleaseEnterToken'), 'error');
    return;
  }

  showValidation(getMessage('options_checking'), 'loading');

  try {
    const api = new GitHubAPI(token, owner, repo, branch);

    const tokenResult = await api.validateToken();
    if (!tokenResult.valid) {
      showValidation(getMessage('options_invalidToken'), 'error');
      return;
    }

    if (!tokenResult.scopes.includes('repo')) {
      showValidation(getMessage('options_tokenValidMissingScope', [tokenResult.username]), 'error');
      return;
    }

    if (owner && repo) {
      const repoExists = await api.checkRepo();
      if (!repoExists) {
        showValidation(getMessage('options_tokenValidRepoNotFound', [tokenResult.username, `${owner}/${repo}`]), 'error');
        return;
      }
      showValidation(getMessage('options_connectionOk', [tokenResult.username, `${owner}/${repo}`]), 'success');
    } else {
      showValidation(getMessage('options_tokenValidSpecifyRepo', [tokenResult.username]), 'success');
    }
  } catch (err) {
    showValidation(getMessage('options_error', [err.message]), 'error');
  }
});

function showValidation(message, type) {
  validationResult.textContent = message;
  validationResult.className = `validation-result ${type}`;
}

// ==============================
// Save Settings (shared by GitHub and Sync tabs)
// ==============================

async function saveSettings() {
  const syncSettings = {
    [STORAGE_KEYS.REPO_OWNER]: ownerInput.value.trim(),
    [STORAGE_KEYS.REPO_NAME]: repoInput.value.trim(),
    [STORAGE_KEYS.BRANCH]: branchInput.value.trim() || 'main',
    [STORAGE_KEYS.FILE_PATH]: filepathInput.value.trim() || 'bookmarks',
    [STORAGE_KEYS.AUTO_SYNC]: autoSyncInput.checked,
    [STORAGE_KEYS.SYNC_INTERVAL]: getEffectiveSyncInterval(),
    [STORAGE_KEYS.DEBOUNCE_DELAY]: getEffectiveDebounceMs(),
    [STORAGE_KEYS.SYNC_PROFILE]: syncProfileSelect.value,
    [STORAGE_KEYS.SYNC_ON_STARTUP]: syncOnStartupInput.checked,
    [STORAGE_KEYS.SYNC_ON_FOCUS]: syncOnFocusInput.checked,
    [STORAGE_KEYS.LANGUAGE]: languageSelect.value,
  };

  try {
    // Encrypt token and store in local storage (never in sync)
    const encryptedToken = await encryptToken(tokenInput.value.trim());
    await chrome.storage.local.set({ [STORAGE_KEYS.GITHUB_TOKEN]: encryptedToken });

    // Store other settings in sync storage
    await chrome.storage.sync.set(syncSettings);
    await chrome.runtime.sendMessage({ action: 'settingsChanged' });

    showSaveResult(getMessage('options_settingsSaved'), 'success');
    setTimeout(() => {
      saveGitHubResult.textContent = '';
      saveSyncResult.textContent = '';
    }, 3000);
  } catch (err) {
    showSaveResult(getMessage('options_errorSaving', [err.message]), 'error');
  }
}

function showSaveResult(message, type) {
  saveGitHubResult.textContent = message;
  saveGitHubResult.className = `save-result ${type}`;
  saveSyncResult.textContent = message;
  saveSyncResult.className = `save-result ${type}`;
}

saveGitHubBtn.addEventListener('click', saveSettings);
saveSyncBtn.addEventListener('click', saveSettings);

// ==============================
// Import/Export: Bookmarks
// ==============================

// File picker triggers: click hidden input
importBookmarksTrigger.addEventListener('click', () => importBookmarksFile.click());
importSettingsTrigger.addEventListener('click', () => importSettingsFile.click());

// Enable import button and show filename when file is selected
importBookmarksFile.addEventListener('change', () => {
  const hasFile = !!importBookmarksFile.files.length;
  importBookmarksBtn.disabled = !hasFile;
  importBookmarksFilename.textContent = hasFile ? importBookmarksFile.files[0].name : '';
});

importSettingsFile.addEventListener('change', () => {
  const hasFile = !!importSettingsFile.files.length;
  importSettingsBtn.disabled = !hasFile;
  importSettingsFilename.textContent = hasFile ? importSettingsFile.files[0].name : '';
});

/**
 * Export current bookmarks as a JSON file download.
 */
exportBookmarksBtn.addEventListener('click', async () => {
  try {
    const tree = await chrome.bookmarks.getTree();
    const deviceId = crypto.randomUUID();
    const data = serializeToJson(tree, deviceId);
    const json = JSON.stringify(data, null, 2);

    const date = new Date().toISOString().slice(0, 10);
    downloadFile(`bookmarks-export-${date}.json`, json, 'application/json');

    showResult(exportBookmarksResult, getMessage('options_exportSuccess'), 'success');
  } catch (err) {
    showResult(exportBookmarksResult, getMessage('options_importError', [err.message]), 'error');
  }
});

/**
 * Import bookmarks from a JSON file, replacing all local bookmarks.
 */
importBookmarksBtn.addEventListener('click', async () => {
  const file = importBookmarksFile.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const bookmarks = deserializeFromJson(data);

    // Convert legacy format (array with role fields) to roleMap for replaceLocalBookmarks
    const roleMap = {};
    for (const node of bookmarks) {
      const role = node.role || 'other';
      roleMap[role] = {
        title: role,
        children: node.children || [],
      };
    }

    await replaceLocalBookmarks(roleMap);

    showResult(importBookmarksResult, getMessage('options_importSuccess'), 'success');
    importBookmarksFile.value = '';
    importBookmarksBtn.disabled = true;
    importBookmarksFilename.textContent = '';
  } catch (err) {
    showResult(importBookmarksResult, getMessage('options_importError', [err.message]), 'error');
  }
});

// ==============================
// Import/Export: Settings
// ==============================

/**
 * Export current settings as a JSON file download.
 * Includes the decrypted token so the export is complete and portable.
 */
exportSettingsBtn.addEventListener('click', async () => {
  try {
    const syncSettings = await chrome.storage.sync.get(null);

    // Include decrypted token in the export
    const localData = await chrome.storage.local.get({ [STORAGE_KEYS.GITHUB_TOKEN]: '' });
    const token = await decryptToken(localData[STORAGE_KEYS.GITHUB_TOKEN]);
    syncSettings[STORAGE_KEYS.GITHUB_TOKEN] = token;

    const json = JSON.stringify(syncSettings, null, 2);

    const date = new Date().toISOString().slice(0, 10);
    downloadFile(`bookhub-settings-${date}.json`, json, 'application/json');

    showResult(exportSettingsResult, getMessage('options_exportSuccess'), 'success');
  } catch (err) {
    showResult(exportSettingsResult, getMessage('options_importError', [err.message]), 'error');
  }
});

/**
 * Import settings from a JSON file, replacing all current settings.
 * If the import contains a githubToken, it's encrypted and stored in local storage.
 */
importSettingsBtn.addEventListener('click', async () => {
  const file = importSettingsFile.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const settings = JSON.parse(text);

    // Validate it's a plain object
    if (typeof settings !== 'object' || Array.isArray(settings)) {
      throw new Error('Invalid settings format.');
    }

    // Extract token if present, encrypt it, and store separately in local
    if (settings[STORAGE_KEYS.GITHUB_TOKEN]) {
      const encrypted = await encryptToken(settings[STORAGE_KEYS.GITHUB_TOKEN]);
      await chrome.storage.local.set({ [STORAGE_KEYS.GITHUB_TOKEN]: encrypted });
      delete settings[STORAGE_KEYS.GITHUB_TOKEN];
    }

    await chrome.storage.sync.set(settings);
    await chrome.runtime.sendMessage({ action: 'settingsChanged' });

    showResult(importSettingsResult, getMessage('options_importSuccess'), 'success');
    importSettingsFile.value = '';
    importSettingsBtn.disabled = true;
    importSettingsFilename.textContent = '';

    // Reload after a short delay so the user sees the success message
    setTimeout(() => { location.reload(); }, 1000);
  } catch (err) {
    showResult(importSettingsResult, getMessage('options_importError', [err.message]), 'error');
  }
});

// ==============================
// Helpers
// ==============================

/**
 * Trigger a file download in the browser.
 */
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Show a result message next to an import/export button.
 */
function showResult(el, message, type) {
  el.textContent = message;
  el.className = `ie-result ${type}`;
  setTimeout(() => { el.textContent = ''; el.className = 'ie-result'; }, 4000);
}

// replaceLocalBookmarks is imported from lib/sync-engine.js (single source of truth)
