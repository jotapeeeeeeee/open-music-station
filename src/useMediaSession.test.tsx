// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { demoTracks } from './data'
import { useMediaSession } from './useMediaSession'

describe('Media Session controls', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'mediaSession')
    Reflect.deleteProperty(globalThis, 'MediaMetadata')
  })

  it('publishes track metadata and routes system transport actions', () => {
    const handlers = new Map<string, MediaSessionActionHandler | null>()
    const setActionHandler = vi.fn((action: string, handler: MediaSessionActionHandler | null) => handlers.set(action, handler))
    const session = { metadata: null, playbackState: 'none', setActionHandler } as unknown as MediaSession
    Object.defineProperty(navigator, 'mediaSession', { configurable: true, value: session })
    class TestMediaMetadata {
      constructor(readonly values: MediaMetadataInit) {}
    }
    Object.defineProperty(globalThis, 'MediaMetadata', { configurable: true, value: TestMediaMetadata })
    const actions = { play: vi.fn(), pause: vi.fn(), previous: vi.fn(), next: vi.fn() }
    const { unmount } = renderHook(() => useMediaSession(demoTracks[0], true, actions))

    expect((session.metadata as unknown as InstanceType<typeof TestMediaMetadata>).values).toMatchObject({ title: 'Night Bus', artist: 'Open Signals' })
    expect(session.playbackState).toBe('playing')
    handlers.get('play')?.({} as MediaSessionActionDetails)
    handlers.get('previoustrack')?.({} as MediaSessionActionDetails)
    handlers.get('nexttrack')?.({} as MediaSessionActionDetails)
    expect(actions.play).toHaveBeenCalledOnce()
    expect(actions.previous).toHaveBeenCalledOnce()
    expect(actions.next).toHaveBeenCalledOnce()
    unmount()
    expect(handlers.get('nexttrack')).toBeNull()
  })
})
