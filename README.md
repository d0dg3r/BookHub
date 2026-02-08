# BookHub

Chromium-Extension, die deine Bookmarks bidirektional mit einem GitHub-Repository synchronisiert.

## Features

- **Bidirektionale Synchronisation**: Bookmarks werden zwischen Browser und GitHub abgeglichen
- **Automatischer Sync**: Bei jeder Bookmark-Änderung wird automatisch gepusht (mit 5s Debounce)
- **Periodischer Pull**: Alle 15 Minuten (konfigurierbar) wird nach Remote-Änderungen geprüft
- **Manueller Sync**: Push, Pull und Full-Sync per Button im Popup
- **Konflikt-Erkennung**: Wenn lokal und remote gleichzeitig geändert wird, wirst du informiert
- **Dual-Format**: Bookmarks werden als JSON (für Sync) und Markdown (zum Lesen auf GitHub) gespeichert
- **Kein Server nötig**: Alles läuft direkt über die GitHub REST API mit deinem Personal Access Token

## Installation

### 1. Repository klonen

```bash
git clone git@github.com:d0dg3r/BookHub.git
cd BookHub
```

### 2. Extension in Chromium laden

1. Öffne Chromium/Chrome und navigiere zu `chrome://extensions/`
2. Aktiviere den **Entwicklermodus** (Toggle oben rechts)
3. Klicke auf **Entpackte Erweiterung laden**
4. Wähle den Ordner `BookHub` aus

### 3. GitHub Personal Access Token erstellen

1. Gehe zu [GitHub Settings > Tokens](https://github.com/settings/tokens/new?scopes=repo&description=Bookmark+Sync)
2. Erstelle einen Token mit dem Scope **`repo`**
3. Kopiere den Token

### 4. Extension konfigurieren

1. Klicke auf das Extension-Icon in der Toolbar
2. Gehe zu **Einstellungen**
3. Gib deinen **Personal Access Token**, den **Repository-Besitzer** (dein GitHub-Username) und den **Repository-Namen** ein
4. Klicke auf **Verbindung testen** um alles zu prüfen
5. Speichere die Einstellungen

### 5. Erstmalige Synchronisation

1. Klicke auf das Extension-Icon
2. Klicke auf **Jetzt synchronisieren**
3. Deine Bookmarks werden als `bookmarks/bookmarks.json` und `bookmarks/bookmarks.md` in dein GitHub-Repository gepusht

## Dateien im GitHub-Repository

Nach dem ersten Sync findest du folgende Dateien in deinem Repository:

```
bookmarks/
  bookmarks.json     # Strukturiertes JSON aller Bookmarks
  bookmarks.md       # Menschenlesbare Markdown-Übersicht
  sync_meta.json     # Sync-Metadaten (Zeitstempel, Gerät)
```

## Konfiguration

| Einstellung | Standard | Beschreibung |
|-------------|----------|--------------|
| Personal Access Token | – | GitHub PAT mit `repo`-Scope |
| Repository-Besitzer | – | Dein GitHub-Username oder Organisation |
| Repository-Name | – | Name des Ziel-Repositories |
| Branch | `main` | Ziel-Branch für die Sync-Dateien |
| Dateipfad | `bookmarks` | Ordner im Repository |
| Auto-Sync | An | Automatisch bei Bookmark-Änderungen pushen |
| Sync-Intervall | 15 Min | Wie oft nach Remote-Änderungen geprüft wird |

## Konfliktauflösung

Wenn du Bookmarks auf zwei Geräten gleichzeitig änderst, kann ein Konflikt entstehen:

1. Das Extension-Icon zeigt ein **!** Badge
2. Öffne das Popup
3. Wähle:
   - **Lokal → GitHub**: Deine lokalen Bookmarks überschreiben die Remote-Version
   - **GitHub → Lokal**: Die Remote-Version überschreibt deine lokalen Bookmarks

## Technische Details

- **Manifest V3** Chrome Extension
- **Service Worker** für Background-Sync
- **GitHub Contents API** für Datei-Operationen
- **SHA-basierte Konflikterkennung**: Stimmt der SHA beim Push nicht überein, wurde remote geändert
- **Debounce**: Mehrere schnelle Bookmark-Änderungen werden zu einem Sync zusammengefasst (5s)

## Voraussetzungen

- Chromium-basierter Browser (Chrome, Chromium, Brave, Edge, etc.)
- GitHub-Account mit einem Repository für die Bookmarks
- Personal Access Token mit `repo`-Scope

## Lizenz

MIT
