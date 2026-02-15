/**
 * Bookmark Serializer
 * Converts browser bookmark trees to a per-file format (one JSON file per bookmark)
 * and reconstructs the tree from that format.
 * Supports both Chrome and Firefox via role-based root folder mapping.
 *
 * File format:
 *   bookmarks/
 *     _index.json                     ← metadata
 *     toolbar/
 *       _order.json                   ← ordering: ["github_a1b2.json", "dev-tools"]
 *       github_a1b2.json             ← { "title": "GitHub", "url": "https://github.com" }
 *       dev-tools/
 *         _order.json
 *         chrome-devtools_e5f6.json
 *     other/
 *       _order.json
 *       ...
 */

import { getMessage } from './i18n.js';

// ---- Root folder role detection ----

const ROOT_FOLDER_ID_MAP = {
  '1': 'toolbar', '2': 'other', '3': 'mobile',                         // Chrome
  'toolbar_____': 'toolbar', 'unfiled_____': 'other',                   // Firefox
  'menu________': 'menu', 'mobile______': 'mobile',                     // Firefox
};

const ROOT_FOLDER_TITLE_PATTERNS = [
  { pattern: /toolbar|lesezeichen-symbolleiste|bookmarks bar/i, role: 'toolbar' },
  { pattern: /other|unfiled|weitere|sonstige/i, role: 'other' },
  { pattern: /mobile|mobil/i, role: 'mobile' },
  { pattern: /menu|menü/i, role: 'menu' },
];

/**
 * Detect the semantic role of a root-level bookmark folder.
 * @param {object} node - A root-level bookmark node (from chrome.bookmarks.getTree())
 * @returns {'toolbar' | 'other' | 'menu' | 'mobile' | 'unknown'}
 */
export function detectRootFolderRole(node) {
  if (node.id && ROOT_FOLDER_ID_MAP[node.id]) {
    return ROOT_FOLDER_ID_MAP[node.id];
  }
  const title = node.title || '';
  for (const { pattern, role } of ROOT_FOLDER_TITLE_PATTERNS) {
    if (pattern.test(title)) return role;
  }
  return 'unknown';
}

// ---- Slug & filename generation ----

/**
 * Create a URL-safe slug from a string.
 * @param {string} str
 * @returns {string}
 */
export function slugify(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40)
    || 'untitled';
}

/**
 * Generate a short deterministic hash from a string (FNV-1a).
 * @param {string} str
 * @returns {string} 4-character base-36 hash
 */
export function shortHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).padStart(4, '0').substring(0, 4);
}

/**
 * Generate a deterministic filename for a bookmark.
 * Format: {slug-from-title}_{hash-from-url}.json
 * @param {string} title
 * @param {string} url
 * @returns {string}
 */
export function generateFilename(title, url) {
  return `${slugify(title)}_${shortHash(url || '')}.json`;
}

/**
 * Generate a folder name slug, with dedup suffix if needed.
 * @param {string} title
 * @param {Set<string>} existingNames - Names already used in this directory
 * @returns {string}
 */
function generateFolderName(title, existingNames) {
  let name = slugify(title);
  if (!existingNames.has(name)) return name;
  let i = 2;
  while (existingNames.has(`${name}-${i}`)) i++;
  return `${name}-${i}`;
}

// ---- Browser bookmark tree → file map ----

/**
 * Convert the browser bookmark tree to a file map (path → content string).
 * Each bookmark becomes a JSON file, each folder a directory with _order.json.
 *
 * @param {chrome.bookmarks.BookmarkTreeNode[]} bookmarkTree - From chrome.bookmarks.getTree()
 * @param {string} basePath - Base directory in the repo (e.g. "bookmarks")
 * @returns {Object<string, string>} Map of file path → file content
 */
