import { describe, expect, it, vi } from 'vitest'
import type { GeneratedMenu } from '../schemas/menu.js'
import { GeminiMenuGenerator } from './geminiMenuGenerator.js'
import type { MenuGenerationInput } from './menuGenerator.js'
import type { generateStructuredJson } from './gemini.js'

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

const validMenu: GeneratedMenu = {
  title: 'Birthday dinner',
  summary: 'A concise seated menu.',
  items: [
    {
      course: 'main',
      name: 'Roasted chicken',
      description: 'Chicken with seasonal vegetables.',
      dietaryTags: [],
      portion: { amount: 180, unit: 'g' },
      ingredients: [{ name: 'chicken', amountPerServing: 180, unit: 'g' }],
      servingScope: 'all_guests',
    },
    {
      course: 'vegan',
      name: 'Mushroom risotto',
      description: 'Plant-based risotto with herbs.',
      dietaryTags: ['vegan'],
      portion: { amount: 280, unit: 'g' },
      ingredients: [{ name: 'risotto rice', amountPerServing: 90, unit: 'g' }],
      servingScope: 'dietary_option',
    },
  ],
  planningAssumptions: ['4 vegan guests were specified; allocation is deferred.'],
}

describe('GeminiMenuGenerator corrective regeneration', () => {
  it('allows one clean regeneration after menu schema validation fails', async () => {
    const generate = vi.fn<typeof generateStructuredJson>()
      .mockResolvedValueOnce({ value: { title: 'Incomplete' }, geminiAttempt: 1 })
      .mockResolvedValueOnce({ value: validMenu, geminiAttempt: 1 })
    const generator = new GeminiMenuGenerator('test-key', 'test-model', generate)

    await expect(generator.generate(input)).resolves.toMatchObject({ title: 'Birthday dinner' })
    expect(generate).toHaveBeenCalledTimes(2)
    expect(generate.mock.calls[1]?.[0].contents).toContain('correction')
  })

  it('allows one clean regeneration after policy validation fails', async () => {
    const invalidPolicyMenu: GeneratedMenu = {
      ...validMenu,
      planningAssumptions: ['Plan 31 standard meals and 4 vegan meals.'],
    }
    const generate = vi.fn<typeof generateStructuredJson>()
      .mockResolvedValueOnce({ value: invalidPolicyMenu, geminiAttempt: 1 })
      .mockResolvedValueOnce({ value: validMenu, geminiAttempt: 1 })
    const generator = new GeminiMenuGenerator('test-key', 'test-model', generate)

    await expect(generator.generate(input)).resolves.toMatchObject({ title: 'Birthday dinner' })
    expect(generate).toHaveBeenCalledTimes(2)
  })
})
