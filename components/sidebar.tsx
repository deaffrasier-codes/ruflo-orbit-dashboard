'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, BarChart2, MessageSquare, DollarSign } from 'lucide-react'

const nav = [
  { href: '/',          label: 'Pipeline',   icon: LayoutGrid },
  { href: '/analytics', label: 'Analytics',  icon: BarChart2 },
  { href: '/revenue',   label: 'Revenue',    icon: DollarSign },
  { href: '/chat',      label: 'AI Chat',    icon: MessageSquare },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-52 shrink-0 border-r border-border flex flex-col bg-sidebar">
      <div className="px-5 py-5 border-b border-border">
        <p className="text-xs text-muted-foreground font-medium tracking-widest uppercase">deaffrasier</p>
        <h1 className="text-lg font-bold text-primary leading-tight">Ruflo Orbit</h1>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">v1.6 pipeline</p>
      </div>
    </aside>
  )
}
