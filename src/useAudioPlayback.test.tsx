// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoTracks } from './data'
import { useAudioPlayback } from './useAudioPlayback'

describe('useAudioPlayback', () => {
  const audio = document.createElement('audio')
  const track = { ...demoTracks[0], blob: new Blob(['audio']) }
  const createObjectURL = vi.fn(() => 'blob:local-track')
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    audio.currentTime = 0
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
  })

  afterEach(() => vi.restoreAllMocks())

  it('keeps one source and its playhead when pausing and resuming', () => {
    const audioRef = { current: audio }
    const onError = vi.fn()
    const { rerender, unmount } = renderHook(
      ({ playing }) => useAudioPlayback(audioRef, track, playing, onError),
      { initialProps: { playing: true } },
    )

    audio.currentTime = 31
    rerender({ playing: false })
    rerender({ playing: true })

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(audio.getAttribute('src')).toBe('blob:local-track')
    expect(audio.currentTime).toBe(31)
    expect(audio.play).toHaveBeenCalledTimes(2)
    expect(audio.pause).toHaveBeenCalled()
    expect(revokeObjectURL).not.toHaveBeenCalled()

    unmount()
    expect(revokeObjectURL).toHaveBeenCalledOnce()
  })
})
