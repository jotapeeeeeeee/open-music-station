import { useEffect, useRef } from 'react'
import type { Track } from './types'

type MediaActions = { play: () => void; pause: () => void; previous: () => void; next: () => void }
type ActionName = 'play' | 'pause' | 'previoustrack' | 'nexttrack'

function registerAction(session: MediaSession, action: ActionName, handler: MediaSessionActionHandler | null) {
  try {
    session.setActionHandler(action, handler)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotSupportedError') return
    throw error
  }
}

export function useMediaSession(track: Track | null, playing: boolean, actions: MediaActions) {
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  useEffect(() => {
    document.title = track ? `${playing ? 'Playing' : 'Paused'}: ${track.title} — Open Music Station` : 'Open Music Station'
    if (!track || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return
    const session = navigator.mediaSession
    session.metadata = new MediaMetadata({ title: track.title, artist: track.artist, album: track.album })
    session.playbackState = playing ? 'playing' : 'paused'
    registerAction(session, 'play', () => actionsRef.current.play())
    registerAction(session, 'pause', () => actionsRef.current.pause())
    registerAction(session, 'previoustrack', () => actionsRef.current.previous())
    registerAction(session, 'nexttrack', () => actionsRef.current.next())
    return () => {
      registerAction(session, 'play', null)
      registerAction(session, 'pause', null)
      registerAction(session, 'previoustrack', null)
      registerAction(session, 'nexttrack', null)
    }
  }, [track?.id, track?.title, track?.artist, track?.album, playing])
}
