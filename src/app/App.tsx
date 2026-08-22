import { Navigate, Route, Routes } from 'react-router-dom'
import { DescribeEventPage } from '../features/event-brief/DescribeEventPage'
import { InterpretationPage } from '../features/interpretation/InterpretationPage'
import { PlanOverviewPage } from '../features/plan/PlanOverviewPage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<DescribeEventPage />} />
      <Route path="/interpretation" element={<InterpretationPage />} />
      <Route path="/plan" element={<PlanOverviewPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
