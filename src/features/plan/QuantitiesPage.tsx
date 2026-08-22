import { Scale } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { PlanPage } from '../../components/layout/PlanPage'
import { Button } from '../../components/ui/Button'
import { PendingState } from '../../components/ui/PendingState'
import { PlanListItem } from '../../components/ui/PlanListItem'
import { getPlanResults } from '../../domain/planResults'
import styles from './PlanningPages.module.css'

export function QuantitiesPage() {
  const { state } = usePlanning()
  const navigate = useNavigate()
  if (!state.menu) return <Navigate to="/interpretation" replace />
  const results = getPlanResults()

  return (
    <PlanPage title="Quantity overview" subtitle="Review each menu selection once quantities have been calculated." backTo="/plan" backLabel="Back to plan overview">
      {results.quantities.status === 'pending' && <PendingState title="Not calculated yet" description="Quantity calculations are waiting for backend planning data." icon={Scale} />}
      <section className={styles.section} aria-labelledby="quantity-items">
        <h2 id="quantity-items">Menu selections</h2>
        <div className={styles.stack}>
          {state.menu.items.map((item) => (
            <PlanListItem key={item.id} title={item.name} detail="Quantity pending" icon={Scale} onClick={() => navigate(`/plan/quantities/${encodeURIComponent(item.id)}`)} ariaLabel={`View quantity details for ${item.name}`} />
          ))}
        </div>
      </section>
      <Button fullWidth className={styles.action} type="button" onClick={() => navigate('/plan/products')}>View product matching</Button>
    </PlanPage>
  )
}
