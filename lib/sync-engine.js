/**
 * Sync Engine – Per-file bookmark sync with Three-Way-Merge
 *
 * Core concept: Each bookmark is stored as an individual JSON file in the Git repo.
 * The sync algorithm uses a three-way merge (base vs local vs remote) to detect
 * and resolve changes on both sides automatically.
 *
 * State management:
 *   LAST_SYNC_FILES: { [path]: { sha, content } } — snapshot at last sync
 *   LAST_COMMIT_SHA: commit SHA at last sync
 */

import { GitHubAPI, GitHubError } from './github-api.js';
import {
  bookmarkTreeToFileMap,
  fileMapToBookmarkTree,
  fileMapToMarkdown,
  gitTreeToShaMap,
  detectRootFolderRole,
} from './bookmark-serializer.js';
import { getMessage } from './i18n.js';
import { decryptToken } from './crypto.js';

// ---- Storage keys ----

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
  DEVICE_ID: 'deviceId',
  LAST_SYNC_TIME: 'lastSyncTime',
  LAST_SYNC_WITH_CHANGES_TIME: 'lastSyncWithChangesTime',
  LAST_SYNC_FILES: 'lastSyncFiles',
  LAST_COMMIT_SHA: 'lastCommitSha',
  HAS_CONFLICT: 'hasConflict',
  // Legacy keys (for migration detection)
  LAST_SYNC_DATA: 'lastSyncData',
  LAST_REMOTE_SHA_JSON: 'lastRemoteShaJson',
  LAST_REMOTE_SHA_MD: 'lastRemoteShaMd',
  LAST_REMOTE_SHA_META: 'lastRemoteShaMeta',
};

export { STORAGE_KEYS };

// ---- Sync profile presets ----

/** Preset definitions: { interval (minutes), debounceMs } */
export const SYNC_PRESETS = {
  realtime: { interval: 1, debounceMs: 2000 },
  frequent: { interval: 5, debounceMs: 3000 },
  normal: { interval: 15, debounceMs: 5000 },
  powersave: { interval: 60, debounceMs: 10000 },
  custom: { interval: null, debounceMs: null },
};

// ---- Settings & configuration ----

export async function getDeviceId() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.DEVICE_ID);
  if (result[STORAGE_KEYS.DEVICE_ID]) return result[STORAGE_KEYS.DEVICE_ID];
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ [STORAGE_KEYS.DEVICE_ID]: id });
  return id;
}

export async function getSettings() {
  const defaults = {
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
  };
  const result = await chrome.storage.sync.get({
    ...defaults,
    [STORAGE_KEYS.NOTIFICATIONS_MODE]: undefined,
    [STORAGE_KEYS.NOTIFICATIONS_ENABLED]: undefined,
  });
  const localData = await chrome.storage.local.get({ [STORAGE_KEYS.GITHUB_TOKEN]: '' });
  result[STORAGE_KEYS.GITHUB_TOKEN] = await decryptToken(localData[STORAGE_KEYS.GITHUB_TOKEN]);

  // Migrate notificationsEnabled -> notificationsMode
  const mode = result[STORAGE_KEYS.NOTIFICATIONS_MODE];
  const oldEnabled = result[STORAGE_KEYS.NOTIFICATIONS_ENABLED];
  if (mode && ['off', 'all', 'errorsOnly'].includes(mode)) {
    result[STORAGE_KEYS.NOTIFICATIONS_MODE] = mode;
  } else if (oldEnabled === false) {
    result[STORAGE_KEYS.NOTIFICATIONS_MODE] = 'off';
  } else {
    result[STORAGE_KEYS.NOTIFICATIONS_MODE] = 'all';
  }
  delete result[STORAGE_KEYS.NOTIFICATIONS_ENABLED];

  return result;
}

export function isConfigured(settings) {
  return !!(
    settings[STORAGE_KEYS.GITHUB_TOKEN] &&
    settings[STORAGE_KEYS.REPO_OWNER] &&
    settings[STORAGE_KEYS.REPO_NAME]
  );
}

function createApi(settings) {
  return new GitHubAPI(
    settings[STORAGE_KEYS.GITHUB_TOKEN],
    settings[STORAGE_KEYS.REPO_OWNER],
    settings[STORAGE_KEYS.REPO_NAME],
    settings[STORAGE_KEYS.BRANCH]
  );
}

