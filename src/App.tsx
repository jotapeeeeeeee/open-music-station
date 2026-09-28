import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, DragEvent, FormEvent } from 'react'
import { demoTracks, formatTime } from './data'
import { searchCommonsTracks } from './commonsCatalog'
import { groupLibraryTracks, sortLibraryTracks } from './libraryBrowse'
import { recommend } from './recommend'
import { createQueue, takeNextTrack, takePreviousTrack } from './playback'
import { deletePlaylist, loadEvents, loadPlaylists, loadTracks, saveEvent, savePlaylist, saveTrack } from './storage'
import PlayerBar from './PlayerBar'
import { useAudioPlayback } from './useAudioPlayback'
import { useMediaSession } from './useMediaSession'
import { usePlaybackShortcuts } from './usePlaybackShortcuts'
import { useOnlineStatus } from './useOnlineStatus'
import type { ListeningEvent, Playlist, Track } from './types'
import type { LibraryGroupBy, LibrarySort } from './libraryBrowse'

type View = 'home' | 'search' | 'library' | 'likes' | 'queue' | 'playlists'

function Artwork({ track, large = false }: { track: Track; large?: boolean }) {
  return <div className={`artwork ${large ? 'artwork-large' : ''}`} style={{ '--art': track.color } as CSSProperties}><span>{track.title.split(' ').map(word => word[0]).join('').slice(0, 2)}</span></div>
}

