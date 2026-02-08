/**
 * Popup Logic
 * Handles manual sync buttons, status display, and conflict resolution.
 */

// DOM elements
const notConfiguredEl = document.getElementById('not-configured');
const configuredEl = document.getElementById('configured');
const statusBox = document.getElementById('status-box');
const statusIcon = document.getElementById('status-icon');
const statusMessage = document.getElementById('status-message');
const lastSyncEl = document.getElementById('last-sync');
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

let isSyncing = false;

// Initialize on load
document.addEventListener('DOMContentLoaded', loadStatus);

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
    setStatus('⚠️', 'Konflikt erkannt', 'status-warning');
    conflictBox.style.display = 'block';
  } else if (status.lastSyncTime) {
    setStatus('✅', 'Synchronisiert', 'status-ok');
    conflictBox.style.display = 'none';
  } else {
    setStatus('📋', 'Noch nicht synchronisiert', 'status-ok');
    conflictBox.style.display = 'none';
  }

  // Last sync time
  if (status.lastSyncTime) {
    const date = new Date(status.lastSyncTime);
    lastSyncEl.textContent = `Letzter Sync: ${formatRelativeTime(date)}`;
  } else {
    lastSyncEl.textContent = '';
  }

  // Auto-sync status
  if (status.autoSync) {
    autoSyncDot.className = 'dot dot-active';
    autoSyncText.textContent = 'Auto-Sync aktiv';
  } else {
    autoSyncDot.className = 'dot dot-inactive';
    autoSyncText.textContent = 'Auto-Sync deaktiviert';
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

  if (diffMin < 1) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  return date.toLocaleDateString('de-DE', {
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
  syncText.textContent = loading ? 'Synchronisiere...' : 'Jetzt synchronisieren';
}

async function handleAction(action) {
  if (isSyncing) return;
  setLoading(true);

  try {
    const result = await chrome.runtime.sendMessage({ action });

    if (result.success) {
      setStatus('✅', result.message, 'status-ok');
      conflictBox.style.display = 'none';
      lastSyncEl.textContent = 'Letzter Sync: gerade eben';
    } else {
      if (result.message.includes('Konflikt')) {
        setStatus('⚠️', result.message, 'status-warning');
        conflictBox.style.display = 'block';
      } else {
        setStatus('❌', result.message, 'status-error');
      }
    }
  } catch (err) {
    setStatus('❌', `Fehler: ${err.message}`, 'status-error');
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
