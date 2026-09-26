import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, DragEvent } from 'react'
import { demoTracks, formatTime } from './data'
import { recommend } from './recommend'
import { loadEvents, loadTracks, saveEvent, saveTrack } from './storage'
import { createQueue, takeNextTrack, takePreviousTrack } from './playback'
import PlayerBar from './PlayerBar'
import { useAudioPlayback } from './useAudioPlayback'
import type { ListeningEvent, Track } from './types'

type View = 'home' | 'search' | 'library' | 'likes' | 'queue'

function Artwork({ track, large = false }: { track: Track; large?: boolean }) {
  return <div className={`artwork ${large ? 'artwork-large' : ''}`} style={{ '--art': track.color } as CSSProperties}><span>{track.title.split(' ').map(w => w[0]).join('').slice(0, 2)}</span></div>
}

export default function App() {
  const [tracks, setTracks] = useState<Track[]>(demoTracks), [events, setEvents] = useState<ListeningEvent[]>([])
  const [view, setView] = useState<View>('home'), [query, setQuery] = useState(''), [current, setCurrent] = useState<Track | null>(null)
  const [playing, setPlaying] = useState(false), [progress, setProgress] = useState(0), [volume, setVolume] = useState(0.78)
  const [queue, setQueue] = useState<Track[]>([]), [playbackHistory, setPlaybackHistory] = useState<Track[]>([])
  const [toast, setToast] = useState(''), [dragging, setDragging] = useState(false), [notInterested, setNotInterested] = useState<Set<string>>(new Set())
  const audio = useRef<HTMLAudioElement | null>(null), fileInput = useRef<HTMLInputElement | null>(null), audioContext = useRef<AudioContext | null>(null)

  useEffect(() => { Promise.all([loadTracks(), loadEvents()]).then(([saved, history]) => { if (saved.length) setTracks([...demoTracks, ...saved.filter(t => !t.id.startsWith('demo-'))]); setEvents(history) }) }, [])
  const handlePlaybackError = useCallback(() => {
    setPlaying(false)
    setToast(`Could not play “${current?.title ?? 'this track'}”. Try another audio format.`)
  }, [current?.title])
  useAudioPlayback(audio, current, playing, handlePlaybackError)
  useEffect(() => {
    if (!playing || !current || current.blob) return
    const startingProgress = progress
    const startedAt = Date.now()
    let completed = false
    const id = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      const next = Math.min(current.duration, startingProgress + elapsed)
      setProgress(next)
      if (next >= current.duration && !completed) {
        completed = true
        window.clearInterval(id)
        void record('complete', current)
        advance()
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [playing, current?.id])
  useEffect(() => {
    if (!current || current.blob) return
    if (!playing) return
    const context = audioContext.current ?? new AudioContext(); audioContext.current = context
    const oscillator = context.createOscillator(); const gain = context.createGain()
    oscillator.frequency.value = 180 + (current.id.charCodeAt(5) % 5) * 38; oscillator.type = 'triangle'; gain.gain.value = volume * 0.035
    oscillator.connect(gain).connect(context.destination); oscillator.start()
    return () => oscillator.stop()
  }, [current, playing, volume])
  useEffect(() => { if (audio.current) audio.current.volume = volume }, [volume])
  const suggestions = useMemo(() => recommend(tracks.filter(t => !notInterested.has(t.id)), events), [tracks, events, notInterested])
  const filtered = tracks.filter(t => `${t.title} ${t.artist} ${t.genre} ${t.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  const liked = new Set(events.filter(e => e.type === 'like').map(e => e.trackId))

  async function record(type: ListeningEvent['type'], track: Track) { const event = { trackId: track.id, type, at: Date.now() }; setEvents(e => [...e, event]); await saveEvent(event) }
  function play(track: Track) {
    if (current && current.id !== track.id) setPlaybackHistory(history => [...history, current])
    setCurrent(track)
    setQueue(createQueue(tracks, track.id))
    setPlaying(true)
    setProgress(0)
  }
  function advance() {
    if (!current) return
    const next = takeNextTrack(queue, tracks, current.id)
    if (!next.track) { setPlaying(false); return }
    setPlaybackHistory(history => [...history, current])
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
  function handleFiles(files: FileList | File[]) { Array.from(files).filter(f => f.type.startsWith('audio/')).forEach(file => { const track: Track = { id: `local-${crypto.randomUUID()}`, title: file.name.replace(/\.[^/.]+$/, ''), artist: 'Local file', album: 'Imported', year: new Date().getFullYear(), genre: 'Unsorted', tags: ['your library'], duration: 0, color: '#d7f45b', blob: file }; setTracks(t => [...t, track]); void saveTrack(track); setToast('Added to your library') }); setDragging(false) }
  function onInput(e: ChangeEvent<HTMLInputElement>) { if (e.target.files) handleFiles(e.target.files) }
  function onDrop(e: DragEvent) { e.preventDefault(); handleFiles(e.dataTransfer.files) }
  function exportData() { const blob = new Blob([JSON.stringify({ tracks: tracks.filter(t => !t.id.startsWith('demo-')).map(({ blob: _blob, ...t }) => t), events }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'open-music-station.json'; a.click(); URL.revokeObjectURL(url) }
  function toggleLike(track: Track) { void record('like', track); setToast(liked.has(track.id) ? 'Removed from likes' : 'Saved to likes') }
  function nav(v: View) { setView(v); if (v !== 'search') setQuery('') }

  return <div className="app-shell" onDragOver={e => { e.preventDefault(); setDragging(true) }} onDrop={onDrop}><audio ref={audio} onTimeUpdate={e => setProgress(e.currentTarget.currentTime)} onLoadedMetadata={e => {
    if (!current?.blob || !Number.isFinite(e.currentTarget.duration)) return
    const updated = { ...current, duration: e.currentTarget.duration }
    setCurrent(updated)
    void saveTrack(updated)
  }} onEnded={() => { if (current) void record('complete', current); advance() }} onError={() => {
    if (current?.blob) { setPlaying(false); setToast(`Could not decode “${current.title}”. Try another audio format.`) }
  }} />
    {dragging && <div className="drop-overlay"><strong>Drop audio to add it</strong><span>Files stay in this browser</span></div>}
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">◒</span><span>open<br /><b>music</b></span></div>
      <nav aria-label="Main navigation"><button className={view === 'home' ? 'active' : ''} onClick={() => nav('home')}>⌂ <span>Station</span></button><button className={view === 'search' ? 'active' : ''} onClick={() => nav('search')}>⌕ <span>Search</span></button><button className={view === 'library' ? 'active' : ''} onClick={() => nav('library')}>▦ <span>Your library</span></button><button className={view === 'likes' ? 'active' : ''} onClick={() => nav('likes')}>♡ <span>Likes</span><em>{liked.size || ''}</em></button></nav>
      <div className="sidebar-bottom"><p className="tiny-label">LOCAL MODE</p><p className="privacy"><span className="status-dot" /> Nothing leaves this device</p><button className="text-button" onClick={exportData}>↥ Export library</button><button className="text-button" onClick={() => fileInput.current?.click()}>＋ Import audio</button><input ref={fileInput} hidden type="file" accept="audio/*" multiple onChange={onInput} /></div>
    </aside>
    <main className="main-stage">
      <header className="topbar"><button className="mobile-brand" onClick={() => nav('home')}>open <b>music</b></button><div className="breadcrumbs">{view === 'home' ? 'YOUR STATION' : view.replace('-', ' ').toUpperCase()}</div><div className="top-actions"><button className="icon-button" aria-label="Search" onClick={() => nav('search')}>⌕</button><button className="avatar" aria-label="Local profile">OM</button></div></header>
      {view === 'search' ? <section className="content search-view"><div className="heading-row"><div><p className="tiny-label">FIND A SOUND</p><h1>Search your library.</h1></div></div><div className="search-box"><span>⌕</span><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Track, artist, genre or tag" /></div><TrackList tracks={filtered} liked={liked} onPlay={play} onLike={toggleLike} onNotInterested={t => { setNotInterested(s => new Set(s).add(t.id)); void record('not-interested', t) }} /></section> : view === 'library' || view === 'likes' ? <section className="content"><div className="heading-row"><div><p className="tiny-label">{view === 'likes' ? 'YOUR PICKS' : 'YOUR FILES'}</p><h1>{view === 'likes' ? 'Liked tracks.' : 'Your library.'}</h1></div><button className="outline-button" onClick={() => fileInput.current?.click()}>＋ Add music</button></div>{view === 'library' && !tracks.some(t => t.id.startsWith('local-')) && <EmptyState onImport={() => fileInput.current?.click()} />}{view === 'likes' && !liked.size && <EmptyState onImport={() => nav('home')} copy="Like a track and it will live here." />}{(view === 'library' ? tracks.filter(t => t.id.startsWith('local-')) : tracks.filter(t => liked.has(t.id))).length > 0 && <TrackList tracks={view === 'library' ? tracks.filter(t => t.id.startsWith('local-')) : tracks.filter(t => liked.has(t.id))} liked={liked} onPlay={play} onLike={toggleLike} />}</section> : <section className="content home-view"><div className="station-intro"><div><p className="tiny-label">GOOD EVENING, LISTENER</p><h1>Your station,<br /><i>in progress.</i></h1><p className="lede">A private listening space that gets more personal with every play.</p></div><div className="station-note"><span className="signal-line" /><span>Powered by your<br />listening history</span></div></div><div className="section-heading"><div><p className="tiny-label">UP NEXT FOR YOU</p><h2>Made for this moment</h2></div><button className="subtle-button" onClick={() => nav('queue')}>View queue →</button></div><div className="recommendations">{suggestions.slice(0, 3).map(({ track, reason }, i) => <article className={`feature-track ${i === 0 ? 'featured' : ''}`} key={track.id} onDoubleClick={() => play(track)}><Artwork track={track} large={i === 0} /><div className="feature-copy"><span className="reason">{reason}</span><h3>{track.title}</h3><p>{track.artist} · {track.genre}</p><button className="play-small" onClick={() => play(track)}>▶ Play now</button></div><button className="heart-button" onClick={() => toggleLike(track)} aria-label="Like track">{liked.has(track.id) ? '♥' : '♡'}</button></article>)}</div><div className="lower-grid"><section className="import-panel"><div><p className="tiny-label">YOUR LIBRARY</p><h2>Bring your own sound.</h2><p>Drop audio here or choose files. Metadata stays yours.</p></div><button className="lime-button" onClick={() => fileInput.current?.click()}>＋ Import audio</button></section><section className="recent-panel"><div className="section-heading"><div><p className="tiny-label">RECENTLY PLAYED</p><h2>Keep the thread.</h2></div></div>{events.filter(e => e.type === 'complete').slice(-3).reverse().map(e => { const t = tracks.find(x => x.id === e.trackId); return t ? <div className="mini-row" key={`${t.id}-${e.at}`}><Artwork track={t} /><span><b>{t.title}</b><small>{t.artist}</small></span><time>played</time></div> : null })}{!events.length && <p className="muted">Your listening history will appear here.</p>}</section></div></section>}
    </main>
    <PlayerBar current={current} playing={playing} progress={progress} volume={volume} queueLength={queue.length} liked={current ? liked.has(current.id) : false} audio={audio} onToggle={() => setPlaying(value => !value)} onPrevious={previous} onNext={advance} onLike={() => { if (current) toggleLike(current) }} onProgress={setProgress} onVolume={setVolume} />
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}

function TrackList({ tracks, liked, onPlay, onLike, onNotInterested }: { tracks: Track[]; liked: Set<string>; onPlay: (t: Track) => void; onLike: (t: Track) => void; onNotInterested?: (t: Track) => void }) {
  return <div className="track-list">{tracks.map((track, index) => <div className="track-row" key={track.id}><span className="track-index">{String(index + 1).padStart(2, '0')}</span><Artwork track={track} /><div className="track-title"><b>{track.title}</b><span>{track.artist}</span></div><span className="track-meta">{track.genre}</span><span className="track-meta">{track.album}</span><span className="track-duration">{track.duration ? formatTime(track.duration) : '—'}</span><button className="row-play" onClick={() => onPlay(track)} aria-label={`Play ${track.title}`}>▶</button><button className="heart-button" onClick={() => onLike(track)} aria-label="Like track">{liked.has(track.id) ? '♥' : '♡'}</button>{onNotInterested && <button className="more-button" onClick={() => onNotInterested(track)} aria-label="Not interested">×</button>}</div>)}{!tracks.length && <p className="empty-inline">No tracks match that search.</p>}</div>
}
function EmptyState({ onImport, copy = 'Your imported audio will appear here.' }: { onImport: () => void; copy?: string }) { return <div className="empty-state"><span className="empty-symbol">◌</span><h2>Nothing here yet.</h2><p>{copy}</p><button className="lime-button" onClick={onImport}>＋ Import audio</button></div> }
