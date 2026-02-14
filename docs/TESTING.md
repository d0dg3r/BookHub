# GitSyncMarks – Testing Guide

This document describes how to test the extension on Chrome and Firefox (desktop) as well as Firefox for Android.

---

## Store Screenshots

Screenshots for Chrome Web Store and Firefox AMO are generated automatically. Run after building the Chrome extension:

```bash
npm run build:chrome && npm run generate-screenshots
```

Or use the combined command:

```bash
npm run screenshots
```

Output: `store-assets/screenshot-chrome-*.png`, `screenshot-chrome-de-*.png`, and `screenshot-firefox-*.png` (Firefox assets are copied from Chrome; UI is identical).

**Prerequisites:** Playwright with Chromium (`npx playwright install chromium` — run once).

---

## Chrome (Desktop)

### Build

```bash
npm run build:chrome
```

Output: `build/chrome/` (unpacked) and `build/GitSyncMarks-vX.X.X-chrome.zip`.

### Load Unpacked Extension

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `build/chrome/` folder

### Test

- **Popup:** Click the extension icon in the toolbar
- **Options:** Right-click the icon → **Options**, or open `chrome://extensions/` → GitSyncMarks → **Details** → **Extension options**
- **Debug:** Right-click the popup → **Inspect** to open DevTools

### Responsive Layout Check

To simulate mobile viewport for the options page:

1. Open the options page in a tab (via the extension)
2. Press **F12** → toggle **Device toolbar** (Ctrl+Shift+M)
3. Choose a phone preset or set 360×640 px

---

## Firefox (Desktop)

### Build

```bash
npm run build:firefox
```

Output: `build/firefox/` and `build/GitSyncMarks-vX.X.X-firefox.zip`.

### Load Temporary Add-on

1. Open `about:debugging`
2. Select **This Firefox**
3. Click **Load Temporary Add-on**
4. Choose `build/GitSyncMarks-vX.X.X-firefox.zip` or the `manifest.json` in `build/firefox/`

**Note:** Temporary add-ons are removed when Firefox restarts. Reload after code changes via the **Reload** button in `about:debugging`.

### Test

- **Popup:** Click the extension icon in the toolbar
- **Options:** Click the icon → **Open Settings**, or open `about:addons` → GitSyncMarks → **Preferences**
- **Debug:** Right-click the popup → **Inspect** to open DevTools

### Responsive Layout Check

1. Open the options page (it loads in a tab)
2. Press **Ctrl+Shift+M** for Responsive Design Mode
3. Set viewport to 360×640 px or a phone preset

For the popup: Open `moz-extension://<EXTENSION-ID>/popup.html` in a tab (ID from `about:debugging`), then use Responsive Design Mode.

---

## Mobile Layout Test on Desktop

To verify responsive layout changes without an Android device, use the browser’s responsive/device mode:

**Chrome:** Load the extension (see Chrome section), open options in a tab, press **Ctrl+Shift+M** (Device toolbar), set viewport to 360×640 px.

**Firefox:** Load the extension (see Firefox section). For the options page: open it in a tab, press **Ctrl+Shift+M**. For the popup: open `moz-extension://<EXTENSION-ID>/popup.html` in a tab (ID from `about:debugging`), then use Responsive Design Mode.

Responsive mode only simulates viewport size. Final verification should be done on real Firefox for Android.

---

## Full Test on Firefox for Android

For full compatibility testing on real Firefox for Android.

### Prerequisites

- **adb** (Android Debug Bridge) in your PATH
- **web-ext** version 7.12.0 or later

**Install on Arch Linux / CachyOS:**
```bash
# Android tools (includes adb)
sudo pacman -S android-tools

# web-ext
npm install -g web-ext
```

### Android Device Setup

1. Enable **Developer options** (tap Build number 7 times in Settings → About)
2. Enable **USB debugging**
3. Install Firefox from the Play Store (or Firefox Nightly/Beta)
4. In Firefox: Settings → **Enable “Remote debugging via USB”**
5. Connect the device via USB and approve the debugging prompt

### Verify Connection

```bash
adb devices
```

### Run the Extension on Android

```bash
# 1. Build the Firefox extension
npm run build:firefox

# 2. Run from the unpacked build directory
cd build/firefox
web-ext run --target=firefox-android
```

**Select Firefox variant** (if multiple are installed):
```bash
# Release Firefox
web-ext run --target=firefox-android --firefox-apk org.mozilla.firefox

# Firefox Nightly
web-ext run --target=firefox-android --firefox-apk org.mozilla.fenix

# Firefox Beta
web-ext run --target=firefox-android --firefox-apk org.mozilla.firefox_beta
```

**If multiple devices are connected:**
```bash
web-ext run --target=firefox-android --adb-device <device-id>
```

### Debugging

- Use `about:debugging` on your desktop Firefox, connect to the Android device, then inspect processes
- For popup HTML/CSS: temporarily open the popup in a tab to use the Inspector (see [Extension Workshop](https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/))
- Check `adb logcat` filtered by your extension ID for manifest and runtime messages

---

## Android Emulator (Without a Physical Device)

If you do not have an Android phone:

1. Install **Android Studio** (or at least the Android SDK)
2. Create an **Android Virtual Device (AVD)** with a phone profile
3. Start the emulator
4. Install Firefox from the Play Store (or sideload an APK)
5. `adb` will connect to the emulator; use the same `web-ext run` commands as above

---

## Quick Reference

| Platform | Load | Effort |
|----------|------|--------|
| Chrome Desktop | `chrome://extensions/` → Load unpacked → `build/chrome/` | Low |
| Firefox Desktop | `about:debugging` → Load Temporary Add-on → `build/GitSyncMarks-vX.X.X-firefox.zip` | Low |
| Firefox Android (device) | `web-ext run --target=firefox-android` from `build/firefox/` | Medium |
| Firefox Android (emulator) | Same as above, with AVD running | High |

**Recommendation:** Test on both Chrome and Firefox desktop before each release. Use the desktop Responsive Mode for mobile layout checks, then verify on real Firefox for Android.
