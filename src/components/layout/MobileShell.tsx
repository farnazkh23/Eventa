import type { ReactNode } from 'react'
import styles from './MobileShell.module.css'

interface MobileShellProps {
  children: ReactNode
  compact?: boolean
  bottomNavigation?: ReactNode
  contentMode?: 'scroll' | 'fixed'
}

export function MobileShell({
  children,
  compact = false,
  bottomNavigation,
  contentMode = 'scroll',
}: MobileShellProps) {
  return (
    <div className={styles.stage}>
      <main className={`${styles.shell} ${compact ? styles.compact : ''}`}>
        <div className={`${styles.content} ${styles[contentMode]}`}>{children}</div>
        {bottomNavigation}
      </main>
    </div>
  )
}
