import { create } from 'zustand'

interface PasswordRequest {
  reason: number
  resolve: (password: string | null) => void
}

interface PasswordState {
  request: PasswordRequest | null
  askForPassword: (reason: number) => Promise<string | null>
  resolvePassword: (password: string | null) => void
}

export const usePasswordStore = create<PasswordState>((set, get) => ({
  request: null,
  askForPassword: (reason) =>
    new Promise<string | null>((resolve) => set({ request: { reason, resolve } })),
  resolvePassword: (password) => {
    const request = get().request
    if (!request) return
    set({ request: null })
    request.resolve(password)
  }
}))
