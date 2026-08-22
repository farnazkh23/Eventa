import { ChartPie, LayoutDashboard, Package, Utensils } from 'lucide-react'
import styles from './BottomNavigation.module.css'

const items = [
  { label: 'Overview', icon: LayoutDashboard, active: true },
  { label: 'Menu', icon: Utensils, active: false },
  { label: 'Products', icon: Package, active: false },
  { label: 'Budget', icon: ChartPie, active: false },
]

export function BottomNavigation() {
  return (
    <nav className={styles.nav} aria-label="Plan sections">
      {items.map(({ label, icon: Icon, active }) => (
        <button
          key={label}
          className={`${styles.item} ${active ? styles.active : ''}`}
          type="button"
          aria-current={active ? 'page' : undefined}
          aria-disabled={!active}
          disabled={!active}
        >
          <Icon size={25} strokeWidth={1.8} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
