import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNavigation } from './BottomNavigation'
import { MobileHeader } from './MobileHeader'
import { MobileShell } from './MobileShell'
import styles from './PlanPage.module.css'

interface PlanPageProps {
  title: string
  subtitle?: string
  children: ReactNode
  backTo?: string
  backLabel?: string
  bottomNavigation?: boolean
  regionLabel?: string
}

export function PlanPage({
  title,
  subtitle,
  children,
  backTo,
  backLabel = 'Back',
  bottomNavigation = true,
  regionLabel = title,
}: PlanPageProps) {
  const navigate = useNavigate()

  return (
    <MobileShell
      compact
      contentMode="fixed"
      bottomNavigation={bottomNavigation ? <BottomNavigation /> : undefined}
    >
      <div className={styles.page}>
        <MobileHeader
          action={backTo ? (
            <button className={styles.back} type="button" onClick={() => navigate(backTo)} aria-label={backLabel}>
              <ArrowLeft size={25} strokeWidth={1.9} aria-hidden="true" />
            </button>
          ) : undefined}
        />
        <div className={styles.scrollArea} tabIndex={0} role="region" aria-label={regionLabel}>
          <header className={styles.heading}>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </header>
          {children}
        </div>
      </div>
    </MobileShell>
  )
}
