# BookHub — Data Formats and Data Flow

## Overview

BookHub converts browser bookmarks into two file formats (JSON and Markdown), stores them on GitHub, and manages synchronization state locally. This document describes every data format and how data flows through the system.

## Data Flow: Push

```mermaid
flowchart LR
    subgraph Browser
        BM["chrome.bookmarks\n.getTree()"]
    end

    subgraph Serialization
        JSON["serializeToJson()\n→ bookmarks.json"]
        MD["serializeToMarkdown()\n→ bookmarks.md"]
        META["sync_meta.json"]
    end

    subgraph GitHub["GitHub Repository"]
        GJ["bookmarks/bookmarks.json"]
        GM["bookmarks/bookmarks.md"]
        GS["bookmarks/sync_meta.json"]
    end

    BM --> JSON
    JSON --> MD
    JSON --> META
    JSON -->|"PUT Contents API"| GJ
    MD -->|"PUT Contents API"| GM
    META -->|"PUT Contents API"| GS
```

## Data Flow: Pull

```mermaid
flowchart RL
    subgraph GitHub["GitHub Repository"]
        GJ["bookmarks/bookmarks.json"]
    end

    subgraph Deserialization
        DS["deserializeFromJson()"]
    end

    subgraph Browser
        BM["chrome.bookmarks\n.create() / .removeTree()"]
    end

    GJ -->|"GET Contents API"| DS
    DS -->|"replaceLocalBookmarks()"| BM
```

## File Formats

### `bookmarks.json` — Machine-Readable Bookmark Data

This is the **primary data file** used for synchronization. It contains the full bookmark tree with metadata.

```json
{
  "version": 1,
  "exportedAt": "2026-02-08T15:30:00.000Z",
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "bookmarks": [
    {
      "title": "Bookmarks Bar",
      "dateAdded": 1700000000000,
      "type": "folder",
      "children": [
        {
          "title": "GitHub",
          "dateAdded": 1700000001000,
          "type": "bookmark",
          "url": "https://github.com"
        },
        {
          "title": "Dev Tools",
          "dateAdded": 1700000002000,
          "type": "folder",
          "children": [
            {
              "title": "MDN Web Docs",
              "dateAdded": 1700000003000,
              "type": "bookmark",
              "url": "https://developer.mozilla.org"
            }
          ]
        }
      ]
    },
    {
      "title": "Other Bookmarks",
      "dateAdded": 1700000000000,
      "type": "folder",
      "children": []
    }
  ]
}
```

#### Schema

| Field | Type | Description |
|---|---|---|
| `version` | `number` | Data format version (currently `1`) |
| `exportedAt` | `string` (ISO 8601) | Timestamp of export |
| `deviceId` | `string` (UUID) | Unique device identifier |
| `bookmarks` | `array` | Top-level bookmark folders |

#### Bookmark Node Schema

| Field | Type | Present in | Description |
|---|---|---|---|
| `title` | `string` | Both | Display name |
| `dateAdded` | `number` | Both | Chrome's `dateAdded` timestamp (ms since epoch) |
| `type` | `string` | Both | `"bookmark"` or `"folder"` |
| `url` | `string` | Bookmarks only | The URL |
| `children` | `array` | Folders only | Nested bookmark nodes |

### `bookmarks.md` — Human-Readable Markdown

Generated alongside the JSON for easy browsing on GitHub. **Not used for synchronization** — purely informational.

```markdown
# Bookmarks

> Last synced: 2026-02-08T15:30:00.000Z
> Device: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

## Bookmarks Bar

- [GitHub](https://github.com)

### Dev Tools

- [MDN Web Docs](https://developer.mozilla.org)

## Other Bookmarks
```

#### Formatting rules

- Top-level folders → `## Heading`
- Subfolders → `###`, `####`, etc. (up to `######`)
- Bookmarks → `- [title](url)` list items
- Bookmarks are rendered before subfolders within each folder
- Untitled folders show as `(Untitled)`

### `sync_meta.json` — Sync Metadata

Lightweight metadata file for quick reference.

```json
{
  "lastSync": "2026-02-08T15:30:00.000Z",
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "version": 1
}
```

## Local Storage

BookHub uses two Chrome storage areas:

### `chrome.storage.sync` — User Settings

Synced across the user's Chrome instances. Contains:

