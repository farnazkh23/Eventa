import { AlertTriangle, Calculator, Scale } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { PlanPage } from '../../components/layout/PlanPage'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PendingState } from '../../components/ui/PendingState'
import { PlanListItem } from '../../components/ui/PlanListItem'
import { allocationLabel, findMenuItem, formatQuantity } from '../../domain/planResults'
import styles from './PlanningPages.module.css'

export function QuantityDetailPage() {
  const { state, retryQuantities, confirmServingAllocation } = usePlanning()
  const navigate = useNavigate()
  const { itemId } = useParams()
  const [servings, setServings] = useState(() => itemId ? String(state.servingOverrides[itemId] ?? '') : '')
  if (!state.menu) return <Navigate to="/interpretation" replace />
  const item = findMenuItem(state.menu, itemId)
  if (!item) return <Navigate to="/plan/quantities" replace />
  const menuItemId = item.id
  const allocation = state.quantityPlan?.itemAllocations.find((entry) => entry.menuItemId === menuItemId)
  const ingredients = state.quantityPlan?.ingredientRequirements.filter((entry) => entry.sourceMenuItemIds.includes(menuItemId)) ?? []
  const guestLimit = state.quantityPlan?.guestCount ?? state.confirmedEvent.guestCount
  const parsedServings = Number(servings)
  const canConfirm = Number.isInteger(parsedServings) && parsedServings > 0 && guestLimit !== null && parsedServings <= guestLimit && state.quantityStatus !== 'loading'
  const needsServingConfirmation = allocation?.status === 'needs_confirmation' && allocation.plannedServings === null

  function handleConfirmation(event: FormEvent) {
    event.preventDefault()
    if (canConfirm) void confirmServingAllocation(menuItemId, parsedServings)
  }

  return (
    <PlanPage title="Quantity detail" subtitle="Backend calculation details for this menu selection.">
      <p className={styles.detailName}>{item.name}</p>
      {state.quantityStatus === 'error' && <div className={styles.stateBlock}><PendingState title="Quantity calculation failed" description={state.quantityError ?? 'Please try again.'} icon={AlertTriangle} /><Button fullWidth type="button" onClick={() => void retryQuantities()}>Retry calculation</Button></div>}
      {allocation?.reason && <PendingState title={allocationLabel(allocation)} description={allocation.reason} icon={AlertTriangle} />}
      {needsServingConfirmation && (
        <Card className={styles.confirmationCard}>
          <form onSubmit={handleConfirmation}>
            <label htmlFor="serving-allocation">How many guests should receive this option?</label>
            <div className={styles.quantityInput}>
              <input id="serving-allocation" type="number" inputMode="numeric" min="1" max={guestLimit ?? undefined} step="1" value={servings} onChange={(event) => setServings(event.target.value)} aria-describedby="serving-allocation-hint" />
              <span>guests</span>
            </div>
            <small id="serving-allocation-hint">Enter between 1 and {guestLimit} guests.</small>
            <Button type="submit" fullWidth disabled={!canConfirm} aria-busy={state.quantityStatus === 'loading'}>{state.quantityStatus === 'loading' ? 'Recalculating…' : 'Confirm & recalculate'}</Button>
          </form>
        </Card>
      )}
      <section className={styles.section} aria-labelledby="quantity-breakdown">
        <h2 id="quantity-breakdown">Calculation</h2>
        <div className={styles.stack}>
          <PlanListItem title="Guest count" detail={state.quantityPlan ? `${state.quantityPlan.guestCount} guests` : 'Loading calculation…'} icon={Scale} />
          <PlanListItem title="Planned servings" detail={allocationLabel(allocation)} icon={Calculator} />
          {ingredients.map((ingredient) => <PlanListItem key={ingredient.ingredientKey} title={ingredient.name} detail={formatQuantity(ingredient.amount, ingredient.unit)} icon={Scale} />)}
        </div>
      </section>
      {state.quantityPlan && ingredients.length === 0 && <p className={styles.note}>No resolved ingredient quantities are available for this selection.</p>}
      <Button fullWidth className={styles.action} type="button" onClick={() => navigate('/plan/quantities')}>Back to quantities</Button>
    </PlanPage>
  )
}
