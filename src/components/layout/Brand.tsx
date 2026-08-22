import eventaLogo from '../../assets/branding/eventa-logo.png'
import styles from './Brand.module.css'

export function Brand() {
  return (
    <div className={styles.brand}>
      <span className={styles.mark}>
        <img src={eventaLogo} alt="eventa." />
      </span>
      <span className={styles.slogan}>Event in a Box</span>
    </div>
  )
}
