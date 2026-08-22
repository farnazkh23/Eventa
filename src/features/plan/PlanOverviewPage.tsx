import { Check, HandPlatter, Package, Scale, ShoppingCart, WalletCards } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { BottomNavigation } from '../../components/layout/BottomNavigation'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { MobileShell } from '../../components/layout/MobileShell'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PlanSummaryCard } from './PlanSummaryCard'
import styles from './PlanOverviewPage.module.css'

export function PlanOverviewPage() {
  const { state } = usePlanning()
  const navigate = useNavigate()
  const { confirmedEvent, menu } = state

  if (!menu) return <Navigate to="/interpretation" replace />

  const eventTitle = confirmedEvent.eventType ?? menu.title
  const metadata = [
    confirmedEvent.guestCount ? `${confirmedEvent.guestCount} guests` : null,
    confirmedEvent.location,
    confirmedEvent.date,
  ].filter((value): value is string => Boolean(value))

  return (
    <MobileShell compact contentMode="fixed" bottomNavigation={<BottomNavigation />}>
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
              <span>Not calculated yet</span>
            </PlanSummaryCard>
            <PlanSummaryCard icon={Package} iconTone="rose" title="Transgourmet products" ariaLabel="Open products overview" onClick={() => navigate('/plan/products')}>
              <span>Not matched yet</span>
            </PlanSummaryCard>
            <PlanSummaryCard icon={WalletCards} iconTone="green" title="Budget" ariaLabel="Open budget" onClick={() => navigate('/plan/budget')}>
              <span>Calculated after product matching</span>
            </PlanSummaryCard>
          </section>

          <Button type="button" fullWidth className={styles.review} onClick={() => navigate('/plan/shopping-list')}>Review shopping list</Button>
        </div>
      </div>
    </MobileShell>
  )
}
