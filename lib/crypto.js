/**
 * Token Encryption Module
 * Encrypts/decrypts the GitHub PAT using AES-256-GCM with a
 * non-extractable CryptoKey stored in IndexedDB.
 *
 * Storage format: "enc:v1:<base64-iv>:<base64-ciphertext>"
 * Legacy plain-text tokens (no "enc:" prefix) are handled transparently.
 */

const DB_NAME = 'bookhub-keys';
const DB_VERSION = 1;
const STORE_NAME = 'keys';
const KEY_ID = 'tokenKey';
const ENC_PREFIX = 'enc:v1:';

/**
 * Open the IndexedDB database for CryptoKey storage.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get the CryptoKey from IndexedDB, or generate and store a new one.
 * The key is AES-GCM 256-bit, non-extractable.
 * @returns {Promise<CryptoKey>}
 */
async function getOrCreateKey() {
  const db = await openDB();

  // Try to load existing key
  const existing = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(KEY_ID);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (existing) {
    db.close();
    return existing;
  }

  // Generate a new key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt']
  );

  // Store it
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(key, KEY_ID);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  db.close();
  return key;
}

/**
 * Convert an ArrayBuffer to a base64 string.
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

/**
 * Convert a base64 string to a Uint8Array.
 * @param {string} base64
 * @returns {Uint8Array}
 */
function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypt a plain-text token.
 * @param {string} plaintext - The token to encrypt
 * @returns {Promise<string>} Encrypted string in format "enc:v1:<iv>:<ciphertext>"
 */
export async function encryptToken(plaintext) {
  if (!plaintext) return '';

  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return `${ENC_PREFIX}${bufferToBase64(iv)}:${bufferToBase64(ciphertext)}`;
}

/**
 * Decrypt a stored token value.
 * If the value doesn't have the "enc:" prefix, it's treated as a
 * legacy plain-text token and returned as-is.
 * @param {string} stored - The stored (possibly encrypted) token
 * @returns {Promise<string>} The decrypted plain-text token
 */
export async function decryptToken(stored) {
  if (!stored) return '';

  // Legacy plain-text token (no encryption prefix)
  if (!stored.startsWith(ENC_PREFIX)) {
    return stored;
  }

  const payload = stored.slice(ENC_PREFIX.length);
  const parts = payload.split(':');
  if (parts.length !== 2) {
    console.warn('[BookHub] Invalid encrypted token format');
    return '';
  }

  const iv = base64ToBuffer(parts[0]);
  const ciphertext = base64ToBuffer(parts[1]);
  const key = await getOrCreateKey();

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error('[BookHub] Token decryption failed:', err);
    return '';
  }
}

/**
 * Migrate a plain-text token from chrome.storage.sync to
 * encrypted storage in chrome.storage.local.
 * Removes the token from sync storage after migration.
 * @returns {Promise<boolean>} true if a migration was performed
 */
export async function migrateTokenIfNeeded() {
  const syncData = await chrome.storage.sync.get('githubToken');
  const plainToken = syncData.githubToken;

  if (!plainToken) return false;

  // Encrypt and store in local
  const encrypted = await encryptToken(plainToken);
  await chrome.storage.local.set({ githubToken: encrypted });

  // Remove plain-text token from sync
  await chrome.storage.sync.remove('githubToken');

  console.log('[BookHub] Token migrated from sync (plain) to local (encrypted)');
  return true;
}
