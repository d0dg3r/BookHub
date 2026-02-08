/**
 * Sync Engine
 * Handles bidirectional synchronization of bookmarks with GitHub.
 * Includes push, pull, conflict detection, and debounced auto-sync.
 */

import { GitHubAPI, GitHubError } from './github-api.js';
import { serializeToJson, deserializeFromJson, serializeToMarkdown, bookmarksEqual } from './bookmark-serializer.js';

const STORAGE_KEYS = {
  GITHUB_TOKEN: 'githubToken',
  REPO_OWNER: 'repoOwner',
  REPO_NAME: 'repoName',
  BRANCH: 'branch',
  FILE_PATH: 'filePath',
  AUTO_SYNC: 'autoSync',
  SYNC_INTERVAL: 'syncInterval',
  DEVICE_ID: 'deviceId',
  LAST_REMOTE_SHA_JSON: 'lastRemoteShaJson',
  LAST_REMOTE_SHA_MD: 'lastRemoteShaMd',
  LAST_REMOTE_SHA_META: 'lastRemoteShaMeta',
  LAST_SYNC_TIME: 'lastSyncTime',
  LAST_SYNC_DATA: 'lastSyncData',
  HAS_CONFLICT: 'hasConflict',
};

export { STORAGE_KEYS };

/**
 * Get or generate a unique device ID.
 * @returns {Promise<string>}
 */
export async function getDeviceId() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.DEVICE_ID);
  if (result[STORAGE_KEYS.DEVICE_ID]) {
    return result[STORAGE_KEYS.DEVICE_ID];
  }
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ [STORAGE_KEYS.DEVICE_ID]: id });
  return id;
}

/**
 * Load the extension settings from chrome.storage.sync.
 * @returns {Promise<object>}
 */
export async function getSettings() {
  const defaults = {
    [STORAGE_KEYS.GITHUB_TOKEN]: '',
    [STORAGE_KEYS.REPO_OWNER]: '',
    [STORAGE_KEYS.REPO_NAME]: '',
    [STORAGE_KEYS.BRANCH]: 'main',
    [STORAGE_KEYS.FILE_PATH]: 'bookmarks',
    [STORAGE_KEYS.AUTO_SYNC]: true,
    [STORAGE_KEYS.SYNC_INTERVAL]: 15,
  };
  const result = await chrome.storage.sync.get(defaults);
  return result;
}

/**
 * Check if the extension is properly configured.
 * @param {object} settings
 * @returns {boolean}
 */
export function isConfigured(settings) {
  return !!(
    settings[STORAGE_KEYS.GITHUB_TOKEN] &&
    settings[STORAGE_KEYS.REPO_OWNER] &&
    settings[STORAGE_KEYS.REPO_NAME]
  );
}

/**
 * Create a GitHubAPI instance from settings.
 * @param {object} settings
 * @returns {GitHubAPI}
 */
function createApi(settings) {
  return new GitHubAPI(
    settings[STORAGE_KEYS.GITHUB_TOKEN],
    settings[STORAGE_KEYS.REPO_OWNER],
    settings[STORAGE_KEYS.REPO_NAME],
    settings[STORAGE_KEYS.BRANCH]
  );
}

/**
 * Build the full file paths for the bookmark files.
 * @param {string} basePath
 * @returns {{json: string, md: string, meta: string}}
 */
function getFilePaths(basePath) {
  const base = basePath.replace(/\/+$/, '');
  return {
    json: `${base}/bookmarks.json`,
    md: `${base}/bookmarks.md`,
    meta: `${base}/sync_meta.json`,
  };
}

/**
 * Get the current local bookmarks as serialized JSON.
 * @returns {Promise<object>}
 */
async function getLocalBookmarks() {
  const deviceId = await getDeviceId();
  const tree = await chrome.bookmarks.getTree();
  return serializeToJson(tree, deviceId);
}

