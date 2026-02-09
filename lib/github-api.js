/**
 * GitHub REST API Wrapper for the Contents API.
 * Handles authentication via Personal Access Token (PAT),
 * reading/writing files, and token validation.
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
