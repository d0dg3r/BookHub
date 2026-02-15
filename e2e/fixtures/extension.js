/**
 * Playwright fixtures for testing the GitSyncMarks Chrome extension.
 * Loads the extension via launchPersistentContext and provides extensionId.
 *
 * Requires: npm run build:chrome (build/chrome/ must exist)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });

const path = require('path');
const fs = require('fs');
const { test: base, chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '../..');
const EXTENSION_PATH = path.join(ROOT, 'build', 'chrome');

if (!fs.existsSync(EXTENSION_PATH)) {
  throw new Error(
    `Extension not found at ${EXTENSION_PATH}. Run "npm run build:chrome" first.`
  );
}

/**
 * Custom test with extension-loaded context and extensionId.
 * Use in tests: test('...', async ({ page, extensionId }) => { ... })
 */
const test = base.extend({
  context: async ({}, use) => {
    const userDataDir = path.join(
      require('os').tmpdir(),
      `gitsyncmarks-e2e-${Date.now()}`
    );
    const args = [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ];
    if (process.env.CI) {
      args.push('--no-sandbox', '--disable-dev-shm-usage');
    }
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: true,
      args,
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let serviceWorker = context.serviceWorkers()[0];
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker', { timeout: 60000 });
    }
    const extensionId = serviceWorker.url().split('/')[2];
    await use(extensionId);
  },
});

module.exports = { test };
