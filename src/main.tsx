import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app/App'
import { PlanningProvider } from './app/PlanningContext'
import { EventaNavigationProvider } from './app/EventaNavigation'
import './styles/tokens.css'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PlanningProvider>
        <EventaNavigationProvider>
          <App />
        </EventaNavigationProvider>
      </PlanningProvider>
    </BrowserRouter>
  </StrictMode>,
)