/**
 * Push local bookmarks to GitHub.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function push() {
  if (isSyncing) {
    return { success: false, message: 'Sync läuft bereits.' };
  }
  isSyncing = true;
  try {
    const settings = await getSettings();
    if (!isConfigured(settings)) {
      return { success: false, message: 'Extension nicht konfiguriert. Bitte Einstellungen öffnen.' };
    }

    const api = createApi(settings);
    const paths = getFilePaths(settings[STORAGE_KEYS.FILE_PATH]);
    const localData = await getLocalBookmarks();

    // Check if content actually changed compared to last sync
    const lastSyncDataResult = await chrome.storage.local.get(STORAGE_KEYS.LAST_SYNC_DATA);
    const lastSyncData = lastSyncDataResult[STORAGE_KEYS.LAST_SYNC_DATA];
    if (lastSyncData && bookmarksEqual(localData, JSON.parse(lastSyncData))) {
      return { success: true, message: 'Keine Änderungen seit letztem Sync.' };
    }

    // Get current remote SHAs for update
    const shaResult = await chrome.storage.local.get([
      STORAGE_KEYS.LAST_REMOTE_SHA_JSON,
      STORAGE_KEYS.LAST_REMOTE_SHA_MD,
      STORAGE_KEYS.LAST_REMOTE_SHA_META,
    ]);

    let shaJson = shaResult[STORAGE_KEYS.LAST_REMOTE_SHA_JSON] || null;
    let shaMd = shaResult[STORAGE_KEYS.LAST_REMOTE_SHA_MD] || null;
    let shaMeta = shaResult[STORAGE_KEYS.LAST_REMOTE_SHA_META] || null;

    // If we don't have SHAs, try to fetch them
    if (!shaJson) {
      const existing = await api.getFile(paths.json);
      if (existing) {
        shaJson = existing.sha;
        // Check for conflict: remote has data we didn't sync
        const remoteData = JSON.parse(existing.content);
        if (lastSyncData) {
          const lastSynced = JSON.parse(lastSyncData);
          if (!bookmarksEqual(remoteData, lastSynced)) {
            await chrome.storage.local.set({ [STORAGE_KEYS.HAS_CONFLICT]: true });
            return { success: false, message: 'Konflikt erkannt: Remote wurde ebenfalls geändert.' };
          }
        }
      }
    }
    if (!shaMd) {
      const existing = await api.getFile(paths.md);
      if (existing) shaMd = existing.sha;
    }
    if (!shaMeta) {
      const existing = await api.getFile(paths.meta);
      if (existing) shaMeta = existing.sha;
    }

    // Serialize
    const jsonContent = JSON.stringify(localData, null, 2);
    const mdContent = serializeToMarkdown(localData);
    const metaContent = JSON.stringify({
      lastSync: new Date().toISOString(),
      deviceId: localData.deviceId,
      version: localData.version,
    }, null, 2);

    const commitMsg = `Bookmark sync from device ${localData.deviceId.substring(0, 8)} - ${new Date().toISOString()}`;

    // Push files
    const jsonResult = await api.createOrUpdateFile(paths.json, jsonContent, commitMsg, shaJson);
    const mdResult = await api.createOrUpdateFile(paths.md, mdContent, commitMsg, shaMd);
    const metaResult = await api.createOrUpdateFile(paths.meta, metaContent, commitMsg, shaMeta);

    // Store the new SHAs and sync data
    await chrome.storage.local.set({
      [STORAGE_KEYS.LAST_REMOTE_SHA_JSON]: jsonResult.sha,
      [STORAGE_KEYS.LAST_REMOTE_SHA_MD]: mdResult.sha,
      [STORAGE_KEYS.LAST_REMOTE_SHA_META]: metaResult.sha,
      [STORAGE_KEYS.LAST_SYNC_TIME]: new Date().toISOString(),
      [STORAGE_KEYS.LAST_SYNC_DATA]: jsonContent,
      [STORAGE_KEYS.HAS_CONFLICT]: false,
    });

    return { success: true, message: 'Bookmarks erfolgreich nach GitHub gepusht.' };

  } catch (err) {
    if (err instanceof GitHubError && err.statusCode === 409) {
      await chrome.storage.local.set({ [STORAGE_KEYS.HAS_CONFLICT]: true });
      return { success: false, message: 'Konflikt: Die Datei wurde zwischenzeitlich geändert.' };
    }
    console.error('Push error:', err);
    return { success: false, message: `Push fehlgeschlagen: ${err.message}` };
  } finally {
    isSyncing = false;
  }
}

/**
 * Pull bookmarks from GitHub and replace local bookmarks.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function pull() {
  if (isSyncing) {
    return { success: false, message: 'Sync läuft bereits.' };
  }
  isSyncing = true;
  try {
    const settings = await getSettings();
    if (!isConfigured(settings)) {
      return { success: false, message: 'Extension nicht konfiguriert. Bitte Einstellungen öffnen.' };
    }

    const api = createApi(settings);
    const paths = getFilePaths(settings[STORAGE_KEYS.FILE_PATH]);

    // Fetch the JSON file
    const remoteFile = await api.getFile(paths.json);
    if (!remoteFile) {
      return { success: false, message: 'Keine Bookmarks auf GitHub gefunden.' };
    }

    const remoteData = JSON.parse(remoteFile.content);
    const bookmarks = deserializeFromJson(remoteData);

    // Check if content actually changed
    const localData = await getLocalBookmarks();
    if (bookmarksEqual(localData, remoteData)) {
      // Still update SHAs
      await updateRemoteShas(api, paths);
      return { success: true, message: 'Bookmarks sind bereits aktuell.' };
    }

    // Replace local bookmarks with remote data
    await replaceLocalBookmarks(bookmarks);

    // Update SHAs and sync data
    await updateRemoteShas(api, paths);
    await chrome.storage.local.set({
      [STORAGE_KEYS.LAST_SYNC_TIME]: new Date().toISOString(),
      [STORAGE_KEYS.LAST_SYNC_DATA]: remoteFile.content,
      [STORAGE_KEYS.HAS_CONFLICT]: false,
    });

    return { success: true, message: 'Bookmarks erfolgreich von GitHub geladen.' };

  } catch (err) {
    console.error('Pull error:', err);
    return { success: false, message: `Pull fehlgeschlagen: ${err.message}` };
  } finally {
    isSyncing = false;
  }
}

/**
 * Full bidirectional sync: check for changes on both sides, push or pull accordingly.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sync() {
  if (isSyncing) {
    return { success: false, message: 'Sync läuft bereits.' };
  }
  // Note: we don't set isSyncing here because push/pull will set it
  try {
    const settings = await getSettings();
    if (!isConfigured(settings)) {
      return { success: false, message: 'Extension nicht konfiguriert. Bitte Einstellungen öffnen.' };
    }

    const api = createApi(settings);
    const paths = getFilePaths(settings[STORAGE_KEYS.FILE_PATH]);

    // Get current local bookmarks
    const localData = await getLocalBookmarks();

    // Get last synced state
    const stored = await chrome.storage.local.get(STORAGE_KEYS.LAST_SYNC_DATA);
    const lastSyncData = stored[STORAGE_KEYS.LAST_SYNC_DATA]
      ? JSON.parse(stored[STORAGE_KEYS.LAST_SYNC_DATA])
      : null;

    // Fetch remote
    const remoteFile = await api.getFile(paths.json);
    const remoteData = remoteFile ? JSON.parse(remoteFile.content) : null;

    const localChanged = !lastSyncData || !bookmarksEqual(localData, lastSyncData);
    const remoteChanged = !lastSyncData
      ? !!remoteData
      : (remoteData && !bookmarksEqual(remoteData, lastSyncData));

    if (!localChanged && !remoteChanged) {
      return { success: true, message: 'Alles synchron. Keine Änderungen.' };
    }

    if (localChanged && !remoteChanged) {
      // Only local changes -> push
      return await push();
    }

    if (!localChanged && remoteChanged) {
      // Only remote changes -> pull
      return await pull();
    }

    // Both changed -> conflict
    await chrome.storage.local.set({ [STORAGE_KEYS.HAS_CONFLICT]: true });
    return {
      success: false,
      message: 'Konflikt: Sowohl lokal als auch remote wurden Bookmarks geändert. Bitte wähle Push oder Pull.',
    };

  } catch (err) {
    console.error('Sync error:', err);
    return { success: false, message: `Sync fehlgeschlagen: ${err.message}` };
  }
}

/**
 * Update stored remote SHAs from the current remote state.
 * @param {GitHubAPI} api
 * @param {{json: string, md: string, meta: string}} paths
 */
