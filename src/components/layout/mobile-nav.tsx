'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Ship,
  PlusCircle,
  Grid3X3,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dives', label: 'Dives', icon: Ship },
  { href: '/upload', label: 'Upload', icon: PlusCircle, primary: true },
  { href: '/gallery', label: 'Gallery', icon: Grid3X3 },
  { href: '/settings', label: 'Profile', icon: User },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-md lg:hidden">
      <div className="flex items-center justify-around px-2 py-1">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium transition-colors',
                item.primary && !isActive && 'text-primary',
                isActive
                  ? 'text-primary'
                  : item.primary
                    ? 'text-primary'
                    : 'text-muted-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5',
                  item.primary && 'h-7 w-7'
                )}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
