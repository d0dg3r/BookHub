# BookHub

A browser extension that bidirectionally syncs your bookmarks with a GitHub repository. Supports Chrome and Firefox.

## Features

- **Per-file storage**: Each bookmark is stored as an individual JSON file in your Git repo — human-readable and diff-friendly
- **Three-way merge**: Automatic conflict-free sync when changes happen on both sides simultaneously
- **Cross-browser**: Works with Chrome, Chromium, Brave, Edge, and Firefox
- **Auto-sync**: Automatically syncs on every bookmark change (with 5s debounce)
- **Periodic sync**: Checks for remote changes every 15 minutes (configurable)
- **Manual sync**: Push, Pull, and full Sync via popup buttons
- **Conflict detection**: Notifies you when automatic merge is not possible
- **Readable overview**: A `README.md` with all bookmarks is generated in the repo for easy browsing on GitHub
- **Automation**: Add bookmarks via Git, CLI, or GitHub Actions — the extension picks them up automatically
- **Import/Export**: Export and import bookmarks or extension settings as JSON files
- **Multilanguage**: English and German, with manual language selection
- **No server needed**: Communicates directly with the GitHub API using your Personal Access Token

## Installation

### Chrome / Chromium

1. Go to the [Releases page](https://github.com/d0dg3r/BookHub/releases)
2. Download `BookHub-vX.X.X-chrome.zip`
3. Extract the ZIP to a folder
4. Open `chrome://extensions/`, enable **Developer mode**
5. Click **Load unpacked** and select the extracted folder

### Firefox

1. Go to the [Releases page](https://github.com/d0dg3r/BookHub/releases)
2. Download `BookHub-vX.X.X-firefox.zip`
3. Open `about:debugging#/runtime/this-firefox`
4. Click **Load Temporary Add-on** and select the ZIP file

### Create a GitHub Personal Access Token

1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens/new?scopes=repo&description=BookHub+Sync)
2. Create a token with the **`repo`** scope
3. Copy the token

### Configure the extension

1. Click the extension icon in the toolbar
2. Go to **Settings**
3. Enter your **Personal Access Token**, **Repository Owner**, and **Repository Name**
4. Click **Test Connection** to verify
5. Save the settings

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
| Personal Access Token | – | GitHub PAT with `repo` scope |
| Repository Owner | – | Your GitHub username or organization |
| Repository Name | – | Name of the target repository |
| Branch | `main` | Target branch for sync |
| File Path | `bookmarks` | Base folder in the repository |
| Auto-Sync | On | Automatically sync on bookmark changes |
| Sync Interval | 15 min | How often to check for remote changes |

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
- **Debounced auto-sync**: Multiple rapid changes bundled into a single sync (5s)
- **Token encryption**: AES-256-GCM at rest in `chrome.storage.local`
- **Custom i18n**: Runtime language switching without page reload

## Requirements

- Chrome, Chromium, Brave, Edge, or Firefox
- GitHub account with a repository for bookmarks
- Personal Access Token with `repo` scope

## License

[MIT](LICENSE)