async function updateRemoteShas(api, paths) {
  try {
    const [jsonFile, mdFile, metaFile] = await Promise.all([
      api.getFile(paths.json),
      api.getFile(paths.md),
      api.getFile(paths.meta),
    ]);

    await chrome.storage.local.set({
      [STORAGE_KEYS.LAST_REMOTE_SHA_JSON]: jsonFile?.sha || null,
      [STORAGE_KEYS.LAST_REMOTE_SHA_MD]: mdFile?.sha || null,
      [STORAGE_KEYS.LAST_REMOTE_SHA_META]: metaFile?.sha || null,
    });
  } catch (err) {
    console.warn('Could not update remote SHAs:', err);
  }
}

/**
 * Replace all local bookmarks with the given bookmark structure.
 * This removes all existing bookmarks and recreates them from the remote data.
 * It skips the root-level folders (Bookmarks Bar, Other Bookmarks, Mobile Bookmarks)
 * and only replaces their children.
 * @param {object[]} remoteBookmarks - Array of top-level bookmark nodes
 */
async function replaceLocalBookmarks(remoteBookmarks) {
  const tree = await chrome.bookmarks.getTree();
  const rootChildren = tree[0]?.children || [];

  // Map remote top-level folders to local root folders by index/title
  for (let i = 0; i < rootChildren.length && i < remoteBookmarks.length; i++) {
    const localFolder = rootChildren[i];
    const remoteFolder = remoteBookmarks[i];

    // Remove existing children
    if (localFolder.children) {
      for (const child of [...localFolder.children].reverse()) {
        await removeBookmarkTree(child.id);
      }
    }

    // Recreate from remote data
    if (remoteFolder.children) {
      for (const child of remoteFolder.children) {
        await createBookmarkTree(child, localFolder.id);
      }
    }
  }
}

