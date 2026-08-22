import { PackageOpen, Plus, ShoppingBasket, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { PlanPage } from '../../components/layout/PlanPage'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PendingState } from '../../components/ui/PendingState'
import {
  loadPantryBasics,
  savePantryBasics,
  type PantryBasic,
} from '../../services/localPlanningStorage'
import styles from '../reusable-data/ReusableDataPages.module.css'

export function MyBasicsPage() {
  const [items, setItems] = useState(loadPantryBasics)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function persist(next: PantryBasic[]) {
    if (!savePantryBasics(next)) {
      setError('My Basics could not be saved in this browser.')
      return false
    }
    setItems(next)
    setError(null)
    return true
  }

  function addItem(event: FormEvent) {
    event.preventDefault()
    const itemName = name.trim()
    if (!itemName) return
    const next: PantryBasic[] = [...items, {
      id: crypto.randomUUID(),
      name: itemName,
      preferredProduct: null,
      bulkPackPreference: null,
    }]
    if (persist(next)) setName('')
  }

  return (
    <PlanPage title="My Basics" subtitle="Keep track of products and ingredients you regularly have or buy.">
      <Card className={styles.formCard}>
        <form onSubmit={addItem}>
          <label>
            Add a usual stock item
            <input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Olive oil" />
          </label>
          <Button type="submit" fullWidth disabled={!name.trim()}><Plus size={19} aria-hidden="true" /> Add basic</Button>
        </form>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </Card>

      <section className={styles.section} aria-labelledby="usual-items">
        <h2 id="usual-items">Usual stock items</h2>
        {items.length === 0 ? (
          <PendingState title="No basics added yet" description="Add products or ingredients you regularly keep in stock." icon={PackageOpen} />
        ) : (
          <div className={styles.list}>
            {items.map((item) => (
              <Card key={item.id} className={styles.item}>
                <div className={styles.itemHeader}>
                  <span className={styles.icon}><ShoppingBasket size={22} strokeWidth={1.8} aria-hidden="true" /></span>
                  <span className={styles.copy}><strong>{item.name}</strong><small>Usual stock item · No preferred product selected</small></span>
                  <button className={styles.iconButton} type="button" onClick={() => persist(items.filter(({ id }) => id !== item.id))} aria-label={`Remove ${item.name}`}><Trash2 size={20} aria-hidden="true" /></button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className={styles.offerState}>
        <PendingState title="Offers not connected" description="Offers will appear here when product pricing is connected." icon={ShoppingBasket} />
      </div>
    </PlanPage>
  )
}
