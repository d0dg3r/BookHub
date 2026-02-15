# Store Listings — GitSyncMarks

Reference file for both the **Chrome Web Store** and **Firefox Add-ons (AMO)** listings.

---

## Chrome Web Store

### Name
GitSyncMarks

### Summary (max 132 characters)
Your bookmarks, safe on GitHub — per-file storage, three-way merge sync, works on Chrome & Firefox. No server needed.

### Detailed Description
GitSyncMarks syncs your browser bookmarks with a GitHub repository — bidirectionally, automatically, and without any external server.

Features:
• Per-file storage: each bookmark is an individual JSON file — human-readable and diff-friendly
• Three-way merge: automatic conflict-free sync when changes happen on both sides
• Cross-browser: works with Chrome, Chromium, Brave, Edge, and Firefox
• Multiple bookmark profiles: work and personal sets with separate GitHub repos; switch replaces local bookmarks
• Onboarding: create folder or pull bookmarks when configuring a new profile
• Sync profiles: real-time, frequent, normal, or power-save (preset intervals and debounce)
• Auto-sync on every bookmark change (debounce configurable per profile)
• Periodic sync to detect remote changes (1–120 minutes, configurable)
• Manual Push, Pull, and full Sync via the popup
• Conflict detection when automatic merge is not possible
• A README.md with all bookmarks is generated in the repo for easy browsing
• Automation: add bookmarks via Git, CLI, or GitHub Actions — no browser needed
• Import/Export: back up and restore bookmarks or settings as JSON files (clear UI with file picker)
• Theme: light, dark, or auto (system) for options and popup
• Multilanguage: English, German, French, and Spanish with manual language selection
• No external server — communicates directly with the GitHub API using your Personal Access Token

How it works:
1. Create a GitHub repository for your bookmarks
2. Generate a Personal Access Token with the "repo" scope
3. Configure GitSyncMarks with your token and repository
4. Click "Sync Now" — done!

Each bookmark is stored as an individual JSON file in your repository, organized into folders that mirror your bookmark hierarchy. A README.md gives you a clean overview directly on GitHub.

Automation:
You can add bookmarks without even opening the browser. GitSyncMarks includes a GitHub Actions workflow (add-bookmark.yml) that lets you add bookmarks via the GitHub web UI or the command line:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

You can also create bookmark files directly in the repository — just add a JSON file with "title" and "url" to any bookmark folder. The extension detects new files automatically on the next sync and normalizes them into its canonical format.

GitSyncMarks is fully open source: https://github.com/d0dg3r/GitSyncMarks

### Category
Productivity

### Language
English

---

## Chrome Web Store (German / Deutsch)

### Name
GitSyncMarks

### Summary (max 132 characters)
Deine Lesezeichen, sicher auf GitHub — Einzeldatei-Speicherung, Drei-Wege-Merge, funktioniert mit Chrome & Firefox. Kein Server nötig.

### Detailed Description
GitSyncMarks synchronisiert deine Browser-Lesezeichen mit einem GitHub-Repository — bidirektional, automatisch und ohne externen Server.

Funktionen:
• Einzeldatei-Speicherung: Jedes Lesezeichen ist eine eigene JSON-Datei — lesbar und diff-freundlich
• Drei-Wege-Merge: automatische konfliktfreie Synchronisierung bei Änderungen auf beiden Seiten
• Cross-Browser: funktioniert mit Chrome, Chromium, Brave, Edge und Firefox
• Mehrere Lesezeichen-Profile: Arbeit und Privat mit getrennten GitHub-Repos; Wechsel ersetzt lokale Lesezeichen
• Onboarding: Ordner anlegen oder Lesezeichen laden beim Konfigurieren eines neuen Profils
• Sync-Profile: Echtzeit, häufig, normal oder Stromsparen (vorkonfigurierte Intervalle)
• Auto-Sync bei jeder Lesezeichen-Änderung (Verzögerung pro Profil konfigurierbar)
• Periodischer Sync zur Erkennung von Remote-Änderungen (1–120 Min., konfigurierbar)
• Manuelles Push, Pull und Sync über das Popup
• Konflikterkennung, wenn automatisches Mergen nicht möglich ist
• Eine README.md mit allen Lesezeichen wird im Repository generiert
• Automatisierung: Lesezeichen über Git, CLI oder GitHub Actions hinzufügen — ohne Browser
• Import/Export: Lesezeichen oder Einstellungen als JSON-Dateien sichern und wiederherstellen (klare UI mit Dateiauswahl)
• Design: Hell, Dunkel oder Auto (System) für Einstellungen und Popup
• Mehrsprachig: Englisch, Deutsch, Französisch und Spanisch mit manueller Sprachauswahl
• Kein externer Server — kommuniziert direkt mit der GitHub API über deinen Personal Access Token

