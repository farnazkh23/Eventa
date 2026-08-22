import styles from './ProgressIndicator.module.css'

interface ProgressIndicatorProps {
  current: number
  total: number
}

export function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  const value = (current / total) * 100

  return (
    <div className={styles.wrapper} aria-label={`Step ${current} of ${total}`}>
      <div className={styles.track} aria-hidden="true">
        <span className={styles.fill} style={{ width: `${value}%` }} />
      </div>
      <span className={styles.label}>Step {current} of {total}</span>
    </div>
  )
}
