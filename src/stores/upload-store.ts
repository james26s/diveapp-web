import { create } from 'zustand'
import type * as tus from 'tus-js-client'

export interface UploadItem {
  id: string
  file: File
  diveId: string
  videoId: string
  progress: number
  status: 'queued' | 'uploading' | 'paused' | 'completed' | 'error'
  error?: string
  tusUpload?: tus.Upload
}

interface UploadStore {
  items: UploadItem[]
  addItem: (item: Omit<UploadItem, 'progress' | 'status'>) => void
  updateItem: (id: string, updates: Partial<UploadItem>) => void
  removeItem: (id: string) => void
  clearCompleted: () => void
  getActiveCount: () => number
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  items: [],

  addItem: (item) => {
    set((state) => ({
      items: [...state.items, { ...item, progress: 0, status: 'queued' }],
    }))
  },

  updateItem: (id, updates) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }))
  },

  removeItem: (id) => {
    const item = get().items.find((i) => i.id === id)
    if (item?.tusUpload && item.status === 'uploading') {
      item.tusUpload.abort()
    }
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }))
  },

  clearCompleted: () => {
    set((state) => ({
      items: state.items.filter((item) => item.status !== 'completed'),
    }))
  },

  getActiveCount: () => {
    return get().items.filter((i) => i.status === 'uploading' || i.status === 'queued').length
  },
}))
