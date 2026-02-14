# Open Points

Open items and next steps for further development. Updated each session.

---

## Current Status (develop/2.2.0)

- **Multiple Sync Profiles** – Implemented:
  - Profile manager, migration, CRUD, switchProfile
  - Sync engine adapted, options UI, popup profile dropdown
  - replaceLocalBookmarks: empty profiles are correctly cleared
  - Loading indicator during profile switch (options + popup)

---

## Open Points

### Profile Onboarding

- **Git folder does not exist yet:** When a new profile is configured with a repo/path that does not yet exist in Git (e.g. empty branch, new folder), onboarding is suboptimal.
  - Possible improvements: UI hint, manual setup instructions, or automatic creation on first push.
  - To decide: Should the extension create the folder automatically, or provide the user with clear instructions?

### Backup (Import/Export)

The Backup tab behavior changes with multiple profiles. Needs review and possibly adjustment:

- **Settings export/import:** Already includes profiles with decrypted tokens (see [options.js](../options.js) lines 516–636). Verify migration from legacy format and round-trip export/import.
- **Bookmark export/import:** Exports all browser bookmarks; import replaces local bookmarks. Clarify whether per-profile export (e.g. "export current profile only") is needed, and how import interacts with multiple profiles.
- **UI:** Consider indicating which profile's data is affected when importing bookmarks.

### Other (optional)

- **Profile limit:** Currently 10 profiles. Consider displaying in options.

---

## Next Steps

1. [ ] Improve profile onboarding (folder not present)
2. [ ] Test on Chrome, Firefox Desktop, Firefox Android
3. [ ] Prepare release branch `release/v2.2.0` (version, CHANGELOG, docs/RELEASE.md)
4. [ ] PR from develop/2.2.0 → main
5. [ ] Tag v2.2.0, publish release

---

## Usage

- When continuing: read this file as entry point.
- Move completed items to a "Done" section or remove them.
- Add new open points here.