// ---- Local bookmark access ----

/**
 * Get current browser bookmarks as a file map.
 * @param {string} basePath
 * @returns {Promise<Object<string, string>>}
 */
async function getLocalFileMap(basePath) {
  const tree = await chrome.bookmarks.getTree();
  return bookmarkTreeToFileMap(tree, basePath);
}

// ---- Remote access helpers ----

/**
 * Fetch the remote file map from GitHub.
 * Returns { shaMap, fileMap, commitSha } where:
 *   shaMap: { [path]: blobSha } (all files)
 *   fileMap: { [path]: content } (all file contents fetched)
 *   commitSha: current commit SHA
 *
 * Optimized: only fetches blob content for files that differ from base.
 *
 * @param {GitHubAPI} api
 * @param {string} basePath
 * @param {Object<string, {sha: string, content: string}>|null} baseFiles
 * @returns {Promise<{shaMap: object, fileMap: object, commitSha: string}|null>}
 */
async function fetchRemoteFileMap(api, basePath, baseFiles) {
  let commitSha;
  try {
    commitSha = await api.getLatestCommitSha();
  } catch (err) {
    if (err instanceof GitHubError && (err.statusCode === 404 || err.statusCode === 409)) {
      return null; // No branch / empty repo
    }
    throw err;
  }

  const commit = await api.getCommit(commitSha);
  const treeEntries = await api.getTree(commit.treeSha);
  const shaMap = gitTreeToShaMap(treeEntries, basePath);

  // No files under basePath
  if (Object.keys(shaMap).length === 0) {
    return { shaMap: {}, fileMap: {}, commitSha };
  }

  // Fetch blob content, using cached base content when SHA matches
  const fileMap = {};
  const fetchPromises = [];

  for (const [path, blobSha] of Object.entries(shaMap)) {
    if (baseFiles && baseFiles[path] && baseFiles[path].sha === blobSha) {
      // SHA unchanged — use cached content
      fileMap[path] = baseFiles[path].content;
    } else {
      // SHA changed or new file — fetch content
      fetchPromises.push(
        api.getBlob(blobSha).then(content => {
          fileMap[path] = content;
        })
      );
    }
  }

  if (fetchPromises.length > 0) {
    await Promise.all(fetchPromises);
  }

  return { shaMap, fileMap, commitSha };
}

// ---- File map filtering ----

/**
 * Files to exclude from diff calculations.
 * These are either metadata or generated files that should not trigger sync actions.
 */
const DIFF_IGNORE_SUFFIXES = ['/README.md', '/_index.json'];

/**
 * Filter a file map to exclude generated/meta files from diff calculations.
 * @param {Object<string, string>} files
 * @returns {Object<string, string>}
 */
function filterForDiff(files) {
  const filtered = {};
  for (const [path, content] of Object.entries(files)) {
    if (DIFF_IGNORE_SUFFIXES.some(suffix => path.endsWith(suffix))) continue;
    filtered[path] = content;
  }
  return filtered;
}

// ---- Three-Way-Merge ----

// ---- _order.json content-level merge helpers ----

/**
 * Extract a unique key from an _order.json entry for comparison.
 * @param {string|object} entry
 * @returns {string}
 */
function orderEntryKey(entry) {
  if (typeof entry === 'string') return entry;
  if (typeof entry === 'object' && entry !== null && entry.dir) return `dir:${entry.dir}`;
  return JSON.stringify(entry);
}

/**
 * Three-way merge for _order.json content.
 *
 * _order.json is an array of entries where each entry is either a bookmark
 * filename (string) or a folder descriptor ({ dir, title }).  When two devices
 * concurrently add/remove different bookmarks in the same folder, both produce
 * different _order.json content.  Instead of treating this as a conflict, we
 * merge the arrays: keep local order as the base, apply remote additions at the
 * end, and honour removals from both sides.
 *
 * @param {string|null} baseContent  - Base _order.json (null if newly created)
 * @param {string}      localContent - Local _order.json
 * @param {string}      remoteContent - Remote _order.json
 * @returns {string|null} Merged JSON string, or null if merge is not possible.
 */
