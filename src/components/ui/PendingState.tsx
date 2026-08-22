import { Clock3, type LucideIcon } from 'lucide-react'
import { Card } from './Card'
import styles from './PendingState.module.css'

interface PendingStateProps {
  title: string
  description: string
  icon?: LucideIcon
}

export function PendingState({ title, description, icon: Icon = Clock3 }: PendingStateProps) {
  return (
    <Card tone="soft" className={styles.state} role="status">
      <span className={styles.icon}><Icon size={27} strokeWidth={1.8} aria-hidden="true" /></span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </Card>
  )
}
