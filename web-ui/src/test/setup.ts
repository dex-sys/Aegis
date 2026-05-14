import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock de window.alert
window.alert = vi.fn()

// Mock de lucide-react para evitar problemas de renderizado en tests
vi.mock('lucide-react', () => ({
  Dumbbell: () => 'Dumbbell',
  Trophy: () => 'Trophy',
  Activity: () => 'Activity',
  Info: () => 'Info',
  Save: () => 'Save',
  Star: () => 'Star',
  AlertCircle: () => 'AlertCircle',
  CheckCircle2: () => 'CheckCircle2',
  Trash2: () => 'Trash2'
}))
