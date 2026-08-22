import { AlertTriangle, Calculator, Scale } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { PlanPage } from '../../components/layout/PlanPage'
import { Button } from '../../components/ui/Button'
import { PendingState } from '../../components/ui/PendingState'
import { PlanListItem } from '../../components/ui/PlanListItem'
import { allocationLabel, findMenuItem, formatQuantity } from '../../domain/planResults'
import styles from './PlanningPages.module.css'

export function QuantityDetailPage() {
  const { state, retryQuantities } = usePlanning()
  const navigate = useNavigate()
  const { itemId } = useParams()
  if (!state.menu) return <Navigate to="/interpretation" replace />
  const item = findMenuItem(state.menu, itemId)
  if (!item) return <Navigate to="/plan/quantities" replace />
  const allocation = state.quantityPlan?.itemAllocations.find((entry) => entry.menuItemId === item.id)
  const ingredients = state.quantityPlan?.ingredientRequirements.filter((entry) => entry.sourceMenuItemIds.includes(item.id)) ?? []

  return (
    <PlanPage title="Quantity detail" subtitle="Backend calculation details for this menu selection.">
      <p className={styles.detailName}>{item.name}</p>
      {state.quantityStatus === 'error' && <div className={styles.stateBlock}><PendingState title="Quantity calculation failed" description={state.quantityError ?? 'Please try again.'} icon={AlertTriangle} /><Button fullWidth type="button" onClick={() => void retryQuantities()}>Retry calculation</Button></div>}
      {allocation?.reason && <PendingState title={allocationLabel(allocation)} description={allocation.reason} icon={AlertTriangle} />}
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
