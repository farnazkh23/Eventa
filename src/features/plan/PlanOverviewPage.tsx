import { Check, HandPlatter, Package, Scale, ShoppingCart, WalletCards } from 'lucide-react'
import { usePlanning } from '../../app/PlanningContext'
import { BottomNavigation } from '../../components/layout/BottomNavigation'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { MobileShell } from '../../components/layout/MobileShell'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PlanSummaryCard } from './PlanSummaryCard'
import styles from './PlanOverviewPage.module.css'

const chf = new Intl.NumberFormat('en-CH', {
  style: 'currency',
  currency: 'CHF',
  maximumFractionDigits: 0,
})

export function PlanOverviewPage() {
  const { state } = usePlanning()
  const { plan } = state
  const costPerGuest = plan.totalCost / plan.guestCount
  const totalBudget = plan.budgetPerGuest * plan.guestCount
  const underBudget = totalBudget - plan.totalCost

  return (
    <MobileShell compact contentMode="fixed" bottomNavigation={<BottomNavigation />}>
      <div className={styles.page}>
        <MobileHeader
          action={
            <button type="button" className={styles.cart} aria-label="Shopping cart, 3 items">
              <ShoppingCart size={29} strokeWidth={1.8} aria-hidden="true" />
              <span>3</span>
            </button>
          }
        />

        <div className={styles.scrollArea} tabIndex={0} role="region" aria-label="Event plan overview">
          <header className={styles.eventHeader}>
            <h1>{plan.title}</h1>
            <p>
              <span>{plan.guestCount} guests</span><i aria-hidden="true" />
              <span>{plan.location}</span><i aria-hidden="true" />
              <span>{plan.date}</span>
            </p>
          </header>

          <Card tone="success" className={styles.ready} role="status">
            <span className={styles.check}><Check size={31} strokeWidth={2.2} aria-hidden="true" /></span>
            <span>
              <strong>Your plan is ready</strong>
              <small>All set. Let’s review and finalize your order.</small>
            </span>
          </Card>

          <section className={styles.summaries} aria-label="Event plan summary">
            <PlanSummaryCard icon={HandPlatter} iconTone="neutral" title="Menu" ariaLabel="Open menu summary">
              <span>{plan.menu.length} selections</span>
              <small>{plan.menu.join(', ')}</small>
            </PlanSummaryCard>
            <PlanSummaryCard icon={Scale} iconTone="blue" title="Quantities" ariaLabel="Open quantities summary">
              <span>{plan.foodKg} kg food<br />{plan.beveragesLitres} L beverages</span>
            </PlanSummaryCard>
            <PlanSummaryCard icon={Package} iconTone="rose" title="Transgourmet products" ariaLabel="Open product summary">
              <span>{plan.productCount} products selected</span>
              <span>{chf.format(plan.totalCost)}</span>
            </PlanSummaryCard>
            <PlanSummaryCard icon={WalletCards} iconTone="green" title="Budget" ariaLabel="Open budget summary">
              <strong className={styles.total}>{chf.format(plan.totalCost)}</strong>
              <span>CHF {costPerGuest.toFixed(2)} / guest</span>
              <small className={styles.saving}>● CHF {underBudget.toFixed(0)} under budget</small>
            </PlanSummaryCard>
          </section>

          <Button type="button" fullWidth className={styles.review}>Review shopping list</Button>
        </div>
      </div>
    </MobileShell>
  )
}
