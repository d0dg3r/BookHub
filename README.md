<p align="center">
  <img src="icons/icon128.png" alt="GitSyncMarks Logo" width="128" height="128">
</p>

<h1 align="center">GitSyncMarks</h1>

<p align="center">
  <a href="https://github.com/d0dg3r/GitSyncMarks/releases"><img src="https://img.shields.io/github/v/release/d0dg3r/GitSyncMarks" alt="Release"></a>
  <a href="https://github.com/d0dg3r/GitSyncMarks/releases?q=pre"><img src="https://img.shields.io/github/v/release/d0dg3r/GitSyncMarks?include_prereleases&label=pre-release&logo=github&style=flat-square" alt="Pre-release"></a>
  <a href="https://chromewebstore.google.com/detail/kogijidhfkoibgihpiaiippajhgdgmif"><img src="https://img.shields.io/badge/Chrome_Web_Store-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome Web Store"></a>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/gitsyncmarks/"><img src="https://img.shields.io/badge/Firefox_Add-on-FF7139?style=flat-square&logo=firefoxbrowser&logoColor=white" alt="Firefox Add-on"></a>
</p>

<p align="center">
  A browser extension that bidirectionally syncs your bookmarks with a GitHub repository.<br>
  Supports Chrome and Firefox.
</p>

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes. See [ROADMAP.md](ROADMAP.md) for planned features.

## Features

- **Per-file storage**: Each bookmark is stored as an individual JSON file in your Git repo — human-readable and diff-friendly
- **Three-way merge**: Automatic conflict-free sync when changes happen on both sides simultaneously
- **Cross-browser**: Works with Chrome, Chromium, Brave, Edge, and Firefox
- **Auto-sync**: Automatically syncs on every bookmark change (configurable debounce)
- **Multiple profiles**: Work and personal bookmark sets with separate GitHub repos; switch between profiles; each profile has its own sync state
- **Sync profiles**: Real-time, frequent, normal, or power-save presets; optional sync on browser start or focus
- **Theme**: Light, dark, or auto (follow system) in options and popup
- **Periodic sync**: Checks for remote changes at configurable intervals (1–120 minutes)
- **Manual sync**: Push, Pull, and full Sync via popup buttons
- **Conflict detection**: Notifies you when automatic merge is not possible
- **Readable overview**: A `README.md` with all bookmarks is generated in the repo for easy browsing on GitHub
- **Automation**: Add bookmarks via Git, CLI, or GitHub Actions — the extension picks them up automatically
- **Import/Export**: Export and import bookmarks or extension settings as JSON files
- **Multilanguage**: English, German, French, and Spanish, with manual language selection
- **No server needed**: Communicates directly with the GitHub API using your Personal Access Token

## Installation

### Chrome / Chromium

1. Go to the [Releases page](https://github.com/d0dg3r/GitSyncMarks/releases)
2. Download `GitSyncMarks-vX.X.X-chrome.zip` (or a pre-release build for testing)
3. Extract the ZIP to a folder
4. Open `chrome://extensions/`, enable **Developer mode**
5. Click **Load unpacked** and select the extracted folder

### Firefox

1. Go to the [Releases page](https://github.com/d0dg3r/GitSyncMarks/releases)
2. Download `GitSyncMarks-vX.X.X-firefox.zip` (or a pre-release build for testing)
3. Open `about:debugging#/runtime/this-firefox`
4. Click **Load Temporary Add-on** and select the ZIP file

### Create a GitHub Personal Access Token

1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens/new?scopes=repo&description=GitSyncMarks+Sync)
2. Create a token with the **`repo`** scope
3. Copy the token

### Configure the extension

1. Click the extension icon in the toolbar
2. Go to **Settings** (GitHub tab)
3. Select a **Profile** (or add one with + Add)
4. Enter your **Personal Access Token**, **Repository Owner**, and **Repository Name**
5. Click **Test Connection** to verify. If the folder does not exist yet, you can create it; if bookmarks are already in the repo, you can pull them
6. Save the settings

### First sync

1. Click the extension icon
2. Click **Sync Now**
3. Your bookmarks will be pushed to your GitHub repository as individual files

## Files in the GitHub Repository

After the first sync, your repository will contain:

```
bookmarks/
  _index.json                     # Metadata (format version)
  README.md                       # Human-readable overview (auto-generated)
  toolbar/
    _order.json                   # Ordering of bookmarks and subfolders
    github_a1b2.json             # { "title": "GitHub", "url": "https://github.com" }
    stackoverflow_c3d4.json
    dev-tools/
      _order.json
      mdn-web-docs_e5f6.json
  other/
    _order.json
    ...
```

Each bookmark is a simple JSON file:
```json
{
  "title": "GitHub",
  "url": "https://github.com"
}
```

## Automation

You can add bookmarks directly in the Git repo — just create a `.json` file with `title` and `url` in any bookmark folder. The extension picks it up on the next sync and normalizes the filename and ordering automatically.

A **GitHub Action** workflow (`.github/workflows/add-bookmark.yml`) is included for adding bookmarks via CLI or the GitHub web UI:

```bash
gh workflow run add-bookmark.yml \
  -f url="https://example.com" \
  -f title="Example" \
  -f folder="toolbar"
```

See the **Automation** tab in the extension settings for details.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Profile | Default | Active bookmark profile (each has its own GitHub repo config) |
| Personal Access Token | – | GitHub PAT with `repo` scope |
| Repository Owner | – | Your GitHub username or organization |
| Repository Name | – | Name of the target repository |
| Branch | `main` | Target branch for sync |
| File Path | `bookmarks` | Base folder in the repository |
| Auto-Sync | On | Automatically sync on bookmark changes |
| Sync Profile | Normal | Real-time / frequent / normal / power-save / custom |
| Sync Interval | 15 min | How often to check for remote changes (custom profile) |
| Sync on Start | Off | Sync when the browser starts |
| Sync on Focus | Off | Sync when the browser gains focus |
| Switch without confirmation | Off | Skip confirmation when changing profiles |

## Conflict Resolution

If both local and remote bookmarks changed and cannot be merged automatically:

1. The extension icon shows a **!** badge
2. Open the popup
3. Choose:
   - **Local → GitHub**: Your local bookmarks overwrite the remote version
   - **GitHub → Local**: The remote version overwrites your local bookmarks

## Technical Details

- **Manifest V3** browser extension (Chrome + Firefox)
- **Per-file bookmark storage**: One JSON file per bookmark, directory structure mirrors folder hierarchy
- **GitHub Git Data API** for atomic multi-file commits (blobs, trees, commits, refs)
- **Three-way merge**: Base vs Local vs Remote comparison with per-file diff
- **Role-based folder mapping**: Cross-browser root folder detection (toolbar, other, menu, mobile)
- **Debounced auto-sync**: Multiple rapid changes bundled into a single sync (configurable, 2–10s by profile)
- **Token encryption**: AES-256-GCM at rest in `chrome.storage.local`
- **Custom i18n**: Runtime language switching without page reload

## Requirements

- Chrome, Chromium, Brave, Edge, or Firefox
- GitHub account with a repository for bookmarks
- Personal Access Token with `repo` scope

## License

[MIT](LICENSE)