export function mergeOrderJson(baseContent, localContent, remoteContent) {
  let base, local, remote;
  try {
    base = baseContent ? JSON.parse(baseContent) : [];
    local = JSON.parse(localContent);
    remote = JSON.parse(remoteContent);
  } catch {
    return null; // Malformed JSON → fall through to conflict
  }

  if (!Array.isArray(base) || !Array.isArray(local) || !Array.isArray(remote)) {
    return null;
  }

  const baseKeys = new Set(base.map(orderEntryKey));
  const localKeys = new Set(local.map(orderEntryKey));
  const remoteKeys = new Set(remote.map(orderEntryKey));

  // Determine what each side removed relative to base
  const remoteRemovedKeys = new Set(
    base.filter(e => !remoteKeys.has(orderEntryKey(e))).map(orderEntryKey)
  );
  const localRemovedKeys = new Set(
    base.filter(e => !localKeys.has(orderEntryKey(e))).map(orderEntryKey)
  );

  // Start with local order — remove entries that remote deleted
  const merged = local.filter(e => !remoteRemovedKeys.has(orderEntryKey(e)));

  // Append entries that remote added (entries in remote but not in base)
  // Skip any that are already present in merged (e.g. both sides added the same entry)
  const mergedKeys = new Set(merged.map(orderEntryKey));
  for (const entry of remote) {
    const key = orderEntryKey(entry);
    if (!baseKeys.has(key) && !mergedKeys.has(key) && !localRemovedKeys.has(key)) {
      merged.push(entry);
      mergedKeys.add(key);
    }
  }

  return JSON.stringify(merged, null, 2);
}

/**
 * Compute the diff between a base file map and a current file map.
 * @param {Object<string, string>} base - Base file map (path → content)
 * @param {Object<string, string>} current - Current file map
 * @returns {{added: Object<string, string>, removed: string[], modified: Object<string, string>}}
 */
export function computeDiff(base, current) {
  const added = {};
  const removed = [];
  const modified = {};

  // Find added and modified
  for (const [path, content] of Object.entries(current)) {
    if (!(path in base)) {
      added[path] = content;
    } else if (base[path] !== content) {
      modified[path] = content;
    }
  }

  // Find removed
  for (const path of Object.keys(base)) {
    if (!(path in current)) {
      removed.push(path);
    }
  }

  return { added, removed, modified };
}

/**
 * Merge two diffs (local and remote) into a set of actions.
 * Implements the three-way merge rules from the plan.
 *
 * For _order.json files that both sides modified, a content-level merge is
 * attempted (combining additions/removals from both sides) instead of
 * immediately treating the change as a conflict.
 *
 * @param {object} localDiff - { added, removed, modified }
 * @param {object} remoteDiff - { added, removed, modified }
 * @param {Object<string, string>} localFiles - Full local file map
 * @param {Object<string, string>} remoteFiles - Full remote file map
 * @param {Object<string, string>} [baseFiles={}] - Base file map (for _order.json merging)
 * @returns {{
 *   toPush: Object<string, string|null>,
 *   toApplyLocal: Object<string, string|null>,
 *   conflicts: Array<{path: string, local: string|null, remote: string|null}>
 * }}
 */
