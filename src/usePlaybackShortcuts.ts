import { useEffect } from 'react'

export function usePlaybackShortcuts(togglePlayback: () => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== 'Space' || event.repeat) return
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      event.preventDefault()
      togglePlayback()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePlayback])
}
