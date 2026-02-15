# Roadmap

Planned features and ideas for GitSyncMarks. See [CHANGELOG.md](CHANGELOG.md) for released changes.

Contributions and ideas welcome — open an issue or pull request.

---

## Planned for v2.2 / v2.3 (Near term)

- **Browser notifications** - Notifications on sync success/failure.

---

## Planned for v3.0 (Larger milestones)

- **GitLab support** — GitLab API wrapper (different endpoints than GitHub), provider abstraction (`lib/git-provider.js`), GitLab CI/CD automation equivalent. Current `lib/github-api.js` is tightly coupled to `api.github.com`.

- **New layout** — Redesign of popup and/or options page (tabs, sidebar, more compact UI, improved responsive behaviour).

---

## Recently completed

- **Keyboard shortcuts** (v2.2.0) — Quick sync (Ctrl+Shift+.), open options (Ctrl+Shift+,); customizable in extension settings
- **Multiple sync profiles** (v2.2.0) — Work/personal bookmark sets with separate GitHub repos; switch replaces local bookmarks; onboarding (create folder / pull on first config)

## Backlog / ideas (No timeline)

| Idea | Description | Effort |
|------|-------------|--------|
| **Folder browse/select** | Select or browse the sync folder in the Git repo instead of typing the path manually | Small |
| **Browser import files** | Automatically generate import files for common browsers (e.g. Netscape HTML) alongside README.md. Enables importing directly from the repo without the extension. | Medium |
| Additional sync sources (read-only) | Add extra folders from centrally maintained repos (e.g. team bookmarks). Your personal bookmarks stay in your repo; the shared folder is merged in read-only. Assemble bookmarks from multiple sources in one place | Medium |
| Selective folder sync | Sync only specific bookmark folders instead of all | Medium |
| Sync history / rollback | Restore previous sync states (requires storing commit history) | Medium |
| Conflict resolution UI | Diff view for merge conflicts instead of force push/pull only | Medium |
| More languages | Extend i18n (e.g. French, Spanish) | Small |
| Self-hosted Git (Gitea, Forgejo) | Broader provider support beyond GitHub/GitLab | Large |
