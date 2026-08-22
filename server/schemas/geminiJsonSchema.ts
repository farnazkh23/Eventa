const unsupportedSchemaKeys = new Set([
  '$schema',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'minLength',
  'maxLength',
])

export function toGeminiJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toGeminiJsonSchema)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !unsupportedSchemaKeys.has(key))
      .map(([key, child]) => [key, toGeminiJsonSchema(child)]),
  )
}
