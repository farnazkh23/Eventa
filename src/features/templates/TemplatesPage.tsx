import { CalendarRange, LayoutTemplate, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { PlanPage } from '../../components/layout/PlanPage'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PendingState } from '../../components/ui/PendingState'
import {
  loadTemplates,
  saveTemplates,
  type PlanningTemplate,
} from '../../services/localPlanningStorage'
import styles from '../reusable-data/ReusableDataPages.module.css'

function templateDetail(template: PlanningTemplate) {
  return [
    template.event.guestCount === null ? null : `${template.event.guestCount} guests`,
    template.event.location,
    template.event.serviceStyle ?? template.event.mealType,
  ].filter(Boolean).join(' · ') || 'Reusable event setup'
}

export function TemplatesPage() {
  const navigate = useNavigate()
  const { state, loadTemplate } = usePlanning()
  const [templates, setTemplates] = useState(loadTemplates)
  const [name, setName] = useState(state.confirmedEvent.eventType ?? state.menu?.title ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function persist(next: PlanningTemplate[]) {
    if (!saveTemplates(next)) {
      setError('Templates could not be saved in this browser.')
      return false
    }
    setTemplates(next)
    setError(null)
    return true
  }

  function saveCurrentTemplate() {
    const templateName = name.trim()
    if (!templateName || !state.menu) return
    const template: PlanningTemplate = {
      id: crypto.randomUUID(),
      name: templateName,
      createdAt: new Date().toISOString(),
      originalDescription: state.brief,
      event: state.confirmedEvent,
    }
    if (persist([template, ...templates])) setMessage('Template saved for future plans.')
  }

  function applyTemplate(template: PlanningTemplate) {
    const hasCurrentPlan = Boolean(state.menu || state.brief.trim())
    if (hasCurrentPlan && !window.confirm('Use this template and replace the current event plan?')) return
    loadTemplate(template.event, template.originalDescription)
    navigate('/interpretation')
  }

  function removeTemplate(templateId: string) {
    persist(templates.filter(({ id }) => id !== templateId))
    setMessage(null)
  }

  return (
    <PlanPage title="Templates" subtitle="Save event setups you want to plan again.">
      {state.menu && (
        <Card className={styles.formCard}>
          <label>
            Template name
            <input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Company Summer Party" />
          </label>
          <Button type="button" fullWidth disabled={!name.trim()} onClick={saveCurrentTemplate}>Save current event</Button>
          {message && <p className={styles.message} role="status">{message}</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
        </Card>
      )}

      <section className={styles.section} aria-labelledby="saved-templates">
        <h2 id="saved-templates">Saved templates</h2>
        {templates.length === 0 ? (
          <PendingState title="No templates yet" description="Save a current event plan here when you want to reuse its setup." icon={LayoutTemplate} />
        ) : (
          <div className={styles.list}>
            {templates.map((template) => (
              <Card key={template.id} className={styles.item}>
                <div className={styles.itemHeader}>
                  <span className={styles.icon}><CalendarRange size={22} strokeWidth={1.8} aria-hidden="true" /></span>
                  <span className={styles.copy}><strong>{template.name}</strong><small>{templateDetail(template)}</small></span>
                  <button className={styles.iconButton} type="button" onClick={() => removeTemplate(template.id)} aria-label={`Delete ${template.name}`}><Trash2 size={20} aria-hidden="true" /></button>
                </div>
                <div className={styles.itemActions}>
                  <button className={styles.useAction} type="button" onClick={() => applyTemplate(template)}>Use template</button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </PlanPage>
  )
}
