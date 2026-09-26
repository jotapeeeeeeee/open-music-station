import { describe, expect, it } from 'vitest'
import { createQueue, takeNextTrack, takePreviousTrack } from './playback'
import { demoTracks } from './data'

describe('playback queue', () => {
  it('builds an ordered queue after the selected track, wrapping at the end', () => {
    expect(createQueue(demoTracks, 'demo-04').map(track => track.id)).toEqual(['demo-05', 'demo-01', 'demo-02', 'demo-03'])
  })

  it('consumes queued tracks before falling back to the library order', () => {
    const queue = [demoTracks[3], demoTracks[1]]
    const next = takeNextTrack(queue, demoTracks, 'demo-01')
    expect(next.track?.id).toBe('demo-04')
    expect(next.queue.map(track => track.id)).toEqual(['demo-02'])
  })

  it('uses library order rather than recommendation ranking when no queue remains', () => {
    const next = takeNextTrack([], demoTracks, 'demo-03')
    expect(next.track?.id).toBe('demo-04')
    expect(next.queue.map(track => track.id)).toEqual(['demo-05', 'demo-01', 'demo-02'])
  })

  it('restores the previous track and places the current track at the front of the queue', () => {
    const previous = takePreviousTrack([demoTracks[0], demoTracks[1]], demoTracks[2], [demoTracks[3]])
    expect(previous?.track.id).toBe('demo-02')
    expect(previous?.history.map(track => track.id)).toEqual(['demo-01'])
    expect(previous?.queue.map(track => track.id)).toEqual(['demo-03', 'demo-04'])
  })
})
