import { ArrowLeft, Scale } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { menuCourses, type MenuCourse } from '../../../shared/menu'
import { usePlanning } from '../../app/PlanningContext'
import { BottomNavigation } from '../../components/layout/BottomNavigation'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { MobileShell } from '../../components/layout/MobileShell'
import { Card } from '../../components/ui/Card'
import styles from './MenuPage.module.css'

const courseLabels: Record<MenuCourse, string> = {
  starter: 'Starters',
  main: 'Main dishes',
  side: 'Sides',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  dessert: 'Desserts',
  beverage: 'Beverages',
  other: 'Other selections',
}

function formatPortion(amount: number, unit: string): string {
  return `${new Intl.NumberFormat('en-CH', { maximumFractionDigits: 2 }).format(amount)} ${unit}`
}

export function MenuPage() {
  const navigate = useNavigate()
  const { state } = usePlanning()
  const { menu } = state

  if (!menu) return <Navigate to="/interpretation" replace />

  const groupedCourses = menuCourses
    .map((course) => ({ course, items: menu.items.filter((item) => item.course === course) }))
    .filter(({ items }) => items.length > 0)

  return (
    <MobileShell compact contentMode="fixed" bottomNavigation={<BottomNavigation />}>
      <div className={styles.page}>
        <MobileHeader
          action={
            <button type="button" className={styles.back} onClick={() => navigate('/plan')} aria-label="Back to plan overview">
              <ArrowLeft size={25} strokeWidth={1.9} aria-hidden="true" />
            </button>
          }
        />

        <div className={styles.scrollArea} tabIndex={0} role="region" aria-label="Generated event menu">
          <header className={styles.header}>
            <p>Generated menu</p>
            <h1>{menu.title}</h1>
            <span>{menu.summary}</span>
          </header>

          <div className={styles.courses}>
            {groupedCourses.map(({ course, items }) => (
              <section key={course} aria-labelledby={`course-${course}`}>
                <h2 id={`course-${course}`}>{courseLabels[course]}</h2>
                <div className={styles.items}>
                  {items.map((item) => (
                    <article key={item.id} className={styles.item}>
                      <div className={styles.itemHeading}>
                        <h3>{item.name}</h3>
                        {item.portion && (
                          <span className={styles.portion}>
                            <Scale size={15} strokeWidth={1.8} aria-hidden="true" />
                            Suggested {formatPortion(item.portion.amount, item.portion.unit)}
                          </span>
                        )}
                      </div>
                      <p>{item.description}</p>
                      {(item.dietaryTags.length > 0 || item.servingScope === 'dietary_option') && (
                        <div className={styles.tags} aria-label="Dietary information">
                          {item.dietaryTags.map((tag) => <span key={tag}>{tag}</span>)}
                          {item.servingScope === 'dietary_option' && <span>dietary option</span>}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {menu.planningAssumptions.length > 0 && (
            <Card tone="soft" className={styles.assumptions}>
              <h2>Planning assumptions</h2>
              <ul>
                {menu.planningAssumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </MobileShell>
  )
}
