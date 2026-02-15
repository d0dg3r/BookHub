#!/usr/bin/env node
/**
 * Generate store screenshots for Chrome Web Store and Firefox AMO.
 * Requires: npm run build:chrome first (build/chrome/ must exist).
 * Uses Playwright to launch Chromium with the extension loaded.
 *
 * Output: store-assets/{en,de,fr,es}/chrome-*.png and en/firefox-*.png
 *
 * Usage: node scripts/generate-screenshots.js
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const EXTENSION_PATH = path.join(ROOT, 'build', 'chrome');
const STORE_ASSETS = path.join(ROOT, 'store-assets');
const VIEWPORT = { width: 1280, height: 800 };

const LANGUAGES = [{ code: 'en' }, { code: 'de' }, { code: 'fr' }, { code: 'es' }];

const OPTIONS_TABS = [
  { id: 'github', file: 'github' },
  { id: 'sync', file: 'settings' },
  { id: 'backup', file: 'import-export' },
  { id: 'automation', file: 'automation' },
  { id: 'help', file: 'help' },
  { id: 'about', file: 'about' },
];

const FIREFOX_MAPPING = [
  { src: 'github', dst: 'settings' },
  { src: 'import-export', dst: 'import-export' },
  { src: 'automation', dst: 'automation' },
  { src: 'help', dst: 'help' },
  { src: 'about', dst: 'about' },
];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function main() {
  if (!fs.existsSync(EXTENSION_PATH)) {
    console.error(
      `Extension not found at ${EXTENSION_PATH}. Run "npm run build:chrome" first.`
    );
    process.exit(1);
  }

  await ensureDir(STORE_ASSETS);

  const userDataDir = path.join(os.tmpdir(), 'gitsyncmarks-screenshots-' + Date.now());
  const launchArgs = [
    `--disable-extensions-except=${EXTENSION_PATH}`,
    `--load-extension=${EXTENSION_PATH}`,
  ];
  if (process.env.CI) {
    launchArgs.push('--no-sandbox', '--disable-dev-shm-usage');
  }
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: launchArgs,
  });

  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker', { timeout: 90000 });
  }
  const extensionId = serviceWorker.url().split('/')[2];
  console.log('Extension ID:', extensionId);

  const optionsUrl = `chrome-extension://${extensionId}/options.html`;
  const popupUrl = `chrome-extension://${extensionId}/popup.html?demo=1`;

  for (const { code } of LANGUAGES) {
    const langDir = path.join(STORE_ASSETS, code);
    await ensureDir(langDir);

    console.log(`\nChrome (${code.toUpperCase()}) options:`);
    const page = await context.newPage();
    await page.goto(optionsUrl);
    await page.setViewportSize(VIEWPORT);
    await page.waitForLoadState('networkidle');
    await page.locator('#language-select option[value="' + code + '"]').waitFor({ state: 'attached', timeout: 10000 });

    await page.locator('#language-select').selectOption(code);
    await page.waitForTimeout(600);

    for (const { id, file } of OPTIONS_TABS) {
      const tabBtn = page.locator(`.tab-btn[data-tab="${id}"]`);
      await tabBtn.click();
      await page.waitForTimeout(300);
      const outPath = path.join(langDir, `chrome-${file}.png`);
      await page.screenshot({ path: outPath });
      console.log('  ', `${code}/chrome-${file}.png`);
    }
    await page.close();

    console.log(`\nChrome (${code.toUpperCase()}) popup:`);
    const popupPage = await context.newPage();
    await popupPage.goto(popupUrl);
    await popupPage.setViewportSize(VIEWPORT);
    await popupPage.waitForLoadState('networkidle');
    await popupPage.waitForTimeout(code === 'en' ? 300 : 500);
    const dialogPath = path.join(langDir, 'chrome-dialog.png');
    await popupPage.screenshot({ path: dialogPath });
    console.log('  ', `${code}/chrome-dialog.png`);
    await popupPage.close();
  }

  // ---- Firefox: copy from Chrome EN (UI is identical) ----
  const enDir = path.join(STORE_ASSETS, 'en');
  console.log('\nFirefox (copy from Chrome EN):');
  for (const { src, dst } of FIREFOX_MAPPING) {
    const srcPath = path.join(enDir, `chrome-${src}.png`);
    const dstPath = path.join(enDir, `firefox-${dst}.png`);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, dstPath);
      console.log('  ', `en/firefox-${dst}.png`);
    }
  }

  await context.close();
  console.log('\nDone. Screenshots in store-assets/en/, de/, fr/, es/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