export function mergeDiffs(localDiff, remoteDiff, localFiles, remoteFiles, baseFiles = {}) {
  const toPush = {};      // path → content (or null for delete) — changes to push to GitHub
  const toApplyLocal = {}; // path → content (or null for delete) — changes to apply locally
  const conflicts = [];

  // All paths that were changed on either side
  const allPaths = new Set([
    ...Object.keys(localDiff.added),
    ...localDiff.removed,
    ...Object.keys(localDiff.modified),
    ...Object.keys(remoteDiff.added),
    ...remoteDiff.removed,
    ...Object.keys(remoteDiff.modified),
  ]);

  for (const path of allPaths) {
    const localAdded = path in localDiff.added;
    const localRemoved = localDiff.removed.includes(path);
    const localModified = path in localDiff.modified;
    const remoteAdded = path in remoteDiff.added;
    const remoteRemoved = remoteDiff.removed.includes(path);
    const remoteModified = path in remoteDiff.modified;

    const localChanged = localAdded || localRemoved || localModified;
    const remoteChanged = remoteAdded || remoteRemoved || remoteModified;

    if (localChanged && !remoteChanged) {
      // Only local change → push to remote
      if (localRemoved) {
        toPush[path] = null;
      } else {
        toPush[path] = localFiles[path];
      }
    } else if (!localChanged && remoteChanged) {
      // Only remote change → apply locally
      if (remoteRemoved) {
        toApplyLocal[path] = null;
      } else {
        toApplyLocal[path] = remoteFiles[path];
      }
    } else if (localChanged && remoteChanged) {
      // Both changed — check if same change
      const localContent = localRemoved ? null : (localFiles[path] || null);
      const remoteContent = remoteRemoved ? null : (remoteFiles[path] || null);

      if (localContent === remoteContent) {
        // Same change on both sides → no conflict, no action needed
        continue;
      }

      // Attempt content-level merge for _order.json files
      if (path.endsWith('/_order.json') && localContent !== null && remoteContent !== null) {
        const baseContent = baseFiles[path] || null;
        const merged = mergeOrderJson(baseContent, localContent, remoteContent);
        if (merged !== null) {
          // Successfully merged — push merged version and apply locally
          toPush[path] = merged;
          toApplyLocal[path] = merged;
          continue;
        }
        // mergeOrderJson returned null → fall through to conflict
      }

      if (localAdded && remoteAdded) {
        // Both added different files at same path → conflict
        conflicts.push({ path, local: localContent, remote: remoteContent });
      } else if (localRemoved && remoteRemoved) {
        // Both deleted → nothing to do
        continue;
      } else {
        // One modified/added + other modified/removed → true conflict
        conflicts.push({ path, local: localContent, remote: remoteContent });
      }
    }
  }

  return { toPush, toApplyLocal, conflicts };
}

// ---- Core sync operations ----

