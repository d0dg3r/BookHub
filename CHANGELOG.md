# Changelog

All notable changes to GitSyncMarks are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Multiple profiles**: Work and personal bookmark sets with separate GitHub repos; up to 10 profiles; switching replaces local bookmarks with the selected profile's data
- **Onboarding**: Test Connection checks the target path; offers to create the folder structure when empty, or to pull existing bookmarks when found
- **Profile Add**: When adding a new profile, automatically switch to it for immediate configuration
- **Spinner**: Loading indicators during profile switch and Test Connection

### Changed

- **Profile switch**: Inline confirmation instead of `confirm()`; optional toggle "Switch without confirmation"
- **Profile layout**: Redesigned Profile card (label, dropdown, actions, toggle, inline confirmation)
- **Popup**: Restructured layout — profile dropdown in header; simplified status area (status line + meta); theme-aware spinner; compact footer; auto-sync and countdown on one line
- **Pull success message**: Shortened to "Loaded from GitHub." / "Von GitHub geladen."

## [2.1.2] - 2025-02-13

### Added

- **Store buttons in README**: Chrome Web Store and Firefox Add-on badges with direct links
- **Testing guide** ([docs/TESTING.md](docs/TESTING.md)): Instructions for Chrome, Firefox desktop, and Firefox Android

### Changed

- **Responsive mobile layout** for Firefox Android: Popup and options page adapt to narrow viewports; tab bar scrolls horizontally; header stacks on small screens

## [2.1.1] - TBD

### Changed

- **New icon**: Updated logo (blue bookmark + green sync arrow on black background) across extension, store assets, and favicons

## [2.1.0] - 2025-02-10

### Added

- **Sync profiles**: Presets for real-time (1 min), frequent (5 min), normal (15 min), and power-save (60 min) sync — each with tuned debounce delay
- **Custom sync profile**: Manual interval and debounce settings
- **Sync on browser start**: Optional automatic sync when the browser starts
- **Sync when browser gains focus**: Optional sync when switching back to the browser (with 60s cooldown)
- **Commit link in popup**: Last commit hash shown as a clickable link to GitHub
- **Next sync countdown**: Countdown timer until the next periodic sync (when auto-sync is on)
- **Theme selector**: Light, dark, or auto (system) — applies to options page and popup
- **Pre-release workflow**: Tags like `v2.1.0-pre.1`, `v2.1.0-alpha.1`, `v2.1.0-beta.1`, `v2.1.0-rc.1` create GitHub Pre-releases
- **Language selector** in options header (moved from Settings tab)

### Changed

- **Project renamed**: BookHub → GitSyncMarks
- **Firefox**: New extension ID `gitsyncmarks@d0dg3r` — existing Firefox users must uninstall the old extension and install the new one
- **IndexedDB migration**: Automatic migration from `bookhub-keys` to `gitsyncmarks-keys` — existing users keep their token without re-entering it
- **Options tabs**: Reorganized into GitHub, Synchronization, Backup, Automation, About
- **Backup tab**: Redesigned with clearer block layout, descriptions per action, file picker with chosen filename display
- **Last data change**: Popup shows "Last data change" instead of "Last sync" when changes were pushed
- **Debounce**: Configurable per profile; max-wait cap prevents indefinite deferral (30s or 6× debounce)
- **package.json**: Version kept in sync with manifest for releases

## [2.0.1] - TBD

### Fixed

- False merge conflicts when two devices edit the same folder concurrently (`_order.json` content-level merge)
- Hardened GitHub Action inputs for automation workflow
- Updated Firefox manifest and i18n
- Updated store screenshots

## [2.0.0] - TBD

### Added

- Per-file bookmark storage (one JSON file per bookmark)
- Three-way merge sync
- Firefox support
- Automation via GitHub Actions
- Cross-browser build system

## [1.5.0] - TBD

### Added

- Token encryption at rest (AES-256-GCM)
- Token moved to local storage

## [1.4.0] - TBD

### Added

- Tabbed options page
- Import/export of bookmarks
- GitHub project links
- Improved description

## [1.3.0] - TBD

### Added

- Multilanguage support (i18n) with manual language selection

## [1.2.0] - TBD

### Added

- Chrome Web Store preparation
- Privacy policy

## [1.1.0] - TBD

### Added

- Open source (MIT license)
- English translation

## [1.0.0] - TBD

### Added

- Initial release: bookmark sync with GitHub

[Unreleased]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.1.2...HEAD
[2.1.1]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v1.5.0...v2.0.0
[1.5.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/d0dg3r/GitSyncMarks/releases/tag/v1.0.0
