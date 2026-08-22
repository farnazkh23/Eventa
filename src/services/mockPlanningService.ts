import type { EventPlanSummary } from '../domain/planning'

export const sampleBrief =
  'Company summer party for 120 people in Bern. Dinner buffet, relaxed atmosphere, around CHF 45 per guest. We need vegetarian options.'

export const mockPlan: EventPlanSummary = {
  title: 'Corporate Summer Party',
  guestCount: 120,
  location: 'Bern',
  date: '24 May',
  menu: ['Fresh green salad', 'Roasted chicken', 'Creamy risotto', 'Panna cotta'],
  foodKg: 68.5,
  beveragesLitres: 25,
  productCount: 18,
  totalCost: 4842,
  budgetPerGuest: 45,
}
