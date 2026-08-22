import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { InterpretationField, PlanningEventInterpretation, PlanningState } from '../domain/planning'
import {
  applyInterpretationFieldEdit,
  toInterpretationFields,
  emptyEventInterpretation,
} from '../services/eventInterpretationMapper'
import { interpretEvent, InterpretEventServiceError } from '../services/interpretEvent'
import { generateMenu, GenerateMenuServiceError } from '../services/generateMenu'
import { calculateQuantities, matchProducts, PlanResultsServiceError } from '../services/planResults'
import type { ProductMatchPlan, QuantityPlan } from '../domain/planResults'
import type { EventMenu } from '../../shared/menu'

type PlanningAction =
  | { type: 'setBrief'; brief: string }
  | { type: 'interpretStart' }
  | { type: 'interpretSuccess'; event: PlanningEventInterpretation; interpretation: InterpretationField[] }
  | { type: 'interpretError'; message: string }
  | { type: 'startManualEntry' }
  | { type: 'updateField'; field: InterpretationField }
  | { type: 'menuStart' }
  | { type: 'menuSuccess'; menu: EventMenu }
  | { type: 'menuError'; message: string }
  | { type: 'menuReset' }
  | { type: 'quantityStart' }
  | { type: 'quantitySuccess'; plan: QuantityPlan }
  | { type: 'quantityError'; message: string }
  | { type: 'productStart' }
  | { type: 'productSuccess'; plan: ProductMatchPlan }
  | { type: 'productError'; message: string }
  | { type: 'basicsRegenerationStart'; event: PlanningEventInterpretation; interpretation: InterpretationField[] }
  | { type: 'resetPlan' }
  | { type: 'loadTemplate'; event: PlanningEventInterpretation; brief: string; interpretation: InterpretationField[] }

interface PlanningContextValue {
  state: PlanningState
  setBrief: (brief: string) => void
  interpretBrief: () => Promise<void>
  startManualEntry: () => void
  updateField: (field: InterpretationField) => void
  generateConfirmedMenu: () => Promise<void>
  resetMenuGeneration: () => void
  retryQuantities: () => Promise<void>
  retryProducts: () => Promise<void>
  regeneratePlanWithBasics: (fields: InterpretationField[]) => Promise<void>
  resetPlan: () => void
  loadTemplate: (event: PlanningEventInterpretation, brief: string) => void
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
  quantityPlan: null,
  quantityStatus: 'idle',
  quantityError: null,
  productPlan: null,
  productStatus: 'idle',
  productError: null,
  planInvalidatedByBrief: false,
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
        quantityPlan: null,
        quantityStatus: 'idle',
        quantityError: null,
        productPlan: null,
        productStatus: 'idle',
        productError: null,
        planInvalidatedByBrief: state.planInvalidatedByBrief || Boolean(state.menu),
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
        quantityPlan: null,
        quantityStatus: 'idle',
        quantityError: null,
        productPlan: null,
        productStatus: 'idle',
        productError: null,
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
        quantityPlan: null,
        quantityStatus: 'idle',
        quantityError: null,
        productPlan: null,
        productStatus: 'idle',
        productError: null,
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
        quantityPlan: null,
        quantityStatus: 'idle',
        quantityError: null,
        productPlan: null,
        productStatus: 'idle',
        productError: null,
      }
    case 'menuStart':
      return { ...state, menuStatus: 'loading', menuError: null }
    case 'menuSuccess':
      return { ...state, menu: action.menu, menuStatus: 'success', menuError: null, quantityPlan: null, quantityStatus: 'idle', quantityError: null, productPlan: null, productStatus: 'idle', productError: null, planInvalidatedByBrief: false }
    case 'menuError':
      return { ...state, menu: null, menuStatus: 'error', menuError: action.message }
    case 'menuReset':
      return { ...state, menuStatus: 'idle', menuError: null }
    case 'quantityStart':
      return { ...state, quantityStatus: 'loading', quantityError: null, productPlan: null, productStatus: 'idle', productError: null }
    case 'quantitySuccess':
      return { ...state, quantityPlan: action.plan, quantityStatus: 'success', quantityError: null }
    case 'quantityError':
      return { ...state, quantityPlan: null, quantityStatus: 'error', quantityError: action.message, productPlan: null, productStatus: 'idle', productError: null }
    case 'productStart':
      return { ...state, productStatus: 'loading', productError: null }
    case 'productSuccess':
      return { ...state, productPlan: action.plan, productStatus: 'success', productError: null }
    case 'productError':
      return { ...state, productPlan: null, productStatus: 'error', productError: action.message }
    case 'basicsRegenerationStart':
      return {
        ...state,
        confirmedEvent: action.event,
        interpretation: action.interpretation,
        menu: null,
        menuStatus: 'loading',
        menuError: null,
        quantityPlan: null,
        quantityStatus: 'idle',
        quantityError: null,
        productPlan: null,
        productStatus: 'idle',
        productError: null,
      }
    case 'resetPlan':
      return initialState
    case 'loadTemplate':
      return {
        ...initialState,
        brief: action.brief,
        confirmedEvent: action.event,
        interpretation: action.interpretation,
        interpretationStatus: 'success',
      }
  }
}

