import { z } from 'zod'
import { menuCourses } from '../../shared/menu.js'
import { compatibleEventInterpretationSchema } from './eventInterpretation.js'
import { toGeminiJsonSchema } from './geminiJsonSchema.js'

const menuCourseSchema = z.enum(menuCourses)
const servingScopeSchema = z.enum(['all_guests', 'dietary_option', 'shared'])

const portionSchema = z
  .object({
    amount: z.number().finite().positive().max(100_000),
    unit: z.string().trim().min(1).max(40),
  })
  .strict()

const ingredientSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    amountPerServing: z.number().finite().positive().max(100_000).nullable(),
    unit: z.string().trim().min(1).max(40).nullable(),
  })
  .strict()

export const generatedMenuItemSchema = z
  .object({
    course: menuCourseSchema,
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(500),
    dietaryTags: z.array(z.string().trim().min(1).max(80)).max(20),
    portion: portionSchema.nullable(),
    ingredients: z.array(ingredientSchema).min(1).max(40),
    servingScope: servingScopeSchema,
  })
  .strict()

export const generatedMenuSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    summary: z.string().trim().min(1).max(600),
    items: z.array(generatedMenuItemSchema).min(2).max(24),
    planningAssumptions: z.array(z.string().trim().min(1).max(400)).max(30),
  })
  .strict()

export const menuItemSchema = generatedMenuItemSchema.extend({
  id: z.string().trim().min(1).max(200),
}).strict()

export const eventMenuSchema = generatedMenuSchema.extend({
  items: z.array(menuItemSchema).min(2).max(24),
}).strict()

export const generateMenuRequestSchema = z
  .object({
    event: compatibleEventInterpretationSchema,
    originalDescription: z.string().trim().min(10).max(1000).optional(),
  })
  .strict()

export type GeneratedMenu = z.infer<typeof generatedMenuSchema>

export const generatedMenuJsonSchema = toGeminiJsonSchema({
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          course: { type: 'string', enum: [...menuCourses] },
          name: { type: 'string' },
          description: { type: 'string' },
          dietaryTags: { type: 'array', items: { type: 'string' } },
          portion: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  amount: { type: 'number' },
                  unit: { type: 'string' },
                },
                required: ['amount', 'unit'],
              },
              { type: 'null' },
            ],
          },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                amountPerServing: { anyOf: [{ type: 'number' }, { type: 'null' }] },
                unit: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              },
              required: ['name', 'amountPerServing', 'unit'],
            },
          },
          servingScope: {
            type: 'string',
            enum: ['all_guests', 'dietary_option', 'shared'],
          },
        },
        required: [
          'course',
          'name',
          'description',
          'dietaryTags',
          'portion',
          'ingredients',
          'servingScope',
        ],
      },
    },
    planningAssumptions: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'summary', 'items', 'planningAssumptions'],
})
