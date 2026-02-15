# Chrome Web Store — GitSyncMarks

---

## English (EN)

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
• GitHub Repos folder: optional folder with bookmarks to all your GitHub repositories (public and private)
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

## Deutsch (DE)

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
• GitHub-Repos-Ordner: optionaler Ordner mit Lesezeichen zu allen deinen GitHub-Repositories (öffentlich und privat)
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

## Français (FR)

### Name
GitSyncMarks

### Summary (max 132 characters)
Vos favoris, en sécurité sur GitHub — stockage par fichier, synchronisation à fusion triple, Chrome et Firefox. Pas de serveur requis.

### Detailed Description
GitSyncMarks synchronise vos favoris de navigateur avec un dépôt GitHub — bidirectionnel, automatique et sans serveur externe.

Fonctionnalités :
• Stockage par fichier : chaque favori est un fichier JSON individuel — lisible et adapté au diff
• Fusion triple : synchronisation automatique sans conflit lorsque des changements surviennent des deux côtés
• Multi-navigateur : fonctionne avec Chrome, Chromium, Brave, Edge et Firefox
• Plusieurs profils de favoris : travail et personnel avec des dépôts GitHub séparés ; le changement remplace les favoris locaux
• Dossier Repos GitHub : dossier optionnel avec des favoris vers tous vos dépôts GitHub (publics et privés)
• Intégration : créer le dossier ou récupérer les favoris lors de la configuration d'un nouveau profil
• Profils de sync : temps réel, fréquent, normal ou économie d'énergie (intervalles prédéfinis)
• Auto-sync à chaque modification de favori (délai configurable par profil)
• Sync périodique pour détecter les changements distants (1–120 minutes, configurable)
• Push, Pull et Sync complet manuels via le popup
• Détection des conflits lorsque la fusion automatique est impossible
• Un README.md avec tous les favoris est généré dans le dépôt pour une navigation facile
• Automatisation : ajouter des favoris via Git, CLI ou GitHub Actions — sans ouvrir le navigateur
• Import/Export : sauvegarder et restaurer les favoris ou les paramètres en JSON (interface claire avec sélection de fichier)
• Thème : clair, sombre ou auto (système) pour les options et le popup
• Multilingue : anglais, allemand, français et espagnol avec sélection manuelle de la langue
• Pas de serveur externe — communique directement avec l'API GitHub via votre Personal Access Token

Comment ça marche :
1. Créez un dépôt GitHub pour vos favoris
2. Générez un Personal Access Token avec le scope « repo »
3. Configurez GitSyncMarks avec votre token et le dépôt
4. Cliquez sur « Synchroniser maintenant » — terminé !

Chaque favori est stocké comme un fichier JSON individuel dans votre dépôt, organisé en dossiers qui reflètent la hiérarchie de vos favoris. Un README.md vous donne une vue d'ensemble directement sur GitHub.

Automatisation :
Vous pouvez ajouter des favoris sans ouvrir le navigateur. GitSyncMarks inclut un workflow GitHub Actions (add-bookmark.yml) pour ajouter des favoris via l'interface web GitHub ou la ligne de commande :

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Exemple" -f folder="toolbar"

Vous pouvez aussi créer des fichiers de favoris directement dans le dépôt — ajoutez simplement un fichier JSON avec « title » et « url » dans un dossier de favoris. L'extension détecte les nouveaux fichiers au prochain sync et les normalise.

GitSyncMarks est entièrement open source : https://github.com/d0dg3r/GitSyncMarks

### Category
Productivité

### Language
Français

---

## Español (ES)

### Name
GitSyncMarks

### Summary (max 132 characters)
Tus marcadores, seguros en GitHub — almacenamiento por archivo, sincronización de fusión triple, Chrome y Firefox. Sin servidor.

### Detailed Description
GitSyncMarks sincroniza tus marcadores del navegador con un repositorio GitHub — bidireccional, automáticamente y sin ningún servidor externo.

