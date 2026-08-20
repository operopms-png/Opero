'use client'
import { createContext, useContext, useEffect, useState } from 'react'

export const SIDEBAR_EXPANDED_WIDTH = 220
export const SIDEBAR_COLLAPSED_WIDTH = 64
const STORAGE_KEY = 'opero_sidebar_collapsed'

const SidebarCollapseContext = createContext<{ collapsed: boolean; toggle: () => void }>({
  collapsed: false,
  toggle: () => {},
})

export function SidebarCollapseProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === '1') setCollapsed(true)
  }, [])

  function toggle() {
    setCollapsed(prev => {
      const next = !prev
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <SidebarCollapseContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarCollapseContext.Provider>
  )
}

export function useSidebarCollapse() {
  return useContext(SidebarCollapseContext)
}
