import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { openDB } from 'idb'

describe('library database migrations', () => {
  it('adds the playlists store when upgrading a version-one library', async () => {
    const legacy = await openDB('open-music-station', 1, { upgrade(db) {
      db.createObjectStore('tracks', { keyPath: 'id' })
      db.createObjectStore('events', { autoIncrement: true })
    }})
    await legacy.put('tracks', { id: 'local-legacy', title: 'Old file' })
    legacy.close()

    const storage = await import('./storage')
    expect(await storage.loadPlaylists()).toEqual([])
    expect((await storage.loadTracks()).map(track => track.id)).toContain('local-legacy')
    const upgraded = await openDB('open-music-station', 2)
    expect(upgraded.objectStoreNames.contains('playlists')).toBe(true)
    upgraded.close()
  })
})
