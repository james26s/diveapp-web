'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Sidebar } from './sidebar'
import { useState } from 'react'
import { useUploadStore } from '@/stores/upload-store'
import { Badge } from '@/components/ui/badge'
import { Upload } from 'lucide-react'

export function Topbar() {
  const [open, setOpen] = useState(false)
  const activeCount = useUploadStore((s) => s.getActiveCount())

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border/50 bg-background/80 px-4 backdrop-blur-md lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      {activeCount > 0 && (
        <Badge variant="secondary" className="gap-1.5">
          <Upload className="h-3 w-3" />
          {activeCount} uploading
        </Badge>
      )}
    </header>
  )
}
