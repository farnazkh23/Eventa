import type { EventMenu, MenuItem } from '../../shared/menu'

export type BackendResult<T> =
  | { status: 'pending'; data: null }
  | { status: 'ready'; data: T }
  | { status: 'error'; data: null; message: string }

export interface QuantityLine {
  menuItemId: string
  name: string
  quantity: number
  unit: string
}

export interface ProductMatch {
  id: string
  menuItemId: string
  name: string
  packDescription: string
  quantity: number
  unitPriceChf: number
}

export interface BudgetCalculation {
  totalChf: number
  perGuestChf: number
  targetChf: number | null
}

export interface PlanResults {
  quantities: BackendResult<QuantityLine[]>
  products: BackendResult<ProductMatch[]>
  budget: BackendResult<BudgetCalculation>
}

/**
 * Frontend boundary for planning results that will eventually arrive from backend adapters.
 * Menu data is intentionally not converted into quantities, matches, or prices here.
 */
export function getPlanResults(): PlanResults {
  return {
    quantities: { status: 'pending', data: null },
    products: { status: 'pending', data: null },
    budget: { status: 'pending', data: null },
  }
}

export function findMenuItem(menu: EventMenu, itemId: string | undefined): MenuItem | null {
  if (!itemId) return null
  return menu.items.find((item) => item.id === itemId) ?? null
}
