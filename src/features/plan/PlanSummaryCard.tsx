import { ChevronRight, type LucideIcon } from 'lucide-react'
import { IconContainer } from '../../components/ui/IconContainer'
import styles from './PlanSummaryCard.module.css'

interface PlanSummaryCardProps {
  icon: LucideIcon
  iconTone: 'neutral' | 'blue' | 'rose' | 'green'
  title: string
  children: React.ReactNode
  ariaLabel: string
  onClick?: () => void
}

export function PlanSummaryCard({
  icon: Icon,
  iconTone,
  title,
  children,
  ariaLabel,
  onClick,
}: PlanSummaryCardProps) {
  return (
    <button
      type="button"
      className={styles.card}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={!onClick}
    >
      <IconContainer size="large" tone={iconTone}>
        <Icon size={30} strokeWidth={1.75} aria-hidden="true" />
      </IconContainer>
      <span className={styles.copy}>
        <strong>{title}</strong>
        {children}
      </span>
      {onClick && <ChevronRight className={styles.chevron} size={24} strokeWidth={1.7} aria-hidden="true" />}
    </button>
  )
}
