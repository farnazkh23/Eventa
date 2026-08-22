import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  tone?: 'default' | 'soft' | 'success'
}

export function Card({ children, tone = 'default', className = '', ...props }: CardProps) {
  return (
    <div className={`${styles.card} ${styles[tone]} ${className}`} {...props}>
      {children}
    </div>
  )
}