/**
 * Full push: upload all local bookmarks as individual files.
 * Used for initial sync or force-push.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function push() {
  if (isSyncing) return { success: false, message: getMessage('sync_alreadyInProgress') };
  isSyncing = true;

  try {
    const settings = await getSettings();
    if (!isConfigured(settings)) return { success: false, message: getMessage('sync_notConfigured') };

    const api = createApi(settings);
    const basePath = settings[STORAGE_KEYS.FILE_PATH].replace(/\/+$/, '');
    const localFiles = await getLocalFileMap(basePath);
    const deviceId = await getDeviceId();

    // Get current remote state to determine what to change
    let remote;
    try {
      remote = await fetchRemoteFileMap(api, basePath, null);
    } catch (err) {
      console.warn('[GitSyncMarks] Could not fetch remote state for push:', err);
      remote = null;
    }

    // Build file changes: add/update all local files, delete remote files not in local
    const fileChanges = {};
    for (const [path, content] of Object.entries(localFiles)) {
      if (!remote || !remote.fileMap[path] || remote.fileMap[path] !== content) {
        fileChanges[path] = content;
      }
    }
    if (remote) {
      for (const path of Object.keys(remote.fileMap)) {
        if (path.startsWith(basePath + '/') && !(path in localFiles)) {
          fileChanges[path] = null; // delete
        }
      }
    }

    if (Object.keys(fileChanges).length === 0) {
      return { success: true, message: getMessage('sync_noChanges') };
    }

    // Generate readable Markdown overview
    fileChanges[`${basePath}/README.md`] = fileMapToMarkdown(localFiles, basePath);

    const commitMsg = `Bookmark sync (push) from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
    const newCommitSha = await api.atomicCommit(commitMsg, fileChanges);

    // Save sync state
    await saveSyncState(api, basePath, localFiles, newCommitSha);

    return { success: true, message: getMessage('sync_pushSuccess') };
  } catch (err) {
    console.error('[GitSyncMarks] Push error:', err);
    return { success: false, message: getMessage('sync_pushFailed', [err.message]) };
  } finally {
    isSyncing = false;
  }
}

/**
 * Full pull: replace all local bookmarks with remote data.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function pull() {
  if (isSyncing) return { success: false, message: getMessage('sync_alreadyInProgress') };
  isSyncing = true;

  try {
    const settings = await getSettings();
    if (!isConfigured(settings)) return { success: false, message: getMessage('sync_notConfigured') };

    const api = createApi(settings);
    const basePath = settings[STORAGE_KEYS.FILE_PATH].replace(/\/+$/, '');

    const remote = await fetchRemoteFileMap(api, basePath, null);
    if (!remote || Object.keys(remote.fileMap).length === 0) {
      return { success: false, message: getMessage('sync_noBookmarksOnGithub') };
    }

    // Convert remote files to bookmark tree and apply
    const roleMap = fileMapToBookmarkTree(remote.fileMap, basePath);
    suppressAutoSyncUntil = Date.now() + 10000;
    await replaceLocalBookmarks(roleMap);

    // Re-generate local file map (to capture exact state with any normalization)
    const freshLocalFiles = await getLocalFileMap(basePath);

    // Save sync state with the fresh local files (content matches what browser has)
    // but use remote SHAs for the stored state so remote diff is clean
    await saveSyncStateFromMaps(freshLocalFiles, remote.shaMap, remote.commitSha);

    return { success: true, message: getMessage('sync_pullSuccess') };
  } catch (err) {
    console.error('[GitSyncMarks] Pull error:', err);
    return { success: false, message: getMessage('sync_pullFailed', [err.message]) };
  } finally {
    isSyncing = false;
  }
}

/**
 * Bidirectional sync with three-way merge.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sync() {
  if (isSyncing) return { success: false, message: getMessage('sync_alreadyInProgress') };
  isSyncing = true;

  try {
    const settings = await getSettings();
    if (!isConfigured(settings)) return { success: false, message: getMessage('sync_notConfigured') };

    const api = createApi(settings);
    const basePath = settings[STORAGE_KEYS.FILE_PATH].replace(/\/+$/, '');
    const deviceId = await getDeviceId();

    // 1. Load base state
    const stored = await chrome.storage.local.get([
      STORAGE_KEYS.LAST_SYNC_FILES,
      STORAGE_KEYS.LAST_COMMIT_SHA,
    ]);
    const baseFiles = stored[STORAGE_KEYS.LAST_SYNC_FILES] || null;
    const baseCommitSha = stored[STORAGE_KEYS.LAST_COMMIT_SHA] || null;

    // 2. Get local file map
    const localFiles = await getLocalFileMap(basePath);

    // 3. Get remote file map (optimized: uses base SHAs to skip unchanged blobs)
    const remote = await fetchRemoteFileMap(api, basePath, baseFiles);

    // 4. Handle special cases

    // 4a. No base state (first sync)
    if (!baseFiles) {
      const hasRemote = remote && Object.keys(remote.fileMap).length > 0;
      const hasLocal = Object.keys(localFiles).length > 1; // more than just _index.json

      if (!hasRemote && hasLocal) {
        // First sync, no remote data → push everything
        console.log('[GitSyncMarks] First sync: pushing local bookmarks');
        isSyncing = false;
        return await push();
      }
      if (hasRemote && !hasLocal) {
        // Remote has data, local is empty → pull
        console.log('[GitSyncMarks] First sync: pulling remote bookmarks');
        isSyncing = false;
        return await pull();
      }
      if (hasRemote && hasLocal) {
        // Both have data, no base → can't merge, user must choose
        console.log('[GitSyncMarks] First sync: both sides have data, conflict');
        await chrome.storage.local.set({ [STORAGE_KEYS.HAS_CONFLICT]: true });
        return { success: false, message: getMessage('sync_conflictBothModified') };
      }
      // Neither has data
      return { success: true, message: getMessage('sync_allInSync') };
    }

    // 4b. Extract base content map (path → content) from stored state
    const baseContentMap = {};
    for (const [path, info] of Object.entries(baseFiles)) {
      baseContentMap[path] = info.content;
    }

    const remoteFiles = remote ? remote.fileMap : {};

    // 5. Compute diffs (excluding generated files like README.md)
    const localDiff = computeDiff(filterForDiff(baseContentMap), filterForDiff(localFiles));
    const remoteDiff = computeDiff(filterForDiff(baseContentMap), filterForDiff(remoteFiles));

    const localHasChanges = Object.keys(localDiff.added).length > 0 ||
      localDiff.removed.length > 0 || Object.keys(localDiff.modified).length > 0;
    const remoteHasChanges = Object.keys(remoteDiff.added).length > 0 ||
      remoteDiff.removed.length > 0 || Object.keys(remoteDiff.modified).length > 0;

    console.log('[GitSyncMarks] Sync analysis:', {
      localChanges: {
        added: Object.keys(localDiff.added).length,
        removed: localDiff.removed.length,
        modified: Object.keys(localDiff.modified).length,
      },
      remoteChanges: {
        added: Object.keys(remoteDiff.added).length,
        removed: remoteDiff.removed.length,
        modified: Object.keys(remoteDiff.modified).length,
      },
    });

    // 6. No changes on either side
    if (!localHasChanges && !remoteHasChanges) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.LAST_SYNC_TIME]: new Date().toISOString(),
      });
      return { success: true, message: getMessage('sync_allInSync') };
    }

    // 7. Only local changes → push
    if (localHasChanges && !remoteHasChanges) {
      const fileChanges = {};
      for (const [p, c] of Object.entries(localDiff.added)) fileChanges[p] = c;
      for (const [p, c] of Object.entries(localDiff.modified)) fileChanges[p] = c;
      for (const p of localDiff.removed) fileChanges[p] = null;

      // Regenerate Markdown overview
      fileChanges[`${basePath}/README.md`] = fileMapToMarkdown(localFiles, basePath);

      const msg = `Bookmark sync from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
      const newCommitSha = await api.atomicCommit(msg, fileChanges);
      await saveSyncState(api, basePath, localFiles, newCommitSha);

      return { success: true, message: getMessage('sync_pushSuccess') };
    }

    // 8. Only remote changes → apply locally
    if (!localHasChanges && remoteHasChanges) {
      const roleMap = fileMapToBookmarkTree(remoteFiles, basePath);
      suppressAutoSyncUntil = Date.now() + 10000;
      await replaceLocalBookmarks(roleMap);

      const freshLocal = await getLocalFileMap(basePath);
      await saveSyncStateFromMaps(freshLocal, remote.shaMap, remote.commitSha);

      return { success: true, message: getMessage('sync_pullSuccess') };
    }

    // 9. Both changed → three-way merge
    const { toPush, toApplyLocal, conflicts } = mergeDiffs(
      localDiff, remoteDiff, localFiles, remoteFiles, baseContentMap
    );

    if (conflicts.length > 0) {
      console.log('[GitSyncMarks] Merge conflicts:', conflicts.map(c => c.path));
      await chrome.storage.local.set({ [STORAGE_KEYS.HAS_CONFLICT]: true });
      return { success: false, message: getMessage('sync_conflictBothModified') };
    }

    // Apply non-conflicting changes

    // Apply remote changes locally
    if (Object.keys(toApplyLocal).length > 0) {
      // Build merged file map: start with local, apply remote changes
      const mergedFiles = { ...localFiles };
      for (const [path, content] of Object.entries(toApplyLocal)) {
        if (content === null) {
          delete mergedFiles[path];
        } else {
          mergedFiles[path] = content;
        }
      }

      const roleMap = fileMapToBookmarkTree(mergedFiles, basePath);
      suppressAutoSyncUntil = Date.now() + 10000;
      await replaceLocalBookmarks(roleMap);
    }

    // Push local changes to remote
    if (Object.keys(toPush).length > 0) {
      // Regenerate Markdown overview from merged state
      const mergedForMd = { ...localFiles };
      for (const [path, content] of Object.entries(toApplyLocal)) {
        if (content === null) delete mergedForMd[path];
        else mergedForMd[path] = content;
      }
      toPush[`${basePath}/README.md`] = fileMapToMarkdown(mergedForMd, basePath);

      const msg = `Bookmark merge from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
      const newCommitSha = await api.atomicCommit(msg, toPush);

      // Refresh sync state
      const freshLocal = await getLocalFileMap(basePath);
      await saveSyncState(api, basePath, freshLocal, newCommitSha);
    } else if (Object.keys(toApplyLocal).length > 0) {
      // Only remote changes applied locally — update sync state
      const freshLocal = await getLocalFileMap(basePath);
      await saveSyncStateFromMaps(freshLocal, remote.shaMap, remote.commitSha);
    }

    await chrome.storage.local.set({ [STORAGE_KEYS.HAS_CONFLICT]: false });
    return { success: true, message: getMessage('sync_allInSync') };

  } catch (err) {
    console.error('[GitSyncMarks] Sync error:', err);
    return { success: false, message: getMessage('sync_syncFailed', [err.message]) };
  } finally {
    isSyncing = false;
  }
}

// ---- Sync state management ----

/**
 * Save sync state after a push (fetches fresh SHAs from remote tree).
 */
