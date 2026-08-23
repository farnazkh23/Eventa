import { Check, Circle, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { MobileShell } from '../../components/layout/MobileShell'
import { Button } from '../../components/ui/Button'
import { getPlanningProgress } from '../../domain/planningProgress'
import styles from './MenuGenerationState.module.css'

interface MenuGenerationStateProps {
  error: string | null
  onRetry: () => void
  onBack: () => void
}

export function MenuGenerationState({ error, onRetry, onBack }: MenuGenerationStateProps) {
  const [videoFailed, setVideoFailed] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReducedMotion(preference.matches)
    preference.addEventListener('change', updatePreference)
    return () => preference.removeEventListener('change', updatePreference)
  }, [])

  const showVideo = !error && !videoFailed && !reducedMotion
  const progress = getPlanningProgress()

  return (
    <MobileShell compact contentMode="fixed">
      <div className={styles.page}>
        <MobileHeader />
        <section className={styles.content} aria-labelledby="generation-title" aria-live="polite">
          <div className={styles.heading}>
            <h1 id="generation-title">Creating your<br />event plan</h1>
            <p>{error ? 'Plan creation needs your attention.' : 'Eventa is building a menu around your event.'}</p>
          </div>

          {showVideo && (
            <div className={styles.videoWrap} aria-hidden="true">
              <video
                className={styles.video}
                src="/media/process-waiting.mp4"
                autoPlay
                muted
                playsInline
                loop
                preload="auto"
                onError={() => setVideoFailed(true)}
              />
            </div>
          )}

          <ol className={styles.steps} aria-label="Event plan progress">
            {progress.map((step) => (
              <li key={step.label} className={`${styles[step.state]} ${error && step.state === 'active' ? styles.paused : ''}`} aria-current={step.state === 'active' ? 'step' : undefined}>
                <span>
                  {step.state === 'completed' && <Check size={20} strokeWidth={2.2} aria-hidden="true" />}
                  {step.state === 'active' && <LoaderCircle size={20} strokeWidth={2} aria-hidden="true" />}
                  {step.state === 'pending' && <Circle size={18} strokeWidth={1.8} aria-hidden="true" />}
                </span>
                {step.label}
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
