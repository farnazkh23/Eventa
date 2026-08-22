import { Barcode, PackageSearch } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { PlanPage } from '../../components/layout/PlanPage'
import { Button } from '../../components/ui/Button'
import { PendingState } from '../../components/ui/PendingState'
import { PlanListItem } from '../../components/ui/PlanListItem'
import { findMenuItem } from '../../domain/planResults'
import styles from './PlanningPages.module.css'

export function ProductDetailPage() {
  const { state } = usePlanning()
  const navigate = useNavigate()
  const { itemId } = useParams()
  if (!state.menu) return <Navigate to="/interpretation" replace />
  const item = findMenuItem(state.menu, itemId)
  if (!item) return <Navigate to="/plan/products" replace />

  return (
    <PlanPage title="Product detail" subtitle="Matched packs and ordering details for this selection." backTo="/plan/products" backLabel="Back to products overview">
      <p className={styles.detailName}>{item.name}</p>
      <PendingState title="Not matched yet" description="Product name, pack size, article number, quantity, and price will appear after matching." icon={Barcode} />
      <section className={styles.section} aria-labelledby="match-status">
        <h2 id="match-status">Match status</h2>
        <PlanListItem title="Transgourmet product" detail="No product selected" icon={PackageSearch} />
      </section>
      <Button fullWidth className={styles.action} type="button" onClick={() => navigate('/plan/products')}>Back to products</Button>
    </PlanPage>
  )
}
