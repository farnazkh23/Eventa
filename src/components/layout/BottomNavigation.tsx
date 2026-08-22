import { ChartPie, LayoutDashboard, Package, Utensils } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import styles from './BottomNavigation.module.css'

export function BottomNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { state } = usePlanning()
  const items = [
    { label: 'Overview', icon: LayoutDashboard, path: '/plan', enabled: Boolean(state.menu) },
    { label: 'Menu', icon: Utensils, path: '/plan/menu', enabled: Boolean(state.menu) },
    { label: 'Products', icon: Package, path: null, enabled: false },
    { label: 'Budget', icon: ChartPie, path: null, enabled: false },
  ]

  return (
    <nav className={styles.nav} aria-label="Plan sections">
      {items.map(({ label, icon: Icon, path, enabled }) => {
        const active = path === location.pathname
        return (
        <button
          key={label}
          className={`${styles.item} ${active ? styles.active : ''}`}
          type="button"
          aria-current={active ? 'page' : undefined}
          aria-disabled={!enabled}
          disabled={!enabled}
          onClick={() => path && navigate(path)}
        >
          <Icon size={25} strokeWidth={1.8} aria-hidden="true" />
          <span>{label}</span>
        </button>
        )
      })}
    </nav>
  )
}
