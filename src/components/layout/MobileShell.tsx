import type { ReactNode } from 'react'
import { BottomNavigation } from './BottomNavigation'
import styles from './MobileShell.module.css'

interface MobileShellProps {
  children: ReactNode
  compact?: boolean
  showBottomNavigation?: boolean
  contentMode?: 'scroll' | 'fixed'
}

export function MobileShell({
  children,
  compact = false,
  showBottomNavigation = true,
  contentMode = 'scroll',
}: MobileShellProps) {
  return (
    <div className={styles.stage}>
      <main className={`${styles.shell} ${compact ? styles.compact : ''}`}>
        <div className={`${styles.content} ${styles[contentMode]}`}>{children}</div>
        {showBottomNavigation && <BottomNavigation />}
      </main>
    </div>
  )
}
