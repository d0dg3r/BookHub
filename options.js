/**
 * Options Page Logic
 * Handles loading/saving settings, token validation, and language selection.
 */

import { GitHubAPI } from './lib/github-api.js';
import { initI18n, applyI18n, getMessage, reloadI18n, getLanguage, SUPPORTED_LANGUAGES } from './lib/i18n.js';

const STORAGE_KEYS = {
  GITHUB_TOKEN: 'githubToken',
  REPO_OWNER: 'repoOwner',
  REPO_NAME: 'repoName',
  BRANCH: 'branch',
  FILE_PATH: 'filePath',
  AUTO_SYNC: 'autoSync',
  SYNC_INTERVAL: 'syncInterval',
  LANGUAGE: 'language',
};

// DOM elements
const tokenInput = document.getElementById('token');
const toggleTokenBtn = document.getElementById('toggle-token');
const ownerInput = document.getElementById('owner');
const repoInput = document.getElementById('repo');
const branchInput = document.getElementById('branch');
const filepathInput = document.getElementById('filepath');
const autoSyncInput = document.getElementById('auto-sync');
const syncIntervalInput = document.getElementById('sync-interval');
const validateBtn = document.getElementById('validate-btn');
const validationResult = document.getElementById('validation-result');
const saveBtn = document.getElementById('save-btn');
const saveResult = document.getElementById('save-result');
const languageSelect = document.getElementById('language-select');

// Load settings on page open
document.addEventListener('DOMContentLoaded', async () => {
  await initI18n();
  populateLanguageDropdown();
  applyI18n();
  await loadSettings();
});

/**
 * Populate the language dropdown with supported languages.
 */
function populateLanguageDropdown() {
  languageSelect.innerHTML = '';

  // "Auto (Browser)" option
  const autoOption = document.createElement('option');
  autoOption.value = 'auto';
  autoOption.textContent = getMessage('options_langAuto');
  languageSelect.appendChild(autoOption);

  // Each supported language
  for (const lang of SUPPORTED_LANGUAGES) {
    const option = document.createElement('option');
    option.value = lang.code;
    option.textContent = lang.name;
    languageSelect.appendChild(option);
  }
}

async function loadSettings() {
  const defaults = {
    [STORAGE_KEYS.GITHUB_TOKEN]: '',
    [STORAGE_KEYS.REPO_OWNER]: '',
    [STORAGE_KEYS.REPO_NAME]: '',
    [STORAGE_KEYS.BRANCH]: 'main',
    [STORAGE_KEYS.FILE_PATH]: 'bookmarks',
    [STORAGE_KEYS.AUTO_SYNC]: true,
    [STORAGE_KEYS.SYNC_INTERVAL]: 15,
    [STORAGE_KEYS.LANGUAGE]: 'auto',
  };

  const settings = await chrome.storage.sync.get(defaults);

  tokenInput.value = settings[STORAGE_KEYS.GITHUB_TOKEN];
  ownerInput.value = settings[STORAGE_KEYS.REPO_OWNER];
  repoInput.value = settings[STORAGE_KEYS.REPO_NAME];
  branchInput.value = settings[STORAGE_KEYS.BRANCH];
  filepathInput.value = settings[STORAGE_KEYS.FILE_PATH];
  autoSyncInput.checked = settings[STORAGE_KEYS.AUTO_SYNC];
  syncIntervalInput.value = settings[STORAGE_KEYS.SYNC_INTERVAL];
  languageSelect.value = settings[STORAGE_KEYS.LANGUAGE];
}

// Language change: re-translate the page instantly
languageSelect.addEventListener('change', async () => {
  const newLang = languageSelect.value;
  await chrome.storage.sync.set({ [STORAGE_KEYS.LANGUAGE]: newLang });
  await reloadI18n();
  populateLanguageDropdown();
  // Re-select the chosen value (dropdown was rebuilt)
  languageSelect.value = newLang;
  applyI18n();
  // Update the page title
  document.title = `BookHub – ${getMessage('options_subtitle')}`;
});

// Toggle token visibility
toggleTokenBtn.addEventListener('click', () => {
  if (tokenInput.type === 'password') {
    tokenInput.type = 'text';
  } else {
    tokenInput.type = 'password';
  }
});

// Validate token
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

    // Validate token
    const tokenResult = await api.validateToken();
    if (!tokenResult.valid) {
      showValidation(getMessage('options_invalidToken'), 'error');
      return;
    }

    // Check scopes
    if (!tokenResult.scopes.includes('repo')) {
      showValidation(getMessage('options_tokenValidMissingScope', [tokenResult.username]), 'error');
      return;
    }

    // Check repo access if owner and repo are provided
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

// Save settings
saveBtn.addEventListener('click', async () => {
  const settings = {
    [STORAGE_KEYS.GITHUB_TOKEN]: tokenInput.value.trim(),
    [STORAGE_KEYS.REPO_OWNER]: ownerInput.value.trim(),
    [STORAGE_KEYS.REPO_NAME]: repoInput.value.trim(),
    [STORAGE_KEYS.BRANCH]: branchInput.value.trim() || 'main',
    [STORAGE_KEYS.FILE_PATH]: filepathInput.value.trim() || 'bookmarks',
    [STORAGE_KEYS.AUTO_SYNC]: autoSyncInput.checked,
    [STORAGE_KEYS.SYNC_INTERVAL]: parseInt(syncIntervalInput.value, 10) || 15,
    [STORAGE_KEYS.LANGUAGE]: languageSelect.value,
  };

  try {
    await chrome.storage.sync.set(settings);

    // Notify background script that settings changed
    await chrome.runtime.sendMessage({ action: 'settingsChanged' });

    showSaveResult(getMessage('options_settingsSaved'), 'success');
    setTimeout(() => {
      saveResult.textContent = '';
    }, 3000);
  } catch (err) {
    showSaveResult(getMessage('options_errorSaving', [err.message]), 'error');
  }
});

function showSaveResult(message, type) {
  saveResult.textContent = message;
  saveResult.className = `save-result ${type}`;
}
