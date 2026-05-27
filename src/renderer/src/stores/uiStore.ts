import { create } from 'zustand'

interface UIState {
  paletteOpen: boolean
  helpOpen: boolean
  welcomeOpen: boolean
  setPaletteOpen: (v: boolean) => void
  togglePalette: () => void
  setHelpOpen: (v: boolean) => void
  toggleHelp: () => void
  setWelcomeOpen: (v: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  paletteOpen: false,
  helpOpen: false,
  welcomeOpen: false,
  setPaletteOpen: (v) => set({ paletteOpen: v }),
  togglePalette:  () => set((s) => ({ paletteOpen: !s.paletteOpen })),
  setHelpOpen:    (v) => set({ helpOpen: v }),
  toggleHelp:     () => set((s) => ({ helpOpen: !s.helpOpen })),
  setWelcomeOpen: (v) => set({ welcomeOpen: v }),
}))
