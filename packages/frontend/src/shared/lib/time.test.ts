import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatRelativeTime, formatTime } from './time'

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 방금 전 for less than 1 minute ago', () => {
    expect(formatRelativeTime('2026-01-15T11:59:30Z')).toBe('방금 전')
  })

  it('returns N분 전 for minutes ago', () => {
    expect(formatRelativeTime('2026-01-15T11:55:00Z')).toBe('5분 전')
    expect(formatRelativeTime('2026-01-15T11:01:00Z')).toBe('59분 전')
  })

  it('returns N시간 전 for hours ago', () => {
    expect(formatRelativeTime('2026-01-15T10:00:00Z')).toBe('2시간 전')
    expect(formatRelativeTime('2026-01-14T13:00:00Z')).toBe('23시간 전')
  })

  it('returns N일 전 for days ago', () => {
    expect(formatRelativeTime('2026-01-14T12:00:00Z')).toBe('1일 전')
    expect(formatRelativeTime('2026-01-09T12:00:00Z')).toBe('6일 전')
  })

  it('returns N주 전 for weeks ago', () => {
    expect(formatRelativeTime('2026-01-08T12:00:00Z')).toBe('1주 전')
    expect(formatRelativeTime('2025-12-25T12:00:00Z')).toBe('3주 전')
  })

  it('returns N개월 전 for months ago', () => {
    expect(formatRelativeTime('2025-12-15T12:00:00Z')).toBe('1개월 전')
    expect(formatRelativeTime('2025-06-15T12:00:00Z')).toBe('7개월 전')
  })

  it('returns N년 전 for years ago', () => {
    expect(formatRelativeTime('2025-01-15T12:00:00Z')).toBe('1년 전')
    expect(formatRelativeTime('2023-01-15T12:00:00Z')).toBe('3년 전')
  })
})

describe('formatTime', () => {
  it('returns a string', () => {
    const result = formatTime('2026-01-15T14:30:00Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
