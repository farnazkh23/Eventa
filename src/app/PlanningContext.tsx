import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { InterpretationField, PlanningEventInterpretation, PlanningState } from '../domain/planning'
import {
  applyInterpretationFieldEdit,
  toInterpretationFields,
  emptyEventInterpretation,
} from '../services/eventInterpretationMapper'
import { interpretEvent, InterpretEventServiceError } from '../services/interpretEvent'
import { generateMenu, GenerateMenuServiceError } from '../services/generateMenu'
import { calculateQuantities, createPurchasingPlan, matchProducts, PlanResultsServiceError } from '../services/planResults'
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
  | { type: 'servingOverridesSet'; overrides: Record<string, number> }
  | { type: 'productStart' }
  | { type: 'productSuccess'; plan: ProductMatchPlan }
  | { type: 'productError'; message: string }
  | { type: 'purchasingStart' }
  | { type: 'purchasingSuccess' }
  | { type: 'purchasingError'; message: string }
  | { type: 'basicsRegenerationStart'; event: PlanningEventInterpretation; interpretation: InterpretationField[] }
  | { type: 'resetPlan' }
  | { type: 'loadTemplate'; event: PlanningEventInterpretation; brief: string; interpretation: InterpretationField[] }

interface PlanningContextValue {
  state: PlanningState
  setBrief: (brief: string) => void
  interpretBrief: () => Promise<void>
  startManualEntry: () => void
  updateField: (field: InterpretationField) => void
  generateConfirmedMenu: () => Promise<boolean>
  retryFailedPlanningPhase: () => Promise<boolean>
  resetMenuGeneration: () => void
  retryQuantities: () => Promise<void>
  retryProducts: () => Promise<void>
  confirmServingAllocation: (menuItemId: string, servings: number) => Promise<void>
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
  servingOverrides: {},
  productPlan: null,
  productStatus: 'idle',
  productError: null,
  purchasingStatus: 'idle',
  purchasingError: null,
  planningPhase: 'understanding_event',
  failedPlanningPhase: null,
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
        servingOverrides: {},
        productPlan: null,
        productStatus: 'idle',
        productError: null,
        purchasingStatus: 'idle',
        purchasingError: null,
        planningPhase: 'understanding_event',
        failedPlanningPhase: null,
        planInvalidatedByBrief: state.planInvalidatedByBrief || Boolean(state.menu),
      }
    case 'interpretStart':
      return { ...state, interpretationStatus: 'loading', interpretationError: null, planningPhase: 'understanding_event', failedPlanningPhase: null }
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
        servingOverrides: {},
        productPlan: null,
        productStatus: 'idle',
        productError: null,
        purchasingStatus: 'idle',
        purchasingError: null,
        planningPhase: 'understanding_event',
        failedPlanningPhase: null,
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
        servingOverrides: {},
        productPlan: null,
        productStatus: 'idle',
        productError: null,
        purchasingStatus: 'idle',
        purchasingError: null,
        planningPhase: 'understanding_event',
        failedPlanningPhase: null,
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
        servingOverrides: {},
        productPlan: null,
        productStatus: 'idle',
        productError: null,
        purchasingStatus: 'idle',
        purchasingError: null,
        planningPhase: 'understanding_event',
        failedPlanningPhase: null,
      }
    case 'menuStart':
      return { ...state, menuStatus: 'loading', menuError: null, planningPhase: 'creating_menu', failedPlanningPhase: null }
    case 'menuSuccess':
      return { ...state, menu: action.menu, menuStatus: 'success', menuError: null, quantityPlan: null, quantityStatus: 'idle', quantityError: null, servingOverrides: {}, productPlan: null, productStatus: 'idle', productError: null, purchasingStatus: 'idle', purchasingError: null, planInvalidatedByBrief: false }
    case 'menuError':
      return { ...state, menu: null, menuStatus: 'error', menuError: action.message, planningPhase: 'error', failedPlanningPhase: 'creating_menu' }
    case 'menuReset':
      return { ...state, menu: null, menuStatus: 'idle', menuError: null, quantityPlan: null, quantityStatus: 'idle', quantityError: null, productPlan: null, productStatus: 'idle', productError: null, purchasingStatus: 'idle', purchasingError: null, planningPhase: 'understanding_event', failedPlanningPhase: null }
    case 'quantityStart':
      return { ...state, quantityStatus: 'loading', quantityError: null, productPlan: null, productStatus: 'idle', productError: null, purchasingStatus: 'idle', purchasingError: null, planningPhase: 'calculating_quantities', failedPlanningPhase: null }
    case 'quantitySuccess':
      return { ...state, quantityPlan: action.plan, quantityStatus: 'success', quantityError: null }
    case 'quantityError':
      return { ...state, quantityPlan: null, quantityStatus: 'error', quantityError: action.message, productPlan: null, productStatus: 'idle', productError: null, purchasingStatus: 'idle', purchasingError: null, planningPhase: 'error', failedPlanningPhase: 'calculating_quantities' }
    case 'servingOverridesSet':
      return { ...state, servingOverrides: action.overrides }
    case 'productStart':
      return { ...state, productStatus: 'loading', productError: null, purchasingStatus: 'idle', purchasingError: null, planningPhase: 'matching_products', failedPlanningPhase: null }
    case 'productSuccess':
      return { ...state, productPlan: action.plan, productStatus: 'success', productError: null }
    case 'productError':
      return { ...state, productPlan: null, productStatus: 'error', productError: action.message, planningPhase: 'error', failedPlanningPhase: 'matching_products' }
    case 'purchasingStart':
      return { ...state, purchasingStatus: 'loading', purchasingError: null, planningPhase: 'calculating_budget', failedPlanningPhase: null }
    case 'purchasingSuccess':
      return { ...state, purchasingStatus: 'success', purchasingError: null, planningPhase: 'complete', failedPlanningPhase: null }
    case 'purchasingError':
      return { ...state, purchasingStatus: 'error', purchasingError: action.message, planningPhase: 'error', failedPlanningPhase: 'calculating_budget' }
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
        servingOverrides: {},
        productPlan: null,
        productStatus: 'idle',
        productError: null,
        purchasingStatus: 'idle',
        purchasingError: null,
        planningPhase: 'creating_menu',
        failedPlanningPhase: null,
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

  async function loadPurchasing(productPlan: ProductMatchPlan, event = state.confirmedEvent) {
    dispatch({ type: 'purchasingStart' })
    if (event.guestCount === null) {
      dispatch({ type: 'purchasingError', message: 'Add a guest count before calculating the budget.' })
      return false
    }
    try {
      await createPurchasingPlan(event, productPlan)
      dispatch({ type: 'purchasingSuccess' })
      return true
    } catch (error) {
      dispatch({ type: 'purchasingError', message: error instanceof PlanResultsServiceError ? error.message : 'Eventa could not calculate the budget. Please try again.' })
      return false
    }
  }

  async function loadProducts(plan: QuantityPlan, event = state.confirmedEvent) {
    dispatch({ type: 'productStart' })
    if (plan.ingredientRequirements.length === 0) {
      const productPlan = { matches: [], summary: { totalIngredients: 0, matched: 0, lowConfidence: 0, unresolved: 0, selectedProductsWithPrice: 0 } }
      dispatch({ type: 'productSuccess', plan: productPlan })
      return loadPurchasing(productPlan, event)
    }
    try {
      const productPlan = await matchProducts(plan.ingredientRequirements)
      dispatch({ type: 'productSuccess', plan: productPlan })
      return loadPurchasing(productPlan, event)
    } catch (error) {
      dispatch({ type: 'productError', message: error instanceof PlanResultsServiceError ? error.message : 'Eventa could not match products. Please try again.' })
      return false
    }
  }

  async function loadQuantities(event = state.confirmedEvent, menu = state.menu, overrides = state.servingOverrides) {
    dispatch({ type: 'quantityStart' })
    if (!menu) {
      dispatch({ type: 'quantityError', message: 'A generated menu is required before calculating quantities.' })
      return false
    }
    if (event.guestCount === null) {
      dispatch({ type: 'quantityError', message: 'Add a guest count before calculating quantities.' })
      return false
    }
    try {
      const servingOverrides = Object.entries(overrides).map(([menuItemId, servings]) => ({ menuItemId, servings }))
      const plan = await calculateQuantities(event, menu, servingOverrides)
      dispatch({ type: 'quantitySuccess', plan })
      return await loadProducts(plan, event)
    } catch (error) {
      dispatch({ type: 'quantityError', message: error instanceof PlanResultsServiceError ? error.message : 'Eventa could not calculate quantities. Please try again.' })
      return false
    }
  }

  async function confirmServingAllocation(menuItemId: string, servings: number) {
    const overrides = { ...state.servingOverrides, [menuItemId]: servings }
    dispatch({ type: 'servingOverridesSet', overrides })
    await loadQuantities(state.confirmedEvent, state.menu, overrides)
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
      return true
    } catch (error) {
      const message = error instanceof GenerateMenuServiceError
        ? error.message
        : 'Eventa could not create the menu. Please try again.'
      dispatch({ type: 'menuError', message })
      throw error
    }
  }

  async function retryFailedPlanningPhase() {
    switch (state.failedPlanningPhase) {
      case 'creating_menu':
        return generateConfirmedMenu()
      case 'calculating_quantities':
        return loadQuantities(state.confirmedEvent, state.menu, state.servingOverrides)
      case 'matching_products':
        if (state.quantityPlan) return loadProducts(state.quantityPlan, state.confirmedEvent)
        dispatch({ type: 'productError', message: 'Quantity results are required before matching products.' })
        return false
      case 'calculating_budget':
        if (state.productPlan) return loadPurchasing(state.productPlan, state.confirmedEvent)
        dispatch({ type: 'purchasingError', message: 'Product matches are required before calculating the budget.' })
        return false
      case 'understanding_event':
      case null:
        return false
    }
  }

  async function regeneratePlanWithBasics(fields: InterpretationField[]) {
    const event = fields.reduce(applyInterpretationFieldEdit, state.confirmedEvent)
    dispatch({ type: 'basicsRegenerationStart', event, interpretation: fields })
    try {
      const menu = await generateMenu(event, state.brief)
      dispatch({ type: 'menuSuccess', menu })
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
        retryFailedPlanningPhase,
        resetMenuGeneration: () => dispatch({ type: 'menuReset' }),
        retryQuantities: async () => { await loadQuantities() },
        retryProducts: async () => { if (state.quantityPlan) await loadProducts(state.quantityPlan) },
        confirmServingAllocation,
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
