# BookHub — Architecture Overview

## High-Level Architecture

BookHub is a Chromium browser extension (Manifest V3) that bidirectionally synchronizes bookmarks with a GitHub repository. It uses a **Service Worker** as its background process, communicates via **Chrome messaging**, and interacts with the **GitHub REST API** for remote storage.

```mermaid
flowchart TB
    subgraph Browser["Chromium Browser"]
        BM["Bookmarks API"]
        Storage["chrome.storage"]
        Alarms["chrome.alarms"]
    end

    subgraph Extension["BookHub Extension"]
        BG["background.js\n(Service Worker)"]
        Popup["popup.html / popup.js"]
        Options["options.html / options.js"]
        subgraph Lib["lib/"]
            SE["sync-engine.js"]
            GH["github-api.js"]
            BS["bookmark-serializer.js"]
            I18N["i18n.js"]
        end
    end

    subgraph Remote["GitHub"]
        API["REST API\n/repos/.../contents/"]
        Repo["Repository\nbookmarks.json\nbookmarks.md\nsync_meta.json"]
    end

    Popup -- "sendMessage()" --> BG
    Options -- "sendMessage()" --> BG
    BG -- "import" --> SE
    SE -- "import" --> GH
    SE -- "import" --> BS
    SE -- "import" --> I18N
    GH -- "import" --> I18N
    BS -- "import" --> I18N
    BG -- "import" --> I18N
    BG --> BM
    BG --> Storage
    BG --> Alarms
    SE --> Storage
    GH -- "fetch()" --> API
    API --> Repo
```

## Component Descriptions

### `manifest.json`

Extension metadata and configuration. Declares:

| Field | Value |
|---|---|
| Manifest Version | 3 |
| Permissions | `bookmarks`, `storage`, `alarms` |
| Host Permissions | `https://api.github.com/*` |
| Background | Service Worker (`background.js`, ES module) |
| UI | Popup (`popup.html`), Options page (`options.html`, opens in tab) |
| i18n | `default_locale: "en"`, name/description via `__MSG_` placeholders |

### `background.js` — Service Worker

The central coordinator. Responsibilities:

- **Bookmark event listeners** — Listens to `onCreated`, `onRemoved`, `onChanged`, `onMoved` and triggers a debounced auto-push.
- **Periodic sync alarm** — Creates a `chrome.alarms` alarm to periodically run a full bidirectional sync.
- **Message handler** — Receives `sync`, `push`, `pull`, `getStatus`, `settingsChanged` actions from popup/options and delegates to the sync engine.
- **i18n initialization** — Calls `initI18n()` at startup and on install/update events.

### `popup.html` / `popup.js` — Popup UI

The extension's toolbar popup. Shows:

- Current sync status (synced, not synced, conflict)
- Last sync time (relative)
- Manual action buttons: Sync Now, Push, Pull
- Conflict resolution UI (force push / force pull)
- Auto-sync status indicator
- Link to settings

All text is translated via `data-i18n` attributes and `getMessage()`.

### `options.html` / `options.js` — Settings Page

Full-page settings UI (opens in a tab) with three tabs:

1. **Settings Tab**
   - **Language** — Dropdown for manual language selection (Auto / English / Deutsch)
   - **GitHub Connection** — Token (PAT), owner, repo, branch, file path, connection test
   - **Synchronization** — Auto-sync toggle, sync interval
2. **Import/Export Tab**
   - **Bookmarks** — Export current bookmarks as JSON; import bookmarks from JSON (replaces all local bookmarks)
   - **Settings** — Export extension settings as JSON; import settings from JSON (reloads page)
3. **About Tab** — Version info, links to GitHub repo, documentation, issues, privacy policy, and license

Settings are stored in `chrome.storage.sync`. Language changes re-translate the page instantly without reload.

### `lib/sync-engine.js` — Sync Engine

The core synchronization logic. Key exports:

