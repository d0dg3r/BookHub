# GitSyncMarks — Sync Logic

## Overview

GitSyncMarks implements **bidirectional bookmark synchronization** using a **three-way merge** algorithm. Each bookmark is stored as an individual JSON file. The sync engine compares three states — base (last sync), local (browser), and remote (GitHub) — to automatically merge non-conflicting changes.

## Core Concept: Three-Way Merge

```mermaid
flowchart TD
    subgraph inputs [Three States]
        Base["Base: Last sync snapshot\n(stored in chrome.storage.local)"]
        Local["Local: Current browser bookmarks\n(via chrome.bookmarks.getTree)"]
        Remote["Remote: Current GitHub tree\n(via Git Data API)"]
    end
    subgraph diff [Compute Diffs]
        LocalDiff["Local Diff:\nWhat changed locally since base?"]
        RemoteDiff["Remote Diff:\nWhat changed remotely since base?"]
    end
    subgraph merge [Merge]
        AutoMerge["Auto-merge non-conflicting changes"]
        Conflict["True conflicts:\nsame file changed differently on both sides"]
    end
    Base --> LocalDiff
    Local --> LocalDiff
    Base --> RemoteDiff
    Remote --> RemoteDiff
    LocalDiff --> AutoMerge
    RemoteDiff --> AutoMerge
    AutoMerge --> Conflict
```

## Sync Operations

### Push (Local → GitHub)

Full push of all local bookmarks as individual files using atomic commit.

```mermaid
sequenceDiagram
    participant UI as Popup_or_AutoSync
    participant SE as SyncEngine
    participant BM as Bookmarks_API
    participant GH as Git_Data_API

    UI->>SE: push()
    SE->>BM: getTree()
    SE->>SE: bookmarkTreeToFileMap()
    SE->>GH: fetchRemoteFileMap()
    SE->>SE: Compute file changes
    SE->>GH: atomicCommit(fileChanges)
    Note over GH: Creates blobs, tree, commit, updates ref
    SE->>SE: saveSyncState()
    SE-->>UI: success
```

### Pull (GitHub → Local)

Fetch remote file map, convert to bookmark tree, replace local bookmarks.

```mermaid
sequenceDiagram
    participant UI as Popup
    participant SE as SyncEngine
    participant BM as Bookmarks_API
    participant GH as Git_Data_API

    UI->>SE: pull()
    SE->>GH: fetchRemoteFileMap()
    SE->>SE: fileMapToBookmarkTree()
    SE->>BM: replaceLocalBookmarks(roleMap)
    Note over BM: Remove all children per role folder, recreate from remote
    SE->>BM: getTree() for fresh state
    SE->>SE: saveSyncState()
    SE-->>UI: success
```

### Sync (Bidirectional Three-Way Merge)

```mermaid
sequenceDiagram
    participant UI as Popup_or_Alarm
    participant SE as SyncEngine
    participant BM as Bookmarks_API
    participant GH as Git_Data_API
    participant Storage as chrome_storage

    UI->>SE: sync()
    SE->>Storage: Load base state (LAST_SYNC_FILES)
    SE->>BM: getTree() → bookmarkTreeToFileMap()
    SE->>GH: fetchRemoteFileMap()

    SE->>SE: computeDiff(base, local)
    SE->>SE: computeDiff(base, remote)

    alt No changes on either side
        SE-->>UI: "All in sync"
    else Only local changes
        SE->>GH: atomicCommit(localChanges)
    else Only remote changes
        SE->>BM: replaceLocalBookmarks()
    else Both changed
        SE->>SE: mergeDiffs(localDiff, remoteDiff)
        alt No conflicts
            SE->>BM: Apply remote changes locally
            SE->>GH: Push local changes
        else Conflicts found
            SE->>Storage: Set hasConflict = true
            SE-->>UI: "Conflict: both modified"
        end
    end
```

## Diff Computation

`computeDiff(base, current)` compares two file maps (path → content) and produces:

| Category | Meaning |
|---|---|
| **added** | Files in `current` but not in `base` |
| **removed** | Files in `base` but not in `current` |
| **modified** | Files in both but with different content |

Generated/meta files (`README.md`, `_index.json`) are excluded from diff via `filterForDiff()`.

## Merge Rules

`mergeDiffs(localDiff, remoteDiff)` applies these rules per file path:

| Local | Remote | Action |
|---|---|---|
| Added | — | Push to GitHub |
| — | Added | Create locally |
| Modified | — | Push to GitHub |
| — | Modified | Apply locally |
| Removed | — | Delete on GitHub |
| — | Removed | Delete locally |
| Same change | Same change | No action needed |
| Different change | Different change | **Conflict** |
| Removed | Removed | No action needed |

## Conflict Detection and Resolution

When `mergeDiffs` finds conflicts (same file changed differently on both sides):

1. `hasConflict` flag is set in `chrome.storage.local`
2. Popup shows conflict warning with resolution buttons:
   - **Local → GitHub** (force push) — overwrites remote
   - **GitHub → Local** (force pull) — overwrites local
3. The chosen operation clears the conflict flag

### First Sync Special Cases

When no base state exists (first sync ever):

| Local | Remote | Action |
|---|---|---|
| Has bookmarks | Empty repo | Push |
| Empty | Has data | Pull |
| Has bookmarks | Has data | Conflict (user must choose) |
| Empty | Empty | Nothing to do |

## Auto-Sync and Debounce

```
Bookmark event → triggerAutoSync() → debouncedSync(5000ms)
                                          ↓
                               clearTimeout (if pending)
                                          ↓
                               setTimeout(sync, 5000ms)
```

- Default delay: 5 seconds
- Each new event resets the timer
- Uses `sync()` (three-way merge), not just push
- Suppressed for 10 seconds after a pull (to ignore bookmark events from `replaceLocalBookmarks`)

### Re-Entrancy Guard

A module-level `isSyncing` boolean prevents concurrent operations. `background.js` also checks `isSyncInProgress()` and `isAutoSyncSuppressed()` before triggering auto-sync.

## The `replaceLocalBookmarks` Algorithm

Uses **role-based mapping** for cross-browser compatibility:

1. Get local bookmark tree via `chrome.bookmarks.getTree()`
2. Detect each root folder's role via `detectRootFolderRole()` (uses browser-specific IDs with title fallback)
3. For each role in the remote data (toolbar, other, menu, mobile):
   a. Find the matching local root folder
   b. Remove all existing children (reverse order)
   c. Recursively recreate from remote data
4. Roles not present locally are skipped (e.g., Chrome has no "menu")

## Optimized Remote Fetching

`fetchRemoteFileMap()` minimizes API calls:

1. `getLatestCommitSha()` — 1 call
2. `getCommit()` + `getTree(recursive=1)` — 2 calls → full file list with SHAs
3. For each file: compare blob SHA with stored base SHA
   - **SHA matches** → use cached content from base state (0 calls)
   - **SHA differs** → `getBlob()` (1 call per changed file)

In the common case (few files changed), this is 3 + N calls where N is the number of changed files.
