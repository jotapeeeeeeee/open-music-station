import { openDB } from 'idb'
import type { ListeningEvent, Track } from './types'
const dbPromise = openDB('open-music-station', 1, { upgrade(db) {
  db.createObjectStore('tracks', { keyPath: 'id' }); db.createObjectStore('events', { autoIncrement: true })
}})
export async function loadTracks(): Promise<Track[]> { return (await dbPromise).getAll('tracks') }
export async function saveTrack(track: Track) { return (await dbPromise).put('tracks', track) }
export async function saveEvent(event: ListeningEvent) { return (await dbPromise).add('events', event) }
export async function loadEvents(): Promise<ListeningEvent[]> { return (await dbPromise).getAll('events') }
