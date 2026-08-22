import {
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  FileText,
  HandPlatter,
  Leaf,
  MapPin,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { PlanPage } from '../../components/layout/PlanPage'
import { AiNote } from '../../components/ui/AiNote'
import { Button } from '../../components/ui/Button'
import type { InterpretationField, InterpretationFieldId } from '../../domain/planning'
import { EditableDetail } from '../interpretation/EditableDetail'
import styles from './BasicsPage.module.css'

const fieldIcons: Record<InterpretationFieldId, LucideIcon> = {
  eventType: BriefcaseBusiness,
  guestCount: UsersRound,
  location: MapPin,
  date: CalendarDays,
  time: Clock3,
  mealType: HandPlatter,
  serviceStyle: HandPlatter,
  budgetPerGuest: WalletCards,
  totalBudget: CircleDollarSign,
  dietaryRequirements: Leaf,
  additionalNotes: FileText,
}

export function BasicsPage() {
  const navigate = useNavigate()
  const { state, regeneratePlanWithBasics } = usePlanning()
  const [draftFields, setDraftFields] = useState(state.interpretation)
  const hasDownstreamResults = Boolean(state.menu) || state.menuStatus === 'error'
  const dirty = JSON.stringify(draftFields) !== JSON.stringify(state.interpretation)

  function updateDraft(field: InterpretationField) {
    setDraftFields((fields) => fields.map((item) => item.id === field.id ? field : item))
  }

  async function save() {
    try {
      await regeneratePlanWithBasics(draftFields)
      navigate('/plan')
    } catch {
      // PlanningContext exposes the safe regeneration error below.
    }
  }

  return (
    <PlanPage title="My Basics" subtitle="Review the confirmed details Eventa uses to build your plan.">
      <div className={styles.fields} aria-label="Confirmed event details">
        {draftFields.map((field) => (
          <EditableDetail key={field.id} field={field} icon={fieldIcons[field.id]} onSave={updateDraft} showLabel />
        ))}
      </div>

      {dirty && hasDownstreamResults && (
        <AiNote>Your event details changed. Regenerate the plan to update menu, quantities, products and budget.</AiNote>
      )}
      {state.menuStatus === 'error' && state.menuError && <p className={styles.error} role="alert">{state.menuError}</p>}

      <Button type="button" fullWidth className={styles.action} disabled={!dirty || state.menuStatus === 'loading'} onClick={() => void save()}>
        {state.menuStatus === 'loading' ? 'Regenerating plan…' : hasDownstreamResults ? 'Save & regenerate plan' : 'Save changes'}
      </Button>
    </PlanPage>
  )
}
