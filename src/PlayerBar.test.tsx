// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PlayerBar from './PlayerBar'
import { demoTracks } from './data'
import type { RefObject } from 'react'

afterEach(cleanup)

function renderPlayer(audioElement: HTMLAudioElement) {
  const props = {
    current: { ...demoTracks[0], blob: new Blob(['audio']) },
    playing: true,
    progress: 12,
    volume: 0.5,
    queueLength: 2,
    liked: false,
    audio: { current: audioElement } as RefObject<HTMLAudioElement | null>,
    onToggle: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onLike: vi.fn(),
    onProgress: vi.fn(),
    onVolume: vi.fn(),
  }
  render(<PlayerBar {...props} />)
  return props
}

describe('player controls', () => {
  it('seeks the actual audio element and synchronizes displayed progress', () => {
    const audio = document.createElement('audio')
    const props = renderPlayer(audio)
    fireEvent.change(screen.getByRole('slider', { name: 'Track progress' }), { target: { value: '42' } })
    expect(audio.currentTime).toBe(42)
    expect(props.onProgress).toHaveBeenCalledWith(42)
  })

  it('exposes accessible transport controls and invokes their actions', () => {
    const props = renderPlayer(document.createElement('audio'))
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous track' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next track, 2 queued' }))
    expect(props.onToggle).toHaveBeenCalledOnce()
    expect(props.onPrevious).toHaveBeenCalledOnce()
    expect(props.onNext).toHaveBeenCalledOnce()
  })
})
