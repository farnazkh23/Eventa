const unsupportedSchemaKeys = new Set([
  '$schema',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'minLength',
  'maxLength',
])

export function toStructuredOutputJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toStructuredOutputJsonSchema)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !unsupportedSchemaKeys.has(key))
      .map(([key, child]) => [key, toStructuredOutputJsonSchema(child)]),
  )
}
