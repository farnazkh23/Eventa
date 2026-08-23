import type { PlanningState } from '../domain/planning'

export function shouldResetInitialRoute(pathname: string) {
  return pathname !== '/'
}

export function resetInitialRoute() {
  if (typeof window === 'undefined' || !shouldResetInitialRoute(window.location.pathname)) return
  window.history.replaceState(null, document.title, '/')
}

export function canEnterInterpretation(state: Pick<PlanningState, 'interpretationStatus'>) {
  return state.interpretationStatus === 'success'
}
