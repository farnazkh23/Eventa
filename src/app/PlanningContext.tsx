import { createContext, useContext, useReducer, useRef, type ReactNode } from 'react'
import type { InterpretationField, PlanningState } from '../domain/planning'
import {
  applyInterpretationFieldEdit,
  toInterpretationFields,
  emptyEventInterpretation,
} from '../services/eventInterpretationMapper'
import { interpretEvent, InterpretEventServiceError } from '../services/interpretEvent'
import { generateMenu, GenerateMenuServiceError } from '../services/generateMenu'
import { SingleFlight } from '../services/singleFlight'
import type { EventInterpretation } from '../../shared/eventInterpretation'
import type { EventMenu } from '../../shared/menu'

type PlanningAction =
  | { type: 'setBrief'; brief: string }
  | { type: 'interpretStart' }
  | { type: 'interpretSuccess'; event: EventInterpretation; interpretation: InterpretationField[] }
  | { type: 'interpretError'; message: string }
  | { type: 'startManualEntry' }
  | { type: 'updateField'; field: InterpretationField }
  | { type: 'menuStart' }
  | { type: 'menuSuccess'; menu: EventMenu }
  | { type: 'menuError'; message: string }
  | { type: 'menuReset' }

interface PlanningContextValue {
  state: PlanningState
  setBrief: (brief: string) => void
  interpretBrief: () => Promise<void>
  startManualEntry: () => void
  updateField: (field: InterpretationField) => void
  generateConfirmedMenu: () => Promise<void>
  resetMenuGeneration: () => void
}

const initialState: PlanningState = {
  brief: '',
  confirmedEvent: emptyEventInterpretation,
  interpretation: toInterpretationFields(emptyEventInterpretation),
  interpretationStatus: 'idle',
  interpretationError: null,
  menu: null,
  menuStatus: 'idle',
  menuError: null,
}

function reducer(state: PlanningState, action: PlanningAction): PlanningState {
  switch (action.type) {
    case 'setBrief':
      return {
        ...state,
        brief: action.brief,
        interpretationStatus: state.interpretationStatus === 'error' ? 'idle' : state.interpretationStatus,
        interpretationError: null,
        menu: null,
        menuStatus: 'idle',
        menuError: null,
      }
    case 'interpretStart':
      return { ...state, interpretationStatus: 'loading', interpretationError: null }
    case 'interpretSuccess':
      return {
        ...state,
        confirmedEvent: action.event,
        interpretation: action.interpretation,
        interpretationStatus: 'success',
        interpretationError: null,
        menu: null,
        menuStatus: 'idle',
        menuError: null,
      }
    case 'interpretError':
      return { ...state, interpretationStatus: 'error', interpretationError: action.message }
    case 'startManualEntry':
      return {
        ...state,
        confirmedEvent: emptyEventInterpretation,
        interpretation: toInterpretationFields(emptyEventInterpretation),
        interpretationStatus: 'success',
        interpretationError: null,
        menu: null,
        menuStatus: 'idle',
        menuError: null,
      }
    case 'updateField':
      return {
        ...state,
        confirmedEvent: applyInterpretationFieldEdit(state.confirmedEvent, action.field),
        interpretation: state.interpretation.map((field) =>
          field.id === action.field.id ? action.field : field,
        ),
        menu: null,
        menuStatus: 'idle',
        menuError: null,
      }
    case 'menuStart':
      return { ...state, menuStatus: 'loading', menuError: null }
    case 'menuSuccess':
      return { ...state, menu: action.menu, menuStatus: 'success', menuError: null }
    case 'menuError':
      return { ...state, menu: null, menuStatus: 'error', menuError: action.message }
    case 'menuReset':
      return { ...state, menuStatus: 'idle', menuError: null }
  }
}

const PlanningContext = createContext<PlanningContextValue | null>(null)

export function PlanningProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const menuGeneration = useRef(new SingleFlight())

  async function interpretBrief() {
    dispatch({ type: 'interpretStart' })
    try {
      const result = await interpretEvent(state.brief)
      dispatch({ type: 'interpretSuccess', event: result, interpretation: toInterpretationFields(result) })
    } catch (error) {
      const message = error instanceof InterpretEventServiceError
        ? error.message
        : 'Eventa could not interpret this event. Please try again.'
      dispatch({ type: 'interpretError', message })
      throw error
    }
  }

  function generateConfirmedMenu(): Promise<void> {
    return menuGeneration.current.run(async () => {
      dispatch({ type: 'menuStart' })
      try {
        const menu = await generateMenu(state.confirmedEvent, state.brief)
        dispatch({ type: 'menuSuccess', menu })
      } catch (error) {
        const message = error instanceof GenerateMenuServiceError
          ? error.message
          : 'Eventa could not create the menu. Please try again.'
        dispatch({ type: 'menuError', message })
        throw error
      }
    })
  }

  return (
    <PlanningContext.Provider
      value={{
        state,
        setBrief: (brief) => dispatch({ type: 'setBrief', brief }),
        interpretBrief,
        startManualEntry: () => dispatch({ type: 'startManualEntry' }),
        updateField: (field) => dispatch({ type: 'updateField', field }),
        generateConfirmedMenu,
        resetMenuGeneration: () => dispatch({ type: 'menuReset' }),
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
