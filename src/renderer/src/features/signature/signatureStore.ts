import { create } from 'zustand'

export interface SavedSignature {
  id: string
  dataUrl: string // base64 PNG data
}

interface SignatureState {
  savedSignatures: SavedSignature[]
  loadSignatures: () => Promise<void>
  addSignature: (dataUrl: string) => void
  deleteSignature: (id: string) => void
}

export const useSignatureStore = create<SignatureState>((set) => ({
  savedSignatures: [],
  loadSignatures: async () => {
    try {
      const settings = await window.api.getSettings()
      if (settings.savedSignatures && Array.isArray(settings.savedSignatures)) {
        set({ savedSignatures: settings.savedSignatures })
      }
    } catch (err) {
      console.error('Failed to load signatures', err)
    }
  },
  addSignature: (dataUrl) => {
    const newSig = { id: crypto.randomUUID(), dataUrl }
    set((state) => {
      const updated = [...state.savedSignatures, newSig]
      window.api.setSetting('savedSignatures', updated).catch(console.error)
      return { savedSignatures: updated }
    })
  },
  deleteSignature: (id) => {
    set((state) => {
      const updated = state.savedSignatures.filter(s => s.id !== id)
      window.api.setSetting('savedSignatures', updated).catch(console.error)
      return { savedSignatures: updated }
    })
  }
}))