export function bookmarkTreeToFileMap(bookmarkTree, basePath) {
  const files = {};
  const base = basePath.replace(/\/+$/, '');
  const rootChildren = bookmarkTree[0]?.children || [];

  for (const rootFolder of rootChildren) {
    const role = detectRootFolderRole(rootFolder);
    if (role === 'unknown') continue;
    processFolder(rootFolder, `${base}/${role}`, files);
  }

  // Add index metadata
  files[`${base}/_index.json`] = JSON.stringify({ version: 2 }, null, 2);

  return files;
}

/**
 * Recursively process a bookmark folder into files.
 *
 * _order.json format: array of entries, each either:
 *   - string: a bookmark filename (e.g. "github_a1b2.json")
 *   - object: a folder entry { "dir": "dev-tools", "title": "Dev Tools" }
 *
 * @param {object} folder
 * @param {string} dirPath
 * @param {Object<string, string>} files
 */
function processFolder(folder, dirPath, files) {
  const order = [];
  const usedNames = new Set();
  const children = folder.children || [];

  for (const child of children) {
    if (child.url) {
      // Bookmark
      const filename = generateFilename(child.title, child.url);
      const content = JSON.stringify({ title: child.title || '', url: child.url }, null, 2);
      files[`${dirPath}/${filename}`] = content;
      order.push(filename);
      usedNames.add(filename);
    } else {
      // Subfolder — store original title in the order entry
      const folderName = generateFolderName(child.title, usedNames);
      usedNames.add(folderName);
      processFolder(child, `${dirPath}/${folderName}`, files);
      order.push({ dir: folderName, title: child.title || folderName });
    }
  }

  files[`${dirPath}/_order.json`] = JSON.stringify(order, null, 2);
}

// ---- File map → browser bookmark tree ----

/**
 * Convert a file map back into a bookmark tree structure that can be used
 * to create bookmarks via the browser API.
 * Returns a map of role → { children: [...] } for each root folder.
 *
 * @param {Object<string, string>} files - Map of path → content
 * @param {string} basePath - Base directory (e.g. "bookmarks")
 * @returns {Object<string, {title: string, children: object[]}>} Role → folder data
 */
export function fileMapToBookmarkTree(files, basePath) {
  const base = basePath.replace(/\/+$/, '');
  const roles = {};

  // Find root role folders
  for (const path of Object.keys(files)) {
    const rel = path.substring(base.length + 1); // e.g. "toolbar/_order.json"
    const parts = rel.split('/');
    if (parts.length >= 1) {
      const role = parts[0];
      if (['toolbar', 'other', 'menu', 'mobile'].includes(role)) {
        roles[role] = true;
      }
    }
  }

  const result = {};
  for (const role of Object.keys(roles)) {
    result[role] = {
      title: role,
      children: buildFolderChildren(files, `${base}/${role}`),
    };
  }

  return result;
}

/**
 * Build the children array for a folder by reading _order.json and file contents.
 *
 * _order.json entries:
 *   - string "file.json" → bookmark
 *   - object { dir: "name", title: "Display Name" } → folder
 *
 * @param {Object<string, string>} files
 * @param {string} dirPath
 * @returns {object[]}
 */
