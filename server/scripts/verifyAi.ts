import { createKiconnectProvider } from '../ai/createKiconnectProvider.js'
import { loadServerConfig } from '../config/env.js'

const descriptions = [
  'Company summer party for 120 people in Bern, buffet, CHF 45 per guest, vegetarian options.',
  'Birthday dinner in Zürich for 35 guests. 4 are vegan and we want a seated dinner.',
  'Planning an event for around 80 people.',
  'Dinner for 40 guests: 3 are gluten-free, 2 are vegan, and vegetarian options are required.',
]

const config = loadServerConfig()

const provider = createKiconnectProvider(config)
if (!provider) throw new Error('KICONNECT_API_KEY is not configured in .env.local')

for (const [index, description] of descriptions.entries()) {
  const result = await provider.interpret(description)
  console.info(`Case ${index + 1}: ${description}`)
  console.info(JSON.stringify(result, null, 2))
}
