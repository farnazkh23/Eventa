import { AlertTriangle, Barcode, PackageSearch } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { PlanPage } from '../../components/layout/PlanPage'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PendingState } from '../../components/ui/PendingState'
import { findMenuItem, formatQuantity } from '../../domain/planResults'
import styles from './PlanningPages.module.css'

const currency = new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' })

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
            const status = match.status === 'matched' ? 'Matched' : match.status === 'low_confidence' ? 'Review match' : 'No safe product match found'
            return (
              <Card key={match.ingredientKey} className={styles.matchCard}>
                <div className={styles.matchHeading}>
                  <span className={styles.matchIcon}>{product ? <Barcode size={22} aria-hidden="true" /> : <PackageSearch size={22} aria-hidden="true" />}</span>
                  <span><strong>{match.ingredientName}</strong><small>{formatQuantity(match.requiredAmount, match.requiredUnit)}</small></span>
                </div>
                <strong className={match.status === 'matched' ? styles.matchSuccess : styles.matchAttention}>{status}</strong>
                {product && (
                  <dl className={styles.productFacts}>
                    <div><dt>Product</dt><dd>{product.name}</dd></div>
                    <div><dt>Article number</dt><dd>{product.articleNumber}</dd></div>
                    <div><dt>Pack size</dt><dd>{product.packSizeValue !== null && product.packSizeUnit ? `${product.packSizeValue} ${product.packSizeUnit}` : 'Not provided'}</dd></div>
                    {product.priceCHF !== null && <div><dt>Price</dt><dd>{currency.format(product.priceCHF)}{product.priceBasis ? ` · ${product.priceBasis}` : ''}</dd></div>}
                    <div><dt>Match confidence</dt><dd>{Math.round(match.score)}%</dd></div>
                  </dl>
                )}
                {!product && <p className={styles.matchReason}>{match.reason}</p>}
              </Card>
            )
          })}
        </div>
      </section>
      {state.productStatus === 'success' && matches.length === 0 && <PendingState title="No product matches available" description="This selection has no resolved ingredient requirements to match." icon={PackageSearch} />}
      <Button fullWidth className={styles.action} type="button" onClick={() => navigate('/plan/products')}>Back to products</Button>
    </PlanPage>
  )
}
