import { openDB } from 'idb'
import type { ListeningEvent, Playlist, Track } from './types'
const dbPromise = openDB('open-music-station', 2, { upgrade(db) {
  if (!db.objectStoreNames.contains('tracks')) db.createObjectStore('tracks', { keyPath: 'id' })
  if (!db.objectStoreNames.contains('events')) db.createObjectStore('events', { autoIncrement: true })
  if (!db.objectStoreNames.contains('playlists')) db.createObjectStore('playlists', { keyPath: 'id' })
}})
export async function loadTracks(): Promise<Track[]> { return (await dbPromise).getAll('tracks') }
export async function saveTrack(track: Track) { return (await dbPromise).put('tracks', track) }
export async function saveEvent(event: ListeningEvent) { return (await dbPromise).add('events', event) }
export async function loadEvents(): Promise<ListeningEvent[]> { return (await dbPromise).getAll('events') }
export async function loadPlaylists(): Promise<Playlist[]> { return (await dbPromise).getAll('playlists') }
export async function savePlaylist(playlist: Playlist) { return (await dbPromise).put('playlists', playlist) }
export async function deletePlaylist(id: string) { return (await dbPromise).delete('playlists', id) }
