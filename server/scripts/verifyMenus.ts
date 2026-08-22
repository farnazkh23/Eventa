import type { GenerateMenuRequest } from '../../shared/menu.js'
import { GeminiMenuGenerator } from '../ai/geminiMenuGenerator.js'
import { loadServerConfig } from '../config/env.js'

interface VerificationScenario {
  label: 'A' | 'B' | 'C'
  request: GenerateMenuRequest
}

const scenarios: VerificationScenario[] = [
  {
    label: 'A',
    request: {
      event: {
      eventType: 'Corporate summer party',
      guestCount: 120,
      location: 'Bern',
      date: null,
      time: null,
      mealType: 'dinner',
      serviceStyle: 'buffet',
      budgetPerGuest: 45,
      totalBudget: null,
      dietaryRequirements: ['vegetarian'],
      additionalNotes: [],
      },
      originalDescription: 'Company summer party for 120 people in Bern, buffet, CHF 45 per guest, vegetarian options.',
    },
  },
  {
    label: 'B',
    request: {
      event: {
      eventType: 'Birthday',
      guestCount: 35,
      location: 'Zürich',
      date: null,
      time: null,
      mealType: 'dinner',
      serviceStyle: 'seated dinner',
      budgetPerGuest: null,
      totalBudget: null,
      dietaryRequirements: ['vegan'],
      additionalNotes: ['4 guests are vegan'],
      },
      originalDescription: 'Birthday dinner in Zürich for 35 guests. 4 are vegan and we want a seated dinner.',
    },
  },
  {
    label: 'C',
    request: {
      event: {
      eventType: 'Apéro',
      guestCount: 80,
      location: 'Basel',
      date: null,
      time: null,
      mealType: 'apéro',
      serviceStyle: 'finger food',
      budgetPerGuest: null,
      totalBudget: null,
      dietaryRequirements: ['vegetarian', 'gluten-free'],
      additionalNotes: [],
      },
      originalDescription: 'Apéro in Basel for 80 guests with finger food, vegetarian and gluten-free options.',
    },
  },
]

const config = loadServerConfig()
if (!config.geminiApiKey) throw new Error('GEMINI_API_KEY is not configured in .env.local')

const generator = new GeminiMenuGenerator(config.geminiApiKey, config.geminiModel)
const selectedLabel = process.argv[2]?.toUpperCase()
const selectedScenarios = selectedLabel
  ? scenarios.filter(({ label }) => label === selectedLabel)
  : scenarios

if (selectedScenarios.length === 0) throw new Error('Choose menu scenario A, B, or C')

for (const [index, scenario] of selectedScenarios.entries()) {
  if (index > 0) await new Promise((resolve) => setTimeout(resolve, 16_000))
  const menu = await generator.generate(scenario.request)
  console.info(`Scenario ${scenario.label}: ${scenario.request.originalDescription}`)
  console.info(JSON.stringify(menu, null, 2))
}
