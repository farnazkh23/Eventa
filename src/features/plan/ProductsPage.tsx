import { AlertTriangle, CheckCircle2, LoaderCircle, PackageSearch } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { PlanPage } from '../../components/layout/PlanPage'
import { Button } from '../../components/ui/Button'
import { PendingState } from '../../components/ui/PendingState'
import { PlanListItem } from '../../components/ui/PlanListItem'
import styles from './PlanningPages.module.css'

export function ProductsPage() {
  const { state, retryProducts } = usePlanning()
  const navigate = useNavigate()
  if (!state.menu) return <Navigate to="/interpretation" replace />
  const summary = state.productPlan?.summary

  function detailFor(itemId: string) {
    if (state.productStatus === 'loading' || state.quantityStatus === 'loading') return 'Matching products…'
    if (state.productStatus === 'error') return 'Matching unavailable'
    const matches = state.productPlan?.matches.filter((match) => match.sourceMenuItemIds.includes(itemId)) ?? []
    if (matches.length === 0) return 'No resolved ingredients'
    const confirmed = matches.filter((match) => match.status === 'matched').length
    const review = matches.filter((match) => match.status === 'low_confidence').length
    const unresolved = matches.filter((match) => match.status === 'unresolved').length
    return [confirmed ? `${confirmed} matched` : null, review ? `${review} to confirm` : null, unresolved ? `${unresolved} unresolved` : null].filter(Boolean).join(' · ')
  }

  return (
    <PlanPage title="Products overview" subtitle="Real Transgourmet matches grouped by menu selection.">
      {(state.productStatus === 'loading' || state.quantityStatus === 'loading') && <PendingState title="Matching products" description="Eventa is matching calculated ingredient requirements." icon={LoaderCircle} />}
      {state.productStatus === 'error' && <div className={styles.stateBlock}><PendingState title="Product matching failed" description={state.productError ?? 'Please try again.'} icon={AlertTriangle} /><Button fullWidth type="button" onClick={() => void retryProducts()}>Retry matching</Button></div>}
      {state.productStatus === 'success' && summary && <PendingState title={summary.totalIngredients === 0 || summary.matched === 0 ? 'Products unresolved' : summary.lowConfidence || summary.unresolved ? 'Product matches need confirmation' : 'Products matched'} description={`${summary.matched} matched · ${summary.lowConfidence} to confirm · ${summary.unresolved} unresolved`} icon={summary.lowConfidence || summary.unresolved ? AlertTriangle : CheckCircle2} />}
      <section className={styles.section} aria-labelledby="product-groups">
        <h2 id="product-groups">Menu selections</h2>
        <div className={styles.stack}>
          {state.menu.items.map((item) => <PlanListItem key={item.id} title={item.name} detail={detailFor(item.id)} icon={PackageSearch} onClick={() => navigate(`/plan/products/${encodeURIComponent(item.id)}`)} ariaLabel={`View product matches for ${item.name}`} />)}
        </div>
      </section>
      <Button fullWidth className={styles.action} type="button" onClick={() => navigate('/plan/budget')}>View budget</Button>
    </PlanPage>
  )
}
