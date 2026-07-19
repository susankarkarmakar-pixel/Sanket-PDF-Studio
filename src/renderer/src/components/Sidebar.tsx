import { ReactNode } from 'react'

interface SidebarProps {
  children: ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="w-64 h-full bg-[var(--color-panel-light)] dark:bg-[var(--color-panel-dark)] border-r border-gray-300 dark:border-gray-700 overflow-y-auto flex flex-col">
      {children}
    </aside>
  )
}