async function saveSyncState(api, basePath, localFiles, commitSha) {
  const commit = await api.getCommit(commitSha);
  const treeEntries = await api.getTree(commit.treeSha);
  const shaMap = gitTreeToShaMap(treeEntries, basePath);

  await saveSyncStateFromMaps(localFiles, shaMap, commitSha);
}

/**
 * Save sync state from pre-computed maps.
 */
async function saveSyncStateFromMaps(localFiles, shaMap, commitSha) {
  const syncFiles = {};
  for (const [path, content] of Object.entries(localFiles)) {
    syncFiles[path] = {
      sha: shaMap[path] || null,
      content,
    };
  }

  const now = new Date().toISOString();
  await chrome.storage.local.set({
    [STORAGE_KEYS.LAST_SYNC_FILES]: syncFiles,
    [STORAGE_KEYS.LAST_COMMIT_SHA]: commitSha,
    [STORAGE_KEYS.LAST_SYNC_TIME]: now,
    [STORAGE_KEYS.LAST_SYNC_WITH_CHANGES_TIME]: now,
    [STORAGE_KEYS.HAS_CONFLICT]: false,
  });
}

// ---- Local bookmark replacement ----

/**
 * Replace all local bookmarks with data from a role map.
 * @param {Object<string, {title: string, children: object[]}>} roleMap - role → folder data
 */
