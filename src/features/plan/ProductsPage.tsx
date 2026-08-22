import { PackageSearch } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { PlanPage } from '../../components/layout/PlanPage'
import { Button } from '../../components/ui/Button'
import { PendingState } from '../../components/ui/PendingState'
import { PlanListItem } from '../../components/ui/PlanListItem'
import { getPlanResults } from '../../domain/planResults'
import styles from './PlanningPages.module.css'

export function ProductsPage() {
  const { state } = usePlanning()
  const navigate = useNavigate()
  if (!state.menu) return <Navigate to="/interpretation" replace />
  const results = getPlanResults()

  return (
    <PlanPage title="Products overview" subtitle="Transgourmet matches will be grouped by menu selection.">
      {results.products.status === 'pending' && <PendingState title="Not matched yet" description="No Transgourmet products have been matched to this menu yet." icon={PackageSearch} />}
      <section className={styles.section} aria-labelledby="product-groups">
        <h2 id="product-groups">Menu selections</h2>
        <div className={styles.stack}>
          {state.menu.items.map((item) => <PlanListItem key={item.id} title={item.name} detail="Product match pending" icon={PackageSearch} onClick={() => navigate(`/plan/products/${encodeURIComponent(item.id)}`)} ariaLabel={`View product matches for ${item.name}`} />)}
        </div>
      </section>
      <Button fullWidth className={styles.action} type="button" onClick={() => navigate('/plan/budget')}>View budget</Button>
    </PlanPage>
  )
}
