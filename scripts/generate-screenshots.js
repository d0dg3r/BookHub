#!/usr/bin/env node
/**
 * Generate store screenshots for Chrome Web Store and Firefox AMO.
 * Requires: npm run build:chrome first (build/chrome/ must exist).
 * Uses Playwright to launch Chromium with the extension loaded.
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

const OPTIONS_TABS = [
  { id: 'github', file: 'github' },
  { id: 'sync', file: 'settings' },
  { id: 'backup', file: 'import-export' },
  { id: 'automation', file: 'automation' },
  { id: 'about', file: 'about' },
];

const FIREFOX_MAPPING = [
  { src: 'github', dst: 'settings' },
  { src: 'import-export', dst: 'import-export' },
  { src: 'automation', dst: 'automation' },
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
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker');
  }
  const extensionId = serviceWorker.url().split('/')[2];
  console.log('Extension ID:', extensionId);

  const optionsUrl = `chrome-extension://${extensionId}/options.html`;
  const popupUrl = `chrome-extension://${extensionId}/popup.html?demo=1`;

  // ---- Chrome EN: Options tabs ----
  console.log('\nChrome (EN) options:');
  const page = await context.newPage();
  await page.goto(optionsUrl);
  await page.setViewportSize(VIEWPORT);
  await page.waitForLoadState('networkidle');

  for (const { id, file } of OPTIONS_TABS) {
    const tabBtn = page.locator(`.tab-btn[data-tab="${id}"]`);
    await tabBtn.click();
    await page.waitForTimeout(300);
    const outPath = path.join(STORE_ASSETS, `screenshot-chrome-${file}.png`);
    await page.screenshot({ path: outPath });
    console.log('  ', `screenshot-chrome-${file}.png`);
  }
  await page.close();

  // ---- Chrome EN: Popup ----
  console.log('\nChrome (EN) popup:');
  const popupPage = await context.newPage();
  await popupPage.goto(popupUrl);
  await popupPage.setViewportSize(VIEWPORT);
  await popupPage.waitForLoadState('networkidle');
  await popupPage.waitForTimeout(300);
  await popupPage.screenshot({
    path: path.join(STORE_ASSETS, 'screenshot-chrome-dialog.png'),
  });
  console.log('  ', 'screenshot-chrome-dialog.png');
  await popupPage.close();

  // ---- Chrome DE: Options tabs (switch language first) ----
  console.log('\nChrome (DE) options:');
  const pageDe = await context.newPage();
  await pageDe.goto(optionsUrl);
  await pageDe.setViewportSize(VIEWPORT);
  await pageDe.waitForLoadState('networkidle');

  await pageDe.locator('#language-select').selectOption('de');
  await pageDe.waitForTimeout(600);

  for (const { id, file } of OPTIONS_TABS) {
    const tabBtn = pageDe.locator(`.tab-btn[data-tab="${id}"]`);
    await tabBtn.click();
    await pageDe.waitForTimeout(300);
    const outPath = path.join(STORE_ASSETS, `screenshot-chrome-de-${file}.png`);
    await pageDe.screenshot({ path: outPath });
    console.log('  ', `screenshot-chrome-de-${file}.png`);
  }
  await pageDe.close();

  // ---- Chrome DE: Popup (uses lang from storage set above) ----
  console.log('\nChrome (DE) popup:');
  const popupDe = await context.newPage();
  await popupDe.goto(popupUrl);
  await popupDe.setViewportSize(VIEWPORT);
  await popupDe.waitForLoadState('networkidle');
  await popupDe.waitForTimeout(500);
  await popupDe.screenshot({
    path: path.join(STORE_ASSETS, 'screenshot-chrome-de-dialog.png'),
  });
  console.log('  ', 'screenshot-chrome-de-dialog.png');
  await popupDe.close();

  // ---- Firefox: copy from Chrome (UI is identical) ----
  console.log('\nFirefox (copy from Chrome):');
  for (const { src, dst } of FIREFOX_MAPPING) {
    const srcPath = path.join(STORE_ASSETS, `screenshot-chrome-${src}.png`);
    const dstPath = path.join(STORE_ASSETS, `screenshot-firefox-${dst}.png`);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, dstPath);
      console.log('  ', `screenshot-firefox-${dst}.png`);
    }
  }

  await context.close();
  console.log('\nDone. Screenshots in store-assets/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
