import type { EventInterpretation } from './eventInterpretation.js'

export const menuCourses = [
  'starter',
  'main',
  'side',
  'vegetarian',
  'vegan',
  'dessert',
  'beverage',
  'other',
] as const

export type MenuCourse = (typeof menuCourses)[number]

export type MenuServingScope = 'all_guests' | 'dietary_option' | 'shared'

export interface MenuPortion {
  amount: number
  unit: string
}

export interface MenuIngredient {
  name: string
  amountPerServing: number | null
  unit: string | null
}

export interface MenuItem {
  id: string
  course: MenuCourse
  name: string
  description: string
  dietaryTags: string[]
  portion: MenuPortion | null
  ingredients: MenuIngredient[]
  servingScope: MenuServingScope
  /** Explicit audience for dietary_option; tags remain compatibility metadata. */
  dietaryAllocationType?: string | null
}

export interface EventMenu {
  title: string
  summary: string
  items: MenuItem[]
  planningAssumptions: string[]
}

export interface GenerateMenuRequest {
  event: EventInterpretation
  originalDescription?: string
}
