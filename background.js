/**
 * Background Service Worker
 * Listens to bookmark events for auto-sync, manages periodic pull via alarms,
 * and handles messages from popup/options pages.
 */

import { debouncedPush, sync, push, pull, getSyncStatus, getSettings, isConfigured, isSyncInProgress, STORAGE_KEYS } from './lib/sync-engine.js';

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
 */
async function triggerAutoSync() {
  // Don't trigger auto-sync while a sync is already in progress (e.g. during pull)
  if (isSyncInProgress()) return;

  const settings = await getSettings();
  if (settings[STORAGE_KEYS.AUTO_SYNC] && isConfigured(settings)) {
    debouncedPush(5000);
  }
}

// ---- Alarm for periodic pull ----

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

/**
 * Set up or update the periodic pull alarm.
 */
async function setupAlarm() {
  const settings = await getSettings();
  const interval = settings[STORAGE_KEYS.SYNC_INTERVAL] || 15;

  // Clear existing alarm
  await chrome.alarms.clear(ALARM_NAME);

  if (settings[STORAGE_KEYS.AUTO_SYNC] && isConfigured(settings)) {
    chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: interval,
    });
    console.log(`[BookHub] Periodic sync alarm set: every ${interval} minutes`);
  }
}

// ---- Message handler for popup/options ----

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sync') {
    sync().then(sendResponse);
    return true; // async response
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
  await setupAlarm();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[BookHub] Browser started');
  await setupAlarm();
});

// Initial setup
setupAlarm();
