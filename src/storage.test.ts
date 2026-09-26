import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { openDB } from 'idb'
import { deletePlaylist, loadEvents, loadPlaylists, loadTracks, saveEvent, savePlaylist, saveTrack } from './storage'
import type { Playlist, Track } from './types'

const DB_NAME = 'open-music-station'

describe('IndexedDB library persistence', () => {
  beforeEach(async () => {
    const db = await openDB(DB_NAME, 2, { upgrade(database) {
      if (!database.objectStoreNames.contains('tracks')) database.createObjectStore('tracks', { keyPath: 'id' })
      if (!database.objectStoreNames.contains('events')) database.createObjectStore('events', { autoIncrement: true })
      if (!database.objectStoreNames.contains('playlists')) database.createObjectStore('playlists', { keyPath: 'id' })
    }})
    await Promise.all(['tracks', 'events', 'playlists'].map(store => db.clear(store)))
  })

  it('stores track metadata and audio blobs for reload', async () => {
    const track: Track = { id: 'local-a', title: 'My recording', artist: 'Me', album: 'Room', year: 2026, genre: 'Ambient', tags: [], duration: 42, color: '#d7f45b', blob: new Blob(['audio']) }
    await saveTrack(track)
    const [stored] = await loadTracks()
    expect(stored.title).toBe('My recording')
    expect(stored.blob?.size).toBe(5)
  })

  it('persists playlists and listening events, and deletes playlists by id', async () => {
    const playlist: Playlist = { id: 'playlist-a', name: 'Evening', trackIds: ['local-a'], updatedAt: 10 }
    await savePlaylist(playlist)
    await saveEvent({ trackId: 'local-a', type: 'like', at: 11 })
    expect(await loadPlaylists()).toEqual([playlist])
    expect(await loadEvents()).toMatchObject([{ trackId: 'local-a', type: 'like', at: 11 }])
    await deletePlaylist(playlist.id)
    expect(await loadPlaylists()).toEqual([])
  })
})