So funktioniert es:
1. Erstelle ein GitHub-Repository für deine Lesezeichen
2. Generiere einen Personal Access Token mit dem Scope „repo"
3. Konfiguriere GitSyncMarks mit deinem Token und Repository
4. Klicke auf „Jetzt synchronisieren" — fertig!

Jedes Lesezeichen wird als einzelne JSON-Datei in deinem Repository gespeichert, organisiert in Ordnern, die deine Lesezeichen-Hierarchie widerspiegeln. Eine README.md bietet dir eine übersichtliche Darstellung direkt auf GitHub.

Automatisierung:
Du kannst Lesezeichen hinzufügen, ohne den Browser zu öffnen. GitSyncMarks enthält einen GitHub Actions Workflow (add-bookmark.yml), mit dem du Lesezeichen über die GitHub-Oberfläche oder die Kommandozeile hinzufügen kannst:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Beispiel" -f folder="toolbar"

Du kannst auch Lesezeichen-Dateien direkt im Repository erstellen — füge einfach eine JSON-Datei mit „title" und „url" in einen Lesezeichen-Ordner ein. Die Extension erkennt neue Dateien beim nächsten Sync automatisch und normalisiert sie in das kanonische Format.

GitSyncMarks ist vollständig Open Source: https://github.com/d0dg3r/GitSyncMarks

### Category
Produktivität

### Language
Deutsch

---

## Firefox AMO

### Name
GitSyncMarks

### Summary (max 250 characters)
Sync your Firefox bookmarks with GitHub — bidirectionally, conflict-free. Per-file JSON storage, three-way merge, auto-sync. Full support for Bookmarks Toolbar, Menu, and Mobile. Add bookmarks via Git, CLI, or GitHub Actions. Open source, no external server.

### Detailed Description
GitSyncMarks syncs your Firefox bookmarks with a GitHub repository — bidirectionally, automatically, and without any external server.

Features:
• Per-file storage: each bookmark is an individual JSON file — human-readable and diff-friendly
• Three-way merge: automatic conflict-free sync when changes happen on both sides
• Full Firefox support including the Bookmarks Menu folder
• Multiple bookmark profiles: work and personal sets with separate GitHub repos; switch replaces local bookmarks
• Onboarding: create folder or pull bookmarks when configuring a new profile
• Sync profiles: real-time, frequent, normal, or power-save
• Auto-sync on every bookmark change (debounce configurable per profile)
• Periodic sync to detect remote changes (1–120 minutes, configurable)
• Manual Push, Pull, and full Sync via the popup
• Conflict detection when automatic merge is not possible
• A README.md with all bookmarks is generated in the repo for easy browsing
• Automation: add bookmarks via Git, CLI, or GitHub Actions — no browser needed
• Import/Export: back up and restore bookmarks or settings as JSON files (clear UI with file picker)
• Theme: light, dark, or auto (system) for options and popup
• Multilanguage: English, German, French, and Spanish with manual language selection
• No external server — communicates directly with the GitHub API using your Personal Access Token

How it works:
1. Create a GitHub repository for your bookmarks
2. Generate a Personal Access Token with the "repo" scope
3. Configure GitSyncMarks with your token and repository
4. Click "Sync Now" — done!

Each bookmark is stored as an individual JSON file in your repository, organized into folders that mirror your Firefox bookmark hierarchy (Bookmarks Toolbar, Bookmarks Menu, Other Bookmarks, Mobile Bookmarks). A README.md gives you a clean overview directly on GitHub.

