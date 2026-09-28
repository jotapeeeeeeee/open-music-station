// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useOnlineStatus } from './useOnlineStatus'

describe('online status', () => {
  afterEach(() => vi.restoreAllMocks())

  it('tracks browser online and offline events', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    act(() => window.dispatchEvent(new Event('offline')))
    expect(result.current).toBe(false)
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    act(() => window.dispatchEvent(new Event('online')))
    expect(result.current).toBe(true)
  })
})
