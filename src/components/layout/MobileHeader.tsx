import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEventaNavigation } from '../../app/EventaNavigation'
import { getLogoDestination } from '../../app/navigationModel'
import { usePlanning } from '../../app/PlanningContext'
import { Brand } from './Brand'
import styles from './MobileHeader.module.css'

export function MobileHeader({ action }: { action?: ReactNode }) {
  const navigate = useNavigate()
  const { state } = usePlanning()
  const { canGoBack, canGoForward, goBack, goForward } = useEventaNavigation()

  return (
    <header className={styles.header}>
      <button className={styles.logo} type="button" onClick={() => navigate(getLogoDestination(Boolean(state.menu)))} aria-label={state.menu ? 'Go to plan overview' : 'Go to event description'}>
        <Brand />
      </button>
      <nav className={styles.history} aria-label="Event navigation history">
        <button type="button" onClick={goBack} disabled={!canGoBack} aria-label="Go back">
          <ArrowLeft size={21} strokeWidth={1.9} aria-hidden="true" />
        </button>
        <button type="button" onClick={goForward} disabled={!canGoForward} aria-label="Go forward">
          <ArrowRight size={21} strokeWidth={1.9} aria-hidden="true" />
        </button>
      </nav>
      <div className={styles.action}>{action}</div>
    </header>
  )
}
