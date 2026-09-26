import { describe, expect, it } from 'vitest'
import { recommend } from './recommend'
import type { ListeningEvent, Track } from './types'

const tracks: Track[] = [
  { id: 'a', title: 'A', artist: 'Same', album: 'One', year: 2024, genre: 'Ambient', tags: [], duration: 1, color: '#fff' },
  { id: 'b', title: 'B', artist: 'Other', album: 'Two', year: 2024, genre: 'Ambient', tags: [], duration: 1, color: '#fff' },
  { id: 'c', title: 'C', artist: 'Other', album: 'Three', year: 2024, genre: 'Jazz', tags: [], duration: 1, color: '#fff' },
]

describe('recommend', () => {
  it('prioritizes the same genre as the most recent completed play', () => {
    const events: ListeningEvent[] = [{ trackId: 'a', type: 'complete', at: 10 }]
    const result = recommend(tracks, events)
    expect(result.map(r => r.track.id)).toEqual(['a', 'b', 'c'])
    expect(result[1].reason).toContain('ambient')
  })
  it('excludes skipped tracks and gives liked tracks a clear reason', () => {
    const events: ListeningEvent[] = [{ trackId: 'a', type: 'like', at: 1 }, { trackId: 'c', type: 'skip', at: 2 }]
    const result = recommend(tracks, events)
    expect(result.map(r => r.track.id)).not.toContain('c')
    expect(result[0].track.id).toBe('a')
    expect(result[0].reason).toBe('Because you liked this')
  })

  it('removes the like boost when the listener unlikes a track', () => {
    const events: ListeningEvent[] = [
      { trackId: 'c', type: 'like', at: 1 },
      { trackId: 'c', type: 'unlike', at: 2 },
    ]
    expect(recommend(tracks, events)[0].track.id).toBe('a')
    expect(recommend(tracks, events).some(result => result.reason === 'Because you liked this')).toBe(false)
  })
})
