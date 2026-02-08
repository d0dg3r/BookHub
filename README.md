# BookHub

A Chromium extension that bidirectionally syncs your bookmarks with a GitHub repository.

## Features

- **Bidirectional sync**: Bookmarks are synced between your browser and GitHub
- **Auto-sync**: Automatically pushes on every bookmark change (with 5s debounce)
- **Periodic pull**: Checks for remote changes every 15 minutes (configurable)
- **Manual sync**: Push, Pull, and full Sync via popup buttons
- **Conflict detection**: Notifies you when both local and remote bookmarks were modified
- **Dual format**: Bookmarks are stored as JSON (for sync) and Markdown (human-readable on GitHub)
- **No server needed**: Everything runs directly via the GitHub REST API with your Personal Access Token

## Installation

### Option A: Download a release (recommended)

1. Go to the [Releases page](https://github.com/d0dg3r/BookHub/releases)
2. Download the latest `BookHub-vX.X.X.zip`
3. Extract the ZIP to a folder
4. Open Chromium/Chrome and navigate to `chrome://extensions/`
5. Enable **Developer mode** (toggle in the top right)
6. Click **Load unpacked**
7. Select the extracted folder

### Option B: Clone the repository (for developers)

```bash
git clone git@github.com:d0dg3r/BookHub.git
cd BookHub
```

1. Open Chromium/Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `BookHub` folder

### Create a GitHub Personal Access Token

1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens/new?scopes=repo&description=BookHub+Sync)
2. Create a token with the **`repo`** scope
3. Copy the token

### Configure the extension

1. Click the extension icon in the toolbar
2. Go to **Settings**
3. Enter your **Personal Access Token**, **Repository Owner** (your GitHub username), and **Repository Name**
4. Click **Test Connection** to verify everything works
5. Save the settings

### First sync

1. Click the extension icon
2. Click **Sync Now**
3. Your bookmarks will be pushed to your GitHub repository as `bookmarks/bookmarks.json` and `bookmarks/bookmarks.md`

## Files in the GitHub Repository

After the first sync, you'll find the following files in your repository:

```
bookmarks/
  bookmarks.json     # Structured JSON of all bookmarks
  bookmarks.md       # Human-readable Markdown overview
  sync_meta.json     # Sync metadata (timestamp, device)
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Personal Access Token | – | GitHub PAT with `repo` scope |
| Repository Owner | – | Your GitHub username or organization |
| Repository Name | – | Name of the target repository |
| Branch | `main` | Target branch for sync files |
| File Path | `bookmarks` | Folder in the repository |
| Auto-Sync | On | Automatically push on bookmark changes |
| Sync Interval | 15 min | How often to check for remote changes |

## Conflict Resolution

If you modify bookmarks on two devices simultaneously, a conflict may occur:

1. The extension icon shows a **!** badge
2. Open the popup
3. Choose:
   - **Local → GitHub**: Your local bookmarks overwrite the remote version
   - **GitHub → Local**: The remote version overwrites your local bookmarks

## Technical Details

- **Manifest V3** Chrome Extension
- **Service Worker** for background sync
- **GitHub Contents API** for file operations
- **SHA-based conflict detection**: If the SHA doesn't match on push, remote was modified
- **Debounce**: Multiple rapid bookmark changes are bundled into a single sync (5s)

## Requirements

- Chromium-based browser (Chrome, Chromium, Brave, Edge, etc.)
- GitHub account with a repository for bookmarks
- Personal Access Token with `repo` scope

## License

[MIT](LICENSE)
