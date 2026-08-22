import { z } from 'zod'
import { toGeminiJsonSchema } from './geminiJsonSchema.js'

const nullableText = z.string().trim().min(1).max(300).nullable()
const nullableMoney = z.number().finite().nonnegative().max(10_000_000).nullable()
const dietaryType = z.string().trim().min(1).max(100)

export const dietaryRequirementSchema = z
  .object({
    type: dietaryType.describe('Concise normalized dietary requirement, for example vegan'),
    guestCount: z
      .number()
      .int()
      .positive()
      .max(1_000_000)
      .nullable()
      .describe('Explicitly stated guest count for this requirement, otherwise null'),
  })
  .strict()

const compatibleDietaryRequirementSchema = z.preprocess(
  (value) => typeof value === 'string' ? { type: value, guestCount: null } : value,
  dietaryRequirementSchema,
).transform((requirement) => ({
  ...requirement,
  type: requirement.type.toLocaleLowerCase('en'),
}))

export const interpretEventRequestSchema = z
  .object({
    description: z.string().trim().min(10).max(1000),
  })
  .strict()

export const eventInterpretationSchema = z
  .object({
    eventType: nullableText,
    guestCount: z.number().int().positive().max(1_000_000).nullable(),
    location: nullableText,
    date: nullableText,
    time: nullableText,
    mealType: nullableText,
    serviceStyle: nullableText,
    budgetPerGuest: nullableMoney,
    totalBudget: nullableMoney,
    dietaryRequirements: z.array(dietaryRequirementSchema).max(50),
    additionalNotes: z.array(z.string().trim().min(1).max(300)).max(50),
  })
  .strict()

export const compatibleEventInterpretationSchema = eventInterpretationSchema.extend({
  dietaryRequirements: z.array(compatibleDietaryRequirementSchema).max(50),
}).strict()

export type ValidatedEventInterpretation = z.infer<typeof eventInterpretationSchema>

export const eventInterpretationJsonSchema = toGeminiJsonSchema(
  z.toJSONSchema(eventInterpretationSchema, { target: 'draft-7' }),
)
