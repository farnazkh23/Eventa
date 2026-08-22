import type { EventInterpretation } from '../../shared/eventInterpretation'
import type { InterpretationField } from '../domain/planning'

const chfNumber = new Intl.NumberFormat('en-CH', { maximumFractionDigits: 2 })

function displayMoney(value: number | null, suffix: string): string {
  return value === null ? '' : `CHF ${chfNumber.format(value)} ${suffix}`
}

export function toInterpretationFields(data: EventInterpretation): InterpretationField[] {
  return [
    { id: 'eventType', label: 'Event type', value: data.eventType ?? '', editable: true },
    {
      id: 'guestCount',
      label: 'Guests',
      value: data.guestCount === null ? '' : `${data.guestCount} guests`,
      editable: true,
    },
    { id: 'location', label: 'Location', value: data.location ?? '', editable: true },
    { id: 'date', label: 'Date', value: data.date ?? '', editable: true },
    { id: 'time', label: 'Time', value: data.time ?? '', editable: true },
    { id: 'mealType', label: 'Meal type', value: data.mealType ?? '', editable: true },
    {
      id: 'serviceStyle',
      label: 'Service style',
      value: data.serviceStyle ?? '',
      editable: true,
    },
    {
      id: 'budgetPerGuest',
      label: 'Budget per guest',
      value: displayMoney(data.budgetPerGuest, '/ guest'),
      editable: true,
    },
    {
      id: 'totalBudget',
      label: 'Total budget',
      value: displayMoney(data.totalBudget, 'total'),
      editable: true,
    },
    {
      id: 'dietaryRequirements',
      label: 'Dietary needs',
      value: data.dietaryRequirements.join(', '),
      editable: true,
    },
    {
      id: 'additionalNotes',
      label: 'Additional notes',
      value: data.additionalNotes.join('; '),
      editable: true,
    },
  ]
}

function optionalText(value: string): string | null {
  return value.trim() || null
}

function optionalNumber(value: string): number | null {
  const match = value.replace(/[’']/g, '').match(/\d+(?:[.,]\d+)?/)
  if (!match) return null
  const parsed = Number(match[0].replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function listValues(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function applyInterpretationFieldEdit(
  event: EventInterpretation,
  field: InterpretationField,
): EventInterpretation {
  switch (field.id) {
    case 'eventType':
    case 'location':
    case 'date':
    case 'time':
    case 'mealType':
    case 'serviceStyle':
      return { ...event, [field.id]: optionalText(field.value) }
    case 'guestCount':
      return { ...event, guestCount: optionalNumber(field.value) }
    case 'budgetPerGuest':
    case 'totalBudget':
      return { ...event, [field.id]: optionalNumber(field.value) }
    case 'dietaryRequirements':
    case 'additionalNotes':
      return { ...event, [field.id]: listValues(field.value) }
  }
}

export const emptyEventInterpretation: EventInterpretation = {
  eventType: null,
  guestCount: null,
  location: null,
  date: null,
  time: null,
  mealType: null,
  serviceStyle: null,
  budgetPerGuest: null,
  totalBudget: null,
  dietaryRequirements: [],
  additionalNotes: [],
}
