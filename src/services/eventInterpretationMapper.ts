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
