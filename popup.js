/**
 * Popup Logic
 * Handles manual sync buttons, status display, and conflict resolution.
 */

import { initI18n, applyI18n, getMessage } from './lib/i18n.js';
import { initTheme } from './lib/theme.js';

// DOM elements
const notConfiguredEl = document.getElementById('not-configured');
const configuredEl = document.getElementById('configured');
const statusBox = document.getElementById('status-box');
const statusIcon = document.getElementById('status-icon');
const statusMessage = document.getElementById('status-message');
const lastDataChangeEl = document.getElementById('last-data-change');
const lastCommitWrap = document.getElementById('last-commit-wrap');
const conflictBox = document.getElementById('conflict-box');
const autoSyncStatus = document.getElementById('auto-sync-status');
const autoSyncDot = document.getElementById('auto-sync-dot');
const autoSyncText = document.getElementById('auto-sync-text');

const syncBtn = document.getElementById('sync-btn');
const syncSpinner = document.getElementById('sync-spinner');
const syncText = document.getElementById('sync-text');
const pushBtn = document.getElementById('push-btn');
const pullBtn = document.getElementById('pull-btn');
const forcePushBtn = document.getElementById('force-push-btn');
const forcePullBtn = document.getElementById('force-pull-btn');
const openSettingsBtn = document.getElementById('open-settings-btn');
const settingsLink = document.getElementById('settings-link');
const nextSyncCountdownEl = document.getElementById('next-sync-countdown');

const ALARM_NAME = 'bookmarkSyncPull';
let countdownInterval = null;

let isSyncing = false;

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  await initTheme();
  await initI18n();
  applyI18n();
  await loadStatus();
});

async function loadStatus() {
  try {
    const status = await chrome.runtime.sendMessage({ action: 'getStatus' });
    updateUI(status);
  } catch (err) {
    console.error('Could not load status:', err);
    showNotConfigured();
  }
}

function updateUI(status) {
  if (!status || !status.configured) {
    showNotConfigured();
    return;
  }

  notConfiguredEl.style.display = 'none';
  configuredEl.style.display = 'block';

  // Status message
  if (status.hasConflict) {
    setStatus('⚠️', getMessage('popup_conflictDetected'), 'status-warning');
    conflictBox.style.display = 'block';
  } else if (status.lastSyncTime) {
    setStatus('✅', getMessage('popup_synced'), 'status-ok');
    conflictBox.style.display = 'none';
  } else {
    setStatus('📋', getMessage('popup_notSyncedYet'), 'status-ok');
    conflictBox.style.display = 'none';
  }

  // Last data change (timestamp)
  const dataChangeTime = status.lastSyncWithChangesTime || status.lastSyncTime;
  if (dataChangeTime) {
    lastDataChangeEl.textContent = getMessage('popup_lastDataChange', [formatRelativeTime(new Date(dataChangeTime))]);
    lastDataChangeEl.style.display = '';
  } else {
    lastDataChangeEl.style.display = 'none';
  }

  // Last commit (hash as link)
  if (status.lastCommitSha && status.repoOwner && status.repoName) {
    const shortSha = status.lastCommitSha.substring(0, 7);
    const url = `https://github.com/${status.repoOwner}/${status.repoName}/commit/${status.lastCommitSha}`;
    lastCommitWrap.innerHTML = '';
    lastCommitWrap.appendChild(document.createTextNode(getMessage('popup_lastCommit') + ' '));
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'commit-link';
    a.textContent = shortSha;
    lastCommitWrap.appendChild(a);
    lastCommitWrap.style.display = '';
  } else {
    lastCommitWrap.innerHTML = '';
    lastCommitWrap.style.display = 'none';
  }

  // Auto-sync status
  if (status.autoSync) {
    autoSyncDot.className = 'dot dot-active';
    autoSyncText.textContent = getMessage('popup_autoSyncActive');
    startCountdown();
  } else {
    autoSyncDot.className = 'dot dot-inactive';
    autoSyncText.textContent = getMessage('popup_autoSyncDisabled');
    stopCountdown();
    nextSyncCountdownEl.style.display = 'none';
  }
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function updateCountdown() {
  const alarm = await chrome.alarms.get(ALARM_NAME);
  if (!alarm || !alarm.scheduledTime) {
    nextSyncCountdownEl.style.display = 'none';
    return;
  }
  const remaining = alarm.scheduledTime - Date.now();
  if (remaining <= 0) {
    nextSyncCountdownEl.textContent = getMessage('popup_nextSyncIn', [formatCountdown(0)]);
    nextSyncCountdownEl.style.display = 'block';
    return;
  }
  nextSyncCountdownEl.textContent = getMessage('popup_nextSyncIn', [formatCountdown(remaining)]);
  nextSyncCountdownEl.style.display = 'block';
}

function startCountdown() {
  stopCountdown();
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function showNotConfigured() {
  notConfiguredEl.style.display = 'block';
  configuredEl.style.display = 'none';
}

function setStatus(icon, message, boxClass) {
  statusIcon.textContent = icon;
  statusMessage.textContent = message;
  statusBox.className = `status-box ${boxClass}`;
}

function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);

  if (diffMin < 1) return getMessage('popup_justNow');
  if (diffMin < 60) return getMessage('popup_minAgo', [diffMin]);
  if (diffHours < 24) return getMessage('popup_hoursAgo', [diffHours]);
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---- Button handlers ----

function setLoading(loading) {
  isSyncing = loading;
  syncBtn.disabled = loading;
  pushBtn.disabled = loading;
  pullBtn.disabled = loading;
  syncSpinner.style.display = loading ? 'inline-block' : 'none';
  syncText.textContent = loading ? getMessage('popup_syncing') : getMessage('popup_syncNow');
}

async function handleAction(action) {
  if (isSyncing) return;
  setLoading(true);

  try {
    const result = await chrome.runtime.sendMessage({ action });

    if (result.success) {
      await loadStatus();
      setStatus('✅', result.message, 'status-ok');
      conflictBox.style.display = 'none';
    } else {
      if (result.message.includes('Conflict') || result.message.includes('Konflikt')) {
        setStatus('⚠️', result.message, 'status-warning');
        conflictBox.style.display = 'block';
      } else {
        setStatus('❌', result.message, 'status-error');
      }
    }
  } catch (err) {
    setStatus('❌', getMessage('popup_error', [err.message]), 'status-error');
  } finally {
    setLoading(false);
  }
}

syncBtn.addEventListener('click', () => handleAction('sync'));
pushBtn.addEventListener('click', () => handleAction('push'));
pullBtn.addEventListener('click', () => handleAction('pull'));
forcePushBtn.addEventListener('click', () => handleAction('push'));
forcePullBtn.addEventListener('click', () => handleAction('pull'));

// Settings links
openSettingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

settingsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
