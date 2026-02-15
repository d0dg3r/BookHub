/**
 * Options Page Logic
 * Handles tab navigation, settings, token validation, language selection,
 * and bookmark/settings import/export.
 */

import { GitHubAPI } from './lib/github-api.js';
import { checkPathSetup, initializeRemoteFolder } from './lib/onboarding.js';
import { initI18n, applyI18n, getMessage, reloadI18n, getLanguage, SUPPORTED_LANGUAGES } from './lib/i18n.js';
import { initTheme, applyTheme } from './lib/theme.js';
import { serializeToJson, deserializeFromJson } from './lib/bookmark-serializer.js';
import { replaceLocalBookmarks, SYNC_PRESETS } from './lib/sync-engine.js';
import { encryptToken, decryptToken, migrateTokenIfNeeded } from './lib/crypto.js';
import {
  getProfiles,
  getActiveProfileId,
  getProfileSettings,
  saveProfile,
  addProfile,
  deleteProfile,
  switchProfile,
  migrateToProfiles,
} from './lib/profile-manager.js';

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
  NOTIFICATIONS_MODE: 'notificationsMode',
  NOTIFICATIONS_ENABLED: 'notificationsEnabled', // legacy, for migration
  DEBOUNCE_DELAY: 'debounceDelay',
  LANGUAGE: 'language',
  THEME: 'theme',
};

