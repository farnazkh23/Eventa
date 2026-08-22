import { describe, expect, it } from 'vitest'
import { shouldPlayIntro } from './introSession'

describe('Eventa intro session behavior', () => {
  it('plays once in a motion-enabled fresh session', () => {
    expect(shouldPlayIntro(false, false)).toBe(true)
  })

  it('does not replay in the same session', () => {
    expect(shouldPlayIntro(true, false)).toBe(false)
  })

  it('skips playback when reduced motion is preferred', () => {
    expect(shouldPlayIntro(false, true)).toBe(false)
  })
})
