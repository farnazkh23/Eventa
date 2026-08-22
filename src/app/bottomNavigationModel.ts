export type BottomNavigationItem = 'Overview' | 'New Plan' | 'Templates' | 'My essentials'

export function isBottomNavigationItemActive(item: BottomNavigationItem, pathname: string) {
  switch (item) {
    case 'Overview':
      return pathname === '/plan' || pathname.startsWith('/plan/')
    case 'New Plan':
      return pathname === '/' || pathname === '/interpretation'
    case 'Templates':
      return pathname === '/templates'
    case 'My essentials':
      return pathname === '/basics'
  }
}
