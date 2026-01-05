# Photos Memory

Prototype Vite + React web app that lets a user pick a curated set of Google Photos, caches the selected `mediaItems`, and displays one random photo fullscreen on every visit.

## Prerequisites

1. **Google Cloud project** with the Google Photos Picker API enabled.
2. **OAuth client (Web application)** configured with:
   - Authorized JavaScript origins: `http://localhost:5173` plus production domains you host.
   - Authorized redirect URI: not required for the picker-only flow, but add if you expand auth later.
3. **API key + OAuth Client ID** copied into `.env`.

Create an `.env` file from the provided template:

```bash
cp .env.example .env
```

Then edit the values:

```
VITE_GOOGLE_CLIENT_ID=your-client.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSy...
VITE_PHOTOS_MAX_ITEM_COUNT=50
```

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The dev server runs at `http://localhost:5173`.

## Production Build

```bash
npm run build
npm run preview
```

## How It Works

- Loads Google Identity Services script and requests the `photospicker.mediaitems.readonly` scope.
- Opens the official Google Photos Picker in a popup dialog, then polls the Picker API for the resulting media items.
- Persists the chosen media metadata into `localStorage` and, on each refresh, chooses a random item to display fullscreen. Adjust `VITE_PHOTOS_MAX_ITEM_COUNT` to limit how many picks the modal allows per session.
- Includes quick controls to update the selection, shuffle, or clear cached photos.

## Next Steps

- Improve error surfaces (quota exceeded, popup blocked) with richer UI states.
- Add responsive previews or a grid of recent pulls beneath the fullscreen hero.
- Move token exchange server-side if you need longer-lived sessions or multi-user storage.
