import { Sparkles } from 'lucide-react'
import { Card } from './Card'
import { IconContainer } from './IconContainer'
import styles from './AiNote.module.css'

export function AiNote({ children }: { children: React.ReactNode }) {
  return (
    <Card tone="soft" className={styles.note}>
      <IconContainer size="small">
        <Sparkles size={21} strokeWidth={1.9} aria-hidden="true" />
      </IconContainer>
      <p>{children}</p>
    </Card>
  )
}
