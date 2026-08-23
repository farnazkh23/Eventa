export interface RouteHistory {
  entries: string[]
  index: number
}

export type HistoryAction =
  | { type: 'visit'; route: string }
  | { type: 'move'; index: number }

export function routeHistoryReducer(state: RouteHistory, action: HistoryAction): RouteHistory {
  if (action.type === 'move') return { ...state, index: action.index }
  if (state.entries[state.index] === action.route) return state
  return {
    entries: [...state.entries.slice(0, state.index + 1), action.route],
    index: state.index + 1,
  }
}

export function getLogoDestination(hasPlan: boolean) {
  return hasPlan ? '/plan' : '/'
}