function buildFolderChildren(files, dirPath) {
  const orderPath = `${dirPath}/_order.json`;
  const orderContent = files[orderPath];
  if (!orderContent) return [];

  let order;
  try { order = JSON.parse(orderContent); } catch { return []; }
  if (!Array.isArray(order)) return [];

  const children = [];

  const processedFolders = new Set();

  for (const entry of order) {
    if (typeof entry === 'string' && entry.endsWith('.json')) {
      // Bookmark file
      const filePath = `${dirPath}/${entry}`;
      const content = files[filePath];
      if (!content) continue;
      try {
        const data = JSON.parse(content);
        children.push({ type: 'bookmark', title: data.title || '', url: data.url || '' });
      } catch { /* skip malformed */ }
    } else if (typeof entry === 'object' && entry.dir) {
      // Folder with preserved title
      const folderPath = `${dirPath}/${entry.dir}`;
      const subOrderPath = `${folderPath}/_order.json`;
      if (files[subOrderPath] !== undefined) {
        processedFolders.add(entry.dir);
        children.push({
          type: 'folder',
          title: entry.title || entry.dir,
          children: buildFolderChildren(files, folderPath),
        });
      }
    } else if (typeof entry === 'string') {
      // Legacy: plain folder name (no title)
      const folderPath = `${dirPath}/${entry}`;
      const subOrderPath = `${folderPath}/_order.json`;
      if (files[subOrderPath] !== undefined) {
        processedFolders.add(entry);
        children.push({
          type: 'folder',
          title: entry,
          children: buildFolderChildren(files, folderPath),
        });
      }
    }
  }

  // Scan for "orphan" subdirectories: folders present in fileMap but missing from _order.json.
  // Handles corrupted/manually edited _order.json or migration from older formats.
  const prefix = dirPath + '/';
  for (const path of Object.keys(files)) {
    if (!path.startsWith(prefix)) continue;
    const rel = path.substring(prefix.length);
    const parts = rel.split('/');
    if (parts.length >= 2 && parts[1] === '_order.json') {
      const folderName = parts[0];
      if (processedFolders.has(folderName)) continue;
      const folderPath = `${dirPath}/${folderName}`;
      children.push({
        type: 'folder',
        title: folderName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        children: buildFolderChildren(files, folderPath),
      });
      processedFolders.add(folderName);
    }
  }

  // Scan for "orphan" .json files not listed in _order.json.
  // This allows manually created files in the Git repo to be picked up.
  // On next push, the extension normalizes them (proper filename + _order.json entry).
  const knownFiles = new Set();
  for (const entry of order) {
    if (typeof entry === 'string') knownFiles.add(entry);
    else if (typeof entry === 'object' && entry.dir) knownFiles.add(entry.dir);
  }

  for (const path of Object.keys(files)) {
    if (!path.startsWith(dirPath + '/')) continue;
    const rel = path.substring(dirPath.length + 1);
    if (rel.includes('/')) continue; // skip files in subdirectories
    if (!rel.endsWith('.json')) continue;
    if (rel.startsWith('_')) continue; // skip _order.json, _index.json
    if (knownFiles.has(rel)) continue; // already processed via _order.json
    const content = files[path];
    if (!content) continue;
    try {
      const data = JSON.parse(content);
      if (data.url) {
        children.push({ type: 'bookmark', title: data.title || '', url: data.url });
      }
    } catch { /* skip malformed */ }
  }

  return children;
}

// ---- File map → Markdown ----

/**
 * Human-readable display names for root folder roles.
 */
const ROLE_DISPLAY_NAMES = {
  toolbar: 'Bookmarks Bar',
  other: 'Other Bookmarks',
  menu: 'Bookmarks Menu',
  mobile: 'Mobile Bookmarks',
};

/**
 * Generate a human-readable Markdown representation of bookmarks from a file map.
 * This file is included in the Git repo for readability but is not used for sync logic.
 *
 * @param {Object<string, string>} files - File map (path → content)
 * @param {string} basePath - Base directory (e.g. "bookmarks")
 * @returns {string} Markdown string
 */
