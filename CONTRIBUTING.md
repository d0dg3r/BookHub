# Contributing to GitSyncMarks

Contributions are welcome: bug reports, feature ideas, and pull requests. See [ROADMAP.md](ROADMAP.md) for planned work and ideas.

## Reporting bugs or feature ideas

Use [GitHub Issues](https://github.com/d0dg3r/GitSyncMarks/issues).

- **Bugs:** Include browser and extension version, steps to reproduce, and expected vs actual behavior.
- **Feature ideas:** Check [ROADMAP.md](ROADMAP.md) first; describe your use case and why it would help.

## Contributing code

### Dev setup

1. Clone the repository
2. Run `npm run build:chrome` or `npm run build:firefox`
3. Load the unpacked extension from `build/chrome/` or `build/firefox/` (see [docs/TESTING.md](docs/TESTING.md))

### Workflow

1. Create a branch from `main`: `feature/xyz` or `fix/xyz`
2. Implement your changes
3. Test on Chrome and Firefox (see [docs/TESTING.md](docs/TESTING.md))
4. Open a pull request to `main`

For the full release process (versioning, tagging, store assets), see [docs/RELEASE.md](docs/RELEASE.md).

### Code style

Follow the existing code style. Keep changes focused and small where possible.

### i18n

UI strings live in `_locales/en/messages.json` and `_locales/de/messages.json`. Add or update entries for new user-facing text. See [docs/I18N.md](docs/I18N.md).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
