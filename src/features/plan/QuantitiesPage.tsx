import { AlertTriangle, CheckCircle2, LoaderCircle, Scale } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { PlanPage } from '../../components/layout/PlanPage'
import { Button } from '../../components/ui/Button'
import { PendingState } from '../../components/ui/PendingState'
import { PlanListItem } from '../../components/ui/PlanListItem'
import { allocationLabel } from '../../domain/planResults'
import styles from './PlanningPages.module.css'

export function QuantitiesPage() {
  const { state, retryQuantities } = usePlanning()
  const navigate = useNavigate()
  if (!state.menu) return <Navigate to="/interpretation" replace />
  const plan = state.quantityPlan
  const calculated = plan?.itemAllocations.filter((item) => item.status === 'calculated').length ?? 0
  const needsConfirmation = plan?.itemAllocations.filter((item) => item.status === 'needs_confirmation' && item.plannedServings === null).length ?? 0

  return (
    <PlanPage title="Quantity overview" subtitle="Calculated requirements for the confirmed menu and guest count.">
      {state.quantityStatus === 'loading' && <PendingState title="Calculating quantities" description="Eventa is calculating servings and ingredient requirements." icon={LoaderCircle} />}
      {state.quantityStatus === 'error' && <div className={styles.stateBlock}><PendingState title="Quantity calculation failed" description={state.quantityError ?? 'Please try again.'} icon={AlertTriangle} /><Button fullWidth type="button" onClick={() => void retryQuantities()}>Retry calculation</Button></div>}
      {state.quantityStatus === 'success' && plan && <PendingState title={plan.isComplete ? 'Quantities complete' : needsConfirmation ? `${needsConfirmation} serving allocation${needsConfirmation === 1 ? '' : 's'} need confirmation` : calculated > 0 ? 'Some ingredient quantities are unresolved' : 'Quantities unresolved'} description={plan.isComplete ? `${plan.itemAllocations.length} menu selections calculated.` : needsConfirmation ? 'Confirm the guest count for each option. Calculated quantities remain available below.' : `${calculated} of ${plan.itemAllocations.length} selections have serving allocations.`} icon={plan.isComplete ? CheckCircle2 : AlertTriangle} />}
      <section className={styles.section} aria-labelledby="quantity-items">
        <h2 id="quantity-items">Menu selections</h2>
        <div className={styles.stack}>
          {state.menu.items.map((item) => {
            const allocation = plan?.itemAllocations.find((entry) => entry.menuItemId === item.id)
            return <PlanListItem key={item.id} title={item.name} detail={state.quantityStatus === 'loading' ? 'Calculating…' : state.quantityStatus === 'error' ? 'Calculation unavailable' : allocationLabel(allocation)} icon={Scale} onClick={() => navigate(`/plan/quantities/${encodeURIComponent(item.id)}`)} ariaLabel={`View quantity details for ${item.name}`} />
          })}
        </div>
      </section>
      <Button fullWidth className={styles.action} type="button" onClick={() => navigate('/plan/products')}>View product matching</Button>
    </PlanPage>
  )
}
