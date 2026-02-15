/**
 * Onboarding – check path setup and create minimal bookmark structure.
 * Used when a new user or profile configures GitHub: verify path exists,
 * offer to create if missing, offer to pull if bookmarks exist.
 */

import { GitHubError } from './github-api.js';
import { fetchRemoteFileMap } from './remote-fetch.js';

/**
 * Check if the bookmark path exists and whether it has bookmarks.
 * @param {import('./github-api.js').GitHubAPI} api
 * @param {string} basePath
 * @returns {Promise<{status: 'unreachable'|'empty'|'hasBookmarks', fileMap?: object, commitSha?: string}>}
 */
export async function checkPathSetup(api, basePath) {
  const normalizedPath = (basePath || 'bookmarks').replace(/\/+$/, '');
  try {
    const remote = await fetchRemoteFileMap(api, normalizedPath, null);
    if (!remote) {
      return { status: 'unreachable' };
    }
    const { fileMap, commitSha } = remote;
    const paths = Object.keys(fileMap || {});
    if (paths.length === 0) {
      return { status: 'empty' };
    }
    const hasBookmarkFiles = paths.some(
      (p) =>
        !p.endsWith('_order.json') &&
        !p.endsWith('_index.json') &&
        p.endsWith('.json')
    );
    return {
      status: hasBookmarkFiles ? 'hasBookmarks' : 'empty',
      fileMap,
      commitSha,
    };
  } catch (err) {
    if (err instanceof GitHubError && (err.statusCode === 404 || err.statusCode === 409)) {
      return { status: 'empty' };
    }
    throw err;
  }
}

/**
 * Create the minimal bookmark structure (path -> content).
 * @param {string} basePath
 * @returns {Object<string, string>}
 */
export function createMinimalBookmarkStructure(basePath) {
  const base = (basePath || 'bookmarks').replace(/\/+$/, '');
  const files = {};
  files[`${base}/_index.json`] = JSON.stringify({ version: 2 }, null, 2);
  for (const role of ['toolbar', 'other', 'menu', 'mobile']) {
    files[`${base}/${role}/_order.json`] = JSON.stringify([], null, 2);
  }
  return files;
}

/**
 * Initialize the remote folder with the minimal structure.
 * @param {import('./github-api.js').GitHubAPI} api
 * @param {string} basePath
 * @returns {Promise<string>} Commit SHA
 */
export async function initializeRemoteFolder(api, basePath) {
  const files = createMinimalBookmarkStructure(basePath);
  const fileChanges = {};
  for (const [path, content] of Object.entries(files)) {
    fileChanges[path] = content;
  }
  return api.atomicCommit('Initialize bookmark structure', fileChanges);
}
