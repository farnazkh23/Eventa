import { describe, expect, it } from 'vitest'
import { getLogoDestination, routeHistoryReducer, type RouteHistory } from './navigationModel'

function visit(history: RouteHistory, route: string) {
  return routeHistoryReducer(history, { type: 'visit', route })
}

describe('Eventa navigation history', () => {
  it('moves backward and forward across meaningful routes', () => {
    let history: RouteHistory = { entries: ['/'], index: 0 }
    history = visit(history, '/interpretation')
    history = visit(history, '/plan')
    history = routeHistoryReducer(history, { type: 'move', index: 1 })
    expect(history.entries[history.index]).toBe('/interpretation')
    history = routeHistoryReducer(history, { type: 'move', index: 2 })
    expect(history.entries[history.index]).toBe('/plan')
  })

  it('returns to the original brief route without changing planning state', () => {
    const planningState = { brief: 'Summer party for 120 guests', confirmedEvent: { guestCount: 120 } }
    let history: RouteHistory = { entries: ['/'], index: 0 }
    history = visit(history, '/interpretation')
    history = visit(history, '/plan')
    history = routeHistoryReducer(history, { type: 'move', index: 0 })
    expect(history.entries[history.index]).toBe('/')
    expect(planningState).toEqual({ brief: 'Summer party for 120 guests', confirmedEvent: { guestCount: 120 } })
  })

  it('drops obsolete forward entries after a new route is visited', () => {
    let history: RouteHistory = { entries: ['/', '/interpretation', '/plan'], index: 1 }
    history = visit(history, '/plan/basics')
    expect(history).toEqual({ entries: ['/', '/interpretation', '/plan/basics'], index: 2 })
  })
})

describe('Eventa logo destination', () => {
  it('returns to the plan while a generated plan exists', () => {
    expect(getLogoDestination(true)).toBe('/plan')
  })

  it('returns to the original brief before a plan exists', () => {
    expect(getLogoDestination(false)).toBe('/')
  })
})