const PlanningContext = createContext<PlanningContextValue | null>(null)

export function PlanningProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  async function loadProducts(plan: QuantityPlan) {
    if (plan.ingredientRequirements.length === 0) {
      dispatch({ type: 'productSuccess', plan: { matches: [], summary: { totalIngredients: 0, matched: 0, lowConfidence: 0, unresolved: 0, selectedProductsWithPrice: 0 } } })
      return
    }
    dispatch({ type: 'productStart' })
    try {
      dispatch({ type: 'productSuccess', plan: await matchProducts(plan.ingredientRequirements) })
    } catch (error) {
      dispatch({ type: 'productError', message: error instanceof PlanResultsServiceError ? error.message : 'Eventa could not match products. Please try again.' })
    }
  }

  async function loadQuantities(event = state.confirmedEvent, menu = state.menu) {
    if (!menu || event.guestCount === null) return
    dispatch({ type: 'quantityStart' })
    try {
      const plan = await calculateQuantities(event, menu)
      dispatch({ type: 'quantitySuccess', plan })
      await loadProducts(plan)
    } catch (error) {
      dispatch({ type: 'quantityError', message: error instanceof PlanResultsServiceError ? error.message : 'Eventa could not calculate quantities. Please try again.' })
    }
  }

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

  async function generateConfirmedMenu() {
    dispatch({ type: 'menuStart' })
    try {
      const menu = await generateMenu(state.confirmedEvent, state.brief)
      dispatch({ type: 'menuSuccess', menu })
      void loadQuantities(state.confirmedEvent, menu)
    } catch (error) {
      const message = error instanceof GenerateMenuServiceError
        ? error.message
        : 'Eventa could not create the menu. Please try again.'
      dispatch({ type: 'menuError', message })
      throw error
    }
  }

  async function regeneratePlanWithBasics(fields: InterpretationField[]) {
    const event = fields.reduce(applyInterpretationFieldEdit, state.confirmedEvent)
    dispatch({ type: 'basicsRegenerationStart', event, interpretation: fields })
    try {
      const menu = await generateMenu(event, state.brief)
      dispatch({ type: 'menuSuccess', menu })
      void loadQuantities(event, menu)
    } catch (error) {
      const message = error instanceof GenerateMenuServiceError
        ? error.message
        : 'Eventa could not regenerate the plan. Please try again.'
      dispatch({ type: 'menuError', message })
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
        generateConfirmedMenu,
        resetMenuGeneration: () => dispatch({ type: 'menuReset' }),
        retryQuantities: () => loadQuantities(),
        retryProducts: async () => { if (state.quantityPlan) await loadProducts(state.quantityPlan) },
        regeneratePlanWithBasics,
        resetPlan: () => dispatch({ type: 'resetPlan' }),
        loadTemplate: (event, brief) => dispatch({
          type: 'loadTemplate',
          event,
          brief,
          interpretation: toInterpretationFields(event),
        }),
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
