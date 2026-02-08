/**
 * Options Page Logic
 * Handles loading/saving settings and token validation.
 */

import { GitHubAPI } from './lib/github-api.js';

const STORAGE_KEYS = {
  GITHUB_TOKEN: 'githubToken',
  REPO_OWNER: 'repoOwner',
  REPO_NAME: 'repoName',
  BRANCH: 'branch',
  FILE_PATH: 'filePath',
  AUTO_SYNC: 'autoSync',
  SYNC_INTERVAL: 'syncInterval',
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

// Load settings on page open
document.addEventListener('DOMContentLoaded', loadSettings);

async function loadSettings() {
  const defaults = {
    [STORAGE_KEYS.GITHUB_TOKEN]: '',
    [STORAGE_KEYS.REPO_OWNER]: '',
    [STORAGE_KEYS.REPO_NAME]: '',
    [STORAGE_KEYS.BRANCH]: 'main',
    [STORAGE_KEYS.FILE_PATH]: 'bookmarks',
    [STORAGE_KEYS.AUTO_SYNC]: true,
    [STORAGE_KEYS.SYNC_INTERVAL]: 15,
  };

  const settings = await chrome.storage.sync.get(defaults);

  tokenInput.value = settings[STORAGE_KEYS.GITHUB_TOKEN];
  ownerInput.value = settings[STORAGE_KEYS.REPO_OWNER];
  repoInput.value = settings[STORAGE_KEYS.REPO_NAME];
  branchInput.value = settings[STORAGE_KEYS.BRANCH];
  filepathInput.value = settings[STORAGE_KEYS.FILE_PATH];
  autoSyncInput.checked = settings[STORAGE_KEYS.AUTO_SYNC];
  syncIntervalInput.value = settings[STORAGE_KEYS.SYNC_INTERVAL];
}

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
    showValidation('Bitte Token eingeben.', 'error');
    return;
  }

  showValidation('Prüfe...', 'loading');

  try {
    const api = new GitHubAPI(token, owner, repo, branch);

    // Validate token
    const tokenResult = await api.validateToken();
    if (!tokenResult.valid) {
      showValidation('Token ungültig.', 'error');
      return;
    }

    // Check scopes
    if (!tokenResult.scopes.includes('repo')) {
      showValidation(`Token gültig (${tokenResult.username}), aber "repo"-Scope fehlt.`, 'error');
      return;
    }

    // Check repo access if owner and repo are provided
    if (owner && repo) {
      const repoExists = await api.checkRepo();
      if (!repoExists) {
        showValidation(`Token gültig (${tokenResult.username}), aber Repository "${owner}/${repo}" nicht gefunden.`, 'error');
        return;
      }
      showValidation(`Verbindung OK! Benutzer: ${tokenResult.username}, Repo: ${owner}/${repo}`, 'success');
    } else {
      showValidation(`Token gültig! Benutzer: ${tokenResult.username}. Bitte Repository angeben.`, 'success');
    }
  } catch (err) {
    showValidation(`Fehler: ${err.message}`, 'error');
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
  };

  try {
    await chrome.storage.sync.set(settings);

    // Notify background script that settings changed
    await chrome.runtime.sendMessage({ action: 'settingsChanged' });

    showSaveResult('Einstellungen gespeichert!', 'success');
    setTimeout(() => {
      saveResult.textContent = '';
    }, 3000);
  } catch (err) {
    showSaveResult(`Fehler beim Speichern: ${err.message}`, 'error');
  }
});

function showSaveResult(message, type) {
  saveResult.textContent = message;
  saveResult.className = `save-result ${type}`;
}
