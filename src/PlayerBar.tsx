import type { ChangeEvent, RefObject } from 'react'
import { formatTime } from './data'
import type { Track } from './types'

type PlayerBarProps = {
  current: Track | null
  playing: boolean
  progress: number
  volume: number
  queueLength: number
  liked: boolean
  audio: RefObject<HTMLAudioElement | null>
  onToggle: () => void
  onPrevious: () => void
  onNext: () => void
  onLike: () => void
  onProgress: (value: number) => void
  onVolume: (value: number) => void
}

export default function PlayerBar({ current, playing, progress, volume, queueLength, liked, audio, onToggle, onPrevious, onNext, onLike, onProgress, onVolume }: PlayerBarProps) {
  function seek(event: ChangeEvent<HTMLInputElement>) {
    const time = Number(event.currentTarget.value)
    if ((current?.blob || current?.streamUrl) && audio.current) audio.current.currentTime = time
    onProgress(time)
  }

  return <footer className="player">{current ? <>
    <div className="now-playing">
      <div className="artwork"><span>{current.title.split(' ').map(word => word[0]).join('').slice(0, 2)}</span></div>
      <div className="now-playing-copy"><b>{current.title}</b><span>{current.artist}</span>
        {current.license && <span className="playback-attribution">{current.attribution} · <a href={current.licenseUrl} target="_blank" rel="noreferrer">license</a> · <a href={current.sourceUrl} target="_blank" rel="noreferrer">source</a></span>}
        {!current.blob && !current.streamUrl && <small className="demo-label">Synthetic demo tone</small>}
      </div>
      <button className="heart-button" onClick={onLike} aria-label={liked ? 'Remove from likes' : 'Add to likes'}>{liked ? '♥' : '♡'}</button>
    </div>
    <div className="transport">
      <div className="transport-buttons">
        <button aria-label="Previous track" onClick={onPrevious}>↶</button>
        <button className="play-main" onClick={onToggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? 'Ⅱ' : '▶'}</button>
        <button aria-label={`Next track${queueLength ? `, ${queueLength} queued` : ''}`} onClick={onNext}>↷</button>
      </div>
      <div className="progress-wrap">
        <span>{formatTime(progress)}</span>
        <input aria-label="Track progress" type="range" min="0" max={current.duration || 1} value={Math.min(progress, current.duration || 1)} onChange={seek} />
        <span>{formatTime(current.duration)}</span>
      </div>
    </div>
    <div className="volume"><span aria-hidden="true">⌕</span><input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={event => onVolume(Number(event.currentTarget.value))} /></div>
  </> : <div className="player-empty"><span className="pulse" /> Select a track to start listening</div>}</footer>
}