export async function replaceLocalBookmarks(roleMap) {
  const tree = await chrome.bookmarks.getTree();
  const rootChildren = tree[0]?.children || [];

  // Build map of local root folders by role
  const localByRole = {};
  for (const folder of rootChildren) {
    const role = detectRootFolderRole(folder);
    localByRole[role] = folder;
  }

  for (const [role, data] of Object.entries(roleMap)) {
    const localFolder = localByRole[role];
    if (!localFolder) {
      console.log(`[GitSyncMarks] Skipping role "${role}" — no matching local folder`);
      continue;
    }

    // Remove existing children (reverse order to maintain indices)
    if (localFolder.children) {
      for (const child of [...localFolder.children].reverse()) {
        await removeBookmarkTree(child.id);
      }
    }

    // Recreate from remote data
    if (data.children) {
      for (const child of data.children) {
        await createBookmarkTree(child, localFolder.id);
      }
    }
  }
}

async function removeBookmarkTree(id) {
  try { await chrome.bookmarks.removeTree(id); }
  catch (err) { console.warn('[GitSyncMarks] Could not remove bookmark:', id, err); }
}

export async function createBookmarkTree(node, parentId) {
  if (node.type === 'bookmark') {
    await chrome.bookmarks.create({ parentId, title: node.title, url: node.url });
  } else if (node.type === 'folder') {
    const folder = await chrome.bookmarks.create({ parentId, title: node.title });
    if (node.children) {
      for (const child of node.children) {
        await createBookmarkTree(child, folder.id);
      }
    }
  }
}

// ---- Sync status ----

export async function getSyncStatus() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.LAST_SYNC_TIME,
    STORAGE_KEYS.LAST_SYNC_WITH_CHANGES_TIME,
    STORAGE_KEYS.LAST_COMMIT_SHA,
    STORAGE_KEYS.HAS_CONFLICT,
  ]);
  const settings = await getSettings();
  return {
    configured: isConfigured(settings),
    lastSyncTime: result[STORAGE_KEYS.LAST_SYNC_TIME] || null,
    lastSyncWithChangesTime: result[STORAGE_KEYS.LAST_SYNC_WITH_CHANGES_TIME] || null,
    lastCommitSha: result[STORAGE_KEYS.LAST_COMMIT_SHA] || null,
    hasConflict: result[STORAGE_KEYS.HAS_CONFLICT] || false,
    autoSync: settings[STORAGE_KEYS.AUTO_SYNC],
    repoOwner: settings[STORAGE_KEYS.REPO_OWNER] || '',
    repoName: settings[STORAGE_KEYS.REPO_NAME] || '',
  };
}

