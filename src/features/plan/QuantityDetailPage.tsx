import { Calculator, Scale } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { PlanPage } from '../../components/layout/PlanPage'
import { Button } from '../../components/ui/Button'
import { PendingState } from '../../components/ui/PendingState'
import { PlanListItem } from '../../components/ui/PlanListItem'
import { findMenuItem } from '../../domain/planResults'
import styles from './PlanningPages.module.css'

export function QuantityDetailPage() {
  const { state } = usePlanning()
  const navigate = useNavigate()
  const { itemId } = useParams()
  if (!state.menu) return <Navigate to="/interpretation" replace />
  const item = findMenuItem(state.menu, itemId)
  if (!item) return <Navigate to="/plan/quantities" replace />

  return (
    <PlanPage title="Quantity detail" subtitle="Calculation details for this menu selection.">
      <p className={styles.detailName}>{item.name}</p>
      <PendingState title="Not calculated yet" description="Servings, total amount, and calculation assumptions will appear here when available." icon={Calculator} />
      <section className={styles.section} aria-labelledby="quantity-breakdown">
        <h2 id="quantity-breakdown">Calculation</h2>
        <div className={styles.stack}>
          <PlanListItem title="Guest count" detail={state.confirmedEvent.guestCount ? `${state.confirmedEvent.guestCount} guests` : 'Not provided'} icon={Scale} />
          <PlanListItem title="Calculated amount" detail="Not calculated yet" icon={Calculator} />
        </div>
      </section>
      <Button fullWidth className={styles.action} type="button" onClick={() => navigate('/plan/quantities')}>Back to quantities</Button>
    </PlanPage>
  )
}
