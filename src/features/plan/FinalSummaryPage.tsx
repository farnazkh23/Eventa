import { Check, CircleDashed, HandPlatter, Package, Scale, WalletCards } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { PlanPage } from '../../components/layout/PlanPage'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PlanListItem } from '../../components/ui/PlanListItem'
import { getFinalSummaryStatus } from './finalSummaryStatus'
import styles from './PlanningPages.module.css'

export function FinalSummaryPage() {
  const { state } = usePlanning()
  const navigate = useNavigate()
  if (!state.menu) return <Navigate to="/interpretation" replace />
  const eventTitle = state.confirmedEvent.eventType ?? state.menu.title
  const resultStatus = getFinalSummaryStatus(state)

  return (
    <PlanPage title="Final event summary" subtitle="A clear view of what is ready and what still needs planning.">
      <Card className={styles.total}>
        <span>Event</span>
        <strong>{eventTitle}</strong>
      </Card>
      <div className={styles.statusList} aria-label="Planning status">
        <PlanListItem title="Menu" detail={`${state.menu.items.length} selections ready`} icon={HandPlatter} onClick={() => navigate('/plan/menu')} />
        <PlanListItem title="Quantities" detail={resultStatus.quantities} icon={Scale} onClick={() => navigate('/plan/quantities')} />
        <PlanListItem title="Products" detail={resultStatus.products} icon={Package} onClick={() => navigate('/plan/products')} />
        <PlanListItem title="Budget" detail={resultStatus.budget} icon={WalletCards} onClick={() => navigate('/plan/budget')} />
      </div>
      <section className={styles.section} aria-labelledby="completion-status">
        <h2 id="completion-status">Completion</h2>
        <Card tone="soft" className={styles.summary}>
          <div className={styles.summaryRow}><span><Check size={17} color="var(--color-success)" aria-hidden="true" /> Menu ready</span><strong>Complete</strong></div>
          <div className={styles.summaryRow}>
            <span>
              {resultStatus.orderingComplete
                ? <Check size={17} color="var(--color-success)" aria-hidden="true" />
                : <CircleDashed size={17} aria-hidden="true" />}
              Ordering data
            </span>
            <strong className={resultStatus.orderingComplete ? undefined : styles.pendingValue}>
              {resultStatus.orderingComplete ? 'Complete' : 'Pending'}
            </strong>
          </div>
        </Card>
      </section>
      <Button fullWidth className={styles.action} type="button" onClick={() => navigate('/plan')}>Return to overview</Button>
    </PlanPage>
  )
}
