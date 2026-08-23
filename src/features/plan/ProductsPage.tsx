import { AlertTriangle, CheckCircle2, LoaderCircle, PackageSearch } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { PlanPage } from '../../components/layout/PlanPage'
import { Button } from '../../components/ui/Button'
import { PendingState } from '../../components/ui/PendingState'
import { PlanListItem } from '../../components/ui/PlanListItem'
import { productStatusLabel } from '../../domain/planResults'
import styles from './PlanningPages.module.css'

export function ProductsPage() {
  const { state, retryProducts } = usePlanning()
  const navigate = useNavigate()
  if (!state.menu) return <Navigate to="/interpretation" replace />
  const summary = state.productPlan?.summary

  return (
    <PlanPage title="Products overview" subtitle="Transgourmet matches for every resolved ingredient requirement.">
      {(state.productStatus === 'loading' || state.quantityStatus === 'loading') && <PendingState title="Matching products" description="Eventa is matching the currently calculated ingredient requirements." icon={LoaderCircle} />}
      {state.productStatus === 'error' && <div className={styles.stateBlock}><PendingState title="Product matching failed" description={state.productError ?? 'Please try again.'} icon={AlertTriangle} /><Button fullWidth type="button" onClick={() => void retryProducts()}>Retry matching</Button></div>}
      {state.productStatus === 'success' && summary && <PendingState title={summary.totalIngredients === 0 || summary.matched === 0 ? 'Products unresolved' : summary.lowConfidence || summary.unresolved ? 'Some matches need review' : 'Products matched'} description={`${summary.matched} matched · ${summary.lowConfidence} to review · ${summary.unresolved} unresolved`} icon={summary.lowConfidence || summary.unresolved ? AlertTriangle : CheckCircle2} />}
      <section className={styles.section} aria-labelledby="product-matches">
        <h2 id="product-matches">Product matches</h2>
        <div className={styles.stack}>
          {state.productPlan?.matches.map((match) => {
            const product = match.selectedProduct
            const title = product?.name ?? match.ingredientName
            const status = match.status === 'low_confidence' ? 'Review match' : match.status === 'unresolved' ? 'No safe product match found' : productStatusLabel(match.status)
            const detail = [product ? `Article ${product.articleNumber}` : null, match.ingredientName, status].filter(Boolean).join(' · ')
            const sourceItemId = match.sourceMenuItemIds[0]
            return <PlanListItem key={match.ingredientKey} title={title} detail={detail} icon={PackageSearch} onClick={sourceItemId ? () => navigate(`/plan/products/${encodeURIComponent(sourceItemId)}`) : undefined} ariaLabel={`Review product match for ${match.ingredientName}`} />
          })}
        </div>
      </section>
      {state.productStatus === 'success' && state.productPlan?.matches.length === 0 && <PendingState title="No matchable ingredients" description="Confirm unresolved quantities to create additional ingredient requirements." icon={PackageSearch} />}
      <Button fullWidth className={styles.action} type="button" onClick={() => navigate('/plan/budget')}>View budget</Button>
    </PlanPage>
  )
}