export function fileMapToMarkdown(files, basePath) {
  const base = basePath.replace(/\/+$/, '');
  const lines = [];

  lines.push('# Bookmarks');
  lines.push('');
  lines.push(`> Last synced: ${new Date().toISOString()}`);
  lines.push('');

  const roles = ['toolbar', 'other', 'menu', 'mobile'];
  for (const role of roles) {
    const orderPath = `${base}/${role}/_order.json`;
    if (!(orderPath in files)) continue;

    const displayName = ROLE_DISPLAY_NAMES[role] || role;
    lines.push(`## ${displayName}`);
    lines.push('');
    renderFolderAsMarkdown(files, `${base}/${role}`, lines, 3);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Recursively render a folder's contents as Markdown.
 * @param {Object<string, string>} files
 * @param {string} dirPath
 * @param {string[]} lines
 * @param {number} headingLevel - Current heading depth for subfolders (3-6)
 */
function renderFolderAsMarkdown(files, dirPath, lines, headingLevel) {
  const orderPath = `${dirPath}/_order.json`;
  const orderContent = files[orderPath];
  if (!orderContent) return;

  let order;
  try { order = JSON.parse(orderContent); } catch { return; }
  if (!Array.isArray(order)) return;

  // Separate bookmarks and folders for nicer output (bookmarks first, then subfolders)
  const bookmarks = [];
  const folders = [];

  for (const entry of order) {
    if (typeof entry === 'string' && entry.endsWith('.json')) {
      bookmarks.push(entry);
    } else if (typeof entry === 'object' && entry.dir) {
      folders.push(entry);
    } else if (typeof entry === 'string') {
      folders.push({ dir: entry, title: entry });
    }
  }

  for (const filename of bookmarks) {
    const content = files[`${dirPath}/${filename}`];
    if (!content) continue;
    try {
      const data = JSON.parse(content);
      const title = data.title || data.url || 'Untitled';
      lines.push(`- [${title}](${data.url})`);
    } catch { /* skip */ }
  }

  if (bookmarks.length > 0 && folders.length > 0) {
    lines.push('');
  }

  for (const folder of folders) {
    const folderPath = `${dirPath}/${folder.dir}`;
    if (!((`${folderPath}/_order.json`) in files)) continue;

    const prefix = '#'.repeat(Math.min(headingLevel, 6));
    const title = folder.title || folder.dir;
    lines.push(`${prefix} ${title}`);
    lines.push('');
    renderFolderAsMarkdown(files, folderPath, lines, headingLevel + 1);
  }
}

// ---- Git tree → file map ----

/**
 * Convert a GitHub git tree (from getTree API) into a partial file map.
 * Only includes paths under basePath. Content must be fetched separately via getBlob.
 *
 * @param {Array<{path: string, type: string, sha: string}>} treeEntries
 * @param {string} basePath
 * @returns {Object<string, string>} Map of path → blob SHA (not content!)
 */
export function gitTreeToShaMap(treeEntries, basePath) {
  const base = basePath.replace(/\/+$/, '');
  const shaMap = {};

  for (const entry of treeEntries) {
    if (entry.type === 'blob' && entry.path.startsWith(base + '/')) {
      shaMap[entry.path] = entry.sha;
    }
  }

  return shaMap;
}

// ---- Legacy format support (for import/export & migration) ----

/**
 * Serialize the browser bookmark tree to the legacy single-JSON format.
 * Used for backward-compatible import/export.
 * @param {chrome.bookmarks.BookmarkTreeNode[]} bookmarkTree
 * @param {string} deviceId
 * @returns {object}
 */
export function serializeToJson(bookmarkTree, deviceId) {
  const rootChildren = bookmarkTree[0]?.children || [];
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    deviceId,
    bookmarks: rootChildren.map(node => {
      const serialized = serializeNode(node);
      serialized.role = detectRootFolderRole(node);
      return serialized;
    }),
  };
}

function serializeNode(node) {
  const s = { title: node.title, dateAdded: node.dateAdded };
  if (node.url) {
    s.type = 'bookmark';
    s.url = node.url;
  } else {
    s.type = 'folder';
    s.children = (node.children || []).map(c => serializeNode(c));
  }
  return s;
}

/**
 * Deserialize legacy JSON format.
 * @param {object} data
 * @returns {object[]}
 */
export function deserializeFromJson(data) {
  if (!data || !data.bookmarks || data.version !== 1) {
    throw new Error(getMessage('serializer_invalidFormat'));
  }
  return data.bookmarks;
}

// ---- Utility: content hash for diff detection ----

/**
 * Fast content hash (FNV-1a) for change detection.
 * @param {string} content
 * @returns {string}
 */
export function contentHash(content) {
  let h = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