// ---- Sync lock ----

let isSyncing = false;
export function isSyncInProgress() { return isSyncing; }

// ---- Auto-sync suppression ----

let suppressAutoSyncUntil = 0;
export function isAutoSyncSuppressed() { return Date.now() < suppressAutoSyncUntil; }

// ---- Debounce for auto-sync ----

let debounceTimer = null;
let maxWaitTimer = null;

/**
 * Max wait: sync at latest after 30s or 6× debounce delay (prevents infinite deferral).
 */
const MAX_WAIT_MULTIPLIER = 6;
const MAX_WAIT_MIN_MS = 30000;

export function debouncedSync(delayMs = 5000, onComplete = null) {
  const maxWaitMs = Math.max(MAX_WAIT_MIN_MS, MAX_WAIT_MULTIPLIER * delayMs);

  const runSync = async () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = null;
    if (maxWaitTimer) clearTimeout(maxWaitTimer);
    maxWaitTimer = null;

    const settings = await getSettings();
    if (settings[STORAGE_KEYS.AUTO_SYNC]) {
      console.log('[GitSyncMarks] Auto-sync triggered');
      const result = await sync();
      console.log('[GitSyncMarks] Auto-sync result:', result.message);
      if (result.success) {
        chrome.action.setBadgeText({ text: '' });
      } else {
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
      }
      if (onComplete) onComplete(result);
    }
  };

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runSync, delayMs);

  if (!maxWaitTimer) {
    maxWaitTimer = setTimeout(runSync, maxWaitMs);
  }
}

// Legacy alias for backward compatibility
export const debouncedPush = debouncedSync;

// ---- Migration ----

/**
 * Check if we need to migrate from the old single-file format.
 * @param {GitHubAPI} api
 * @param {string} basePath
 * @returns {Promise<boolean>} true if migration was performed
 */
export async function migrateFromLegacyFormat(api, basePath) {
  const base = basePath.replace(/\/+$/, '');
  const legacyPath = `${base}/bookmarks.json`;

  let legacyFile;
  try {
    legacyFile = await api.getFile(legacyPath);
  } catch {
    return false;
  }

  if (!legacyFile) return false;

  console.log('[GitSyncMarks] Legacy bookmarks.json found, migrating to per-file format...');

  try {
    const data = JSON.parse(legacyFile.content);
    if (!data || data.version !== 1 || !data.bookmarks) return false;

    // The local bookmarks should already match (or the user needs to sync first).
    // We'll push the current local bookmarks as individual files and delete the old files.
    const tree = await chrome.bookmarks.getTree();
    const localFiles = bookmarkTreeToFileMap(tree, base);

    // Build file changes: add all new per-file entries, delete legacy files
    const fileChanges = {};
    for (const [path, content] of Object.entries(localFiles)) {
      fileChanges[path] = content;
    }

    // Delete old legacy files
    const legacyFiles = [
      `${base}/bookmarks.json`,
      `${base}/README.md`,
      `${base}/sync_meta.json`,
    ];
    for (const lf of legacyFiles) {
      try {
        const existing = await api.getFile(lf);
        if (existing) {
          fileChanges[lf] = null; // delete
        }
      } catch { /* ignore */ }
    }

    if (Object.keys(fileChanges).length === 0) return false;

    const deviceId = await getDeviceId();
    const msg = `Migrate to per-file format from ${deviceId.substring(0, 8)}`;
    const newCommitSha = await api.atomicCommit(msg, fileChanges);

    // Save sync state
    await saveSyncState(api, base, localFiles, newCommitSha);

    // Clean up legacy storage keys
    await chrome.storage.local.remove([
      STORAGE_KEYS.LAST_SYNC_DATA,
      STORAGE_KEYS.LAST_REMOTE_SHA_JSON,
      STORAGE_KEYS.LAST_REMOTE_SHA_MD,
      STORAGE_KEYS.LAST_REMOTE_SHA_META,
    ]);

    console.log('[GitSyncMarks] Migration complete');
    return true;
  } catch (err) {
    console.error('[GitSyncMarks] Migration error:', err);
    return false;
  }
}