export default function App() {
  const [tracks, setTracks] = useState<Track[]>(demoTracks)
  const [events, setEvents] = useState<ListeningEvent[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [view, setView] = useState<View>('home')
  const [query, setQuery] = useState('')
  const [catalogMode, setCatalogMode] = useState(false)
  const [catalogTracks, setCatalogTracks] = useState<Track[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [current, setCurrent] = useState<Track | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(0.78)
  const [queue, setQueue] = useState<Track[]>([])
  const [playbackHistory, setPlaybackHistory] = useState<Track[]>([])
  const [libraryMode, setLibraryMode] = useState<'tracks' | LibraryGroupBy>('tracks')
  const [selectedLibraryGroup, setSelectedLibraryGroup] = useState<string | null>(null)
  const [librarySort, setLibrarySort] = useState<LibrarySort>('title')
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [editingTrack, setEditingTrack] = useState<Track | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editArtist, setEditArtist] = useState('')
  const [editAlbum, setEditAlbum] = useState('')
  const [toast, setToast] = useState('')
  const [dragging, setDragging] = useState(false)
  const [offlineReady, setOfflineReady] = useState(Boolean(navigator.serviceWorker?.controller))
  const audio = useRef<HTMLAudioElement | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const queueRef = useRef(queue)
  const tracksRef = useRef(tracks)
  const currentRef = useRef(current)
  const searchSequence = useRef(0)
  queueRef.current = queue
  tracksRef.current = tracks
  currentRef.current = current
  const togglePlayback = useCallback(() => setPlaying(value => !value), [])

  useEffect(() => {
    let active = true
    void Promise.all([loadTracks(), loadEvents(), loadPlaylists()]).then(([saved, history, storedPlaylists]) => {
      if (!active) return
      const merged = new Map(demoTracks.map(track => [track.id, track]))
      saved.forEach(track => merged.set(track.id, track))
      setTracks([...merged.values()])
      setEvents(history)
      setPlaylists(storedPlaylists)
    }).catch(() => setToast('Could not read this browser’s music library. Refresh and try again.'))
    return () => { active = false }
  }, [])

  const handlePlaybackError = useCallback(() => {
    setPlaying(false)
    setToast(`Could not play “${currentRef.current?.title ?? 'this track'}”. Try another audio format.`)
  }, [])
  useAudioPlayback(audio, current, playing, handlePlaybackError)

  useEffect(() => {
    if (!playing || !current || current.blob || current.streamUrl) return
    const startedAt = Date.now()
    const initial = progress
    const timer = window.setInterval(() => {
      const next = Math.min(current.duration, initial + Math.floor((Date.now() - startedAt) / 1000))
      setProgress(next)
      if (next >= current.duration) {
        window.clearInterval(timer)
        void record('complete', current)
        advance()
      }
    }, 250)
    return () => window.clearInterval(timer)
  }, [playing, current?.id])

  useEffect(() => {
    if (!current || current.blob || current.streamUrl || !playing) return
    const context = audioContext.current ?? new AudioContext()
    audioContext.current = context
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = 180 + (current.id.charCodeAt(5) % 5) * 38
    oscillator.type = 'triangle'
    gain.gain.value = volume * 0.035
    oscillator.connect(gain).connect(context.destination)
    oscillator.start()
    return () => oscillator.stop()
  }, [current?.id, playing, volume])

  useEffect(() => { if (audio.current) audio.current.volume = volume }, [volume])

  useEffect(() => {
    if (!catalogMode || view !== 'search' || !query.trim()) {
      setCatalogLoading(false)
      setCatalogError('')
      return
    }
    const controller = new AbortController()
    const requestId = ++searchSequence.current
    const timer = window.setTimeout(() => {
      setCatalogLoading(true)
      setCatalogError('')
      void searchCommonsTracks(query.trim(), controller.signal).then(results => {
        if (searchSequence.current === requestId) {
          setCatalogTracks(results)
          setTracks(items => {
            const merged = new Map(items.map(track => [track.id, track]))
            results.forEach(track => merged.set(track.id, track))
            return [...merged.values()]
          })
        }
      }).catch(error => {
        if (controller.signal.aborted) return
        if (searchSequence.current === requestId) {
          setCatalogTracks([])
          setCatalogError(error instanceof Error ? error.message : 'Open catalog search failed.')
        }
      }).finally(() => {
        if (searchSequence.current === requestId) setCatalogLoading(false)
      })
    }, 350)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [catalogMode, query, view])

  const liked = useMemo(() => {
    const ids = new Set<string>()
    events.forEach(event => {
      if (event.type === 'like') ids.add(event.trackId)
      if (event.type === 'unlike') ids.delete(event.trackId)
    })
    return ids
  }, [events])
  const notInterested = useMemo(() => new Set(events.filter(event => event.type === 'not-interested').map(event => event.trackId)), [events])
  const ownedTracks = useMemo(() => tracks.filter(track => track.id.startsWith('demo-') || track.id.startsWith('local-') || track.saved), [tracks])
  const suggestions = useMemo(() => recommend(ownedTracks.filter(track => !notInterested.has(track.id)), events), [ownedTracks, events, notInterested])
  const filtered = ownedTracks.filter(track => `${track.title} ${track.artist} ${track.genre} ${track.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  const activePlaylist = playlists.find(playlist => playlist.id === activePlaylistId) ?? null
  const playlistTracks = activePlaylist ? activePlaylist.trackIds.map(id => tracks.find(track => track.id === id)).filter((track): track is Track => Boolean(track)) : []
  const libraryTracks = ownedTracks.filter(track => track.id.startsWith('local-') || track.saved)
  const libraryGroups = useMemo(() => libraryMode === 'tracks' ? [] : groupLibraryTracks(libraryTracks, events, libraryMode, librarySort), [libraryTracks, events, libraryMode, librarySort])
  const activeLibraryGroup = libraryGroups.find(group => group.key === selectedLibraryGroup) ?? null
  const displayedLibraryTracks = activeLibraryGroup?.tracks ?? sortLibraryTracks(libraryTracks, events, librarySort)
  const likedTracks = tracks.filter(track => liked.has(track.id))
  usePlaybackShortcuts(togglePlayback)
  useMediaSession(current, playing, { play: () => setPlaying(true), pause: () => setPlaying(false), previous, next: advance })
  const isOnline = useOnlineStatus()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let active = true
    void navigator.serviceWorker.ready.then(() => { if (active) setOfflineReady(true) }).catch(() => {
      if (active) setToast('Offline app storage is unavailable in this browser.')
    })
    const onRegistrationError = () => setToast('The app could not enable offline support. Check browser permissions.')
    window.addEventListener('pwa-registration-error', onRegistrationError)
    return () => { active = false; window.removeEventListener('pwa-registration-error', onRegistrationError) }
  }, [])

  async function record(type: ListeningEvent['type'], track: Track) {
    const event: ListeningEvent = { trackId: track.id, type, at: Date.now() }
    setEvents(previous => [...previous, event])
    try { await saveEvent(event) } catch { setToast('Could not save listening feedback in this browser.') }
  }

  function play(track: Track) {
    if (current && current.id !== track.id) setPlaybackHistory(history => [...history, current])
    setCurrent(track)
    const order = catalogTracks.some(item => item.id === track.id) ? catalogTracks : ownedTracks
    setQueue(createQueue(order.some(item => item.id === track.id) ? order : [...order, track], track.id))
    setPlaying(true)
    setProgress(0)
  }

  function advance() {
    const activeTrack = currentRef.current
    if (!activeTrack) return
    const next = takeNextTrack(queueRef.current, tracksRef.current, activeTrack.id)
    if (!next.track) { setPlaying(false); return }
    setPlaybackHistory(history => [...history, activeTrack])
    setQueue(next.queue)
    setCurrent(next.track)
    setPlaying(true)
    setProgress(0)
  }

  function previous() {
    const previousTrack = takePreviousTrack(playbackHistory, current, queue)
    if (!previousTrack) return
    setPlaybackHistory(previousTrack.history)
    setQueue(previousTrack.queue)
    setCurrent(previousTrack.track)
    setPlaying(true)
    setProgress(0)
  }

  function addToQueue(track: Track) {
    if (track.id === current?.id || queue.some(item => item.id === track.id)) {
      setToast('That track is already in the queue.')
      return
    }
    setQueue(items => [...items, track])
    setToast(`Added “${track.title}” to the queue.`)
  }

  function playQueued(track: Track, index: number) {
    if (current) setPlaybackHistory(history => [...history, current])
    setQueue(items => items.slice(index + 1))
    setCurrent(track)
    setProgress(0)
    setPlaying(true)
  }

  function moveQueueItem(index: number, offset: number) {
    const target = index + offset
    if (target < 0 || target >= queue.length) return
    setQueue(items => {
      const updated = [...items]
      ;[updated[index], updated[target]] = [updated[target], updated[index]]
      return updated
    })
  }

  function handleFiles(files: FileList | File[]) {
    const audioFiles = Array.from(files).filter(file => file.type.startsWith('audio/'))
    if (!audioFiles.length) { setToast('Choose an audio file to import.'); setDragging(false); return }
    for (const file of audioFiles) {
      const track: Track = { id: `local-${crypto.randomUUID()}`, title: file.name.replace(/\.[^/.]+$/, ''), artist: 'Local file', album: 'Imported', year: new Date().getFullYear(), genre: 'Unsorted', tags: ['your library'], duration: 0, color: '#d7f45b', blob: file, addedAt: Date.now() }
      setTracks(items => [...items, track])
      void saveTrack(track).catch(() => setToast(`Could not save “${track.title}” in this browser.`))
    }
    setToast(`${audioFiles.length} track${audioFiles.length === 1 ? '' : 's'} added to your library.`)
    setDragging(false)
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) handleFiles(event.target.files)
    event.target.value = ''
  }
  function onDrop(event: DragEvent) { event.preventDefault(); handleFiles(event.dataTransfer.files) }
  function exportData() {
    const blob = new Blob([JSON.stringify({ tracks: tracks.filter(track => !track.id.startsWith('demo-')).map(({ blob: _blob, ...track }) => track), playlists, events }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'open-music-station.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  function toggleLike(track: Track) {
    void record(liked.has(track.id) ? 'unlike' : 'like', track)
    if (track.id.startsWith('commons-')) void saveTrack(track).catch(() => setToast('Could not remember this open track in your browser.'))
    setToast(liked.has(track.id) ? 'Removed from likes.' : 'Saved to likes.')
  }

  function dismissTrack(track: Track) {
    void record('not-interested', track)
    setToast('We’ll leave this track out of recommendations.')
  }

  function addToLibrary(track: Track) {
    const saved = { ...track, saved: true, addedAt: Date.now() }
    setTracks(items => items.some(item => item.id === track.id) ? items.map(item => item.id === track.id ? saved : item) : [...items, saved])
    void saveTrack(saved).then(() => setToast('Track saved to your library.')).catch(() => setToast('Could not save this track in your library.'))
  }

  async function createPlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = newPlaylistName.trim()
    if (!name) return
    const playlist: Playlist = { id: `playlist-${crypto.randomUUID()}`, name, trackIds: [], updatedAt: Date.now() }
    try {
      await savePlaylist(playlist)
      setPlaylists(items => [...items, playlist])
      setActivePlaylistId(playlist.id)
      setNewPlaylistName('')
    } catch { setToast('Could not create this playlist in your browser.') }
  }

  async function addToPlaylist(track: Track) {
    if (!activePlaylist) { setView('playlists'); setToast('Choose or create a playlist first.'); return }
    if (activePlaylist.trackIds.includes(track.id)) { setToast('That track is already in this playlist.'); return }
    const updated = { ...activePlaylist, trackIds: [...activePlaylist.trackIds, track.id], updatedAt: Date.now() }
    try {
      if (!track.id.startsWith('demo-')) await saveTrack({ ...track, saved: true, addedAt: track.addedAt ?? Date.now() })
      await savePlaylist(updated)
      if (!track.id.startsWith('demo-')) setTracks(items => items.map(item => item.id === track.id ? { ...item, saved: true } : item))
      setPlaylists(items => items.map(item => item.id === updated.id ? updated : item))
      setToast(`Added “${track.title}” to ${updated.name}.`)
    } catch { setToast('Could not add this track to the playlist.') }
  }

  async function removeFromPlaylist(trackId: string) {
    if (!activePlaylist) return
    const updated = { ...activePlaylist, trackIds: activePlaylist.trackIds.filter(id => id !== trackId), updatedAt: Date.now() }
    try { await savePlaylist(updated); setPlaylists(items => items.map(item => item.id === updated.id ? updated : item)) }
    catch { setToast('Could not remove this track from the playlist.') }
  }

  async function removePlaylist(playlist: Playlist) {
    try {
      await deletePlaylist(playlist.id)
      setPlaylists(items => items.filter(item => item.id !== playlist.id))
      if (activePlaylistId === playlist.id) setActivePlaylistId(null)
      setToast(`Deleted ${playlist.name}.`)
    } catch { setToast('Could not delete this playlist.') }
  }

  function startEditing(track: Track) {
    setEditingTrack(track)
    setEditTitle(track.title)
    setEditArtist(track.artist)
    setEditAlbum(track.album)
  }

  async function saveMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingTrack) return
    const updated = { ...editingTrack, title: editTitle.trim() || editingTrack.title, artist: editArtist.trim(), album: editAlbum.trim() }
    try {
      await saveTrack(updated)
      setTracks(items => items.map(track => track.id === updated.id ? updated : track))
      if (current?.id === updated.id) setCurrent(updated)
      setEditingTrack(null)
      setToast('Track details updated.')
    } catch { setToast('Could not save these track details.') }
  }

  function navigate(nextView: View) {
    setView(nextView)
    if (nextView !== 'search') { setQuery(''); setCatalogMode(false); setCatalogTracks([]) }
  }

  return <div className="app-shell" onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={event => { if (event.currentTarget === event.target) setDragging(false) }} onDrop={onDrop}>
    <audio ref={audio} aria-label="Audio playback" preload="metadata" onTimeUpdate={event => setProgress(event.currentTarget.currentTime)} onLoadedMetadata={event => {
      if (!current || !Number.isFinite(event.currentTarget.duration) || current.duration === event.currentTarget.duration) return
      const updated = { ...current, duration: event.currentTarget.duration }
      setCurrent(updated)
      if (updated.id.startsWith('local-') || updated.saved) void saveTrack(updated)
    }} onEnded={() => { if (current) void record('complete', current); advance() }} onError={() => {
      if (current?.blob || current?.streamUrl) { setPlaying(false); setToast(`Could not play “${current.title}”. Try another track or format.`) }
    }} />
    {dragging && <div className="drop-overlay"><strong>Drop audio to add it</strong><span>Files stay in this browser</span></div>}
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">◒</span><span>open<br /><b>music</b></span></div>
      <nav aria-label="Main navigation">
        <button className={view === 'home' ? 'active' : ''} aria-label="Station" aria-current={view === 'home' ? 'page' : undefined} onClick={() => navigate('home')}>⌂ <span>Station</span></button>
        <button className={view === 'search' ? 'active' : ''} aria-label="Search" aria-current={view === 'search' ? 'page' : undefined} onClick={() => navigate('search')}>⌕ <span>Search</span></button>
        <button className={view === 'library' ? 'active' : ''} aria-label="Your library" aria-current={view === 'library' ? 'page' : undefined} onClick={() => navigate('library')}>▦ <span>Your library</span></button>
        <button className={view === 'likes' ? 'active' : ''} aria-label="Likes" aria-current={view === 'likes' ? 'page' : undefined} onClick={() => navigate('likes')}>♡ <span>Likes</span><em>{liked.size || ''}</em></button>
        <button className={view === 'playlists' ? 'active' : ''} aria-label="Playlists" aria-current={view === 'playlists' ? 'page' : undefined} onClick={() => navigate('playlists')}>≡ <span>Playlists</span><em>{playlists.length || ''}</em></button>
      </nav>
      <div className="sidebar-bottom">
        <p className="tiny-label">LOCAL MODE</p><p className="privacy"><span className={`status-dot ${isOnline ? '' : 'offline'}`} /> {isOnline ? 'Nothing leaves this device' : 'Offline · your library is here'}</p>
        <button className="text-button" onClick={exportData}>↥ Export library</button>
        <button className="text-button" onClick={() => fileInput.current?.click()}>＋ Import audio</button>
        <input ref={fileInput} hidden type="file" accept="audio/*" multiple onChange={onInput} />
      </div>
    </aside>
    <main className="main-stage">
      <header className="topbar">
        <button className="mobile-brand" onClick={() => navigate('home')}>open <b>music</b></button>
        <div className="breadcrumbs">{view === 'home' ? 'YOUR STATION' : view === 'queue' ? 'UP NEXT' : view.toUpperCase()}</div>
        <div className="top-actions"><span className={`connection-status ${isOnline ? 'online' : 'offline'}`} aria-label={isOnline ? 'Online' : 'Offline'} title={offlineReady ? 'App shell available offline' : 'Offline support is still preparing'}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span><button className="icon-button" aria-label="Search" onClick={() => navigate('search')}>⌕</button><button className="avatar" aria-label="Local profile">OM</button></div>
      </header>

      {view === 'search' && <section className="content search-view">
        <div className="heading-row"><div><p className="tiny-label">{catalogMode ? 'WIKIMEDIA COMMONS · OPEN LICENSES' : 'FIND A SOUND'}</p><h1>{catalogMode ? 'Open catalog.' : 'Search your library.'}</h1></div>
          <button className="outline-button" onClick={() => { setCatalogMode(value => !value); setCatalogTracks([]); setCatalogError('') }}>{catalogMode ? 'Search your files' : 'Explore open music'}</button>
        </div>
        <div className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={catalogMode ? 'Search openly licensed recordings' : 'Track, artist, genre or tag'} /></div>
        {catalogMode ? <><p className="catalog-disclosure">Recordings surfaced from Wikimedia Commons. Each result is screened for CC0, public domain, or Creative Commons Attribution licenses; open its source page for full credit and license terms. Availability and playback format vary.</p>
          {catalogLoading && <p className="muted" role="status">Searching Wikimedia Commons…</p>}
          {catalogError && <p className="catalog-error" role="alert">{catalogError} Check your connection and try another search.</p>}
          {!catalogLoading && !catalogError && query.trim() && !catalogTracks.length && <p className="muted">No matching openly licensed recordings were found. Try a different search.</p>}
          <TrackList tracks={catalogTracks} liked={liked} onPlay={play} onLike={toggleLike} onNotInterested={dismissTrack} onQueue={addToQueue} onSaveToLibrary={addToLibrary} onAddToPlaylist={addToPlaylist} />
        </> : <TrackList tracks={filtered} liked={liked} onPlay={play} onLike={toggleLike} onNotInterested={dismissTrack} onQueue={addToQueue} onEdit={startEditing} onAddToPlaylist={addToPlaylist} />}
      </section>}

      {view === 'queue' && <section className="content">
        <div className="heading-row"><div><p className="tiny-label">PLAY ORDER</p><h1>Up next.</h1></div><span className="track-meta">{queue.length} queued</span></div>
        {current && <div className="queue-current"><span className="tiny-label">NOW PLAYING</span><TrackList tracks={[current]} liked={liked} onPlay={play} onLike={toggleLike} onQueue={() => setToast('This is already playing.')} /></div>}
        {queue.length ? <div className="track-list">{queue.map((track, index) => <div className="track-row queue-row" key={`${track.id}-${index}`}>
          <span className="track-index">{String(index + 1).padStart(2, '0')}</span><Artwork track={track} />
          <button className="track-title queue-track-button" onClick={() => playQueued(track, index)}><b>{track.title}</b><span>{track.artist}</span></button>
          <span className="track-meta">{track.genre}</span><span className="track-duration">{track.duration ? formatTime(track.duration) : '—'}</span>
          <button className="more-button" aria-label={`Move ${track.title} up`} disabled={index === 0} onClick={() => moveQueueItem(index, -1)}>↑</button>
          <button className="more-button" aria-label={`Move ${track.title} down`} disabled={index === queue.length - 1} onClick={() => moveQueueItem(index, 1)}>↓</button>
          <button className="more-button" aria-label={`Remove ${track.title} from queue`} onClick={() => setQueue(items => items.filter((_, itemIndex) => itemIndex !== index))}>×</button>
        </div>)}</div> : <EmptyState copy="Add tracks from Search or Your library to build your queue." onImport={() => navigate('search')} />}
      </section>}

      {view === 'playlists' && <section className="content">
        <div className="heading-row"><div><p className="tiny-label">MADE BY YOU</p><h1>Playlists.</h1></div></div>
        <form className="create-playlist" onSubmit={event => void createPlaylist(event)}><label htmlFor="playlist-name">New playlist</label><input id="playlist-name" value={newPlaylistName} onChange={event => setNewPlaylistName(event.target.value)} placeholder="Give it a name" maxLength={80} /><button className="lime-button" type="submit">＋ Create</button></form>
        <div className="playlist-choices" aria-label="Your playlists">{playlists.map(playlist => <div className={`playlist-choice ${playlist.id === activePlaylistId ? 'selected' : ''}`} key={playlist.id}><button onClick={() => setActivePlaylistId(playlist.id)}><b>{playlist.name}</b><span>{playlist.trackIds.length} tracks</span></button><button className="more-button" aria-label={`Delete ${playlist.name}`} onClick={() => void removePlaylist(playlist)}>×</button></div>)}</div>
        {activePlaylist && <><div className="section-heading"><h2>{activePlaylist.name}</h2><button className="subtle-button" onClick={() => navigate('search')}>Find tracks to add →</button></div><TrackList tracks={playlistTracks} liked={liked} onPlay={play} onLike={toggleLike} onNotInterested={dismissTrack} onQueue={addToQueue} onEdit={startEditing} onRemoveFromPlaylist={removeFromPlaylist} onAddToPlaylist={addToPlaylist} /></>}
        {!activePlaylist && !playlists.length && <EmptyState copy="Create a playlist, then add tracks from your library or the open catalog." onImport={() => navigate('search')} />}
      </section>}

      {(view === 'library' || view === 'likes') && <section className="content">
        <div className="heading-row"><div><p className="tiny-label">{view === 'likes' ? 'YOUR PICKS' : 'YOUR FILES + SAVED OPEN MUSIC'}</p><h1>{view === 'likes' ? 'Liked tracks.' : 'Your library.'}</h1></div><button className="outline-button" onClick={() => fileInput.current?.click()}>＋ Add music</button></div>
        {editingTrack && <form className="metadata-editor" onSubmit={event => void saveMetadata(event)}><h2>Edit track details</h2><label>Title<input value={editTitle} onChange={event => setEditTitle(event.target.value)} /></label><label>Artist<input value={editArtist} onChange={event => setEditArtist(event.target.value)} /></label><label>Album<input value={editAlbum} onChange={event => setEditAlbum(event.target.value)} /></label><button className="lime-button">Save details</button><button type="button" className="text-button" onClick={() => setEditingTrack(null)}>Cancel</button></form>}
        {view === 'library' && <>
          <div className="library-toolbar">
            <div className="library-tabs" role="group" aria-label="Browse your library">
              {(['tracks', 'artist', 'album', 'genre'] as const).map(mode => <button key={mode} type="button" aria-pressed={libraryMode === mode} className={libraryMode === mode ? 'selected' : ''} onClick={() => { setLibraryMode(mode); setSelectedLibraryGroup(null) }}>{mode === 'tracks' ? 'Tracks' : `${mode[0].toUpperCase()}${mode.slice(1)}s`}</button>)}
            </div>
            <label className="sort-control">Sort
              <select aria-label="Sort library" value={librarySort} onChange={event => setLibrarySort(event.target.value as LibrarySort)}>
                <option value="title">Title A–Z</option>
                <option value="recent">Recently added</option>
                <option value="played">Most played</option>
              </select>
            </label>
          </div>
          {libraryMode !== 'tracks' && activeLibraryGroup && <div className="section-heading group-heading"><div><button className="text-button" onClick={() => setSelectedLibraryGroup(null)}>← All {libraryMode}s</button><h2>{activeLibraryGroup.label}</h2></div><span className="track-meta">{activeLibraryGroup.tracks.length} tracks · {activeLibraryGroup.playCount} plays</span></div>}
          {libraryMode !== 'tracks' && !activeLibraryGroup && <div className="library-groups" aria-label={`${libraryMode} groups`}>
            {libraryGroups.map(group => <button className="library-group" key={group.key} onClick={() => setSelectedLibraryGroup(group.key)}>
              <Artwork track={group.tracks[0]} /><span><b>{group.label}</b><small>{group.tracks.length} {group.tracks.length === 1 ? 'track' : 'tracks'} · {group.playCount} plays</small></span><span className="group-examples">{group.tracks.slice(0, 3).map(track => track.title).join(' · ')}</span><span aria-hidden="true">→</span>
            </button>)}
            {!libraryGroups.length && <EmptyState onImport={() => fileInput.current?.click()} copy={`Import or save music to browse your library by ${libraryMode}.`} />}
          </div>}
        </>}
        {view === 'library' && libraryMode === 'tracks' && !libraryTracks.length && <EmptyState onImport={() => fileInput.current?.click()} />}
        {view === 'likes' && !likedTracks.length && <EmptyState onImport={() => navigate('search')} copy="Like a track and it will live here." />}
        {((view === 'library' && (libraryMode === 'tracks' ? libraryTracks.length > 0 : Boolean(activeLibraryGroup))) || (view === 'likes' && likedTracks.length > 0)) && <TrackList tracks={view === 'library' ? displayedLibraryTracks : likedTracks} liked={liked} onPlay={play} onLike={toggleLike} onNotInterested={dismissTrack} onQueue={addToQueue} onEdit={startEditing} onAddToPlaylist={addToPlaylist} />}
      </section>}

      {view === 'home' && <section className="content home-view">
        <div className="station-intro"><div><p className="tiny-label">GOOD EVENING, LISTENER</p><h1>Your station,<br /><i>in progress.</i></h1><p className="lede">A private listening space that gets more personal with every play.</p></div><div className="station-note"><span className="signal-line" /><span>Powered by your<br />listening history</span></div></div>
        <div className="section-heading"><div><p className="tiny-label">UP NEXT FOR YOU</p><h2>Made for this moment</h2></div><button className="subtle-button" onClick={() => navigate('queue')}>View queue →</button></div>
        <div className="recommendations">{suggestions.slice(0, 3).map(({ track, reason }, index) => <article className={`feature-track ${index === 0 ? 'featured' : ''}`} key={track.id}>
          <Artwork track={track} large={index === 0} /><div className="feature-copy"><span className="reason">{reason}</span><h3>{track.title}</h3><p>{track.artist} · {track.genre}</p><button className="play-small" onClick={() => play(track)}>▶ Play now</button><button className="play-small queue-add" onClick={() => addToQueue(track)}>＋ Queue</button></div>
          <button className="heart-button" onClick={() => toggleLike(track)} aria-label={liked.has(track.id) ? 'Remove from likes' : 'Like track'}>{liked.has(track.id) ? '♥' : '♡'}</button><button className="more-button recommendation-dismiss" onClick={() => dismissTrack(track)} aria-label={`Not interested in ${track.title}`}>×</button>
        </article>)}</div>
        <div className="lower-grid"><section className="import-panel"><div><p className="tiny-label">YOUR LIBRARY</p><h2>Bring your own sound.</h2><p>Drop audio here or choose files. Metadata stays yours.</p></div><button className="lime-button" onClick={() => fileInput.current?.click()}>＋ Import audio</button></section>
          <section className="recent-panel"><div className="section-heading"><div><p className="tiny-label">RECENTLY PLAYED</p><h2>Keep the thread.</h2></div></div>
            {events.filter(event => event.type === 'complete').slice(-3).reverse().map(event => { const track = tracks.find(item => item.id === event.trackId); return track ? <div className="mini-row" key={`${track.id}-${event.at}`}><Artwork track={track} /><span><b>{track.title}</b><small>{track.artist}</small></span><time>played</time></div> : null })}
            {!events.some(event => event.type === 'complete') && <p className="muted">Your listening history will appear here.</p>}
          </section>
        </div>
      </section>}
    </main>
    <PlayerBar current={current} playing={playing} progress={progress} volume={volume} queueLength={queue.length} liked={current ? liked.has(current.id) : false} audio={audio} onToggle={togglePlayback} onPrevious={previous} onNext={() => { if (current) void record('skip', current); advance() }} onLike={() => { if (current) toggleLike(current) }} onProgress={value => { if (current && (current.blob || current.streamUrl) && audio.current) audio.current.currentTime = value; setProgress(value) }} onVolume={setVolume} />
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}

type TrackListProps = {
  tracks: Track[]
  liked: Set<string>
  onPlay: (track: Track) => void
  onLike: (track: Track) => void
  onNotInterested?: (track: Track) => void
  onQueue?: (track: Track) => void
  onEdit?: (track: Track) => void
  onSaveToLibrary?: (track: Track) => void
  onAddToPlaylist?: (track: Track) => void
  onRemoveFromPlaylist?: (id: string) => void
}

function TrackList({ tracks, liked, onPlay, onLike, onNotInterested, onQueue, onEdit, onSaveToLibrary, onAddToPlaylist, onRemoveFromPlaylist }: TrackListProps) {
  return <div className="track-list">{tracks.map((track, index) => <div className="track-row" key={track.id}>
    <span className="track-index">{String(index + 1).padStart(2, '0')}</span><Artwork track={track} />
    <div className="track-title"><b>{track.title}</b><span>{track.artist}</span>{track.license && <small className="track-license">{track.attribution} · <a href={track.sourceUrl} target="_blank" rel="noreferrer">Source &amp; license</a></small>}</div>
    <span className="track-meta">{track.genre}</span><span className="track-meta">{track.album}</span><span className="track-duration">{track.duration ? formatTime(track.duration) : '—'}</span>
    <button className="row-play" onClick={() => onPlay(track)} aria-label={`Play ${track.title}`}>▶</button>
    {onQueue && <button className="more-button" onClick={() => onQueue(track)} aria-label={`Add ${track.title} to queue`}>＋</button>}
    {onLike && <button className="heart-button" onClick={() => onLike(track)} aria-label={liked.has(track.id) ? `Remove ${track.title} from likes` : `Like ${track.title}`}>{liked.has(track.id) ? '♥' : '♡'}</button>}
    {onEdit && track.id.startsWith('local-') && <button className="more-button" onClick={() => onEdit(track)} aria-label={`Edit ${track.title} details`}>✎</button>}
    {onSaveToLibrary && !track.saved && <button className="more-button" onClick={() => onSaveToLibrary(track)} aria-label={`Save ${track.title} to library`}>↓</button>}
    {onAddToPlaylist && <button className="more-button" onClick={() => onAddToPlaylist(track)} aria-label={`Add ${track.title} to playlist`}>≡</button>}
    {onRemoveFromPlaylist && <button className="more-button" onClick={() => onRemoveFromPlaylist(track.id)} aria-label={`Remove ${track.title} from playlist`}>×</button>}
    {onNotInterested && <button className="more-button" onClick={() => onNotInterested(track)} aria-label={`Not interested in ${track.title}`}>×</button>}
  </div>)}{!tracks.length && <p className="empty-inline">No tracks found.</p>}</div>
}

function EmptyState({ onImport, copy = 'Your imported audio will appear here.' }: { onImport: () => void; copy?: string }) {
  return <div className="empty-state"><span className="empty-symbol">◌</span><h2>Nothing here yet.</h2><p>{copy}</p><button className="lime-button" onClick={onImport}>＋ Import audio</button></div>
}
