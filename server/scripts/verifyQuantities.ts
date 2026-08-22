import type { CalculateQuantitiesRequest } from '../../shared/quantities.js'
import { calculateQuantityPlan } from '../quantities/quantityEngine.js'
import { calculateQuantitiesRequestSchema, quantityPlanSchema } from '../schemas/quantities.js'

const baseEvent = {
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
}

const knownDietaryFixture: CalculateQuantitiesRequest = {
  event: baseEvent,
  menu: {
    title: 'Birthday dinner',
    summary: 'A seated dinner with a vegan main option.',
    items: [
      {
        id: 'beef-main',
        course: 'main',
        name: 'Beef main',
        description: 'Beef with seasonal accompaniments.',
        dietaryTags: [],
        portion: null,
        ingredients: [{ name: 'Beef', amountPerServing: 180, unit: 'g' }],
        servingScope: 'all_guests',
      },
      {
        id: 'vegan-main',
        course: 'vegan',
        name: 'Vegan main',
        description: 'A plant-based main course.',
        dietaryTags: ['vegan'],
        portion: null,
        ingredients: [{ name: 'Tofu', amountPerServing: 150, unit: 'g' }],
        servingScope: 'dietary_option',
      },
      {
        id: 'seasonal-salad',
        course: 'starter',
        name: 'Seasonal salad',
        description: 'A shared starter for every guest.',
        dietaryTags: ['vegan', 'gluten-free'],
        portion: null,
        ingredients: [{ name: 'Salad leaves', amountPerServing: 50, unit: 'g' }],
        servingScope: 'all_guests',
      },
    ],
    planningAssumptions: [],
  },
}

const unknownDietaryFixture: CalculateQuantitiesRequest = {
  ...knownDietaryFixture,
  event: {
    ...baseEvent,
    guestCount: 120,
    dietaryRequirements: [{ type: 'vegan', guestCount: null }],
  },
}

function verify(label: string, fixture: CalculateQuantitiesRequest): void {
  const input = calculateQuantitiesRequestSchema.parse(fixture)
  const plan = quantityPlanSchema.parse(calculateQuantityPlan(input))

  console.info(`${label}: complete=${plan.isComplete}`)
  console.info(`allocations=${plan.itemAllocations.map(({ menuItemId, plannedServings, status }) =>
    `${menuItemId}:${plannedServings ?? 'unresolved'}:${status}`).join(', ')}`)
  console.info(`ingredients=${plan.ingredientRequirements.map(({ name, amount, unit }) =>
    `${name}:${amount}${unit}`).join(', ') || 'none'}`)
}

verify('known dietary count', knownDietaryFixture)
verify('unknown dietary count', unknownDietaryFixture)