/**
 * Recursively remove a bookmark tree node.
 * @param {string} id
 */
async function removeBookmarkTree(id) {
  try {
    await chrome.bookmarks.removeTree(id);
  } catch (err) {
    console.warn('Could not remove bookmark:', id, err);
  }
}

/**
 * Recursively create a bookmark tree from serialized data.
 * @param {object} node - Serialized bookmark node
 * @param {string} parentId - ID of the parent folder
 */
async function createBookmarkTree(node, parentId) {
  if (node.type === 'bookmark') {
    await chrome.bookmarks.create({
      parentId: parentId,
      title: node.title,
      url: node.url,
    });
  } else if (node.type === 'folder') {
    const folder = await chrome.bookmarks.create({
      parentId: parentId,
      title: node.title,
    });
    if (node.children) {
      for (const child of node.children) {
        await createBookmarkTree(child, folder.id);
      }
    }
  }
}

/**
 * Get the current sync status.
 * @returns {Promise<object>}
 */
export async function getSyncStatus() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.LAST_SYNC_TIME,
    STORAGE_KEYS.HAS_CONFLICT,
  ]);

  const settings = await getSettings();
  const configured = isConfigured(settings);

  return {
    configured,
    lastSyncTime: result[STORAGE_KEYS.LAST_SYNC_TIME] || null,
    hasConflict: result[STORAGE_KEYS.HAS_CONFLICT] || false,
    autoSync: settings[STORAGE_KEYS.AUTO_SYNC],
  };
}

// ---- Sync lock to prevent re-entrant syncing ----

let isSyncing = false;

export function isSyncInProgress() {
  return isSyncing;
}

// ---- Debounce utility for auto-sync ----

let debounceTimer = null;

/**
 * Trigger a debounced push (used for auto-sync on bookmark events).
 * @param {number} delayMs - Debounce delay in milliseconds
 */
export function debouncedPush(delayMs = 5000) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(async () => {
    debounceTimer = null;
    const settings = await getSettings();
    if (settings[STORAGE_KEYS.AUTO_SYNC]) {
      console.log('[BookHub] Auto-push triggered');
      const result = await push();
      console.log('[BookHub] Auto-push result:', result.message);

      // Update badge
      if (result.success) {
        chrome.action.setBadgeText({ text: '' });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      } else {
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
      }
    }
  }, delayMs);
}