| Function | Description |
|---|---|
| `push()` | Push local bookmarks to GitHub |
| `pull()` | Pull remote bookmarks from GitHub and replace local |
| `sync()` | Bidirectional sync: detect changes, push/pull/conflict |
| `debouncedPush()` | Debounced auto-push (5s default delay) |
| `getSyncStatus()` | Return current sync state for the popup |
| `isSyncInProgress()` | Re-entrancy guard |
| `getSettings()` | Load settings from `chrome.storage.sync` |
| `isConfigured()` | Check if all required settings are present |

Uses a module-level `isSyncing` flag to prevent concurrent sync operations.

### `lib/github-api.js` — GitHub API Wrapper

Wraps the GitHub Contents API (`GET/PUT /repos/{owner}/{repo}/contents/{path}`).

- Authenticates via Personal Access Token (PAT)
- Handles base64 encoding/decoding (Unicode-safe)
- Error handling for 401, 403 (rate limit), 409 (conflict), 404
- Token validation via `GET /user`
- Repository access check

### `lib/bookmark-serializer.js` — Serializer

Converts between Chrome's bookmark tree and storage formats:

- `serializeToJson()` — Chrome tree → JSON with metadata (version, deviceId, exportedAt)
- `deserializeFromJson()` — JSON → bookmark node array for recreation
- `serializeToMarkdown()` — JSON → human-readable Markdown
- `bookmarksEqual()` — Content comparison ignoring metadata

### `lib/crypto.js` — Token Encryption

Encrypts the GitHub PAT at rest using AES-256-GCM:

- `getOrCreateKey()` — generates a non-extractable CryptoKey and stores it in IndexedDB (`bookhub-keys`)
- `encryptToken()` — encrypts a plain-text token, returns `"enc:v1:<iv>:<ciphertext>"`
- `decryptToken()` — decrypts an encrypted token; handles legacy plain-text tokens transparently
- `migrateTokenIfNeeded()` — migrates plain-text tokens from `chrome.storage.sync` to encrypted `chrome.storage.local`

The token is stored **only in `chrome.storage.local`** (device-local, encrypted) and never in `chrome.storage.sync`.

### `lib/i18n.js` — Internationalization Helper

Custom i18n system for runtime language switching:

- Loads `_locales/{lang}/messages.json` dynamically via `fetch()`
- Supports "Auto (Browser)" detection and manual language selection
- `applyI18n()` translates DOM elements via `data-i18n` attributes
- `getMessage()` for dynamic strings with `$1`, `$2` substitutions
- English fallback for missing keys

## File Structure

```
BookHub/
├── manifest.json                 # Extension configuration
├── background.js                 # Service Worker (event handling, alarms)
├── popup.html                    # Popup UI markup
├── popup.js                      # Popup logic
├── popup.css                     # Popup styles
├── options.html                  # Settings page markup
├── options.js                    # Settings logic
├── options.css                   # Settings styles
├── lib/
│   ├── sync-engine.js            # Core sync logic
│   ├── github-api.js             # GitHub REST API wrapper
│   ├── bookmark-serializer.js    # Bookmark ↔ JSON/Markdown conversion
│   ├── crypto.js                 # Token encryption (AES-256-GCM)
│   └── i18n.js                   # Internationalization helper
├── _locales/
│   ├── en/messages.json          # English strings
│   └── de/messages.json          # German strings
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── .github/workflows/
│   └── release.yml               # CI: build ZIP + GitHub Release on tag
├── store-assets/                 # Chrome Web Store listing assets
├── docs/                         # Architecture documentation (this folder)
├── LICENSE                       # MIT License
├── PRIVACY.md                    # Privacy policy
└── README.md                     # User-facing documentation
```

## Technology Stack

| Layer | Technology |
|---|---|
| Extension Framework | Chrome Extension Manifest V3 |
| Background Processing | Service Worker (ES modules) |
| Chrome APIs | `chrome.bookmarks`, `chrome.storage`, `chrome.alarms`, `chrome.runtime` |
| Remote Storage | GitHub REST API v3 (Contents API) |
| Authentication | Personal Access Token (PAT) with `repo` scope |
| i18n | Custom runtime system + Chrome `_locales/` for manifest strings |
| CI/CD | GitHub Actions (`softprops/action-gh-release`) |
| Styling | Plain CSS (no frameworks) |
| JavaScript | Vanilla ES modules (no build step, no bundler) |
