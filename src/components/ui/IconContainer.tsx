import type { ReactNode } from 'react'
import styles from './IconContainer.module.css'

interface IconContainerProps {
  children: ReactNode
  tone?: 'brand' | 'neutral' | 'blue' | 'rose' | 'green'
  size?: 'small' | 'medium' | 'large'
}

export function IconContainer({
  children,
  tone = 'brand',
  size = 'medium',
}: IconContainerProps) {
  return <span className={`${styles.icon} ${styles[tone]} ${styles[size]}`}>{children}</span>
}
