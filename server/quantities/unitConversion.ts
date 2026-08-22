import type { CanonicalQuantityUnit } from '../../shared/quantities.js'

export interface CanonicalQuantity {
  amount: number
  unit: CanonicalQuantityUnit
}

const unitDefinitions: Record<string, { unit: CanonicalQuantityUnit; factor: number }> = {
  g: { unit: 'g', factor: 1 },
  gram: { unit: 'g', factor: 1 },
  grams: { unit: 'g', factor: 1 },
  kg: { unit: 'g', factor: 1000 },
  kilogram: { unit: 'g', factor: 1000 },
  kilograms: { unit: 'g', factor: 1000 },
  ml: { unit: 'ml', factor: 1 },
  milliliter: { unit: 'ml', factor: 1 },
  milliliters: { unit: 'ml', factor: 1 },
  millilitre: { unit: 'ml', factor: 1 },
  millilitres: { unit: 'ml', factor: 1 },
  l: { unit: 'ml', factor: 1000 },
  liter: { unit: 'ml', factor: 1000 },
  liters: { unit: 'ml', factor: 1000 },
  litre: { unit: 'ml', factor: 1000 },
  litres: { unit: 'ml', factor: 1000 },
  piece: { unit: 'piece', factor: 1 },
  pieces: { unit: 'piece', factor: 1 },
  pc: { unit: 'piece', factor: 1 },
  pcs: { unit: 'piece', factor: 1 },
  each: { unit: 'piece', factor: 1 },
  ea: { unit: 'piece', factor: 1 },
  unit: { unit: 'piece', factor: 1 },
  units: { unit: 'piece', factor: 1 },
}

export function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000
}

export function toCanonicalQuantity(amount: number, rawUnit: string): CanonicalQuantity | null {
  const definition = unitDefinitions[rawUnit.trim().toLocaleLowerCase('en')]
  if (!definition || !Number.isFinite(amount) || amount < 0) return null

  return {
    amount: roundQuantity(amount * definition.factor),
    unit: definition.unit,
  }
}
