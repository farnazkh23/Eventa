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
import { useNavigate } from 'react-router-dom'
import { usePlanning } from '../../app/PlanningContext'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { MobileShell } from '../../components/layout/MobileShell'
import { AiNote } from '../../components/ui/AiNote'
import { Button } from '../../components/ui/Button'
import { ProgressIndicator } from '../../components/ui/ProgressIndicator'
import type { InterpretationFieldId } from '../../domain/planning'
import { EditableDetail } from './EditableDetail'
import { MenuGenerationState } from '../plan/MenuGenerationState'
import styles from './InterpretationPage.module.css'

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

export function InterpretationPage() {
  const navigate = useNavigate()
  const {
    state,
    updateField,
    generateConfirmedMenu,
    resetMenuGeneration,
  } = usePlanning()

  async function handleGenerateMenu() {
    try {
      await generateConfirmedMenu()
      navigate('/plan')
    } catch {
      // PlanningContext exposes the safe menu error rendered below.
    }
  }

  function focusFirstEditControl() {
    const firstEditButton = document.querySelector<HTMLButtonElement>('button[aria-label^="Edit"]')
    firstEditButton?.focus()
  }

  if (state.menuStatus === 'loading' || state.menuStatus === 'error') {
    return (
      <MenuGenerationState
        error={state.menuError}
        onRetry={() => void handleGenerateMenu()}
        onBack={resetMenuGeneration}
      />
    )
  }

  return (
    <MobileShell compact contentMode="fixed">
      <div className={styles.page}>
        <MobileHeader />
        <div className={styles.progress}>
          <ProgressIndicator current={2} total={6} />
        </div>

        <section className={styles.intro} aria-labelledby="interpretation-title">
          <h1 id="interpretation-title">Here’s what we<br />understood</h1>
          <p>Review and adjust the extracted details.</p>
        </section>

        <div
          className={styles.details}
          role="region"
          aria-label="Extracted event details, scroll for more"
          tabIndex={0}
        >
          {state.interpretation.map((field) => (
            <EditableDetail
              key={field.id}
              field={field}
              icon={fieldIcons[field.id]}
              onSave={updateField}
            />
          ))}
        </div>

        <div className={styles.actions}>
          <AiNote>You can change anything before Eventa creates your plan.</AiNote>
          <Button type="button" fullWidth onClick={() => void handleGenerateMenu()}>Looks good</Button>
          <Button type="button" variant="text" onClick={focusFirstEditControl}>
            Edit details
          </Button>
        </div>
      </div>
    </MobileShell>
  )
}
