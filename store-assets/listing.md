# Store Listings — BookHub

Reference file for both the **Chrome Web Store** and **Firefox Add-ons (AMO)** listings.

---

## Chrome Web Store

### Name
BookHub

### Summary (max 132 characters)
Your bookmarks, safe on GitHub — per-file storage, three-way merge sync, works on Chrome & Firefox. No server needed.

### Detailed Description
BookHub syncs your browser bookmarks with a GitHub repository — bidirectionally, automatically, and without any external server.

Features:
• Per-file storage: each bookmark is an individual JSON file — human-readable and diff-friendly
• Three-way merge: automatic conflict-free sync when changes happen on both sides
• Cross-browser: works with Chrome, Chromium, Brave, Edge, and Firefox
• Auto-sync on every bookmark change (with 5-second debounce)
• Periodic sync every 15 minutes to detect remote changes (configurable)
• Manual Push, Pull, and full Sync via the popup
• Conflict detection when automatic merge is not possible
• A README.md with all bookmarks is generated in the repo for easy browsing
• Automation: add bookmarks via Git, CLI, or GitHub Actions — no browser needed
• Import/Export: back up and restore bookmarks or settings as JSON files
• Multilanguage: English and German with manual language selection
• No external server — communicates directly with the GitHub API using your Personal Access Token

How it works:
1. Create a GitHub repository for your bookmarks
2. Generate a Personal Access Token with the "repo" scope
3. Configure BookHub with your token and repository
4. Click "Sync Now" — done!

Each bookmark is stored as an individual JSON file in your repository, organized into folders that mirror your bookmark hierarchy. A README.md gives you a clean overview directly on GitHub.

Automation:
You can add bookmarks without even opening the browser. BookHub includes a GitHub Actions workflow (add-bookmark.yml) that lets you add bookmarks via the GitHub web UI or the command line:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

You can also create bookmark files directly in the repository — just add a JSON file with "title" and "url" to any bookmark folder. The extension detects new files automatically on the next sync and normalizes them into its canonical format.

BookHub is fully open source: https://github.com/d0dg3r/BookHub

### Category
Productivity

### Language
English

---

## Firefox AMO

### Name
BookHub

### Summary (max 250 characters)
Sync your bookmarks with GitHub — per-file storage, three-way merge, auto-sync. Add bookmarks via Git, CLI, or GitHub Actions. Open source, no server needed.

### Detailed Description
BookHub syncs your Firefox bookmarks with a GitHub repository — bidirectionally, automatically, and without any external server.

Features:
• Per-file storage: each bookmark is an individual JSON file — human-readable and diff-friendly
• Three-way merge: automatic conflict-free sync when changes happen on both sides
• Full Firefox support including the Bookmarks Menu folder
• Auto-sync on every bookmark change (with 5-second debounce)
• Periodic sync every 15 minutes to detect remote changes (configurable)
• Manual Push, Pull, and full Sync via the popup
• Conflict detection when automatic merge is not possible
• A README.md with all bookmarks is generated in the repo for easy browsing
• Automation: add bookmarks via Git, CLI, or GitHub Actions — no browser needed
• Import/Export: back up and restore bookmarks or settings as JSON files
• Multilanguage: English and German with manual language selection
• No external server — communicates directly with the GitHub API using your Personal Access Token

How it works:
1. Create a GitHub repository for your bookmarks
2. Generate a Personal Access Token with the "repo" scope
3. Configure BookHub with your token and repository
4. Click "Sync Now" — done!

Each bookmark is stored as an individual JSON file in your repository, organized into folders that mirror your Firefox bookmark hierarchy (Bookmarks Toolbar, Bookmarks Menu, Other Bookmarks, Mobile Bookmarks). A README.md gives you a clean overview directly on GitHub.

Automation:
You can add bookmarks without even opening Firefox. BookHub includes a GitHub Actions workflow (add-bookmark.yml) that lets you add bookmarks via the GitHub web UI or the command line:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

You can also create bookmark files directly in the repository — just add a JSON file with "title" and "url" to any bookmark folder. The extension detects new files automatically on the next sync.

BookHub is fully open source: https://github.com/d0dg3r/BookHub

### Categories
Bookmarks

### Tags
bookmarks, sync, github, backup, automation

---

## Privacy (both stores)

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

## Test Instructions (both stores)

### Username
*(leave empty)*

### Password
*(leave empty)*

### Additional Instructions

No shared account needed. Create a GitHub PAT at github.com/settings/tokens (repo scope), create an empty repo, then enter both in the extension settings. Click "Sync Now" to test.

---

## Distribution

### Visibility
Public

### Regions
All regions

---

## Store Assets Checklist

### Chrome Web Store
- [ ] `store-assets/icon128-store.png` — 128x128px store icon
- [ ] `store-assets/promo-small.png` — 440x280px small promo tile
- [x] `store-assets/screenshot-chrome-settings.png` — "Settings: GitHub connection, sync options"
- [x] `store-assets/screenshot-chrome-import-export.png` — "Import/Export: backup and restore bookmarks/settings"
- [x] `store-assets/screenshot-chrome-automation.png` — "Automation: Git file format, GitHub Action, CLI usage"
- [x] `store-assets/screenshot-chrome-about.png` — "About: version, links, license"

### Firefox AMO
- [x] `store-assets/screenshot-firefox-settings.png` — "Settings: Configure your GitHub connection, Personal Access Token, repository, branch, and sync interval."
- [x] `store-assets/screenshot-firefox-import-export.png` — "Import/Export: Back up and restore your bookmarks or extension settings as JSON files."
- [x] `store-assets/screenshot-firefox-automation.png` — "Automation: Add bookmarks via Git, CLI, or GitHub Actions. Includes file format reference and CLI examples."
- [x] `store-assets/screenshot-firefox-about.png` — "About: Version info, links to repository, documentation, bug tracker, and privacy policy."
