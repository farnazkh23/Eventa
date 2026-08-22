import { z } from 'zod'
import { menuCourses } from '../../shared/menu.js'
import { compatibleEventInterpretationSchema } from './eventInterpretation.js'
import { eventMenuSchema } from './menu.js'

const quantityEventSchema = compatibleEventInterpretationSchema.extend({
  guestCount: z.number().int().positive().max(1_000_000),
}).strict()

export const servingOverrideSchema = z.object({
  menuItemId: z.string().trim().min(1).max(200),
  servings: z.number().int().nonnegative().max(1_000_000),
}).strict()

export const calculateQuantitiesRequestSchema = z.object({
  event: quantityEventSchema,
  menu: eventMenuSchema,
  servingOverrides: z.array(servingOverrideSchema).max(100).optional(),
}).strict().superRefine((request, context) => {
  const itemIds = new Set(request.menu.items.map(({ id }) => id))
  const overrideIds = new Set<string>()

  request.servingOverrides?.forEach((override, index) => {
    if (overrideIds.has(override.menuItemId)) {
      context.addIssue({
        code: 'custom',
        path: ['servingOverrides', index, 'menuItemId'],
        message: 'Only one serving override is allowed per menu item.',
      })
    }
    overrideIds.add(override.menuItemId)

    if (!itemIds.has(override.menuItemId)) {
      context.addIssue({
        code: 'custom',
        path: ['servingOverrides', index, 'menuItemId'],
        message: 'Serving override references an unknown menu item.',
      })
    }

    if (override.servings > request.event.guestCount) {
      context.addIssue({
        code: 'custom',
        path: ['servingOverrides', index, 'servings'],
        message: 'Serving override cannot exceed the event guest count.',
      })
    }
  })
})

const itemAllocationSchema = z.object({
  menuItemId: z.string().min(1),
  menuItemName: z.string().min(1),
  course: z.enum(menuCourses),
  plannedServings: z.number().int().nonnegative().nullable(),
  status: z.enum(['calculated', 'needs_confirmation', 'missing_quantity_data']),
  reason: z.string().min(1).optional(),
}).strict()

const ingredientRequirementSchema = z.object({
  ingredientKey: z.string().min(1),
  name: z.string().min(1),
  amount: z.number().finite().nonnegative(),
  unit: z.enum(['g', 'ml', 'piece']),
  sourceMenuItemIds: z.array(z.string().min(1)).min(1),
}).strict()

const unresolvedQuantitySchema = z.object({
  menuItemId: z.string().min(1),
  reason: z.string().min(1),
}).strict()

const unresolvedIngredientQuantitySchema = z.object({
  menuItemId: z.string().min(1),
  ingredientName: z.string().min(1),
  status: z.literal('needs_confirmation'),
  reason: z.string().min(1),
}).strict()

export const quantityPlanSchema = z.object({
  guestCount: z.number().int().positive(),
  isComplete: z.boolean(),
  itemAllocations: z.array(itemAllocationSchema),
  ingredientRequirements: z.array(ingredientRequirementSchema),
  unresolved: z.array(unresolvedQuantitySchema),
  unresolvedIngredients: z.array(unresolvedIngredientQuantitySchema),
  assumptions: z.array(z.string().min(1)),
}).strict()
