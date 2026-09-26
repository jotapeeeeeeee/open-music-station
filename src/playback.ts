import type { Track } from './types'

export function createQueue(tracks: Track[], currentTrackId: string): Track[] {
  const currentIndex = tracks.findIndex(track => track.id === currentTrackId)
  if (currentIndex < 0) return [...tracks]
  return [...tracks.slice(currentIndex + 1), ...tracks.slice(0, currentIndex)]
}

export function takeNextTrack(queue: Track[], tracks: Track[], currentTrackId: string) {
  const available = queue.length ? queue : createQueue(tracks, currentTrackId)
  const [track, ...remaining] = available
  return { track: track ?? null, queue: remaining }
}

export function takePreviousTrack(history: Track[], currentTrack: Track | null, queue: Track[]) {
  const track = history.at(-1)
  if (!track) return null
  return {
    track,
    history: history.slice(0, -1),
    queue: currentTrack ? [currentTrack, ...queue] : queue,
  }
}
