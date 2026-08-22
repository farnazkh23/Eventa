import { describe, expect, it } from 'vitest'
import { corsResponseHeaders } from './cors.js'

describe('corsResponseHeaders', () => {
  it('allows the configured production frontend origin', () => {
    expect(corsResponseHeaders(
      'https://eventa.vercel.app',
      'https://eventa.vercel.app/',
    )).toEqual({
      Vary: 'Origin',
      'Access-Control-Allow-Origin': 'https://eventa.vercel.app',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Request-Id',
    })
  })

  it.each([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ])('allows local development origin %s', (origin) => {
    expect(corsResponseHeaders(origin, null)['Access-Control-Allow-Origin']).toBe(origin)
  })

  it('does not reflect an unapproved origin or wildcard configuration', () => {
    const unapproved = corsResponseHeaders('https://malicious.example', 'https://eventa.vercel.app')
    const wildcard = corsResponseHeaders('https://malicious.example', '*')

    expect(unapproved).toEqual({ Vary: 'Origin' })
    expect(wildcard).toEqual({ Vary: 'Origin' })
  })
})
