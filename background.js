/**
 * Background Service Worker
 * Listens to bookmark events for auto-sync, manages periodic sync via alarms,
 * handles messages from popup/options pages, and triggers migration on first run.
 */

import { initI18n } from './lib/i18n.js';
import {
  debouncedSync,
  sync,
  push,
  pull,
  getSyncStatus,
  getSettings,
  isConfigured,
  isSyncInProgress,
  isAutoSyncSuppressed,
  migrateFromLegacyFormat,
  STORAGE_KEYS,
} from './lib/sync-engine.js';
import { GitHubAPI } from './lib/github-api.js';
import { migrateTokenIfNeeded } from './lib/crypto.js';

const ALARM_NAME = 'bookmarkSyncPull';

// ---- Bookmark event listeners ----

chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log('[BookHub] Bookmark created:', bookmark.title);
  triggerAutoSync();
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  console.log('[BookHub] Bookmark removed:', id);
  triggerAutoSync();
});

chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  console.log('[BookHub] Bookmark changed:', id, changeInfo);
  triggerAutoSync();
});

chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
  console.log('[BookHub] Bookmark moved:', id);
  triggerAutoSync();
});

/**
 * Trigger auto-sync if enabled (debounced).
 * Now uses debouncedSync (three-way merge) instead of debouncedPush.
 */
async function triggerAutoSync() {
  if (isSyncInProgress()) return;
  if (isAutoSyncSuppressed()) return;

  const settings = await getSettings();
  if (settings[STORAGE_KEYS.AUTO_SYNC] && isConfigured(settings)) {
    const delayMs = settings[STORAGE_KEYS.DEBOUNCE_DELAY] ?? 5000;
    debouncedSync(delayMs);
  }
}

// ---- Alarm for periodic sync ----

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('[BookHub] Periodic sync triggered');
    const settings = await getSettings();
    if (isConfigured(settings) && settings[STORAGE_KEYS.AUTO_SYNC]) {
      const result = await sync();
      console.log('[BookHub] Periodic sync result:', result.message);

      if (!result.success) {
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    }
  }
});

// ---- Sync on browser focus ----

const FOCUS_SYNC_COOLDOWN_MS = 60000; // 60 seconds

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE || windowId < 0) return;

  const settings = await getSettings();
  if (!settings[STORAGE_KEYS.SYNC_ON_FOCUS] || !isConfigured(settings) || !settings[STORAGE_KEYS.AUTO_SYNC]) return;

  const stored = await chrome.storage.local.get(STORAGE_KEYS.LAST_SYNC_TIME);
  const lastSync = stored[STORAGE_KEYS.LAST_SYNC_TIME];
  if (lastSync) {
    const elapsed = Date.now() - new Date(lastSync).getTime();
    if (elapsed < FOCUS_SYNC_COOLDOWN_MS) return;
  }

  if (isSyncInProgress()) return;

  console.log('[BookHub] Sync on focus triggered');
  const result = await sync();
  if (!result.success) {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
});

async function setupAlarm() {
  const settings = await getSettings();
  const interval = settings[STORAGE_KEYS.SYNC_INTERVAL] || 15;

  await chrome.alarms.clear(ALARM_NAME);

  if (settings[STORAGE_KEYS.AUTO_SYNC] && isConfigured(settings)) {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: interval });
    console.log(`[BookHub] Periodic sync alarm set: every ${interval} minutes`);
  }
}

// ---- Migration check ----

async function checkAndMigrate() {
  try {
    const settings = await getSettings();
    if (!isConfigured(settings)) return;

    // Check if we already have the new format state
    const stored = await chrome.storage.local.get(STORAGE_KEYS.LAST_SYNC_FILES);
    if (stored[STORAGE_KEYS.LAST_SYNC_FILES]) return; // Already migrated

    const api = new GitHubAPI(
      settings[STORAGE_KEYS.GITHUB_TOKEN],
      settings[STORAGE_KEYS.REPO_OWNER],
      settings[STORAGE_KEYS.REPO_NAME],
      settings[STORAGE_KEYS.BRANCH]
    );
    const basePath = settings[STORAGE_KEYS.FILE_PATH] || 'bookmarks';

    const migrated = await migrateFromLegacyFormat(api, basePath);
    if (migrated) {
      console.log('[BookHub] Successfully migrated to per-file format');
    }
  } catch (err) {
    console.warn('[BookHub] Migration check failed:', err);
  }
}

// ---- Message handler for popup/options ----

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sync') {
    sync().then(sendResponse);
    return true;
  }
  if (message.action === 'push') {
    push().then(sendResponse);
    return true;
  }
  if (message.action === 'pull') {
    pull().then(sendResponse);
    return true;
  }
  if (message.action === 'getStatus') {
    getSyncStatus().then(sendResponse);
    return true;
  }
  if (message.action === 'settingsChanged') {
    setupAlarm().then(() => sendResponse({ ok: true }));
    return true;
  }
});

// ---- Extension install/startup ----

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[BookHub] Extension installed/updated:', details.reason);
  await migrateTokenIfNeeded();
  await initI18n();
  await setupAlarm();
  await checkAndMigrate();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[BookHub] Browser started');
  await migrateTokenIfNeeded();
  await initI18n();
  await setupAlarm();
  await checkAndMigrate();

  const settings = await getSettings();
  if (settings[STORAGE_KEYS.SYNC_ON_STARTUP] && isConfigured(settings) && settings[STORAGE_KEYS.AUTO_SYNC]) {
    setTimeout(() => {
      sync().then((result) => {
        if (!result.success) {
          chrome.action.setBadgeText({ text: '!' });
          chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
        }
      });
    }, 2000);
  }
});

// Initial setup
migrateTokenIfNeeded();
initI18n();
setupAlarm();
checkAndMigrate();