Automation:
You can add bookmarks without even opening Firefox. GitSyncMarks includes a GitHub Actions workflow (add-bookmark.yml) that lets you add bookmarks via the GitHub web UI or the command line:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

You can also create bookmark files directly in the repository — just add a JSON file with "title" and "url" to any bookmark folder. The extension detects new files automatically on the next sync.

GitSyncMarks is fully open source: https://github.com/d0dg3r/GitSyncMarks

### Categories
Bookmarks

### Tags
bookmarks, sync, github, backup, automation

---

## Privacy (both stores)

### Single Purpose
Sync browser bookmarks with a GitHub repository.

### Privacy Policy URL
https://github.com/d0dg3r/GitSyncMarks/blob/main/PRIVACY.md

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

**Screenshots** are auto-generated. Run `npm run screenshots` (see [docs/TESTING.md](../docs/TESTING.md#store-screenshots)). Manually update only if the script fails or you need custom captures.

### Chrome Web Store
- [ ] `store-assets/icon128-store.png` — 128x128px store icon
- [ ] `store-assets/promo-small.png` — 440x280px small promo tile
- [x] `store-assets/screenshot-chrome-github.png` — "GitHub tab: Personal Access Token, repository owner/name, branch, file path, test connection"
- [x] `store-assets/screenshot-chrome-settings.png` — "Synchronization tab: auto-sync toggle, sync profile (real-time/frequent/normal/power-save), sync on start, sync on focus"
- [x] `store-assets/screenshot-chrome-import-export.png` — "Backup tab: export/import bookmarks, export/import settings (JSON), file picker"
- [x] `store-assets/screenshot-chrome-automation.png` — "Automation tab: add bookmarks via Git, JSON file format, GitHub Action workflow, CLI examples"
- [x] `store-assets/screenshot-chrome-help.png` — "Help tab: keyboard shortcuts, main features (popup, profiles, auto-sync, conflicts)"
- [x] `store-assets/screenshot-chrome-dialog.png` — "Popup: sync status, Sync Now, Push, Pull, auto-sync indicator, links to Settings/GitHub/Report issue"

### Chrome Web Store (German / Deutsch)
- [x] `store-assets/screenshot-chrome-de-github.png` — "GitHub-Tab: Personal Access Token, Repository-Besitzer/Name, Branch, Dateipfad, Verbindung testen"
- [x] `store-assets/screenshot-chrome-de-settings.png` — "Synchronisierung-Tab: Auto-Sync, Sync-Profil (Echtzeit/häufig/normal/Stromsparen), Sync beim Start, Sync bei Fokus"
- [x] `store-assets/screenshot-chrome-de-import-export.png` — "Backup-Tab: Lesezeichen exportieren/importieren, Einstellungen exportieren/importieren (JSON), Dateiauswahl"
- [x] `store-assets/screenshot-chrome-de-automation.png` — "Automatisierung-Tab: Lesezeichen über Git hinzufügen, JSON-Dateiformat, GitHub Action Workflow, CLI-Beispiele"
- [x] `store-assets/screenshot-chrome-de-help.png` — "Hilfe-Tab: Tastaturkürzel, wichtigste Funktionen (Popup, Profile, Auto-Sync, Konflikte)"
- [x] `store-assets/screenshot-chrome-de-dialog.png` — "Popup: Sync-Status, Jetzt synchronisieren, Push, Pull, Auto-Sync-Anzeige, Links zu Einstellungen/GitHub/Problem melden"

### Firefox AMO
- [x] `store-assets/screenshot-firefox-settings.png` — "GitHub tab: Personal Access Token, repository owner/name, branch, file path"
- [x] `store-assets/screenshot-firefox-import-export.png` — "Backup tab: Export/import bookmarks and settings as JSON files, file picker"
- [x] `store-assets/screenshot-firefox-automation.png` — "Automation tab: Add bookmarks via Git, JSON file format, GitHub Action, CLI examples"
- [x] `store-assets/screenshot-firefox-help.png` — "Help tab: Keyboard shortcuts, main features (popup, profiles, auto-sync, conflicts)"
- [x] `store-assets/screenshot-firefox-about.png` — "About tab: Version, links to GitHub repository, documentation, bug tracker, privacy policy, license"