// ---- DOM elements: Settings Tab ----
const profileSelect = document.getElementById('profile-select');
const profileAddBtn = document.getElementById('profile-add-btn');
const profileDeleteBtn = document.getElementById('profile-delete-btn');
const profileSwitchingMsg = document.getElementById('profile-switching-msg');
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
const notificationsModeSelect = document.getElementById('notifications-mode');
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
  document.title = `GitSyncMarks – ${getMessage('options_subtitle')}`;
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
  await migrateTokenIfNeeded();
  await migrateToProfiles();

  const profiles = await getProfiles();
  const activeId = await getActiveProfileId();

  // Populate profile dropdown
  profileSelect.innerHTML = '';
  for (const [id, p] of Object.entries(profiles)) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = p.name || id;
    opt.dataset.profileId = id;
    if (id === activeId) opt.selected = true;
    profileSelect.appendChild(opt);
  }

  profileDeleteBtn.style.display = Object.keys(profiles).length > 1 ? 'inline-block' : 'none';

  // Load active profile's GitHub settings
  const profileSettings = await getProfileSettings(activeId);
  if (profileSettings) {
    tokenInput.value = profileSettings.githubToken || '';
    ownerInput.value = profileSettings.repoOwner || '';
    repoInput.value = profileSettings.repoName || '';
    branchInput.value = profileSettings.branch || 'main';
    filepathInput.value = profileSettings.filePath || 'bookmarks';
  }

  // Load global sync settings
  const syncDefaults = {
    autoSync: true,
    syncInterval: 15,
    syncOnStartup: false,
    syncOnFocus: false,
    syncProfile: 'normal',
    debounceDelay: 5000,
    notificationsMode: 'all',
    notificationsEnabled: undefined,
    language: 'auto',
    theme: 'auto',
  };
  const globals = await chrome.storage.sync.get(syncDefaults);

  autoSyncInput.checked = globals.autoSync !== false;
  syncIntervalInput.value = globals.syncInterval ?? 15;
  debounceDelayInput.value = Math.round((globals.debounceDelay ?? 5000) / 1000);
  const profile = detectSyncProfile(globals.syncInterval, globals.debounceDelay);
  syncProfileSelect.value = profile;
  syncCustomFields.style.display = profile === 'custom' ? 'block' : 'none';
  syncOnStartupInput.checked = globals.syncOnStartup === true;
  syncOnFocusInput.checked = globals.syncOnFocus === true;
  const mode = globals.notificationsMode;
  const oldEnabled = globals.notificationsEnabled;
  const displayMode = (mode && ['off', 'all', 'errorsOnly'].includes(mode))
    ? mode
    : (oldEnabled === false ? 'off' : 'all');
  notificationsModeSelect.value = displayMode;
  if (!mode && oldEnabled !== undefined) {
    await chrome.storage.sync.set({ [STORAGE_KEYS.NOTIFICATIONS_MODE]: displayMode });
    await chrome.storage.sync.remove(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
  }
  languageSelect.value = globals.language || 'auto';
  const theme = globals.theme || 'auto';
  themeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

// Profile selector: switching profiles replaces bookmarks
profileSelect.addEventListener('change', async (e) => {
  const targetId = e.target.value;
  const activeId = await getActiveProfileId();
  if (targetId === activeId) return;

  const profiles = await getProfiles();
  const targetProfile = profiles[targetId];
  if (!targetProfile) return;

  const confirmed = confirm(getMessage('options_profileSwitchConfirm', [targetProfile.name || targetId]));
  if (!confirmed) {
    e.target.value = activeId;
    return;
  }

  try {
    profileSelect.disabled = true;
    profileAddBtn.disabled = true;
    profileDeleteBtn.disabled = true;
    profileSwitchingMsg.textContent = getMessage('options_profileSwitching');
    profileSwitchingMsg.style.display = '';
    await switchProfile(targetId);
    await loadSettings();
  } catch (err) {
    alert(getMessage('options_error', [err.message]));
    e.target.value = activeId;
  } finally {
    profileSelect.disabled = false;
    profileAddBtn.disabled = false;
    profileDeleteBtn.disabled = false;
    profileSwitchingMsg.style.display = 'none';
  }
});

profileAddBtn.addEventListener('click', async () => {
  try {
    const name = prompt(getMessage('options_profile') + ' name:', 'New Profile');
    if (!name || !name.trim()) return;
    await addProfile(name.trim());
    await loadSettings();
  } catch (err) {
    alert(getMessage('options_error', [err.message]));
  }
});

profileDeleteBtn.addEventListener('click', async () => {
  const activeId = await getActiveProfileId();
  const profiles = await getProfiles();
  const profile = profiles[activeId];
  if (!profile || Object.keys(profiles).length <= 1) return;

  const confirmed = confirm(getMessage('options_profileDeleteConfirm', [profile.name || activeId]));
  if (!confirmed) return;

  try {
    await deleteProfile(activeId);
    await loadSettings();
  } catch (err) {
    alert(getMessage('options_error', [err.message]));
  }
});

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
  document.title = `GitSyncMarks – ${getMessage('options_subtitle')}`;
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
      const basePath = filepathInput.value.trim() || 'bookmarks';
      const pathCheck = await checkPathSetup(api, basePath);
      if (pathCheck.status === 'unreachable' || pathCheck.status === 'empty') {
        const createFolder = confirm(getMessage('options_onboardingCreateFolder', [basePath]));
        if (createFolder) {
          try {
            await initializeRemoteFolder(api, basePath);
            showValidation(getMessage('options_onboardingCreateSuccess'), 'success');
          } catch (createErr) {
            showValidation(getMessage('options_error', [createErr.message]), 'error');
          }
        } else {
          showValidation(getMessage('options_connectionOk', [tokenResult.username, `${owner}/${repo}`]), 'success');
        }
        return;
      }
      if (pathCheck.status === 'hasBookmarks') {
        const pullNow = confirm(getMessage('options_onboardingPullNow'));
        if (pullNow) {
          try {
            await saveSettings();
            await chrome.runtime.sendMessage({ action: 'pull' });
            showValidation(getMessage('options_onboardingPullSuccess'), 'success');
          } catch (pullErr) {
            showValidation(getMessage('options_error', [pullErr.message]), 'error');
          }
        } else {
          showValidation(getMessage('options_connectionOk', [tokenResult.username, `${owner}/${repo}`]), 'success');
        }
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
  try {
    const activeId = await getActiveProfileId();

    // Save profile-specific GitHub settings
    await saveProfile(activeId, {
      owner: ownerInput.value.trim(),
      repo: repoInput.value.trim(),
      branch: branchInput.value.trim() || 'main',
      filePath: filepathInput.value.trim() || 'bookmarks',
      token: tokenInput.value.trim(),
    });

    // Save global sync settings
    await chrome.storage.sync.set({
      [STORAGE_KEYS.AUTO_SYNC]: autoSyncInput.checked,
      [STORAGE_KEYS.SYNC_INTERVAL]: getEffectiveSyncInterval(),
      [STORAGE_KEYS.DEBOUNCE_DELAY]: getEffectiveDebounceMs(),
      [STORAGE_KEYS.SYNC_PROFILE]: syncProfileSelect.value,
      [STORAGE_KEYS.SYNC_ON_STARTUP]: syncOnStartupInput.checked,
      [STORAGE_KEYS.SYNC_ON_FOCUS]: syncOnFocusInput.checked,
      [STORAGE_KEYS.NOTIFICATIONS_MODE]: notificationsModeSelect.value,
      [STORAGE_KEYS.LANGUAGE]: languageSelect.value,
    });

    try {
      await chrome.runtime.sendMessage({ action: 'settingsChanged' });
    } catch (msgErr) {
      // Background may be terminated (e.g. Firefox Android). Settings are saved;
      // alarm will update when background runs again (next sync, popup open).
    }

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
 * Includes profiles with decrypted tokens so the export is complete and portable.
 */
exportSettingsBtn.addEventListener('click', async () => {
  try {
    const syncSettings = await chrome.storage.sync.get(null);
    const localData = await chrome.storage.local.get({ profileTokens: {}, syncState: {} });

    // Build export with decrypted tokens per profile
    const profiles = syncSettings.profiles || {};
    const profileTokens = localData.profileTokens || {};
    const exportedProfiles = {};
    for (const [id, p] of Object.entries(profiles)) {
      let token = '';
      try {
        token = profileTokens[id] ? await decryptToken(profileTokens[id]) : '';
      } catch { /* ignore */ }
      exportedProfiles[id] = { ...p, token };
    }
    const exportData = {
      ...syncSettings,
      profiles: exportedProfiles,
    };

    const json = JSON.stringify(exportData, null, 2);

    const date = new Date().toISOString().slice(0, 10);
    downloadFile(`gitsyncmarks-settings-${date}.json`, json, 'application/json');

    showResult(exportSettingsResult, getMessage('options_exportSuccess'), 'success');
  } catch (err) {
    showResult(exportSettingsResult, getMessage('options_importError', [err.message]), 'error');
  }
});

/**
 * Import settings from a JSON file, replacing all current settings.
 * Supports both legacy (flat) format and profile format.
 */
importSettingsBtn.addEventListener('click', async () => {
  const file = importSettingsFile.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const settings = JSON.parse(text);

    if (typeof settings !== 'object' || Array.isArray(settings)) {
      throw new Error('Invalid settings format.');
    }

    // New format: profiles with embedded token
    if (settings.profiles && Object.keys(settings.profiles).length > 0) {
      const profileTokens = {};
      const profilesToSave = {};
      for (const [id, p] of Object.entries(settings.profiles)) {
        profilesToSave[id] = {
          id: p.id || id,
          name: p.name || 'Default',
          owner: p.owner || '',
          repo: p.repo || '',
          branch: p.branch || 'main',
          filePath: p.filePath || 'bookmarks',
        };
        if (p.token) {
          profileTokens[id] = await encryptToken(p.token);
        }
      }
      await chrome.storage.sync.set({
        profiles: profilesToSave,
        activeProfileId: settings.activeProfileId || Object.keys(profilesToSave)[0],
        autoSync: settings.autoSync !== false,
        syncInterval: settings.syncInterval ?? 15,
        syncOnStartup: settings.syncOnStartup || false,
        syncOnFocus: settings.syncOnFocus || false,
        syncProfile: settings.syncProfile || 'normal',
        debounceDelay: settings.debounceDelay ?? 5000,
        notificationsMode: settings.notificationsMode || 'all',
        language: settings.language || 'auto',
        theme: settings.theme || 'auto',
      });
      await chrome.storage.local.set({ profileTokens });
    } else {
      // Legacy format: flat repoOwner, repoName, githubToken
      const defaultProfile = {
        id: 'default',
        name: 'Default',
        owner: settings.repoOwner || '',
        repo: settings.repoName || '',
        branch: settings.branch || 'main',
        filePath: settings.filePath || 'bookmarks',
      };
      const profileTokens = {};
      if (settings.githubToken) {
        profileTokens.default = await encryptToken(settings.githubToken);
      }
      await chrome.storage.sync.set({
        profiles: { default: defaultProfile },
        activeProfileId: 'default',
        autoSync: settings.autoSync !== false,
        syncInterval: settings.syncInterval ?? 15,
        syncOnStartup: settings.syncOnStartup || false,
        syncOnFocus: settings.syncOnFocus || false,
        syncProfile: settings.syncProfile || 'normal',
        debounceDelay: settings.debounceDelay ?? 5000,
        notificationsMode: settings.notificationsMode || 'all',
        language: settings.language || 'auto',
        theme: settings.theme || 'auto',
      });
      await chrome.storage.local.set({ profileTokens });
    }

    await chrome.runtime.sendMessage({ action: 'settingsChanged' });

    showResult(importSettingsResult, getMessage('options_importSuccess'), 'success');
    importSettingsFile.value = '';
    importSettingsBtn.disabled = true;
    importSettingsFilename.textContent = '';

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
