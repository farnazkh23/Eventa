import { describe, expect, it } from 'vitest'
import { getPlanningProgress } from './planningProgress'

describe('initial plan waiting progress', () => {
  it('blocks only on menu creation', () => {
    expect(getPlanningProgress().map(({ state }) => state)).toEqual([
      'completed',
      'active',
      'pending',
      'pending',
      'pending',
    ])
  })

  it('keeps the complete checklist copy in order', () => {
    expect(getPlanningProgress().map(({ label }) => label)).toEqual([
      'Understanding your event',
      'Creating your menu',
      'Calculating quantities',
      'Matching products',
      'Calculating budget',
    ])
  })
})
