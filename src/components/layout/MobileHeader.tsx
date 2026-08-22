import type { ReactNode } from 'react'
import { Brand } from './Brand'
import styles from './MobileHeader.module.css'

export function MobileHeader({ action }: { action?: ReactNode }) {
  return (
    <header className={styles.header}>
      <Brand />
      {action}
    </header>
  )
}
