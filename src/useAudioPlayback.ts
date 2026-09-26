import { useEffect } from 'react'
import type { RefObject } from 'react'
import type { Track } from './types'

export function useAudioPlayback(
  audio: RefObject<HTMLAudioElement | null>,
  track: Track | null,
  playing: boolean,
  onError: () => void,
) {
  useEffect(() => {
    const element = audio.current
    if (!element) return
    element.pause()
    if (!track?.blob && !track?.streamUrl) {
      element.removeAttribute('src')
      element.load()
      return
    }
    const url = track.blob ? URL.createObjectURL(track.blob) : track.streamUrl
    if (!url) return
    element.src = url
    element.load()
    return () => {
      element.pause()
      if (track.blob) URL.revokeObjectURL(url)
    }
  }, [audio, track?.id])

  useEffect(() => {
    const element = audio.current
    if (!element || (!track?.blob && !track?.streamUrl)) return
    if (!playing) {
      element.pause()
      return
    }
    let effectIsCurrent = true
    void element.play().catch(() => {
      if (effectIsCurrent) onError()
    })
    return () => { effectIsCurrent = false }
  }, [audio, playing, track?.id, onError])
}
