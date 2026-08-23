import { create } from 'zustand'

type FeedbackTone = 'info' | 'success' | 'error'

type Toast = {
  id: string
  message: string
  tone: FeedbackTone
}

type Confirmation = {
  id: string
  title: string
  message: string
  resolve: (accepted: boolean) => void
}

interface FeedbackState {
  toasts: Toast[]
  confirmation: Confirmation | null
  notify: (message: string, tone?: FeedbackTone) => void
  dismissToast: (id: string) => void
  confirm: (message: string, title?: string) => Promise<boolean>
  resolveConfirmation: (accepted: boolean) => void
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  toasts: [],
  confirmation: null,
  notify: (message, tone = 'info') => {
    const id = crypto.randomUUID()
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }))
    window.setTimeout(() => get().dismissToast(id), 5000)
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  confirm: (message, title = 'Please confirm') =>
    new Promise<boolean>((resolve) => {
      set({ confirmation: { id: crypto.randomUUID(), title, message, resolve } })
    }),
  resolveConfirmation: (accepted) => {
    const confirmation = get().confirmation
    if (!confirmation) return
    set({ confirmation: null })
    confirmation.resolve(accepted)
  }
}))
