import { AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { MobileShell } from '../../components/layout/MobileShell'
import { AiNote } from '../../components/ui/AiNote'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextAreaField } from '../../components/ui/TextAreaField'
import { demoBrief, sampleBrief } from '../../services/mockPlanningService'
import styles from './DescribeEventPage.module.css'

export function DescribeEventPage() {
  const navigate = useNavigate()
  const { state, setBrief, interpretBrief, startManualEntry } = usePlanning()
  const canContinue = state.brief.trim().length >= 10
  const isLoading = state.interpretationStatus === 'loading'
  const hasError = state.interpretationStatus === 'error'

  async function handleContinue() {
    try {
      await interpretBrief()
      navigate('/interpretation')
    } catch {
      // The context exposes a safe user-facing error message on this screen.
    }
  }

  function handleManualEntry() {
    startManualEntry()
    navigate('/interpretation')
  }

  function focusDescription() {
    document.querySelector<HTMLTextAreaElement>('#event-description')?.focus()
  }

  return (
    <MobileShell>
      <MobileHeader showHistory={false} />

      <section className={styles.intro} aria-labelledby="describe-title">
        <h1 id="describe-title">Tell us about<br />your event</h1>
        <p>Describe it in your own words.</p>
      </section>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          handleContinue()
        }}
      >
        <div className={styles.description}>
          <TextAreaField
            id="event-description"
            label="Describe your event"
            maxLength={1000}
            value={state.brief}
            placeholder={sampleBrief}
            onChange={(event) => setBrief(event.target.value)}
            disabled={isLoading}
            required
            aria-describedby="event-description-help"
          />
          <button
            type="button"
            className={styles.example}
            onClick={() => {
              setBrief(demoBrief)
              requestAnimationFrame(focusDescription)
            }}
            disabled={isLoading}
          >
            Use example
          </button>
        </div>
        {hasError ? (
          <Card className={styles.error} role="alert">
            <AlertCircle size={24} strokeWidth={1.9} aria-hidden="true" />
            <p>{state.interpretationError}</p>
          </Card>
        ) : (
          <div id="event-description-help">
            <AiNote>
              {isLoading
                ? 'Eventa is understanding your event.'
                : state.planInvalidatedByBrief
                  ? 'Your event description changed. Continue to review the details and regenerate your plan.'
                  : 'Eventa will extract the important details for you.'}
            </AiNote>
          </div>
        )}
        <Button
          type="submit"
          fullWidth
          disabled={!canContinue || isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? 'Understanding your event…' : hasError ? 'Retry' : 'Continue'}
        </Button>
        <Button
          type="button"
          variant="text"
          onClick={hasError ? focusDescription : handleManualEntry}
          disabled={isLoading}
        >
          {hasError ? 'Edit event description' : 'Enter details manually'}
        </Button>
      </form>
    </MobileShell>
  )
}
