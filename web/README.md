# Gear Pro Web

Browser-based Gear Pro app designed for GitHub Pages hosting.

## Privacy and Data Storage

- All app data is stored locally on the user's device via browser `localStorage`.
- No server-side database is used by default.
- Users can export a JSON backup file and import it later to restore data.

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## GitHub Pages Deployment

This project includes `.github/workflows/deploy-web.yml`:
- Builds `web/` on pushes to `main`.
- Deploys `web/dist` to GitHub Pages.

After your first push:
1. Open repository settings.
2. Go to **Pages**.
3. Ensure source is **GitHub Actions**.

## Imported Real Gear Data

- Generated import file from your spreadsheet:
  - `web/imports/Hunting_Gear_MASTER_gearpro2_backup.json`
- This file is ready to import via the app's **Backup -> Import Backup JSON** action.

## PWA + iPhone Install

This web app is configured as a Progressive Web App:
- `public/manifest.webmanifest` for install metadata
- `public/sw.js` for offline shell caching
- Apple mobile web app meta tags and touch icon in `index.html`

Install on iPhone:
1. Open the deployed app in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Launch from the home screen for app-like full-screen behavior.
