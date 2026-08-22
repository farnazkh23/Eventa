import { useState } from 'react'
import { Check, Pencil, Plus, X, type LucideIcon } from 'lucide-react'
import type { InterpretationField } from '../../domain/planning'
import { IconContainer } from '../../components/ui/IconContainer'
import styles from './EditableDetail.module.css'

interface EditableDetailProps {
  field: InterpretationField
  icon: LucideIcon
  onSave: (field: InterpretationField) => void
}

export function EditableDetail({ field, icon: Icon, onSave }: EditableDetailProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(field.value)
  const isEmpty = !field.value

  function save() {
    if (draft.trim()) {
      onSave({ ...field, value: draft.trim() })
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className={styles.row}>
        <IconContainer size="small" tone={isEmpty ? 'neutral' : 'brand'}>
          <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
        </IconContainer>
        <label className={styles.inputLabel}>
          <span>{field.label}</span>
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') save()
              if (event.key === 'Escape') setEditing(false)
            }}
          />
        </label>
        <div className={styles.editActions}>
          <button type="button" onClick={save} aria-label={`Save ${field.label}`} disabled={!draft.trim()}>
            <Check size={20} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setEditing(false)} aria-label={`Cancel editing ${field.label}`}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.row}>
      <IconContainer size="small" tone={isEmpty ? 'neutral' : 'brand'}>
        <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
      </IconContainer>
      <span className={isEmpty ? styles.muted : styles.value}>{field.value || 'Not specified'}</span>
      <button
        type="button"
        className={styles.editButton}
        onClick={() => {
          setDraft(field.value)
          setEditing(true)
        }}
        aria-label={`${isEmpty ? 'Add' : 'Edit'} ${field.label}`}
      >
        {isEmpty ? <><Plus size={19} aria-hidden="true" /> Add</> : <Pencil size={19} aria-hidden="true" />}
      </button>
    </div>
  )
}
