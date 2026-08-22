import type { TextareaHTMLAttributes } from 'react'
import styles from './TextAreaField.module.css'

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  maxLength: number
}

export function TextAreaField({ label, maxLength, value, id, ...props }: TextAreaFieldProps) {
  const length = typeof value === 'string' ? value.length : 0

  return (
    <div className={styles.field}>
      <label className={styles.srOnly} htmlFor={id}>{label}</label>
      <textarea id={id} className={styles.textarea} maxLength={maxLength} value={value} {...props} />
      <span className={styles.count} aria-live="polite">{length} / {maxLength}</span>
    </div>
  )
}
