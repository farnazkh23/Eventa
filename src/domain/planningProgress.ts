export type PlanningProgressVisualState = 'completed' | 'active' | 'pending'

const steps: Array<{ label: string; state: PlanningProgressVisualState }> = [
  { label: 'Understanding your event', state: 'completed' },
  { label: 'Creating your menu', state: 'active' },
  { label: 'Calculating quantities', state: 'pending' },
  { label: 'Matching products', state: 'pending' },
  { label: 'Calculating budget', state: 'pending' },
]

export function getPlanningProgress() {
  return steps
}
