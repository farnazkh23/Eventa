import { Navigate, Route, Routes } from 'react-router-dom'
import { DescribeEventPage } from '../features/event-brief/DescribeEventPage'
import { InterpretationPage } from '../features/interpretation/InterpretationPage'
import { PlanOverviewPage } from '../features/plan/PlanOverviewPage'
import { MenuPage } from '../features/plan/MenuPage'
import { BudgetPage } from '../features/plan/BudgetPage'
import { FinalSummaryPage } from '../features/plan/FinalSummaryPage'
import { ProductDetailPage } from '../features/plan/ProductDetailPage'
import { ProductsPage } from '../features/plan/ProductsPage'
import { QuantitiesPage } from '../features/plan/QuantitiesPage'
import { QuantityDetailPage } from '../features/plan/QuantityDetailPage'
import { ShoppingListPage } from '../features/plan/ShoppingListPage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<DescribeEventPage />} />
      <Route path="/interpretation" element={<InterpretationPage />} />
      <Route path="/plan" element={<PlanOverviewPage />} />
      <Route path="/plan/menu" element={<MenuPage />} />
      <Route path="/plan/quantities" element={<QuantitiesPage />} />
      <Route path="/plan/quantities/:itemId" element={<QuantityDetailPage />} />
      <Route path="/plan/products" element={<ProductsPage />} />
      <Route path="/plan/products/:itemId" element={<ProductDetailPage />} />
      <Route path="/plan/budget" element={<BudgetPage />} />
      <Route path="/plan/shopping-list" element={<ShoppingListPage />} />
      <Route path="/plan/summary" element={<FinalSummaryPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
