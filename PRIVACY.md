# Privacy Policy for BookHub

**Last updated:** February 8, 2026

## Overview

BookHub is an open-source Chromium extension that syncs your browser bookmarks with a GitHub repository. This privacy policy explains what data BookHub accesses, how it is used, and what is **not** collected.

## Data Collected and Used

### Bookmarks

- BookHub reads your browser bookmarks using the Chrome Bookmarks API.
- Your bookmarks are serialized and sent **directly** to your own GitHub repository via the GitHub REST API.
- Bookmarks are stored as files (`bookmarks.json` and `bookmarks.md`) in a repository **you own and control**.

### GitHub Personal Access Token

- You provide a GitHub Personal Access Token (PAT) to authenticate with the GitHub API.
- The token is stored locally in your browser using the Chrome Storage API (`chrome.storage.sync`).
- The token is **only** sent to `https://api.github.com` for authentication purposes.
- The token is **never** sent to any other server or third party.

### Settings and Sync State

- Extension settings (repository name, branch, sync interval, etc.) are stored locally in your browser using `chrome.storage.sync`.
- Sync state (last sync timestamp, device ID, file SHAs) is stored locally using `chrome.storage.local`.
- A random device ID (UUID) is generated once and stored locally to identify the syncing device.

## Data NOT Collected

- **No analytics or tracking**: BookHub does not use any analytics, telemetry, or tracking tools.
- **No external servers**: BookHub does not communicate with any server other than `api.github.com`. There is no backend, no proxy, and no intermediary server.
- **No personal information**: BookHub does not collect your name, email, IP address, or any other personal information.
- **No data sharing**: Your data is never shared with, sold to, or disclosed to any third party.
- **No remote code**: BookHub does not load or execute any remote code.

## Data Storage

All data is stored locally in your browser or in your own GitHub repository. BookHub has no server-side component and no database.

## Data Deletion

- Uninstalling the extension removes all locally stored data (settings, sync state, device ID).
- Bookmarks stored in your GitHub repository remain there until you delete them manually.

## Permissions Used

| Permission | Reason |
|------------|--------|
| `bookmarks` | Read and write bookmarks for synchronization |
| `storage` | Store extension settings and sync state locally |
| `alarms` | Schedule periodic sync checks |
| `host_permissions (api.github.com)` | Communicate with the GitHub API to read/write bookmark files |

## Open Source

BookHub is fully open source. You can review the complete source code at:
https://github.com/d0dg3r/BookHub

## Contact

If you have any questions about this privacy policy, please open an issue on the GitHub repository:
https://github.com/d0dg3r/BookHub/issues

## Changes to This Policy

Any changes to this privacy policy will be reflected in this document and committed to the repository with a clear changelog.
