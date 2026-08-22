import { FilePlus2, LayoutDashboard, LayoutTemplate, PackageOpen } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { isBottomNavigationItemActive, type BottomNavigationItem } from '../../app/bottomNavigationModel'
import styles from './BottomNavigation.module.css'

export function BottomNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { state, resetPlan } = usePlanning()
  const [confirmingNewPlan, setConfirmingNewPlan] = useState(false)
  const items = [
    { label: 'Overview' as const, icon: LayoutDashboard, path: '/plan', action: false },
    { label: 'New Plan' as const, icon: FilePlus2, path: null, action: true },
    { label: 'Templates' as const, icon: LayoutTemplate, path: '/templates', action: false },
    { label: 'My essentials' as const, icon: PackageOpen, path: '/basics', action: false },
  ]

  function startNewPlan() {
    if (location.pathname === '/') return
    const hasWorkToDiscard = Boolean(state.menu)
    if (hasWorkToDiscard) {
      setConfirmingNewPlan(true)
      return
    }
    resetPlan()
    navigate('/')
  }

  function confirmNewPlan() {
    resetPlan()
    setConfirmingNewPlan(false)
    navigate('/')
  }

  return (
    <div className={styles.container}>
      {confirmingNewPlan && (
        <section className={styles.confirmation} role="alertdialog" aria-labelledby="new-plan-title" aria-describedby="new-plan-description">
          <strong id="new-plan-title">Start a new plan?</strong>
          <p id="new-plan-description">Your current event plan will be cleared.</p>
          <div>
            <button type="button" onClick={() => setConfirmingNewPlan(false)}>Cancel</button>
            <button type="button" className={styles.confirmAction} onClick={confirmNewPlan}>Start new plan</button>
          </div>
        </section>
      )}
      <nav className={styles.nav} aria-label="Eventa sections">
      {items.map(({ label, icon: Icon, path, action }) => {
        const active = isBottomNavigationItemActive(label satisfies BottomNavigationItem, location.pathname)
        return (
        <button
          key={label}
          className={`${styles.item} ${active ? styles.active : ''}`}
          type="button"
          aria-current={active ? 'page' : undefined}
          onClick={() => {
            setConfirmingNewPlan(false)
            if (action) startNewPlan()
            else if (path) navigate(path)
          }}
        >
          <Icon size={25} strokeWidth={1.8} aria-hidden="true" />
          <span>{label}</span>
        </button>
        )
      })}
      </nav>
    </div>
  )
}
