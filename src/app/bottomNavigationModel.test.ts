import { describe, expect, it } from 'vitest'
import { isBottomNavigationItemActive, type BottomNavigationItem } from './bottomNavigationModel'

const cases: Array<[string, BottomNavigationItem]> = [
  ['/', 'New Plan'],
  ['/interpretation', 'New Plan'],
  ['/plan', 'Overview'],
  ['/plan/details', 'Overview'],
  ['/plan/menu', 'Overview'],
  ['/plan/quantities', 'Overview'],
  ['/plan/products', 'Overview'],
  ['/plan/budget', 'Overview'],
  ['/templates', 'Templates'],
  ['/basics', 'My Basics'],
]

describe('bottom navigation active state', () => {
  it.each(cases)('marks %s as %s', (pathname, expected) => {
    const items: BottomNavigationItem[] = ['Overview', 'New Plan', 'Templates', 'My Basics']
    expect(items.filter((item) => isBottomNavigationItemActive(item, pathname))).toEqual([expected])
  })
})
