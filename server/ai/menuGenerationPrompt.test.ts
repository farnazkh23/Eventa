import { describe, expect, it } from 'vitest'
import type { MenuGenerationInput } from './menuGenerator.js'
import { createMenuPromptContents } from './menuGenerationPrompt.js'

const input: MenuGenerationInput = {
  event: {
    eventType: 'birthday',
    guestCount: 35,
    location: 'Zürich',
    date: null,
    time: null,
    mealType: 'dinner',
    serviceStyle: 'seated',
    budgetPerGuest: null,
    totalBudget: null,
    dietaryRequirements: [{ type: 'vegan', guestCount: 4 }],
    additionalNotes: [],
  },
}

describe('menu generation prompt', () => {
  it('uses only compact confirmed facts in the model request', () => {
    const contents = createMenuPromptContents({
      ...input,
      originalDescription: 'Redundant source prose that has already been interpreted.',
    }, false)

    expect(contents).toContain('"guestCount":35')
    expect(contents).not.toContain('Redundant source prose')
    expect(contents).not.toContain('"date":null')
    expect(contents).not.toContain('correction')
  })
})
