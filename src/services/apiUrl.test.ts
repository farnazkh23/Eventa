import { describe, expect, it } from 'vitest'
import { getApiUrl } from './apiUrl'

describe('getApiUrl', () => {
  it('keeps relative API URLs when no base URL is configured', () => {
    expect(getApiUrl('/api/interpret-event', '')).toBe('/api/interpret-event')
    expect(getApiUrl('api/generate-menu', undefined)).toBe('/api/generate-menu')
  })

  it('prefixes API paths with the configured production origin', () => {
    expect(getApiUrl('/api/interpret-event', 'https://api.example.com')).toBe(
      'https://api.example.com/api/interpret-event',
    )
  })

  it('normalizes whitespace and trailing slashes safely', () => {
    expect(getApiUrl('/api/generate-menu', '  https://api.example.com///  ')).toBe(
      'https://api.example.com/api/generate-menu',
    )
  })
})
