import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Coach from './Coach'
import axios from 'axios'

vi.mock('axios')
const mockedAxios = axios as any

describe('Coach Page Acceptance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe mostrar el estado de carga inicialmente', () => {
    mockedAxios.get.mockReturnValue(new Promise(() => {})) // Nunca resuelve
    render(<Coach />)
    expect(screen.getByText(/Iniciando protocolo de entrenamiento/i)).toBeInTheDocument()
  })

  it('debe mostrar el formulario de onboarding si no hay perfil', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { profile: null } })
    
    render(<Coach />)

    await waitFor(() => {
      expect(screen.getByText(/Configuración Judoka/i)).toBeInTheDocument()
    })

    expect(screen.getByPlaceholderText(/ej: -81kg/i)).toBeInTheDocument()
    expect(screen.getByText(/GUARDAR PERFIL TÁCTICO/i)).toBeInTheDocument()

    // Simulate filling and saving
    fireEvent.change(screen.getByPlaceholderText(/ej: -81kg/i), { target: { value: '-81kg' } })
    
    mockedAxios.post.mockResolvedValueOnce({ data: { id: 'some-uuid' } })
    mockedAxios.get.mockResolvedValueOnce({ data: { profile: { belt_rank: 'Blanco', weight_category: '-81kg' } } })

    fireEvent.click(screen.getByText(/GUARDAR PERFIL TÁCTICO/i))

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/coach/profile'), expect.objectContaining({
        weight_category: '-81kg'
      }))
    })
  })

  it('debe mostrar el dashboard del coach si el perfil existe', async () => {
    const mockProfile = {
      belt_rank: 'Negro',
      weight_category: '-73kg',
      preferred_style: 'Seoi-nage specialist',
      injury_history: 'None',
      goals: 'Win Nationals'
    }

    const mockRecommendation = {
      tachi_waza_focus: 'Ippon Seoi Nage',
      ne_waza_focus: 'Sankaku-jime',
      rationale: 'Focus on your Tokui-waza'
    }

    const mockTechniques = [
      { id: 1, name: 'Osoto-gari', category: 'Tachi-waza', mastery_level: 4 }
    ]

    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/coach/profile')) return Promise.resolve({ data: { profile: mockProfile } })
      if (url.includes('/coach/recommendation')) return Promise.resolve({ data: mockRecommendation })
      if (url.includes('/coach/techniques')) return Promise.resolve({ data: mockTechniques })
      if (url.includes('/coach/feedback/today')) return Promise.resolve({ data: null })
      return Promise.reject(new Error('not found: ' + url))
    })

    render(<Coach />)

    await waitFor(() => {
      expect(screen.getByText(/Judoka Negro/i)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText(/Ippon Seoi Nage/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/Sankaku-jime/i)).toBeInTheDocument()
    expect(screen.getByText(/Osoto-gari/i)).toBeInTheDocument()
  })

  it('debe permitir añadir una nueva técnica', async () => {
    const mockProfile = { belt_rank: 'Blanco', weight_category: '-60kg', preferred_style: 'None' }
    
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/coach/profile')) return Promise.resolve({ data: { profile: mockProfile } })
      if (url.includes('/coach/recommendation')) return Promise.resolve({ data: {} })
      if (url.includes('/coach/techniques')) return Promise.resolve({ data: [] })
      if (url.includes('/coach/feedback/today')) return Promise.resolve({ data: null })
      return Promise.reject(new Error('not found: ' + url))
    })

    render(<Coach />)

    await waitFor(() => expect(screen.getByText(/AÑADIR TÉCNICA/i)).toBeInTheDocument())
    
    fireEvent.click(screen.getByText(/AÑADIR TÉCNICA/i))

    const input = screen.getByPlaceholderText(/Nombre técnica/i)
    fireEvent.change(input, { target: { value: 'Uchi-mata' } })
    
    mockedAxios.post.mockResolvedValueOnce({ data: { id: 2, name: 'Uchi-mata', category: 'Tachi-waza', mastery_level: 3 } })
    
    fireEvent.click(screen.getByText(/^GUARDAR$/i))

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/coach/techniques'), expect.objectContaining({
        name: 'Uchi-mata'
      }))
    })
  })

  it('debe permitir enviar feedback de randori', async () => {
    const mockProfile = { belt_rank: 'Negro', weight_category: '-73kg', preferred_style: 'None' }
    const mockRecommendation = { tachi_waza_focus: 'Seoi-nage', ne_waza_focus: 'Juji-gatame', rationale: 'Test' }
    
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/coach/profile')) return Promise.resolve({ data: { profile: mockProfile } })
      if (url.includes('/coach/recommendation')) return Promise.resolve({ data: mockRecommendation })
      if (url.includes('/coach/techniques')) return Promise.resolve({ data: [] })
      if (url.includes('/coach/feedback/today')) return Promise.resolve({ data: null })
      return Promise.reject(new Error('not found'))
    })

    render(<Coach />)

    await waitFor(() => expect(screen.getByText(/Feedback de Randori/i)).toBeInTheDocument())

    const tachiBtn = screen.getByText(/Foco Pie Aplicado/i)
    fireEvent.click(tachiBtn)

    const saveBtn = screen.getByText(/GUARDAR FEEDBACK/i)
    
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })
    mockedAxios.get.mockResolvedValueOnce({ data: { tachi_waza_success: true, ne_waza_success: false, notes: 'Bien' } })

    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/coach/feedback'), expect.objectContaining({
        tachi_waza_success: true
      }))
    })
  })

  it('debe permitir actualizar la maestría de una técnica', async () => {
    const mockProfile = { belt_rank: 'Negro', weight_category: '-73kg', preferred_style: 'None' }
    const mockTechniques = [{ id: 'tech-1', name: 'Osoto-gari', category: 'Tachi-waza', mastery_level: 3 }]
    
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/coach/profile')) return Promise.resolve({ data: { profile: mockProfile } })
      if (url.includes('/coach/recommendation')) return Promise.resolve({ data: {} })
      if (url.includes('/coach/techniques')) return Promise.resolve({ data: mockTechniques })
      if (url.includes('/coach/feedback/today')) return Promise.resolve({ data: null })
      return Promise.reject(new Error('not found'))
    })

    render(<Coach />)

    await waitFor(() => expect(screen.getByText(/Osoto-gari/i)).toBeInTheDocument())

    const dots = screen.getAllByRole('button').filter(b => b.className.includes('w-2.5'))
    fireEvent.click(dots[4]) // Click on mastery level 5

    mockedAxios.patch.mockResolvedValueOnce({ data: { ...mockTechniques[0], mastery_level: 5 } })

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(expect.stringContaining('/coach/techniques/tech-1'), {
        mastery_level: 5
      })
    })
  })
})
