import { describe, expect, it } from 'vitest'
import { shouldPlayIntro, shouldStartIntroPlayback } from './introSession'

describe('Eventa intro document-load behavior', () => {
  it('plays on a motion-enabled document load', () => {
    expect(shouldPlayIntro(false)).toBe(true)
  })

  it('does not depend on session playback history', () => {
    expect(shouldPlayIntro(false)).toBe(true)
  })

  it('starts only once within the current document', () => {
    expect(shouldStartIntroPlayback(false)).toBe(true)
    expect(shouldStartIntroPlayback(true)).toBe(false)
  })

  it('skips playback when reduced motion is preferred', () => {
    expect(shouldPlayIntro(true)).toBe(false)
  })
})
