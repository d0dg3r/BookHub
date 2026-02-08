/**
 * Bookmark Serializer
 * Converts Chrome bookmark trees to JSON and Markdown formats,
 * and deserializes JSON back to a bookmark tree structure.
 */

/**
 * Serialize the Chrome bookmark tree to a JSON object with metadata.
 * @param {chrome.bookmarks.BookmarkTreeNode[]} bookmarkTree - The full bookmark tree from chrome.bookmarks.getTree()
 * @param {string} deviceId - Unique device identifier
 * @returns {object} Serialized bookmark data with metadata
 */
export function serializeToJson(bookmarkTree, deviceId) {
  const rootChildren = bookmarkTree[0]?.children || [];

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    deviceId: deviceId,
    bookmarks: rootChildren.map(node => serializeNode(node)),
  };
}

/**
 * Recursively serialize a single bookmark node.
 * @param {chrome.bookmarks.BookmarkTreeNode} node
 * @returns {object}
 */
function serializeNode(node) {
  const serialized = {
    title: node.title,
    dateAdded: node.dateAdded,
  };

  if (node.url) {
    // It's a bookmark (leaf)
    serialized.type = 'bookmark';
    serialized.url = node.url;
  } else {
    // It's a folder
    serialized.type = 'folder';
    serialized.children = (node.children || []).map(child => serializeNode(child));
  }

  return serialized;
}

/**
 * Deserialize JSON data back into a structure that can be used
 * to recreate the bookmark tree via the Chrome Bookmarks API.
 * @param {object} data - The JSON data (as returned by serializeToJson)
 * @returns {object[]} Array of bookmark nodes
 */
export function deserializeFromJson(data) {
  if (!data || !data.bookmarks || data.version !== 1) {
    throw new Error('Ungültiges Bookmark-Datenformat.');
  }
  return data.bookmarks;
}

/**
 * Serialize bookmark data to a human-readable Markdown string.
 * @param {object} data - The JSON data (as returned by serializeToJson)
 * @returns {string} Markdown-formatted string
 */
export function serializeToMarkdown(data) {
  const lines = [];
  lines.push('# Bookmarks');
  lines.push('');
  lines.push(`> Zuletzt synchronisiert: ${data.exportedAt}`);
  lines.push(`> Gerät: \`${data.deviceId}\``);
  lines.push('');

  const bookmarks = data.bookmarks || [];
  for (const node of bookmarks) {
    renderNodeAsMarkdown(node, lines, 2);
  }

  return lines.join('\n');
}

/**
 * Recursively render a bookmark node as Markdown.
 * @param {object} node - Serialized bookmark node
 * @param {string[]} lines - Array of output lines
 * @param {number} headingLevel - Current heading level for folders (2-6)
 */
function renderNodeAsMarkdown(node, lines, headingLevel) {
  if (node.type === 'folder') {
    const prefix = '#'.repeat(Math.min(headingLevel, 6));
    lines.push(`${prefix} ${node.title || '(Ohne Titel)'}`);
    lines.push('');

    const children = node.children || [];
    // First render bookmarks (leaves), then subfolders
    const bookmarks = children.filter(c => c.type === 'bookmark');
    const folders = children.filter(c => c.type === 'folder');

    for (const bm of bookmarks) {
      renderNodeAsMarkdown(bm, lines, headingLevel + 1);
    }

    if (bookmarks.length > 0 && folders.length > 0) {
      lines.push('');
    }

    for (const folder of folders) {
      renderNodeAsMarkdown(folder, lines, headingLevel + 1);
    }
  } else if (node.type === 'bookmark') {
    const title = node.title || node.url;
    lines.push(`- [${title}](${node.url})`);
  }
}

/**
 * Compare two serialized bookmark JSON objects to check if they differ in content.
 * Ignores metadata like exportedAt and deviceId.
 * @param {object} a - First bookmark data
 * @param {object} b - Second bookmark data
 * @returns {boolean} true if the bookmark content is the same
 */
export function bookmarksEqual(a, b) {
  if (!a || !b) return false;
  return JSON.stringify(a.bookmarks) === JSON.stringify(b.bookmarks);
}
