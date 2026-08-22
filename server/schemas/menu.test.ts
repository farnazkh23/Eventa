import { describe, expect, it } from 'vitest'
import {
  eventMenuSchema,
  generateMenuRequestSchema,
  generatedMenuSchema,
  generatedMenuJsonSchema,
} from './menu.js'

const event = {
  eventType: 'Corporate summer party',
  guestCount: 120,
  location: 'Bern',
  date: null,
  time: null,
  mealType: 'dinner',
  serviceStyle: 'buffet',
  budgetPerGuest: 45,
  totalBudget: null,
  dietaryRequirements: [{ type: 'vegetarian', guestCount: null }],
  additionalNotes: [],
}

const generatedMenu = {
  title: 'Summer party buffet',
  summary: 'A relaxed seasonal buffet with a vegetarian main option.',
  items: [
    {
      course: 'starter',
      name: 'Seasonal leaf salad',
      description: 'Mixed leaves with cucumber and a light herb dressing.',
      dietaryTags: ['vegetarian', 'gluten-free'],
      portion: { amount: 120, unit: 'g' },
      ingredients: [
        { name: 'mixed salad leaves', amountPerServing: 70, unit: 'g' },
      ],
      servingScope: 'all_guests',
    },
    {
      course: 'vegetarian',
      name: 'Mushroom risotto',
      description: 'Creamy risotto with mushrooms and herbs.',
      dietaryTags: ['vegetarian'],
      portion: { amount: 280, unit: 'g' },
      ingredients: [
        { name: 'risotto rice', amountPerServing: 90, unit: 'g' },
      ],
      servingScope: 'dietary_option',
    },
  ],
  planningAssumptions: [
    'Vegetarian guest count was not specified; allocation will be confirmed during quantity planning.',
  ],
} as const

describe('generateMenuRequestSchema', () => {
  it('accepts a confirmed event and optional original description', () => {
    const result = generateMenuRequestSchema.parse({
      event,
      originalDescription: 'Company summer party for 120 people in Bern with a buffet.',
    })
    expect(result.event.guestCount).toBe(120)
  })

  it('normalizes legacy dietary strings in an existing menu request', () => {
    const result = generateMenuRequestSchema.parse({
      event: { ...event, dietaryRequirements: ['vegetarian'] },
    })

    expect(result.event.dietaryRequirements).toEqual([
      { type: 'vegetarian', guestCount: null },
    ])
  })

  it.each([
    {},
    { event: {} },
    { event, originalDescription: 'short' },
    { event: { ...event, guestCount: '120' } },
  ])('rejects invalid menu request %#', (request) => {
    expect(generateMenuRequestSchema.safeParse(request).success).toBe(false)
  })
})

describe('menu response schemas', () => {
  it('validates structured Gemini output without accepting model-provided IDs', () => {
    expect(generatedMenuSchema.safeParse(generatedMenu).success).toBe(true)
    expect(generatedMenuSchema.safeParse({
      ...generatedMenu,
      items: generatedMenu.items.map((item) => ({ ...item, id: 'model-id' })),
    }).success).toBe(false)
  })

  it('requires deterministic IDs in the final Eventa menu', () => {
    const finalMenu = {
      ...generatedMenu,
      items: generatedMenu.items.map((item, index) => ({ ...item, id: `eventa-${index}` })),
    }
    expect(eventMenuSchema.safeParse(finalMenu).success).toBe(true)
  })

  it('removes JSON Schema constraints unsupported by Gemini', () => {
    const serialized = JSON.stringify(generatedMenuJsonSchema)
    expect(serialized).not.toContain('exclusiveMinimum')
    expect(serialized).not.toContain('minLength')
    expect(serialized).not.toContain('maxLength')
    expect(serialized).not.toContain('$schema')
  })
})
