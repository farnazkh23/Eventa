import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import styles from './PlanListItem.module.css'

interface PlanListItemProps {
  title: string
  detail: ReactNode
  icon?: LucideIcon
  onClick?: () => void
  ariaLabel?: string
}

export function PlanListItem({ title, detail, icon: Icon, onClick, ariaLabel }: PlanListItemProps) {
  const content = <>
    {Icon && <span className={styles.icon}><Icon size={22} strokeWidth={1.8} aria-hidden="true" /></span>}
    <span className={styles.copy}><strong>{title}</strong><small>{detail}</small></span>
    {onClick && <ChevronRight className={styles.chevron} size={21} strokeWidth={1.7} aria-hidden="true" />}
  </>

  if (onClick) return <button type="button" className={styles.item} onClick={onClick} aria-label={ariaLabel}>{content}</button>
  return <div className={styles.item}>{content}</div>
}
