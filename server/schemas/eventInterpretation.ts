import { z } from 'zod'

const nullableText = z.string().trim().min(1).max(300).nullable()
const nullableMoney = z.number().finite().nonnegative().max(10_000_000).nullable()

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
    dietaryRequirements: z.array(z.string().trim().min(1).max(100)).max(50),
    additionalNotes: z.array(z.string().trim().min(1).max(300)).max(50),
  })
  .strict()

export type ValidatedEventInterpretation = z.infer<typeof eventInterpretationSchema>

export const eventInterpretationJsonSchema = z.toJSONSchema(eventInterpretationSchema, {
  target: 'draft-7',
})
