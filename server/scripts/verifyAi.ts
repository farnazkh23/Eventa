import { GeminiEventInterpreter } from '../ai/geminiEventInterpreter.js'
import { loadServerConfig } from '../config/env.js'

const descriptions = [
  'Company summer party for 120 people in Bern, buffet, CHF 45 per guest, vegetarian options.',
  'Birthday dinner in Zürich for 35 guests. 4 are vegan and we want a seated dinner.',
  'Planning an event for around 80 people.',
  'Dinner for 40 guests: 3 are gluten-free, 2 are vegan, and vegetarian options are required.',
]

const config = loadServerConfig()

if (!config.geminiApiKey) {
  throw new Error('GEMINI_API_KEY is not configured in .env.local')
}

const interpreter = new GeminiEventInterpreter(config.geminiApiKey, config.geminiModel)

for (const [index, description] of descriptions.entries()) {
  const result = await interpreter.interpret(description)
  console.info(`Case ${index + 1}: ${description}`)
  console.info(JSON.stringify(result, null, 2))
}
