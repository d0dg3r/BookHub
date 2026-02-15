# GitSyncMarks E2E Tests

Automated end-to-end tests for the GitSyncMarks browser extension. Runs on **Chrome only** (Playwright does not support Firefox extension loading).

## Quick Start

```bash
npm run test:e2e:smoke   # Smoke tests (no credentials)
```

## Sync Tests (Connection, Push, Pull)

Sync tests require a private GitHub repo and a Personal Access Token.

1. **Create the test repo** (once):
   ```bash
   GITSYNCMARKS_TEST_PAT=ghp_xxx node scripts/create-test-repo.js
   ```

2. **Set environment variables** (see `.env.example`):
   - `GITSYNCMARKS_TEST_PAT` — GitHub PAT with `repo` scope
   - `GITSYNCMARKS_TEST_REPO_OWNER` — Your username or org
   - `GITSYNCMARKS_TEST_REPO` — `GitSyncMarks-test-sync`

3. **Run sync tests:**
   ```bash
   npm run test:e2e:sync
   ```

## CI (GitHub Actions)

E2E tests run on push/PR to main and develop. To enable full sync tests in CI:

1. Create the test repo (once, locally):  
   `GITSYNCMARKS_TEST_PAT=ghp_xxx node scripts/create-test-repo.js`

2. **PAT must have `repo` scope.** Without it, Connection and Sync tests fail with "missing repo scope".
   - Classic token: [Create with repo scope](https://github.com/settings/tokens/new?scopes=repo)
   - Fine-grained: Contents read/write, Metadata read

3. In **Settings → Secrets and variables → Actions**:

   | Type     | Name                         | Description                    |
   |----------|------------------------------|--------------------------------|
   | Secret   | `GITSYNCMARKS_TEST_PAT`      | GitHub PAT with `repo` scope   |
   | Variable | `GITSYNCMARKS_TEST_REPO_OWNER` | Username or org               |
   | Variable | `GITSYNCMARKS_TEST_REPO`     | `GitSyncMarks-test-sync`       |

Without these, only smoke and invalid-token tests run; connection/sync tests are skipped.

## Test Reports

After a run:
```bash
npm run test:e2e:report
```
Opens the HTML report with screenshots and traces for failed tests.
