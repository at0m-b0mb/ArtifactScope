import { addActivity } from '../db/activity'

export function logActivity(eventType: string, description: string, caseId?: string): void {
  try {
    addActivity(eventType, description, caseId)
  } catch {
    // Non-fatal — never block forensics work because logging failed
  }
}
