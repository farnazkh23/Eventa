import { CalendarPlus, Check, ClipboardList, HandPlatter, Package, Scale, ShoppingCart, SlidersHorizontal, WalletCards } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { usePlanning } from '../../app/PlanningContext'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { MobileShell } from '../../components/layout/MobileShell'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PlanListItem } from '../../components/ui/PlanListItem'
import { PendingState } from '../../components/ui/PendingState'
import { PlanPage } from '../../components/layout/PlanPage'
import { PlanSummaryCard } from './PlanSummaryCard'
import styles from './PlanOverviewPage.module.css'

export function PlanOverviewPage() {
  const { state, retryQuantities } = usePlanning()
  const navigate = useNavigate()
  const { confirmedEvent, menu } = state

  useEffect(() => {
    if (menu && state.quantityStatus === 'idle') void retryQuantities()
  }, [menu, retryQuantities, state.quantityStatus])

  if (!menu) {
    return (
      <PlanPage title="Your event plan" subtitle="Your current Eventa plan will appear here.">
        <PendingState title="No current plan" description="Start a new plan, review the event details, and let Eventa build your menu." icon={CalendarPlus} />
        <Button type="button" fullWidth className={styles.review} onClick={() => navigate('/')}>Start a new plan</Button>
      </PlanPage>
    )
  }

  const eventTitle = confirmedEvent.eventType ?? menu.title
  const metadata = [
    confirmedEvent.guestCount ? `${confirmedEvent.guestCount} guests` : null,
    confirmedEvent.location,
    confirmedEvent.date,
  ].filter((value): value is string => Boolean(value))

  return (
    <MobileShell compact contentMode="fixed">
      <div className={styles.page}>
        <MobileHeader
          action={
            <button type="button" className={styles.cart} aria-label="Open shopping list" onClick={() => navigate('/plan/shopping-list')}>
              <ShoppingCart size={29} strokeWidth={1.8} aria-hidden="true" />
            </button>
          }
        />

        <div className={styles.scrollArea} tabIndex={0} role="region" aria-label="Event plan overview">
          <header className={styles.eventHeader}>
            <h1>{eventTitle}</h1>
            <p>
              {metadata.map((value, index) => (
                <span key={value} className={styles.metaItem}>
                  {index > 0 && <i aria-hidden="true" />}
                  <span>{value}</span>
                </span>
              ))}
            </p>
          </header>

          <div className={styles.basics}>
            <PlanListItem
              title="Event details"
              detail={[
                confirmedEvent.guestCount ? `${confirmedEvent.guestCount} guests` : null,
                confirmedEvent.location,
                confirmedEvent.serviceStyle ?? confirmedEvent.mealType,
              ].filter(Boolean).join(' · ') || 'Review event details'}
              icon={SlidersHorizontal}
              onClick={() => navigate('/plan/details')}
              ariaLabel="Review event details"
            />
          </div>

          <Card tone="success" className={styles.ready} role="status">
            <span className={styles.check}><Check size={31} strokeWidth={2.2} aria-hidden="true" /></span>
            <span>
              <strong>Your menu is ready</strong>
              <small>Review the menu while the remaining planning steps stay pending.</small>
            </span>
          </Card>

          <section className={styles.summaries} aria-label="Event plan summary">
            <PlanSummaryCard
              icon={HandPlatter}
              iconTone="neutral"
              title="Menu"
              ariaLabel="Open generated menu"
              onClick={() => navigate('/plan/menu')}
            >
              <span>{menu.items.length} selections</span>
              <small>{menu.items.slice(0, 4).map((item) => item.name).join(', ')}</small>
            </PlanSummaryCard>
            <PlanSummaryCard icon={Scale} iconTone="blue" title="Quantities" ariaLabel="Open quantity overview" onClick={() => navigate('/plan/quantities')}>
              <span>{quantitySummary(state)}</span>
            </PlanSummaryCard>
            <PlanSummaryCard icon={Package} iconTone="rose" title="Transgourmet products" ariaLabel="Open products overview" onClick={() => navigate('/plan/products')}>
              <span>{productSummary(state)}</span>
            </PlanSummaryCard>
            <PlanSummaryCard icon={WalletCards} iconTone="green" title="Budget" ariaLabel="Open budget" onClick={() => navigate('/plan/budget')}>
              <span>Calculated after product matching</span>
            </PlanSummaryCard>
            <PlanSummaryCard icon={ClipboardList} iconTone="neutral" title="Shopping list" ariaLabel="Open shopping list" onClick={() => navigate('/plan/shopping-list')}>
              <span>Available after product matching</span>
            </PlanSummaryCard>
          </section>

          <Button type="button" fullWidth className={styles.review} onClick={() => navigate('/plan/summary')}>View final summary</Button>
        </div>
      </div>
    </MobileShell>
  )
}

function quantitySummary(state: ReturnType<typeof usePlanning>['state']) {
  if (state.quantityStatus === 'loading' || state.quantityStatus === 'idle') return 'Calculating quantities…'
  if (state.quantityStatus === 'error') return 'Calculation failed · retry available'
  if (!state.quantityPlan) return 'Quantities unresolved'
  const calculated = state.quantityPlan.itemAllocations.filter((item) => item.status === 'calculated').length
  return state.quantityPlan.isComplete ? `${calculated} selections calculated` : calculated ? `${calculated} calculated · confirmation needed` : 'Quantities unresolved'
}

function productSummary(state: ReturnType<typeof usePlanning>['state']) {
  if (state.quantityStatus === 'loading' || state.productStatus === 'loading' || state.productStatus === 'idle') return 'Matching products…'
  if (state.productStatus === 'error') return 'Matching failed · retry available'
  if (!state.productPlan || state.productPlan.summary.matched === 0) return 'Products unresolved'
  const { matched, lowConfidence, unresolved } = state.productPlan.summary
  return lowConfidence || unresolved ? `${matched} matched · confirmation needed` : `${matched} products matched`
}
