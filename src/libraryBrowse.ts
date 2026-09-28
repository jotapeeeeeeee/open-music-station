import type { ListeningEvent, Track } from './types'

export type LibraryGroupBy = 'artist' | 'album' | 'genre'
export type LibrarySort = 'title' | 'recent' | 'played'
export type LibraryGroup = { key: string; label: string; tracks: Track[]; playCount: number; addedAt: number }

function playCounts(events: ListeningEvent[]) {
  const counts = new Map<string, number>()
  events.filter(event => event.type === 'complete').forEach(event => counts.set(event.trackId, (counts.get(event.trackId) ?? 0) + 1))
  return counts
}

export function sortLibraryTracks(tracks: Track[], events: ListeningEvent[], sort: LibrarySort): Track[] {
  const counts = playCounts(events)
  return [...tracks].sort((a, b) => {
    if (sort === 'recent') return (b.addedAt ?? 0) - (a.addedAt ?? 0) || a.title.localeCompare(b.title)
    if (sort === 'played') return (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.title.localeCompare(b.title)
    return a.title.localeCompare(b.title)
  })
}

export function groupLibraryTracks(tracks: Track[], events: ListeningEvent[], by: LibraryGroupBy, sort: LibrarySort): LibraryGroup[] {
  const counts = playCounts(events)
  const groups = new Map<string, Track[]>()
  for (const track of tracks) {
    const label = track[by].trim() || `Unknown ${by}`
    const key = label.toLocaleLowerCase()
    groups.set(key, [...(groups.get(key) ?? []), track])
  }

  return [...groups].map(([key, members]) => ({
    key,
    label: members.map(track => track[by].trim()).find(Boolean) || `Unknown ${by}`,
    tracks: sortLibraryTracks(members, events, sort),
    playCount: members.reduce((sum, track) => sum + (counts.get(track.id) ?? 0), 0),
    addedAt: Math.max(...members.map(track => track.addedAt ?? 0)),
  })).sort((a, b) => {
    if (sort === 'recent') return b.addedAt - a.addedAt || a.label.localeCompare(b.label)
    if (sort === 'played') return b.playCount - a.playCount || a.label.localeCompare(b.label)
    return a.label.localeCompare(b.label)
  })
}
