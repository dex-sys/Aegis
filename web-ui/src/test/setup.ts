import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock de window.alert
window.alert = vi.fn()

// Mock de lucide-react para evitar problemas de renderizado en tests
vi.mock('lucide-react', async (importOriginal) => {
  const actual: any = await importOriginal()
  const mockIcons: any = {}
  Object.keys(actual).forEach(key => {
    mockIcons[key] = () => key
  })
  return mockIcons
})
