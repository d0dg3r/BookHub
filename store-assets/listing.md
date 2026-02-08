# Chrome Web Store Listing - BookHub

Use this file as a reference when filling out the Chrome Developer Dashboard.

---

## Store Listing Tab

### Name
BookHub

### Summary (max 132 characters)
Sync your browser bookmarks bidirectionally with a GitHub repository. Auto-sync, conflict detection, and Markdown export included.

### Detailed Description
BookHub syncs your browser bookmarks with a GitHub repository — bidirectionally, automatically, and without any external server.

Features:
• Bidirectional sync between your browser and GitHub
• Auto-sync on every bookmark change (with 5-second debounce)
• Periodic pull every 15 minutes to detect remote changes (configurable)
• Manual Push, Pull, and full Sync via the popup
• Conflict detection when both local and remote bookmarks were modified
• Dual format: bookmarks stored as JSON (for sync) and Markdown (human-readable on GitHub)
• No external server — communicates directly with the GitHub API using your Personal Access Token

How it works:
1. Create a GitHub repository for your bookmarks
2. Generate a Personal Access Token with the "repo" scope
3. Configure BookHub with your token and repository
4. Click "Sync Now" — done!

Your bookmarks are stored as bookmarks.json and bookmarks.md in your repository. The Markdown file gives you a clean, readable overview of all your bookmarks directly on GitHub.

BookHub is fully open source: https://github.com/d0dg3r/BookHub

### Category
Productivity

### Language
English

---

## Privacy Tab

### Single Purpose
Sync browser bookmarks with a GitHub repository.

### Privacy Policy URL
https://github.com/d0dg3r/BookHub/blob/main/PRIVACY.md

### Permission Justifications

| Permission | Justification |
|------------|---------------|
| `bookmarks` | Required to read and write the user's bookmarks for synchronization with GitHub. |
| `storage` | Required to store extension settings (token, repo config) and sync state (timestamps, SHAs) locally in the browser. |
| `alarms` | Required to schedule periodic background sync checks for remote changes. |
| `host_permissions: https://api.github.com/*` | Required to communicate with the GitHub REST API to read and write bookmark files in the user's repository. |

### Data Use Disclosure

**Does your extension collect or transmit user data?**
Yes — the extension reads the user's bookmarks and transmits them to the GitHub API (api.github.com) to store them in the user's own repository.

**What data is collected?**
- Browser bookmarks (titles, URLs, folder structure)

**Is data transmitted to any server?**
- Only to api.github.com, authenticated with the user's own Personal Access Token
- No other servers, no analytics, no tracking

**Is data sold or transferred to third parties?**
No.

---

## Distribution Tab

### Visibility
Public

### Regions
All regions

---

## Store Assets Checklist

- [ ] `store-assets/icon128-store.png` — 128x128px store icon (upload in Store Listing)
- [ ] `store-assets/screenshot-1.png` — 1280x800px popup screenshot
- [ ] `store-assets/screenshot-2.png` — 1280x800px settings screenshot
- [ ] `store-assets/promo-small.png` — 440x280px small promo tile
