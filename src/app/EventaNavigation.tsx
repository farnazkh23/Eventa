import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { routeHistoryReducer } from './navigationModel'

interface EventaNavigationValue {
  canGoBack: boolean
  canGoForward: boolean
  goBack: () => void
  goForward: () => void
}

const EventaNavigationContext = createContext<EventaNavigationValue | null>(null)

export function EventaNavigationProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const route = `${location.pathname}${location.search}${location.hash}`
  const [history, dispatch] = useReducer(routeHistoryReducer, { entries: [route], index: 0 })
  useEffect(() => {
    dispatch({ type: 'visit', route })
  }, [route])

  function move(offset: -1 | 1) {
    const nextIndex = history.index + offset
    const destination = history.entries[nextIndex]
    if (!destination) return
    dispatch({ type: 'move', index: nextIndex })
    navigate(destination)
  }

  return (
    <EventaNavigationContext.Provider value={{
      canGoBack: history.index > 0,
      canGoForward: history.index < history.entries.length - 1,
      goBack: () => move(-1),
      goForward: () => move(1),
    }}>
      {children}
    </EventaNavigationContext.Provider>
  )
}

// This hook lives with its provider to keep navigation history local to the frontend shell.
// eslint-disable-next-line react-refresh/only-export-components
export function useEventaNavigation() {
  const context = useContext(EventaNavigationContext)
  if (!context) throw new Error('useEventaNavigation must be used inside EventaNavigationProvider')
  return context
}
