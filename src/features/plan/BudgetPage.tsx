import { ChartPie, Package, ReceiptText, Users } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { PlanPage } from '../../components/layout/PlanPage'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PendingState } from '../../components/ui/PendingState'
import { getPlanResults } from '../../domain/planResults'
import styles from './PlanningPages.module.css'

export function BudgetPage() {
  const { state } = usePlanning()
  const navigate = useNavigate()
  if (!state.menu) return <Navigate to="/interpretation" replace />
  const results = getPlanResults()

  return (
    <PlanPage title="Budget" subtitle="Track the event total and cost per guest after products are priced." backTo="/plan" backLabel="Back to plan overview">
      {results.budget.status === 'pending' && <PendingState title="Not calculated yet" description="Budget totals require matched products and current prices." icon={ChartPie} />}
      <section className={styles.section} aria-labelledby="budget-summary">
        <h2 id="budget-summary">Summary</h2>
        <Card className={styles.summary}>
          <div className={styles.summaryRow}><span><ReceiptText size={17} aria-hidden="true" /> Total</span><strong className={styles.pendingValue}>Not calculated yet</strong></div>
          <div className={styles.summaryRow}><span><Users size={17} aria-hidden="true" /> Per guest</span><strong className={styles.pendingValue}>Not calculated yet</strong></div>
          <div className={styles.summaryRow}><span><Package size={17} aria-hidden="true" /> Priced products</span><strong className={styles.pendingValue}>Not matched yet</strong></div>
        </Card>
      </section>
      <Button fullWidth className={styles.action} type="button" onClick={() => navigate('/plan/shopping-list')}>Review shopping list</Button>
    </PlanPage>
  )
}
