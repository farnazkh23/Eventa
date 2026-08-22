import type { ReactNode } from 'react'
import { BottomNavigation } from './BottomNavigation'
import { MobileHeader } from './MobileHeader'
import { MobileShell } from './MobileShell'
import styles from './PlanPage.module.css'

interface PlanPageProps {
  title: string
  subtitle?: string
  children: ReactNode
  bottomNavigation?: boolean
  regionLabel?: string
}

export function PlanPage({
  title,
  subtitle,
  children,
  bottomNavigation = true,
  regionLabel = title,
}: PlanPageProps) {
  return (
    <MobileShell
      compact
      contentMode="fixed"
      bottomNavigation={bottomNavigation ? <BottomNavigation /> : undefined}
    >
      <div className={styles.page}>
        <MobileHeader />
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
