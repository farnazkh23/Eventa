import { PackageCheck, ShoppingCart } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { PlanPage } from '../../components/layout/PlanPage'
import { Button } from '../../components/ui/Button'
import { PendingState } from '../../components/ui/PendingState'
import { PlanListItem } from '../../components/ui/PlanListItem'
import styles from './PlanningPages.module.css'

export function ShoppingListPage() {
  const { state } = usePlanning()
  const navigate = useNavigate()
  if (!state.menu) return <Navigate to="/interpretation" replace />

  return (
    <PlanPage title="Shopping list" subtitle="A consolidated list will be created from matched products." backTo="/plan" backLabel="Back to plan overview">
      <PendingState title="Not available yet" description="The shopping list will appear after quantities and product matches are ready." icon={ShoppingCart} />
      <section className={styles.section} aria-labelledby="shopping-status">
        <h2 id="shopping-status">Preparation status</h2>
        <div className={styles.stack}>
          <PlanListItem title="Quantities" detail="Not calculated yet" icon={PackageCheck} />
          <PlanListItem title="Product matches" detail="Not matched yet" icon={PackageCheck} />
          <PlanListItem title="Prices" detail="Not calculated yet" icon={PackageCheck} />
        </div>
      </section>
      <Button fullWidth className={styles.action} type="button" onClick={() => navigate('/plan/summary')}>View event summary</Button>
    </PlanPage>
  )
}
