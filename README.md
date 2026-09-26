# Open Music Station

Local-first open music player MVP. It is intentionally not a Spotify clone: files, history, and recommendations live in the browser, with no accounts or backend.

## Run

```bash
npm install
npm run dev
```

Build and test with `npm run build` and `npm test`.

## Architecture

Vite + React + TypeScript. `src/storage.ts` wraps IndexedDB (`tracks`, `events`, and `playlists`). `src/recommend.ts` ranks local tracks deterministically from likes, completed plays, skips, genre/artist similarity, and recent listening. `src/useAudioPlayback.ts` owns local and remote audio source lifetimes without reloading on pause; real-audio progress and seeking use the media element's current time. `src/playback.ts` defines the ordered next/previous queue. Wikimedia Commons search and license filtering live in `src/commonsCatalog.ts`. The UI lives in `src/App.tsx` and `src/PlayerBar.tsx`; visual tokens live in `src/styles.css`.

## Data and licensing

Imported files, playlists, and listening history remain in this browser's IndexedDB. Demo entries are synthetic “station tone” sounds generated with Web Audio, not recordings. Search **Explore open music** to query the public Wikimedia Commons MediaWiki API (`commons.wikimedia.org/w/api.php`); it needs no API secret. The adapter only returns direct audio files whose declared Commons metadata identifies CC0, public domain, CC BY, or CC BY-SA. Results link to their Commons source and license; review those terms and attribution on the source page. These are openly licensed Commons recordings, not a complete catalog of commercial releases, and the app cannot promise every search will find a suitable recording. Playback requires a browser-supported audio format and an internet connection.

To add another source, implement an adapter that returns `Track` records with a playable `streamUrl`, attribution text, license name, license URL, and source page. Filter by the source's actual license terms; do not infer permission from a search result or imply that proprietary catalogs, artwork, algorithms, or branding are available.

## Local backup

Use **Export library** to download a JSON snapshot of track metadata, playlists, and listening events. Audio bytes are intentionally omitted from the export; re-select local files after moving to another browser or device.

## Test deployment

The `Deploy Open Music Station` GitHub Actions workflow runs tests and publishes the static app to GitHub Pages on pushes to `main`. The project site URL is `https://jotapeeeeeeee.github.io/open-music-station/`.
