import { Check, Circle, LoaderCircle, TriangleAlert } from 'lucide-react'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { MobileShell } from '../../components/layout/MobileShell'
import { Button } from '../../components/ui/Button'
import styles from './MenuGenerationState.module.css'

interface MenuGenerationStateProps {
  error: string | null
  onRetry: () => void
  onBack: () => void
}

const pendingSteps = ['Calculating quantities', 'Matching products', 'Calculating budget']

export function MenuGenerationState({ error, onRetry, onBack }: MenuGenerationStateProps) {
  return (
    <MobileShell compact contentMode="fixed">
      <div className={styles.page}>
        <MobileHeader />
        <section className={styles.content} aria-labelledby="generation-title" aria-live="polite">
          <div className={styles.heading}>
            <h1 id="generation-title">Creating your<br />event plan</h1>
            <p>{error ? 'Menu creation needs your attention.' : 'Eventa is building a menu around your event.'}</p>
          </div>

          <ol className={styles.steps} aria-label="Event plan progress">
            <li className={styles.complete}>
              <span><Check size={20} strokeWidth={2.2} aria-hidden="true" /></span>
              Understanding your event
            </li>
            <li className={error ? styles.failed : styles.active}>
              <span>
                {error
                  ? <TriangleAlert size={20} strokeWidth={2} aria-hidden="true" />
                  : <LoaderCircle size={20} strokeWidth={2} aria-hidden="true" />}
              </span>
              Creating your menu
            </li>
            {pendingSteps.map((step) => (
              <li key={step} className={styles.pending}>
                <span><Circle size={18} strokeWidth={1.8} aria-hidden="true" /></span>
                {step}
              </li>
            ))}
          </ol>

          {error && <p className={styles.error} role="alert">{error}</p>}
        </section>

        {error && (
          <div className={styles.actions}>
            <Button type="button" fullWidth onClick={onRetry}>Retry</Button>
            <Button type="button" variant="text" onClick={onBack}>Back to event details</Button>
          </div>
        )}
      </div>
    </MobileShell>
  )
}
