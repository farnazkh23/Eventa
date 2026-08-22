import { ChevronRight, type LucideIcon } from 'lucide-react'
import { IconContainer } from '../../components/ui/IconContainer'
import styles from './PlanSummaryCard.module.css'

interface PlanSummaryCardProps {
  icon: LucideIcon
  iconTone: 'neutral' | 'blue' | 'rose' | 'green'
  title: string
  children: React.ReactNode
  ariaLabel: string
}

export function PlanSummaryCard({
  icon: Icon,
  iconTone,
  title,
  children,
  ariaLabel,
}: PlanSummaryCardProps) {
  return (
    <button type="button" className={styles.card} aria-label={ariaLabel}>
      <IconContainer size="large" tone={iconTone}>
        <Icon size={30} strokeWidth={1.75} aria-hidden="true" />
      </IconContainer>
      <span className={styles.copy}>
        <strong>{title}</strong>
        {children}
      </span>
      <ChevronRight className={styles.chevron} size={24} strokeWidth={1.7} aria-hidden="true" />
    </button>
  )
}
