import styles from './Brand.module.css'

export function Brand() {
  return (
    <div className={styles.brand} aria-label="Eventa by Transgourmet">
      <span className={styles.wordmark}>eventa<span>.</span></span>
      <span className={styles.endorsement}>by Transgourmet</span>
    </div>
  )
}
