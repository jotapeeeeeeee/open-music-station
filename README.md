# Open Music Station

Local-first open music player MVP. It is intentionally not a Spotify clone: files, history, and recommendations live in the browser, with no accounts or backend.

## Run

```bash
npm install
npm run dev
```

Build and test with `npm run build` and `npm test`.

## Architecture

Vite + React + TypeScript. `src/storage.ts` wraps IndexedDB (`tracks` and `events` stores). `src/recommend.ts` ranks local tracks deterministically from likes, completed plays, skips, genre/artist similarity, and recent listening. `src/useAudioPlayback.ts` owns local audio URL lifetime and play/pause without reloading the source; real-file progress and seeking use the audio element's current time. `src/playback.ts` defines the ordered next/previous queue. The UI lives in `src/App.tsx` and `src/PlayerBar.tsx`; all visual tokens live in `src/styles.css`.

## Data and licensing

Imported files never leave the browser. Demo entries are synthetic “station tone” tracks generated with Web Audio, not recordings. They exist to make the empty state useful without pretending to ship a catalog. To add an open catalog, implement an adapter that returns `Track` records and document the source's license, attribution, and whether remote playback is permitted. Do not copy proprietary catalogs, artwork, algorithms, or branding.

## Local backup

Use **Export library** to download a JSON snapshot of metadata and listening events. Importing that JSON restores the snapshot; audio bytes still need to be re-selected because browsers do not allow arbitrary file persistence outside IndexedDB.
