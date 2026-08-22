import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { InterpretationField, PlanningState } from '../domain/planning'
import { toInterpretationFields, emptyEventInterpretation } from '../services/eventInterpretationMapper'
import { interpretEvent, InterpretEventServiceError } from '../services/interpretEvent'
import { mockPlan } from '../services/mockPlanningService'

type PlanningAction =
  | { type: 'setBrief'; brief: string }
  | { type: 'interpretStart' }
  | { type: 'interpretSuccess'; interpretation: InterpretationField[] }
  | { type: 'interpretError'; message: string }
  | { type: 'startManualEntry' }
  | { type: 'updateField'; field: InterpretationField }

interface PlanningContextValue {
  state: PlanningState
  setBrief: (brief: string) => void
  interpretBrief: () => Promise<void>
  startManualEntry: () => void
  updateField: (field: InterpretationField) => void
}

const initialState: PlanningState = {
  brief: '',
  interpretation: toInterpretationFields(emptyEventInterpretation),
  interpretationStatus: 'idle',
  interpretationError: null,
  plan: mockPlan,
}

function reducer(state: PlanningState, action: PlanningAction): PlanningState {
  switch (action.type) {
    case 'setBrief':
      return {
        ...state,
        brief: action.brief,
        interpretationStatus: state.interpretationStatus === 'error' ? 'idle' : state.interpretationStatus,
        interpretationError: null,
      }
    case 'interpretStart':
      return { ...state, interpretationStatus: 'loading', interpretationError: null }
    case 'interpretSuccess':
      return {
        ...state,
        interpretation: action.interpretation,
        interpretationStatus: 'success',
        interpretationError: null,
      }
    case 'interpretError':
      return { ...state, interpretationStatus: 'error', interpretationError: action.message }
    case 'startManualEntry':
      return {
        ...state,
        interpretation: toInterpretationFields(emptyEventInterpretation),
        interpretationStatus: 'success',
        interpretationError: null,
      }
    case 'updateField':
      return {
        ...state,
        interpretation: state.interpretation.map((field) =>
          field.id === action.field.id ? action.field : field,
        ),
      }
  }
}

const PlanningContext = createContext<PlanningContextValue | null>(null)

export function PlanningProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  async function interpretBrief() {
    dispatch({ type: 'interpretStart' })
    try {
      const result = await interpretEvent(state.brief)
      dispatch({ type: 'interpretSuccess', interpretation: toInterpretationFields(result) })
    } catch (error) {
      const message = error instanceof InterpretEventServiceError
        ? error.message
        : 'Eventa could not interpret this event. Please try again.'
      dispatch({ type: 'interpretError', message })
      throw error
    }
  }

  return (
    <PlanningContext.Provider
      value={{
        state,
        setBrief: (brief) => dispatch({ type: 'setBrief', brief }),
        interpretBrief,
        startManualEntry: () => dispatch({ type: 'startManualEntry' }),
        updateField: (field) => dispatch({ type: 'updateField', field }),
      }}
    >
      {children}
    </PlanningContext.Provider>
  )
}

// The hook intentionally lives beside its provider to keep this prototype's state boundary explicit.
// eslint-disable-next-line react-refresh/only-export-components
export function usePlanning() {
  const context = useContext(PlanningContext)
  if (!context) throw new Error('usePlanning must be used inside PlanningProvider')
  return context
}
