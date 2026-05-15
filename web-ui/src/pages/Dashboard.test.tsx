import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Dashboard from './Dashboard'
import axios from 'axios'

vi.mock('axios')
const mockedAxios = axios as any

describe('Dashboard Acceptance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock ResizeObserver for Recharts
    global.ResizeObserver = vi.fn().mockImplementation(function() {
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
    })
  })

  it('debe mostrar el monitor ACWR y los timestamps formateados correctamente', async () => {
    const mockInference = {
      target_date: '2026-05-14',
      readiness_score: 0.85,
      fatigue_level: 'Low',
      recommendation_summary: 'Todo bien',
      inference_metadata: { fatigue_engine: { acwr_ratio: 1.1 } }
    }

    const mockFatigueTrend = [
      { date: '2026-05-14', acwr: 1.1, is_predicted: false },
      { date: '2026-05-15', acwr: 1.2, is_predicted: true }
    ]

    const mockActivities = [
      { id: '1', activity_type: 'judo', start_time: '2026-05-14T10:00:00.000Z', cognitive_load_rpe: 7 }
    ]

    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/inference/latest')) return Promise.resolve({ data: mockInference })
      if (url.includes('/metrics/fatigue/trend')) return Promise.resolve({ data: mockFatigueTrend })
      if (url.includes('/activities')) return Promise.resolve({ data: mockActivities })
      if (url.includes('/metrics/biometric/trend')) return Promise.resolve({ data: [] })
      if (url.includes('/metrics/mental/trend')) return Promise.resolve({ data: [] })
      if (url.includes('/inference/trend')) return Promise.resolve({ data: [] })
      if (url.includes('/status')) return Promise.resolve({ data: { value: 'idle' } })
      if (url.includes('/alerts')) return Promise.resolve({ data: [] })
      return Promise.reject(new Error('not found: ' + url))
    })

    render(<Dashboard />)

    // Verificar que el título del monitor predictivo aparece
    await waitFor(() => {
      expect(screen.getByText(/Visualización Predictiva ACWR/i)).toBeInTheDocument()
    })

    // Verificar que el timestamp NO tenga la 'Z' y esté formateado (DD/MM/YYYY)
    await waitFor(() => {
      // Buscamos en la lista de actividades
      const activityTimestamps = screen.getAllByText(/14\/05\/2026/i)
      expect(activityTimestamps.length).toBeGreaterThan(0)
      activityTimestamps.forEach(ts => {
        expect(ts.textContent).not.toContain('Z')
        expect(ts.textContent).not.toContain('.000')
      })
    })

    // Verificar zonas de riesgo en el monitor (usando getAllBy ya que aparece en el tooltip y en el gráfico)
    expect(screen.getAllByText(/Zona Óptima/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Riesgo Crítico/i)).toBeInTheDocument()
  })
})
