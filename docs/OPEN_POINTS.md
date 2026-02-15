# Open Points

Open items and next steps for further development. Updated each session.

---

## Current Status (v2.2.0)

- **Multiple Sync Profiles** – Implemented (profile manager, migration, CRUD, switchProfile, options UI, loading indicator)
- **Profile Onboarding** – Implemented: Test Connection checks path; offers create folder when empty, pull when bookmarks exist
- **Profile Add** – Auto-switch to new profile on add
- **Profile Switch UX** – Inline confirmation, toggle "Switch without confirmation", redesigned layout
- **Popup Overhaul** – Header with profile dropdown; simplified status area; theme-aware spinner; compact footer; shorter pull success message ("Loaded from GitHub.")

---

## Open Points

### Backup (Import/Export)

The Backup tab behavior changes with multiple profiles. Needs review and possibly adjustment:

- **Settings export/import:** Already includes profiles with decrypted tokens (see [options.js](../options.js) lines 516–636). Verify migration from legacy format and round-trip export/import.
- **Bookmark export/import:** Exports all browser bookmarks; import replaces local bookmarks. Clarify whether per-profile export (e.g. "export current profile only") is needed, and how import interacts with multiple profiles.
- **UI:** Consider indicating which profile's data is affected when importing bookmarks.

### Other (optional)

- **Profile limit:** Currently 10 profiles. Consider displaying in options.

---

## Next Steps

1. [ ] Test on Chrome, Firefox Desktop, Firefox Android
2. [ ] Prepare release branch `release/v2.2.0` (bump version in manifest, docs/RELEASE.md already updated)
3. [ ] Tag v2.2.0, publish release

---

## Usage

- When continuing: read this file as entry point.
- Move completed items to a "Done" section or remove them.
- Add new open points here.
