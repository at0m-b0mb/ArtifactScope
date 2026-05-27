import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Case {
  id: string
  name: string
  case_number: string
  investigator: string
  agency: string
  status: 'open' | 'closed' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  tags: string
  created_at: string
  updated_at: string
}

interface CaseStore {
  activeCase: Case | null
  setActiveCase: (c: Case | null) => void
}

export const useCaseStore = create<CaseStore>()(
  persist(
    (set) => ({
      activeCase: null,
      setActiveCase: (c) => set({ activeCase: c }),
    }),
    {
      name: 'artifactscope-active-case',
      partialize: (state) => ({ activeCase: state.activeCase }),
    }
  )
)
