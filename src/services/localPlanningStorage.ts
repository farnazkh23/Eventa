import { z } from 'zod'
import type { PlanningEventInterpretation } from '../domain/planning'

const eventSchema = z.object({
  eventType: z.string().nullable(),
  guestCount: z.number().int().positive().nullable(),
  location: z.string().nullable(),
  date: z.string().nullable(),
  time: z.string().nullable(),
  mealType: z.string().nullable(),
  serviceStyle: z.string().nullable(),
  budgetPerGuest: z.number().nonnegative().nullable(),
  totalBudget: z.number().nonnegative().nullable(),
  dietaryRequirements: z.array(z.object({
    type: z.string().min(1),
    guestCount: z.number().int().nonnegative().nullable(),
  })),
  additionalNotes: z.array(z.string()),
})

const templateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
  originalDescription: z.string(),
  event: eventSchema,
})

const pantryBasicSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  preferredProduct: z.string().nullable(),
  bulkPackPreference: z.string().nullable(),
})

export interface PlanningTemplate {
  id: string
  name: string
  createdAt: string
  originalDescription: string
  event: PlanningEventInterpretation
}

export interface PantryBasic {
  id: string
  name: string
  preferredProduct: string | null
  bulkPackPreference: string | null
}

const templatesKey = 'eventa:planning-templates'
const pantryBasicsKey = 'eventa:pantry-basics'

function localStorageOrNull(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function parseTemplates(value: string | null): PlanningTemplate[] {
  if (!value) return []
  try {
    return z.array(templateSchema).parse(JSON.parse(value))
  } catch {
    return []
  }
}

export function parsePantryBasics(value: string | null): PantryBasic[] {
  if (!value) return []
  try {
    return z.array(pantryBasicSchema).parse(JSON.parse(value))
  } catch {
    return []
  }
}

export function loadTemplates(): PlanningTemplate[] {
  const storage = localStorageOrNull()
  return parseTemplates(storage?.getItem(templatesKey) ?? null)
}

export function saveTemplates(templates: PlanningTemplate[]): boolean {
  const storage = localStorageOrNull()
  if (!storage) return false
  try {
    storage.setItem(templatesKey, JSON.stringify(templates))
    return true
  } catch {
    return false
  }
}

export function loadPantryBasics(): PantryBasic[] {
  const storage = localStorageOrNull()
  return parsePantryBasics(storage?.getItem(pantryBasicsKey) ?? null)
}

export function savePantryBasics(items: PantryBasic[]): boolean {
  const storage = localStorageOrNull()
  if (!storage) return false
  try {
    storage.setItem(pantryBasicsKey, JSON.stringify(items))
    return true
  } catch {
    return false
  }
}
