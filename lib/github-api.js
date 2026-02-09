/**
 * GitHub REST API Wrapper.
 * Includes both the Contents API (for simple operations) and the
 * Git Data API (for atomic multi-file commits via trees/blobs).
 */

import { getMessage } from './i18n.js';

const API_BASE = 'https://api.github.com';

export class GitHubAPI {
  /**
   * @param {string} token - GitHub Personal Access Token
   * @param {string} owner - Repository owner (user or org)
   * @param {string} repo - Repository name
   * @param {string} branch - Branch name (default: 'main')
   */
  constructor(token, owner, repo, branch = 'main') {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
  }

  /**
   * Build standard headers for GitHub API requests.
   * @returns {Headers}
   */
  _headers() {
    return {
      'Authorization': `token ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make a fetch request with error handling.
   * @param {string} url
   * @param {RequestInit} options
   * @returns {Promise<Response>}
   */
  async _fetch(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: this._headers(),
    });

    if (response.status === 401) {
      throw new GitHubError(getMessage('api_invalidToken'), 401);
    }
    if (response.status === 403) {
      const data = await response.json().catch(() => ({}));
      if (data.message && data.message.includes('rate limit')) {
        throw new GitHubError(getMessage('api_rateLimitExceeded'), 403);
      }
      throw new GitHubError(getMessage('api_accessDenied'), 403);
    }
    if (response.status === 409) {
      throw new GitHubError(getMessage('api_conflict'), 409);
    }

    return response;
  }

  /**
   * Validate the token by making a request to the authenticated user endpoint.
   * @returns {Promise<{valid: boolean, username: string|null, scopes: string[]}>}
   */
  async validateToken() {
    try {
      const response = await this._fetch(`${API_BASE}/user`);
      if (!response.ok) {
        return { valid: false, username: null, scopes: [] };
      }
      const data = await response.json();
      const scopes = (response.headers.get('x-oauth-scopes') || '').split(',').map(s => s.trim()).filter(Boolean);
      return {
        valid: true,
        username: data.login,
        scopes,
      };
    } catch (err) {
      return { valid: false, username: null, scopes: [] };
    }
  }

  /**
   * Check if the configured repository exists and is accessible.
   * @returns {Promise<boolean>}
   */
  async checkRepo() {
    try {
      const response = await this._fetch(`${API_BASE}/repos/${this.owner}/${this.repo}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get a file from the repository.
   * @param {string} path - File path within the repo
   * @returns {Promise<{content: string, sha: string}|null>} null if file doesn't exist
   */
  async getFile(path) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`;
    const response = await this._fetch(url);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new GitHubError(getMessage('api_errorReading', [response.status]), response.status);
    }

    const data = await response.json();
    const content = decodeBase64(data.content);

    return {
      content,
      sha: data.sha,
    };
  }

  /**
   * Create or update a file in the repository.
   * @param {string} path - File path within the repo
   * @param {string} content - File content (will be base64-encoded)
   * @param {string} message - Commit message
   * @param {string|null} sha - SHA of the existing file (null for new files)
   * @returns {Promise<{sha: string, commitSha: string}>}
   */
  async createOrUpdateFile(path, content, message, sha = null) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/contents/${path}`;

    const body = {
      message,
      content: encodeBase64(content),
      branch: this.branch,
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await this._fetch(url, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new GitHubError(
        getMessage('api_errorWriting', [errorData.message || response.status]),
        response.status
      );
    }

    const data = await response.json();
    return {
      sha: data.content.sha,
      commitSha: data.commit.sha,
    };
  }

  /**
   * Get the SHA of the latest commit on the configured branch.
   * @returns {Promise<string>}
   */
  async getLatestCommitSha() {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/git/ref/heads/${this.branch}`;
    const response = await this._fetch(url);

    if (!response.ok) {
      throw new GitHubError(getMessage('api_branchNotFound', [this.branch]), response.status);
    }

    const data = await response.json();
    return data.object.sha;
  }

  // ---- Git Data API (atomic multi-file commits) ----

  /**
   * Get the commit object for a given SHA.
   * @param {string} commitSha
   * @returns {Promise<{sha: string, treeSha: string}>}
   */
  async getCommit(commitSha) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/git/commits/${commitSha}`;
    const response = await this._fetch(url);
    if (!response.ok) {
      throw new GitHubError(`Failed to get commit ${commitSha}`, response.status);
    }
    const data = await response.json();
    return { sha: data.sha, treeSha: data.tree.sha };
  }

  /**
   * Get a tree (directory listing) recursively.
   * @param {string} treeSha - SHA of the tree
   * @returns {Promise<Array<{path: string, mode: string, type: string, sha: string, size?: number}>>}
   */
  async getTree(treeSha) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/git/trees/${treeSha}?recursive=1`;
    const response = await this._fetch(url);
    if (!response.ok) {
      throw new GitHubError(`Failed to get tree ${treeSha}`, response.status);
    }
    const data = await response.json();
    return data.tree || [];
  }

  /**
   * Get a blob (file content) by SHA.
   * @param {string} blobSha
   * @returns {Promise<string>} Decoded UTF-8 content
   */
  async getBlob(blobSha) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/git/blobs/${blobSha}`;
    const response = await this._fetch(url);
    if (!response.ok) {
      throw new GitHubError(`Failed to get blob ${blobSha}`, response.status);
    }
    const data = await response.json();
    return decodeBase64(data.content);
  }

  /**
   * Create a new blob (file) in the repository.
   * @param {string} content - UTF-8 file content
   * @returns {Promise<string>} SHA of the created blob
   */
  async createBlob(content) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/git/blobs`;
    const response = await this._fetch(url, {
      method: 'POST',
      body: JSON.stringify({ content, encoding: 'utf-8' }),
    });
    if (!response.ok) {
      throw new GitHubError('Failed to create blob', response.status);
    }
    const data = await response.json();
    return data.sha;
  }

  /**
   * Create a new tree. Uses base_tree for incremental changes.
   * Each item can add/modify (mode + type + sha) or delete (sha = null) a file.
   *
   * @param {string|null} baseTreeSha - Base tree SHA for incremental update (null for full tree)
   * @param {Array<{path: string, mode: string, type: string, sha: string|null}>} items
   * @returns {Promise<string>} SHA of the new tree
   */
  async createTree(baseTreeSha, items) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/git/trees`;
    const body = { tree: items };
    if (baseTreeSha) {
      body.base_tree = baseTreeSha;
    }
    const response = await this._fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new GitHubError(`Failed to create tree: ${err.message || response.status}`, response.status);
    }
    const data = await response.json();
    return data.sha;
  }

  /**
   * Create a new commit.
   * @param {string} message - Commit message
   * @param {string} treeSha - SHA of the tree for this commit
   * @param {string|null} parentSha - SHA of the parent commit (null for initial commit)
   * @returns {Promise<string>} SHA of the new commit
   */
  async createCommit(message, treeSha, parentSha = null) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/git/commits`;
    const body = {
      message,
      tree: treeSha,
      parents: parentSha ? [parentSha] : [],
    };
    const response = await this._fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new GitHubError('Failed to create commit', response.status);
    }
    const data = await response.json();
    return data.sha;
  }

  /**
   * Update an existing branch ref to point to a new commit.
   * @param {string} commitSha - SHA of the new commit
   * @returns {Promise<void>}
   */
  async updateRef(commitSha) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/git/refs/heads/${this.branch}`;
    const response = await this._fetch(url, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commitSha }),
    });
    if (!response.ok) {
      throw new GitHubError('Failed to update ref', response.status);
    }
  }

  /**
   * Create a new branch ref (for initial commit on an empty repo).
   * @param {string} commitSha - SHA of the commit to point to
   * @returns {Promise<void>}
   */
  async createRef(commitSha) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/git/refs`;
    const response = await this._fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${this.branch}`,
        sha: commitSha,
      }),
    });
    if (!response.ok) {
      throw new GitHubError('Failed to create ref', response.status);
    }
  }

  /**
   * Perform an atomic multi-file commit using the Git Data API.
   * Creates blobs, a new tree, a commit, and updates the branch ref.
   * Handles empty repos (no existing branch/commit) by creating the initial commit.
   *
   * @param {string} message - Commit message
   * @param {Object<string, string|null>} fileChanges - Map of path -> content (null = delete)
   * @returns {Promise<string>} SHA of the new commit
   */
  async atomicCommit(message, fileChanges) {
    // 1. Try to get current commit and tree (may not exist for empty repos)
    let currentCommitSha = null;
    let currentTreeSha = null;
    let isEmptyRepo = false;

    try {
      currentCommitSha = await this.getLatestCommitSha();
      const commit = await this.getCommit(currentCommitSha);
      currentTreeSha = commit.treeSha;
    } catch (err) {
      if (err instanceof GitHubError && (err.statusCode === 404 || err.statusCode === 409)) {
        // Empty repo — no branch/commit exists yet
        isEmptyRepo = true;
      } else {
        throw err;
      }
    }

    // 2. Create blobs for new/modified files
    const treeItems = [];
    for (const [path, content] of Object.entries(fileChanges)) {
      if (content === null) {
        if (isEmptyRepo) continue; // Can't delete from empty tree
        treeItems.push({ path, mode: '100644', type: 'blob', sha: null });
      } else {
        const blobSha = await this.createBlob(content);
        treeItems.push({ path, mode: '100644', type: 'blob', sha: blobSha });
      }
    }

    if (treeItems.length === 0) {
      return currentCommitSha; // Nothing to commit
    }

    // 3. Create new tree (incremental if we have an existing tree, full otherwise)
    const newTreeSha = await this.createTree(currentTreeSha, treeItems);

    // 4. Create commit (with parent if existing, without for initial)
    const newCommitSha = await this.createCommit(message, newTreeSha, currentCommitSha);

    // 5. Create or update branch ref
    if (isEmptyRepo) {
      await this.createRef(newCommitSha);
    } else {
      await this.updateRef(newCommitSha);
    }

    return newCommitSha;
  }
}

/**
 * Custom error class for GitHub API errors.
 */
export class GitHubError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'GitHubError';
    this.statusCode = statusCode;
  }
}

/**
 * Encode a string to base64 (handles Unicode).
 * @param {string} str
 * @returns {string}
 */
function encodeBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Decode a base64 string (handles Unicode).
 * GitHub returns content with newlines in the base64, so we strip them.
 * @param {string} base64
 * @returns {string}
 */
function decodeBase64(base64) {
  const cleaned = base64.replace(/\n/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}
