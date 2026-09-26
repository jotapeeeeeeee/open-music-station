// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePlaybackShortcuts } from './usePlaybackShortcuts'

describe('spacebar playback shortcut', () => {
  it('toggles playback when focus is not in an interactive control', () => {
    const toggle = vi.fn()
    renderHook(() => usePlaybackShortcuts(toggle))
    const event = new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true })
    window.dispatchEvent(event)
    expect(toggle).toHaveBeenCalledOnce()
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not steal space from buttons or inputs', () => {
    const toggle = vi.fn()
    renderHook(() => usePlaybackShortcuts(toggle))
    const input = document.createElement('input')
    document.body.append(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true }))
    expect(toggle).not.toHaveBeenCalled()
    input.remove()
  })
})