| Key | Type | Default | Description |
|---|---|---|---|
| `repoOwner` | `string` | `""` | Repository owner |
| `repoName` | `string` | `""` | Repository name |
| `branch` | `string` | `"main"` | Git branch |
| `filePath` | `string` | `"bookmarks"` | Base path in repo |
| `autoSync` | `boolean` | `true` | Auto-sync enabled |
| `syncInterval` | `number` | `15` | Sync interval in minutes |
| `language` | `string` | `"auto"` | UI language (`"auto"`, `"en"`, `"de"`, ...) |

**Note**: The GitHub token is **not** stored here. It was moved to `chrome.storage.local` (encrypted) in v1.5.0 for security. A migration function (`migrateTokenIfNeeded()`) automatically encrypts and moves any legacy plain-text token found in sync storage.

### `chrome.storage.local` — Sync State + Encrypted Token

Device-local, not synced. Contains:

| Key | Type | Description |
|---|---|---|
| `githubToken` | `string` | **Encrypted** GitHub PAT (format: `enc:v1:<iv>:<ciphertext>`) |
| `deviceId` | `string` (UUID) | Unique identifier for this device |
| `lastRemoteShaJson` | `string` \| `null` | SHA of `bookmarks.json` on GitHub |
| `lastRemoteShaMd` | `string` \| `null` | SHA of `bookmarks.md` on GitHub |
| `lastRemoteShaMeta` | `string` \| `null` | SHA of `sync_meta.json` on GitHub |
| `lastSyncTime` | `string` (ISO 8601) \| `null` | Timestamp of last successful sync |
| `lastSyncData` | `string` (JSON) \| `null` | Serialized bookmark JSON from last sync |
| `hasConflict` | `boolean` | Whether a conflict was detected |

The `lastSyncData` field is critical for **change detection**: it stores the JSON-serialized bookmarks as they were at the last successful sync. Both local and remote states are compared against this snapshot.

### Token Encryption

The GitHub PAT is encrypted at rest using **AES-256-GCM**:

1. A **non-extractable** `CryptoKey` is generated once per device via `crypto.subtle.generateKey()` and stored in IndexedDB (`bookhub-keys`).
2. On save, the token is encrypted with a random 12-byte IV and stored as `"enc:v1:<base64-iv>:<base64-ciphertext>"` in `chrome.storage.local`.
3. On load, the token is decrypted transparently. Legacy plain-text tokens (without the `enc:` prefix) are recognized and returned as-is, then migrated on next save.

The token never leaves the device in encrypted or plain form via `chrome.storage.sync`. On a new device, the user must re-enter the token. Settings export/import handles the token by decrypting it for export and re-encrypting on import.

## GitHub Contents API Interaction

All file operations use the **GitHub Contents API**:

### Reading a file

```
GET /repos/{owner}/{repo}/contents/{path}?ref={branch}
```

Response includes:
- `content` — Base64-encoded file content
- `sha` — Git blob SHA (needed for updates)

### Creating or updating a file

```
PUT /repos/{owner}/{repo}/contents/{path}
```

Request body:
```json
{
  "message": "Bookmark sync from device a1b2c3d4 - 2026-02-08T15:30:00.000Z",
  "content": "<base64-encoded content>",
  "branch": "main",
  "sha": "<current file SHA, required for updates>"
}
```

The `sha` field is **required** when updating an existing file. If the SHA doesn't match the current file on GitHub (someone else updated it), the API returns **409 Conflict**.

### Base64 Encoding

The GitHub API requires content in Base64. BookHub uses Unicode-safe encoding/decoding:

- **Encode**: `TextEncoder` → byte array → `String.fromCharCode` → `btoa()`
- **Decode**: `atob()` → byte array → `TextDecoder`

This correctly handles non-ASCII characters (e.g., bookmark titles in German, Japanese, etc.).

### Authentication

All requests include:
```
Authorization: token {PAT}
Accept: application/vnd.github.v3+json
```

The PAT requires the `repo` scope for read/write access to repository contents.

## Data Comparison

The `bookmarksEqual(a, b)` function compares two serialized bookmark objects:

```javascript
JSON.stringify(a.bookmarks) === JSON.stringify(b.bookmarks)
```

This comparison:
- **Includes**: All bookmark titles, URLs, folder structures, ordering, `dateAdded`
- **Ignores**: `exportedAt`, `deviceId`, `version` (metadata)

This means a sync won't be triggered just because the timestamp or device ID changed — only actual bookmark content changes matter.
