import type { ListeningEvent, Track } from './types'
export function recommend(tracks: Track[], events: ListeningEvent[], limit = 5) {
  const completed = events.filter(e => e.type === 'complete'), skipped = new Set(events.filter(e => e.type === 'skip').map(e => e.trackId))
  const liked = new Set<string>()
  events.forEach(event => {
    if (event.type === 'like') liked.add(event.trackId)
    if (event.type === 'unlike') liked.delete(event.trackId)
  })
  const counts = new Map<string, number>(); completed.forEach(e => counts.set(e.trackId, (counts.get(e.trackId) ?? 0) + 1))
  const recent = [...completed].sort((a, b) => b.at - a.at)[0]?.trackId
  const recentTrack = tracks.find(t => t.id === recent)
  return tracks.filter(t => !skipped.has(t.id)).map(track => {
    let score = liked.has(track.id) ? 5 : 0
    if (counts.has(track.id)) score += Math.min(3, counts.get(track.id)!)
    if (recentTrack && track.genre === recentTrack.genre) score += 2
    if (recentTrack && track.artist === recentTrack.artist) score += 1
    const reason = liked.has(track.id) ? 'Because you liked this' : recentTrack && track.genre === recentTrack.genre ? `Because you played ${recentTrack.genre.toLowerCase()}` : 'A fresh start for your station'
    return { track, score, reason }
  }).sort((a, b) => b.score - a.score || a.track.title.localeCompare(b.track.title)).slice(0, limit)
}