Características:
• Almacenamiento por archivo: cada marcador es un archivo JSON individual — legible y apto para diff
• Fusión triple: sincronización automática sin conflictos cuando hay cambios en ambos lados
• Multi-navegador: funciona con Chrome, Chromium, Brave, Edge y Firefox
• Múltiples perfiles de marcadores: trabajo y personal con repos GitHub separados; el cambio reemplaza los marcadores locales
• Carpeta Repos GitHub: carpeta opcional con marcadores a todos tus repositorios GitHub (públicos y privados)
• Integración: crear carpeta o importar marcadores al configurar un nuevo perfil
• Perfiles de sync: tiempo real, frecuente, normal o ahorro de energía (intervalos predefinidos)
• Auto-sync en cada cambio de marcador (retardo configurable por perfil)
• Sync periódico para detectar cambios remotos (1–120 minutos, configurable)
• Push, Pull y Sync completo manuales desde el popup
• Detección de conflictos cuando la fusión automática no es posible
• Un README.md con todos los marcadores se genera en el repositorio para navegar fácilmente
• Automatización: añadir marcadores vía Git, CLI o GitHub Actions — sin abrir el navegador
• Importar/Exportar: respaldar y restaurar marcadores o ajustes en JSON (interfaz clara con selector de archivo)
• Tema: claro, oscuro o auto (sistema) para opciones y popup
• Multilingüe: inglés, alemán, francés y español con selección manual del idioma
• Sin servidor externo — se comunica directamente con la API de GitHub usando tu Personal Access Token

Cómo funciona:
1. Crea un repositorio GitHub para tus marcadores
2. Genera un Personal Access Token con el scope « repo »
3. Configura GitSyncMarks con tu token y el repositorio
4. Haz clic en « Sincronizar ahora » — ¡listo!

Cada marcador se almacena como un archivo JSON individual en tu repositorio, organizado en carpetas que reflejan la jerarquía de tus marcadores. Un README.md te ofrece una visión general directamente en GitHub.

Automatización:
Puedes añadir marcadores sin abrir el navegador. GitSyncMarks incluye un workflow de GitHub Actions (add-bookmark.yml) para añadir marcadores vía la interfaz web de GitHub o la línea de comandos:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Ejemplo" -f folder="toolbar"

También puedes crear archivos de marcadores directamente en el repositorio — solo añade un archivo JSON con « title » y « url » en una carpeta de marcadores. La extensión detecta los nuevos archivos en la próxima sincronización y los normaliza.

GitSyncMarks es totalmente open source: https://github.com/d0dg3r/GitSyncMarks

### Category
Productividad

### Language
Español

---

## Privacy

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
| `notifications` | Required to show sync success or failure notifications (user-configurable). |
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

## Test Instructions

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

**Screenshots** are auto-generated. Run `npm run screenshots` (see [docs/TESTING.md](../docs/TESTING.md#store-screenshots)).

- [ ] `store-assets/icon128-store.png` — 128x128px store icon
- [ ] `store-assets/promo-small.png` — 440x280px small promo tile

### English (EN)
- [x] `en/chrome-github.png` — GitHub tab: Personal Access Token, repository owner/name, branch, file path, test connection
- [x] `en/chrome-settings.png` — Synchronization tab
- [x] `en/chrome-import-export.png` — Backup tab
- [x] `en/chrome-automation.png` — Automation tab
- [x] `en/chrome-help.png` — Help tab
- [x] `en/chrome-dialog.png` — Popup

### Deutsch (DE)
- [x] `de/chrome-github.png` — GitHub-Tab
- [x] `de/chrome-settings.png` — Synchronisierung-Tab
- [x] `de/chrome-import-export.png` — Backup-Tab
- [x] `de/chrome-automation.png` — Automatisierung-Tab
- [x] `de/chrome-help.png` — Hilfe-Tab
- [x] `de/chrome-dialog.png` — Popup

### Français (FR)
- [x] `fr/chrome-github.png` — Onglet GitHub
- [x] `fr/chrome-settings.png` — Onglet Synchronisation
- [x] `fr/chrome-import-export.png` — Onglet Sauvegarde
- [x] `fr/chrome-automation.png` — Onglet Automatisation
- [x] `fr/chrome-help.png` — Onglet Aide
- [x] `fr/chrome-dialog.png` — Popup

### Español (ES)
- [x] `es/chrome-github.png` — Pestaña GitHub
- [x] `es/chrome-settings.png` — Pestaña Sincronización
- [x] `es/chrome-import-export.png` — Pestaña Copia de seguridad
- [x] `es/chrome-automation.png` — Pestaña Automatización
- [x] `es/chrome-help.png` — Pestaña Ayuda
- [x] `es/chrome-dialog.png` — Popup
