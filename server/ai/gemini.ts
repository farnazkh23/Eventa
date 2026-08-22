import { ApiError, GoogleGenAI } from '@google/genai'

const MAX_TRANSIENT_RETRIES = 2

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

interface StructuredGenerationOptions {
  client: GoogleGenAI
  model: string
  contents: string
  systemInstruction: string
  responseJsonSchema: unknown
  temperature?: number
}

export async function generateStructuredJson({
  client,
  model,
  contents,
  systemInstruction,
  responseJsonSchema,
  temperature = 0.1,
}: StructuredGenerationOptions): Promise<unknown> {
  let response

  for (let attempt = 0; ; attempt += 1) {
    try {
      response = await client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature,
          responseMimeType: 'application/json',
          responseJsonSchema,
        },
      })
      break
    } catch (error) {
      const isTransient = error instanceof ApiError && (error.status === 429 || error.status === 503)
      if (!isTransient || attempt >= MAX_TRANSIENT_RETRIES) throw error
      await delay(500 * 2 ** attempt)
    }
  }

  if (!response.text) throw new Error('Gemini returned an empty structured response')
  return JSON.parse(response.text) as unknown
}
