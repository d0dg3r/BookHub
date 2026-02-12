# GitSyncMarks — Data Formats and Data Flow

## Overview

GitSyncMarks stores each bookmark as an individual JSON file in a Git repository. The directory structure mirrors the bookmark folder hierarchy. Synchronization uses the GitHub Git Data API for atomic multi-file commits.

## Data Flow: Push

```mermaid
flowchart LR
    subgraph Browser
        BM["chrome.bookmarks\n.getTree()"]
    end

    subgraph Serialization
        FM["bookmarkTreeToFileMap()"]
        MD["fileMapToMarkdown()"]
    end

    subgraph GitDataAPI["GitHub Git Data API"]
        Blobs["POST /git/blobs"]
        Tree["POST /git/trees"]
        Commit["POST /git/commits"]
        Ref["PATCH /git/refs"]
    end

    subgraph Repo["GitHub Repository"]
        Files["bookmarks/toolbar/*.json\nbookmarks/other/*.json\nbookmarks/README.md"]
    end

    BM --> FM
    FM --> MD
    FM --> Blobs
    MD --> Blobs
    Blobs --> Tree
    Tree --> Commit
    Commit --> Ref
    Ref --> Files
```

## Data Flow: Pull

```mermaid
flowchart RL
    subgraph Repo["GitHub Repository"]
        Files["Per-file bookmarks"]
    end

    subgraph GitDataAPI["GitHub Git Data API"]
        TreeGet["GET /git/trees\n(recursive)"]
        BlobGet["GET /git/blobs"]
    end

    subgraph Conversion
        FMT["fileMapToBookmarkTree()"]
    end

    subgraph Browser
        BM["replaceLocalBookmarks()\nchrome.bookmarks API"]
    end

    Files --> TreeGet
    TreeGet --> BlobGet
    BlobGet --> FMT
    FMT --> BM
```

## File Formats

### Bookmark File (e.g. `github_a1b2.json`)

Each bookmark is a minimal JSON file:

```json
{
  "title": "GitHub",
  "url": "https://github.com"
}
```

Filename format: `{slug-from-title}_{4-char-hash-from-url}.json`

The hash (FNV-1a of the URL, base-36) ensures uniqueness. The slug makes files human-readable.

### `_order.json` — Folder Ordering

Each folder contains an `_order.json` that defines the order of its children:

```json
[
  "github_a1b2.json",
  "stackoverflow_c3d4.json",
  {"dir": "dev-tools", "title": "Dev Tools"}
]
```

Entries are either:
- **String**: A bookmark filename
- **Object**: A subfolder with `dir` (directory name) and `title` (original display name)

Files not listed in `_order.json` (e.g., manually created) are picked up automatically and appended at the end.

### `_index.json` — Metadata

```json
{
  "version": 2
}
```

### `README.md` — Human-Readable Overview

Auto-generated on every push. Shows all bookmarks as Markdown with folder headings. Not used for sync — purely informational.

```markdown
# Bookmarks

> Last synced: 2026-02-09T15:30:00.000Z

## Bookmarks Bar

- [GitHub](https://github.com)
- [Stack Overflow](https://stackoverflow.com)

### Dev Tools

- [MDN Web Docs](https://developer.mozilla.org)

## Other Bookmarks
```

### Complete Repository Structure

```
bookmarks/
  _index.json
  README.md
  toolbar/
    _order.json
    github_a1b2.json
    stackoverflow_c3d4.json
    dev-tools/
      _order.json
      mdn-web-docs_e5f6.json
  other/
    _order.json
    ...
  menu/                          (Firefox only)
    _order.json
    ...
  mobile/
    _order.json
    ...
```

Root folders are mapped by role:
| Role | Chrome | Firefox |
|---|---|---|
| `toolbar` | Bookmarks Bar (ID: `1`) | Bookmarks Toolbar (`toolbar_____`) |
| `other` | Other Bookmarks (ID: `2`) | Unfiled Bookmarks (`unfiled_____`) |
| `menu` | — | Bookmarks Menu (`menu________`) |
| `mobile` | Mobile Bookmarks (ID: `3`) | Mobile Bookmarks (`mobile______`) |

## Local Storage

### `chrome.storage.sync` — User Settings

| Key | Type | Default | Description |
|---|---|---|---|
| `repoOwner` | `string` | `""` | Repository owner |
| `repoName` | `string` | `""` | Repository name |
| `branch` | `string` | `"main"` | Git branch |
| `filePath` | `string` | `"bookmarks"` | Base path in repo |
| `autoSync` | `boolean` | `true` | Auto-sync enabled |
| `syncInterval` | `number` | `15` | Sync interval (minutes) |
| `language` | `string` | `"auto"` | UI language |

### `chrome.storage.local` — Sync State + Token

| Key | Type | Description |
|---|---|---|
| `githubToken` | `string` | Encrypted PAT (`enc:v1:<iv>:<ciphertext>`) |
| `deviceId` | `string` | UUID for this device |
| `lastSyncFiles` | `object` | `{ [path]: { sha, content } }` — snapshot at last sync |
| `lastCommitSha` | `string` | Git commit SHA at last sync |
| `lastSyncTime` | `string` | ISO 8601 timestamp of last sync |
| `hasConflict` | `boolean` | Whether a conflict was detected |

The `lastSyncFiles` object is the **base state** for three-way merge. It maps each file path to its blob SHA (for remote change detection) and content (for local change detection).

## GitHub Git Data API Interaction

All sync operations use the **Git Data API** for atomic multi-file commits:

### Reading the Remote State

```
GET /repos/{owner}/{repo}/git/ref/heads/{branch}     → commitSha
GET /repos/{owner}/{repo}/git/commits/{commitSha}     → treeSha
GET /repos/{owner}/{repo}/git/trees/{treeSha}?recursive=1  → all files + SHAs
GET /repos/{owner}/{repo}/git/blobs/{blobSha}         → file content (base64)
```

### Writing (Atomic Multi-File Commit)

```
POST /repos/{owner}/{repo}/git/blobs                  → create file blob
POST /repos/{owner}/{repo}/git/trees                  → create new tree (incremental)
POST /repos/{owner}/{repo}/git/commits                → create commit
PATCH /repos/{owner}/{repo}/git/refs/heads/{branch}   → update branch
```

For empty repos (no branch yet), `POST /git/refs` creates the initial branch.

### Efficiency

A typical sync with few changes:
- 3 API calls to read (ref + commit + tree)
- N calls to fetch changed blob contents
- M calls to create new blobs
- 3 calls to write (tree + commit + ref update)

Total: ~6 + N + M calls, regardless of total bookmark count.

## Token Encryption

The GitHub PAT is encrypted at rest using AES-256-GCM:

1. Non-extractable `CryptoKey` generated once and stored in IndexedDB
2. Encrypted as `"enc:v1:<base64-iv>:<base64-ciphertext>"` in `chrome.storage.local`
3. Decrypted transparently on load; legacy plain-text tokens handled gracefully
4. Token never stored in `chrome.storage.sync`
