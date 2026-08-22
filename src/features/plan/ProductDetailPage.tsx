import { AlertTriangle, Barcode, PackageSearch } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { PlanPage } from '../../components/layout/PlanPage'
import { Button } from '../../components/ui/Button'
import { PendingState } from '../../components/ui/PendingState'
import { PlanListItem } from '../../components/ui/PlanListItem'
import { findMenuItem, formatQuantity, productStatusLabel } from '../../domain/planResults'
import styles from './PlanningPages.module.css'

export function ProductDetailPage() {
  const { state, retryProducts } = usePlanning()
  const navigate = useNavigate()
  const { itemId } = useParams()
  if (!state.menu) return <Navigate to="/interpretation" replace />
  const item = findMenuItem(state.menu, itemId)
  if (!item) return <Navigate to="/plan/products" replace />
  const matches = state.productPlan?.matches.filter((match) => match.sourceMenuItemIds.includes(item.id)) ?? []

  return (
    <PlanPage title="Product detail" subtitle="Matched products and unresolved ingredients for this selection.">
      <p className={styles.detailName}>{item.name}</p>
      {state.productStatus === 'error' && <div className={styles.stateBlock}><PendingState title="Product matching failed" description={state.productError ?? 'Please try again.'} icon={AlertTriangle} /><Button fullWidth type="button" onClick={() => void retryProducts()}>Retry matching</Button></div>}
      <section className={styles.section} aria-labelledby="match-status">
        <h2 id="match-status">Ingredient matches</h2>
        <div className={styles.stack}>
          {matches.map((match) => {
            const product = match.selectedProduct
            const details = product
              ? [product.name, product.articleNumber ? `Article ${product.articleNumber}` : null, product.packSizeValue && product.packSizeUnit ? `${product.packSizeValue} ${product.packSizeUnit}` : null].filter(Boolean).join(' · ')
              : `${formatQuantity(match.requiredAmount, match.requiredUnit)} · ${productStatusLabel(match.status)}`
            return <PlanListItem key={match.ingredientKey} title={`${match.ingredientName} — ${productStatusLabel(match.status)}`} detail={details} icon={product ? Barcode : PackageSearch} />
          })}
        </div>
      </section>
      {state.productStatus === 'success' && matches.length === 0 && <PendingState title="No product matches available" description="This selection has no resolved ingredient requirements to match." icon={PackageSearch} />}
      <Button fullWidth className={styles.action} type="button" onClick={() => navigate('/plan/products')}>Back to products</Button>
    </PlanPage>
  )
}
