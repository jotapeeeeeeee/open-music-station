import { describe, expect, it } from 'vitest'
import { demoTracks } from './data'
import { groupLibraryTracks, sortLibraryTracks } from './libraryBrowse'
import type { ListeningEvent, Track } from './types'

const tracks: Track[] = [
  { ...demoTracks[0], id: 'older', title: 'Zebra', artist: 'Same artist', album: 'Night', genre: 'Jazz', addedAt: 10 },
  { ...demoTracks[1], id: 'newer', title: 'Alto', artist: 'Same artist', album: 'Day', genre: 'Jazz', addedAt: 20 },
  { ...demoTracks[2], id: 'unplayed', title: 'Mellow', artist: 'Another artist', album: 'Night', genre: 'Ambient', addedAt: 30 },
]
const history: ListeningEvent[] = [
  { trackId: 'older', type: 'complete', at: 1 },
  { trackId: 'older', type: 'complete', at: 2 },
  { trackId: 'newer', type: 'complete', at: 3 },
]

describe('library browsing', () => {
  it('sorts tracks alphabetically, by added date, and by completed plays', () => {
    expect(sortLibraryTracks(tracks, history, 'title').map(track => track.id)).toEqual(['newer', 'unplayed', 'older'])
    expect(sortLibraryTracks(tracks, history, 'recent').map(track => track.id)).toEqual(['unplayed', 'newer', 'older'])
    expect(sortLibraryTracks(tracks, history, 'played').map(track => track.id)).toEqual(['older', 'newer', 'unplayed'])
  })

  it('groups tracks case-insensitively and sums plays across artist groups', () => {
    const groups = groupLibraryTracks(tracks, history, 'artist', 'played')
    expect(groups.map(group => [group.label, group.tracks.length, group.playCount])).toEqual([
      ['Same artist', 2, 3],
      ['Another artist', 1, 0],
    ])
  })

  it('groups distinct albums and genres in predictable alphabetical order', () => {
    expect(groupLibraryTracks(tracks, [], 'album', 'title').map(group => group.label)).toEqual(['Day', 'Night'])
    expect(groupLibraryTracks(tracks, [], 'genre', 'title').map(group => group.label)).toEqual(['Ambient', 'Jazz'])
  })
})
