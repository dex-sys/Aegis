import { useState, useEffect, useRef } from 'react'
import { Activity, Brain, Moon, Zap, BarChart3, Clock, TrendingUp, Upload, X, ChevronRight, Filter, Plus, Save, Info, Trash2, Utensils } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, ReferenceLine, ReferenceArea
} from 'recharts'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:3001/api'

// --- Helpers de Formateo ---
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '--'
  const date = new Date(dateStr)
  // Formato: DD/MM/YYYY HH:mm (evitando la Z y milisegundos)
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(',', '')
}

const formatDateShort = (dateStr: string | null) => {
  if (!dateStr) return '--'
  const date = new Date(dateStr)
  return date.toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short'
  })
}

// --- Componente de Ayuda para Métricas ---
const MetricTooltip = ({ title, description, ranges }: any) => (
  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-72 p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-[100] text-left backdrop-blur-2xl ring-1 ring-white/5">
    <p className="text-primary font-black uppercase text-[10px] tracking-widest mb-2">{title}</p>
    <p className="text-xs text-slate-300 leading-relaxed mb-4">{description}</p>
    {ranges && (
      <div className="space-y-2 border-t border-slate-800 pt-3">
        {ranges.map((r: any) => (
          <div key={r.label} className="flex justify-between items-center text-[10px]">
            <span className="text-slate-500 font-bold uppercase">{r.label}</span>
            <span className={`${r.color} font-black`}>{r.value}</span>
          </div>
        ))}
      </div>
    )}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-4 h-4 bg-slate-900 border-l border-t border-slate-800 rotate-45" />
  </div>
)

// --- Componente Modal Genérico ---
const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 backdrop-blur-md bg-slate-950/60 transition-all">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden">
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
            {title}
          </h2>
          <button onClick={onClose} className="p-3 hover:bg-slate-800 rounded-2xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </div>
    </div>
  )
}

const Dashboard = () => {
  const [latestInference, setLatestInference] = useState<any>(null)
  const [battery, setBattery] = useState<any>(null)
  const [biometricTrend, setBiometricTrend] = useState<any[]>([])
  const [mentalTrend, setMentalTrend] = useState<any[]>([])
  const [inferenceTrend, setInferenceTrend] = useState<any[]>([])
  const [fatigueTrend, setFatigueTrend] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [systemStatus, setSystemStatus] = useState<string>('idle')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [alerts, setAlerts] = useState<any[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const deleteActivity = async () => {
    if (!deleteConfirm) return
    try {
      await axios.delete(`${API_BASE_URL}/activities/${deleteConfirm}`)
      setDeleteConfirm(null)
      fetchData()
    } catch (err) {
      console.error("Error deleting activity:", err)
    }
  }

  // Estados para Modales
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado del Formulario Mental
  const [mentalForm, setMentalForm] = useState({
    mood: 5,
    stress: 5,
    anxiety: 5,
    motivation: 5,
    notes: ""
  })

  const [isSavingMental, setIsSavingMental] = useState(false)

  const handleMentalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingMental(true)
    try {
      await axios.post(`${API_BASE_URL}/metrics/mental`, {
        mood_score: mentalForm.mood,
        stress_level: mentalForm.stress,
        anxiety_level: mentalForm.anxiety,
        motivation_score: mentalForm.motivation,
        subjective_notes: mentalForm.notes
      })
      setActiveModal(null)
      fetchData()
    } catch (err) {
      console.error("Error saving mental health:", err)
    } finally {
      setIsSavingMental(false)
    }
  }

  // Estado del Formulario de Judo
  const [judoForm, setJudoForm] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    duration: 90,
    intensity: 7,
    fatigue: 5,
    mental_state: 7,
    focus_areas: ""
  })

  const fetchData = async () => {
    try {
      const results = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/inference/latest`),
        axios.get(`${API_BASE_URL}/metrics/biometric/trend`),
        axios.get(`${API_BASE_URL}/metrics/mental/trend`),
        axios.get(`${API_BASE_URL}/inference/trend`),
        axios.get(`${API_BASE_URL}/activities`),
        axios.get(`${API_BASE_URL}/status`),
        axios.get(`${API_BASE_URL}/alerts`),
        axios.get(`${API_BASE_URL}/metrics/fatigue/trend`),
        axios.get(`${API_BASE_URL}/metrics/battery`)
      ])

      if (results[0].status === 'fulfilled') setLatestInference(results[0].value.data)
      if (results[1].status === 'fulfilled') setBiometricTrend(results[1].value.data)
      if (results[2].status === 'fulfilled') setMentalTrend(results[2].value.data)
      if (results[3].status === 'fulfilled') setInferenceTrend(results[3].value.data)
      if (results[4].status === 'fulfilled') setActivities(results[4].value.data)
      if (results[5].status === 'fulfilled') {
        setSystemStatus(results[5].value.data.value)
        setIsAnalyzing(results[5].value.data.value === 'analyzing')
      }
      if (results[6].status === 'fulfilled') setAlerts(results[6].value.data)
      if (results[7].status === 'fulfilled') setFatigueTrend(results[7].value.data)
      if (results[8].status === 'fulfilled') setBattery(results[8].value.data)
      
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
    }
  }

  const markAlertRead = async (id: string) => {
    try {
      await axios.post(`${API_BASE_URL}/alerts/${id}/read`)
      fetchData()
    } catch (err) {
      console.error("Error marking alert as read:", err)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('healthData', file)

    setUploadStatus('Subiendo...')
    try {
      await axios.post(`${API_BASE_URL}/upload`, formData)
      setUploadStatus('Éxito: Procesando...')
      setTimeout(() => setUploadStatus(null), 3000)
    } catch (err) {
      setUploadStatus('Error')
      console.error(err)
    }
  }

  const [isSavingJudo, setIsSavingJudo] = useState(false)

  const handleJudoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingJudo(true)
    try {
      await axios.post(`${API_BASE_URL}/activities`, {
        start_time: judoForm.timestamp,
        activity_type: 'judo',
        cognitive_load_rpe: judoForm.intensity,
        context_metadata: {
          duration_minutes: judoForm.duration,
          subjective_fatigue: judoForm.fatigue,
          training_mental_state: judoForm.mental_state,
          focus_areas: judoForm.focus_areas.split(',').map(s => s.trim())
        }
      })
      setActiveModal(null)
      fetchData()
    } catch (err) {
      console.error("Error saving judo log:", err)
    } finally {
      setIsSavingJudo(false)
    }
  }

  const latestMental = mentalTrend[mentalTrend.length - 1] || {
    mood_score: 5, stress_level: 5, anxiety_level: 5, motivation_score: 5
  }

  const getStatusColor = (score: number) => {
    if (score >= 0.8) return 'text-success'
    if (score >= 0.5) return 'text-warning'
    return 'text-danger'
  }

  const getFatigueColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'text-success'
      case 'moderate': return 'text-warning'
      case 'high':
      case 'critical': return 'text-danger'
      default: return 'text-slate-400'
    }
  }

  const readinessScore = latestInference ? (latestInference.readiness_score * 100).toFixed(0) : '--'

  return (
    <>
      {/* System Alerts */}
      {alerts.length > 0 && (
        <div className="mb-8 space-y-4">
          {alerts.map(alert => (
            <div key={alert.id} className={`p-6 rounded-[2rem] border flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500 ${
              alert.level === 'critical' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-orange-500/10 border-orange-500 text-orange-500'
            }`}>
              <div className="flex items-center gap-4">
                <Zap className="w-6 h-6 animate-pulse" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{alert.category}</p>
                  <p className="font-bold">{alert.message}</p>
                </div>
              </div>
              <button onClick={() => markAlertRead(alert.id)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Header Info (Aegis Header was in App.tsx but will keep status here or shared) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 relative z-40">
        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => setActiveModal('mental_form')}
            className="bg-indigo-600 text-white px-6 py-4 rounded-3xl flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-indigo-500/20"
          >
            <Brain className="w-5 h-5 font-black" />
            <span className="font-black text-sm uppercase tracking-widest">Estado Mental</span>
          </button>

          <button 
            onClick={() => setActiveModal('judo_form')}
            className="bg-primary text-slate-950 px-6 py-4 rounded-3xl flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-primary/20"
          >
            <Plus className="w-5 h-5 font-black" />
            <span className="font-black text-sm uppercase tracking-widest">Log Judo</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-slate-900 border border-slate-800 px-6 py-4 rounded-3xl flex items-center gap-3 hover:bg-slate-800 transition-all group"
          >
            <Upload className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm uppercase tracking-widest">{uploadStatus || 'Dumps Salud'}</span>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".xml,.csv,.json" />
          </button>

          <div className="bg-slate-900/40 border border-slate-800 p-1 rounded-[2rem] flex items-center shadow-2xl backdrop-blur-xl">
            {/* Widget Batería Biométrica */}
            <div className="px-6 py-4 flex items-center gap-4 group relative border-r border-slate-800">
               <div className="relative w-8 h-14 bg-slate-950 border-2 border-slate-800 rounded-md p-1 flex flex-col justify-end overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-3 h-1 bg-slate-800 rounded-t-sm" />
                  <div 
                    className={`w-full transition-all duration-1000 rounded-sm ${
                      (battery?.level || 0) > 70 ? 'bg-success shadow-[0_0_15px_rgba(34,197,94,0.4)]' :
                      (battery?.level || 0) > 30 ? 'bg-warning shadow-[0_0_15px_rgba(234,179,8,0.4)]' :
                      'bg-danger shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                    }`}
                    style={{ height: `${battery?.level || 0}%` }}
                  />
               </div>
               <div>
                  <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Batería</p>
                  <p className={`text-xl font-black ${
                    (battery?.level || 0) > 70 ? 'text-success' :
                    (battery?.level || 0) > 30 ? 'text-warning' : 'text-danger'
                  }`}>
                    {battery?.level || '--'}<span className="text-[10px] opacity-50">%</span>
                  </p>
               </div>
               <MetricTooltip 
                  title="Batería Biométrica"
                  description="Representación visual de tu energía total disponible. Combina Readiness (IA), Calidad de Sueño y variabilidad de frecuencia cardíaca (HRV)."
                  ranges={[
                    { label: 'Readiness', value: `${battery?.factors?.readiness || 0}%`, color: 'text-primary' },
                    { label: 'Sueño', value: `${battery?.factors?.sleep_score || 0}/100`, color: 'text-indigo-400' },
                    { label: 'Estatus HRV', value: (battery?.factors?.hrv_status || '--').toUpperCase(), color: 'text-success' }
                  ]}
               />
            </div>

            {systemStatus === 'processing' && (
              <div className="flex items-center gap-2 px-4 animate-pulse">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span className="text-[10px] font-black uppercase text-primary">Procesando</span>
              </div>
            )}
            {isAnalyzing && (
              <div className="flex items-center gap-2 px-4 animate-pulse">
                <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                <span className="text-[10px] font-black uppercase text-indigo-500">IA Analizando</span>
              </div>
            )}
            <div className="px-8 py-4 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-1">Disponibilidad</p>
              <p className={`text-5xl font-black tracking-tighter ${getStatusColor(latestInference?.readiness_score)}`}>
                {readinessScore}<span className="text-xl opacity-50">%</span>
              </p>
            </div>
            <div className="h-16 w-px bg-slate-800" />
            <div className="px-8 py-4 text-center min-w-[120px]">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-1">Fatiga</p>
              <p className={`text-2xl font-black uppercase tracking-tight ${getFatigueColor(latestInference?.fatigue_level)}`}>
                {latestInference?.fatigue_level || '--'}
              </p>
            </div>
            <div className="h-16 w-px bg-slate-800" />
            <div className="px-8 py-4 text-center min-w-[100px] relative group">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-1 flex items-center justify-center gap-1">
                ACWR <Info className="w-3 h-3 opacity-50" />
              </p>
              <p className={`text-2xl font-black ${
                Number(latestInference?.inference_metadata?.fatigue_engine?.acwr_ratio) > 1.5 ? 'text-danger' :
                Number(latestInference?.inference_metadata?.fatigue_engine?.acwr_ratio) > 1.3 ? 'text-warning' :
                Number(latestInference?.inference_metadata?.fatigue_engine?.acwr_ratio) < 0.8 ? 'text-indigo-400' : 'text-success'
              }`}>
                {latestInference?.inference_metadata?.fatigue_engine?.acwr_ratio || '1.0'}
              </p>
              <MetricTooltip 
                title="Acute:Chronic Workload Ratio"
                description="Relación entre la fatiga a corto plazo (7d) y la forma física a largo plazo (28d). Ayuda a predecir el riesgo de lesiones."
                ranges={[
                  { label: 'Zona Óptima', value: '0.8 - 1.3', color: 'text-success' },
                  { label: 'Riesgo Alto', value: '> 1.5', color: 'text-danger' },
                  { label: 'Sub-entreno', value: '< 0.8', color: 'text-indigo-400' }
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      <main className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <section className="bg-slate-900/50 border border-slate-800 rounded-[3rem] p-10 md:p-12 relative shadow-2xl backdrop-blur-sm group">
            <div className="absolute inset-0 rounded-[3rem] overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-700">
                <Activity className="w-96 h-96 text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-4 mb-10 relative z-10">
              <div className="bg-primary p-2 rounded-xl">
                <Brain className="text-slate-950 w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white uppercase">Estado de Combate</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent ml-4" />
            </div>
            <div className="relative z-10">
              <div className="bg-slate-950/40 border-l-4 border-primary p-8 rounded-r-3xl rounded-bl-3xl mb-12">
                <p className="text-2xl md:text-3xl text-slate-100 leading-relaxed font-medium italic">
                  "{latestInference?.recommendation_summary || 'Analizando últimos biométricos...'}"
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-primary" /> Peak Window
                  </p>
                  <p className="text-2xl font-black text-white">
                    {latestInference?.peak_window_start?.slice(0, 5)} <span className="text-slate-600 font-medium">→</span> {latestInference?.peak_window_end?.slice(0, 5)}
                  </p>
                </div>
                <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 relative group">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" /> Carga Aguda <Info className="w-3 h-3 opacity-50 ml-auto" />
                  </p>
                  <p className="text-2xl font-black text-white">{latestInference?.inference_metadata?.fatigue_engine?.acute_workload_7d || 0}</p>
                  <MetricTooltip 
                    title="Carga Aguda (7d)"
                    description="Representa la media de la carga de entrenamiento (RPE x Duración) de los últimos 7 días. Es un indicador directo del estrés fisiológico reciente."
                  />
                </div>
                <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 md:col-span-2">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" /> Protocolo Aplicado
                  </p>
                  <p className="text-2xl font-black text-white truncate">{latestInference?.protocol_applied || 'Aegis-Standard-v2'}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Monitor de Riesgo de Lesión (ACWR) */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-[3rem] p-10 md:p-12 shadow-2xl backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
              <TrendingUp className="w-64 h-64 text-primary" />
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
              <div className="flex items-center gap-4">
                <div className="bg-orange-500/20 p-3 rounded-2xl border border-orange-500/20">
                  <TrendingUp className="text-primary w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white uppercase">Visualización Predictiva ACWR</h2>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">Tendencia de carga y riesgo de sobreentrenamiento</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-6 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_#f97316]" />
                  <span className="text-[9px] font-black uppercase text-slate-400">Ratio ACWR</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                  <span className="text-[9px] font-black uppercase text-slate-400">Carga Crónica</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 border border-primary border-dashed rounded-full" />
                  <span className="text-[9px] font-black uppercase text-slate-400">Carga Aguda</span>
                </div>
              </div>
            </div>
            
            <div className="h-[300px] w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fatigueTrend}>
                  <defs>
                    <linearGradient id="colorACWR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#475569" 
                    fontSize={10} 
                    fontWeight="bold"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatDateShort}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={10} 
                    fontWeight="bold"
                    axisLine={false}
                    tickLine={false}
                    domain={[0, (dataMax: number) => Math.max(2, Math.ceil(dataMax * 1.2))]} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '10px' }}
                    labelFormatter={formatDate}
                    cursor={{ stroke: '#f97316', strokeWidth: 2, strokeDasharray: '5 5' }}
                  />
                  
                  {/* Zonas de Riesgo Coloreadas */}
                  <ReferenceArea y1={0.8} y2={1.3} fill="#22c55e" fillOpacity={0.05} />
                  <ReferenceArea y1={1.5} y2={4} fill="#ef4444" fillOpacity={0.05} />
                  
                  <ReferenceLine y={1.5} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} />
                  <ReferenceLine y={0.8} stroke="#6366f1" strokeDasharray="3 3" strokeWidth={2} />
                  <ReferenceLine y={1.3} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.3} />

                  <Area 
                    type="monotone" 
                    dataKey="acwr" 
                    data={fatigueTrend}
                    stroke="#f97316" 
                    strokeWidth={4} 
                    strokeDasharray="5 5"
                    fillOpacity={1} 
                    fill="url(#colorACWR)" 
                    animationDuration={1500}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="acwr" 
                    data={fatigueTrend.filter(d => !d.is_predicted)}
                    stroke="#f97316" 
                    strokeWidth={4} 
                    strokeDasharray="0"
                    fillOpacity={0} 
                    fill="transparent"
                    animationDuration={1500}
                  />
                  
                  {/* Líneas de Carga (Normalizadas para visualización si es necesario, pero aquí usamos valores reales) */}
                  {/* Como los valores de carga pueden ser mucho más altos que el ACWR (que es un ratio), 
                      podríamos necesitar un eje Y secundario o normalizarlos para que "quepan" en el gráfico 
                      y ver la relación visual. Para simplicidad ahora solo mostramos el ACWR como área. */}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 relative z-10">
              <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800/50">
                <p className="text-success text-[10px] font-black uppercase tracking-widest mb-1">Zona Óptima</p>
                <p className="text-white font-bold text-sm">0.8 - 1.3</p>
                <p className="text-slate-500 text-[10px] mt-2 leading-relaxed">Máxima adaptación fisiológica con riesgo mínimo.</p>
              </div>
              <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800/50">
                <p className="text-warning text-[10px] font-black uppercase tracking-widest mb-1">Precaución</p>
                <p className="text-white font-bold text-sm">1.3 - 1.5</p>
                <p className="text-slate-500 text-[10px] mt-2 leading-relaxed">Incremento rápido de carga. Monitorear fatiga.</p>
              </div>
              <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800/50">
                <p className="text-danger text-[10px] font-black uppercase tracking-widest mb-1">Riesgo Crítico</p>
                <p className="text-white font-bold text-sm">{'>'} 1.5</p>
                <p className="text-slate-500 text-[10px] mt-2 leading-relaxed">Zona de peligro. Alta probabilidad de lesión.</p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl overflow-hidden flex flex-col">
              <h3 className="text-sm font-black uppercase tracking-widest mb-6 text-slate-400 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Actividades
              </h3>
              <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[200px]">
                {Array.isArray(activities) && activities.map((act: any) => (
                  <div key={act.id} className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-colors relative group/item">
                    <button 
                      onClick={() => setDeleteConfirm(act.id)}
                      className="absolute top-2 right-2 p-1.5 text-slate-600 hover:text-danger opacity-0 group-hover/item:opacity-100 transition-all rounded-lg hover:bg-danger/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex justify-between items-start mb-1 pr-6">
                      <p className="text-xs font-black uppercase text-primary tracking-tighter">{act.activity_type}</p>
                      <p className="text-[10px] text-slate-500">{formatDate(act.start_time)}</p>
                    </div>
                    <p className="text-sm font-bold text-white">
                      RPE: <span className="text-primary">{act.cognitive_load_rpe}</span>
                      {act.context_metadata?.duration_minutes && <span className="text-slate-500 ml-2">({act.context_metadata.duration_minutes}m)</span>}
                    </p>
                    {act.context_metadata?.training_mental_state && (
                      <p className="text-[10px] text-slate-400">
                        Mente: <span className={act.context_metadata.training_mental_state > 7 ? 'text-success' : act.context_metadata.training_mental_state < 4 ? 'text-danger' : 'text-primary'}>
                          {act.context_metadata.training_mental_state}/10
                        </span>
                      </p>
                    )}
                    {act.context_metadata?.focus_areas && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {act.context_metadata.focus_areas.map((area: string) => (
                          <span key={area} className="text-[8px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 uppercase font-black">{area}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {(!Array.isArray(activities) || activities.length === 0) && (
                  <p className="text-center text-slate-600 text-xs py-10 uppercase font-black">Sin registros</p>
                )}
              </div>
            </div>

            <div onClick={() => setActiveModal('readiness')} className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl hover:border-primary/40 transition-all cursor-pointer group">
              <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center justify-between text-slate-400">
                <span>Readiness</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </h3>
              <div className="h-40 w-full pointer-events-none">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={inferenceTrend.slice(-10)}>
                    <XAxis dataKey="target_date" hide />
                    <YAxis domain={[0, 1]} hide />
                    <Tooltip labelFormatter={formatDate} />
                    <Line type="monotone" dataKey="readiness_score" stroke="#f97316" strokeWidth={4} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div onClick={() => setActiveModal('steps')} className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl hover:border-primary/40 transition-all cursor-pointer group">
              <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center justify-between text-slate-400">
                <span>Pasos</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </h3>
              <div className="h-40 w-full pointer-events-none">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={biometricTrend.slice(-10)}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      labelFormatter={formatDate}
                      content={({ active, payload, label }: any) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg shadow-xl">
                              <p className="text-[10px] font-black text-slate-500 mb-1">{formatDate(label)}</p>
                              <p className="text-[10px] font-black text-primary">{payload[0].value.toLocaleString()} PASOS</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="steps" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div onClick={() => setActiveModal('sleep')} className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl hover:border-indigo-400/40 transition-all cursor-pointer group">
              <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center justify-between text-slate-400">
                <span>Sueño</span>
                {biometricTrend[biometricTrend.length - 1]?.sleep_score && (
                  <span className="text-indigo-400 font-black">{biometricTrend[biometricTrend.length - 1].sleep_score} pts</span>
                )}
              </h3>
              <div className="h-40 w-full pointer-events-none">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={biometricTrend.slice(-10)}>
                    <Tooltip labelFormatter={formatDate} />
                    <Bar dataKey="sleep_deep" stackId="sleep" fill="#312e81" />
                    <Bar dataKey="sleep_rem" stackId="sleep" fill="#4338ca" />
                    <Bar dataKey="sleep_light" stackId="sleep" fill="#6366f1" />
                    <Bar dataKey="sleep_awake" stackId="sleep" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-8">
          <section className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-8 shadow-2xl backdrop-blur-sm">
            <h3 className="text-xl font-black mb-10 flex items-center gap-3 text-white uppercase tracking-tight">
              <Brain className="text-primary w-6 h-6" /> Salud Mental
            </h3>
            <div className="space-y-10">
              {[
                { label: 'Mood', val: latestMental.mood_score * 10, color: 'bg-primary' },
                { label: 'Motivation', val: latestMental.motivation_score * 10, color: 'bg-primary/80' },
                { label: 'Stress', val: latestMental.stress_level * 10, color: 'bg-danger' },
                { label: 'Anxiety', val: latestMental.anxiety_level * 10, color: 'bg-danger/80' },
              ].map((item) => (
                <div key={item.label} className="group">
                  <div className="flex justify-between items-end mb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-300 transition-colors">{item.label}</p>
                    <p className="text-sm font-black text-slate-100">{item.val}%</p>
                  </div>
                  <div className="h-2.5 w-full bg-slate-800/50 rounded-full overflow-hidden p-[2px] border border-slate-800">
                    <div className={`h-full ${item.color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${item.val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
{/* Quick Action Card */}
<div className={`rounded-[3rem] p-10 shadow-2xl transition-all duration-500 ${latestInference && latestInference.readiness_score < 0.4 ? 'bg-danger text-white' : 'bg-primary text-slate-950'}`}>
  <h3 className="text-2xl font-black mb-6 flex items-center gap-3 uppercase tracking-tighter">
    <Zap className={`w-8 h-8 fill-current`} />
    Prioridad
  </h3>
  <p className="font-bold text-xl leading-snug">
    {latestInference && latestInference.readiness_score < 0.4 ? 'SISTEMA COMPROMETIDO: Recuperación profunda obligatoria.' : 'SISTEMA OPERATIVO: Maximizar rendimiento.'}
  </p>
</div>
        </aside>
      </main>

      {/* Modales */}
      <Modal isOpen={activeModal === 'judo_form'} onClose={() => setActiveModal(null)} title="Registrar Sesión de Judo">
        <form onSubmit={handleJudoSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Fecha y Hora</label>
              <input type="datetime-local" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white" value={judoForm.timestamp} onChange={(e) => setJudoForm({ ...judoForm, timestamp: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Duración (minutos)</label>
              <input type="number" placeholder="Minutos" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white" value={judoForm.duration} onChange={(e) => setJudoForm({ ...judoForm, duration: parseInt(e.target.value) })} />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Foco del Entrenamiento (separado por comas)</label>
              <input type="text" placeholder="Randori, Uchi-komi, Ne-waza..." className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white" value={judoForm.focus_areas} onChange={(e) => setJudoForm({ ...judoForm, focus_areas: e.target.value })} />
            </div>
          </div>
          <div className="space-y-8">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Intensidad (RPE)</label>
                <span className="text-primary font-black">{judoForm.intensity}/10</span>
              </div>
              <input type="range" min="1" max="10" className="w-full accent-primary" value={judoForm.intensity} onChange={(e) => setJudoForm({ ...judoForm, intensity: parseInt(e.target.value) })} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fatiga Percibida</label>
                <span className="text-orange-400 font-black">{judoForm.fatigue}/10</span>
              </div>
              <input type="range" min="1" max="10" className="w-full accent-orange-400" value={judoForm.fatigue} onChange={(e) => setJudoForm({ ...judoForm, fatigue: parseInt(e.target.value) })} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Estado Mental Pre-Entreno</label>
                <span className="text-indigo-400 font-black">{judoForm.mental_state}/10</span>
              </div>
              <input type="range" min="1" max="10" className="w-full accent-indigo-400" value={judoForm.mental_state} onChange={(e) => setJudoForm({ ...judoForm, mental_state: parseInt(e.target.value) })} />
            </div>
            <button type="submit" className="w-full bg-primary text-slate-950 font-black py-6 rounded-3xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all" disabled={isSavingJudo}>
              {isSavingJudo ? 'GUARDANDO...' : 'GUARDAR REGISTRO'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'mental_form'} onClose={() => setActiveModal(null)} title="Estado Mental y Psicológico">
        <form onSubmit={handleMentalSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-8">
            {[
              { key: 'mood', label: 'Estado de Ánimo', color: 'accent-primary' },
              { key: 'motivation', label: 'Motivación', color: 'accent-primary' },
              { key: 'stress', label: 'Nivel de Estrés', color: 'accent-danger' },
              { key: 'anxiety', label: 'Nivel de Ansiedad', color: 'accent-danger' }
            ].map(item => (
              <div key={item.key}>
                <div className="flex justify-between mb-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{item.label}</label>
                  <span className="text-white font-black">{(mentalForm as any)[item.key]}/10</span>
                </div>
                <input 
                  type="range" min="1" max="10" 
                  className={`w-full ${item.color}`}
                  value={(mentalForm as any)[item.key]} 
                  onChange={(e) => setMentalForm({ ...mentalForm, [item.key]: parseInt(e.target.value) })} 
                />
              </div>
            ))}
          </div>
          <div className="space-y-6 flex flex-col">
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Notas Subjetivas</label>
              <textarea 
                className="w-full h-48 bg-slate-950 border border-slate-800 p-6 rounded-[2rem] text-white outline-none focus:border-indigo-500 transition-all resize-none" 
                placeholder="¿Cómo te sientes hoy? ¿Algún factor externo que afecte tu rendimiento?..."
                value={mentalForm.notes} 
                onChange={(e) => setMentalForm({ ...mentalForm, notes: e.target.value })} 
              />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-6 rounded-3xl shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-all" disabled={isSavingMental}>
              {isSavingMental ? 'GUARDANDO...' : 'GUARDAR ESTADO'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'readiness'} onClose={() => setActiveModal(null)} title="Historial Readiness">
        <div className="h-[400px] w-full bg-slate-950/50 p-6 rounded-[2rem] border border-slate-800">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={inferenceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="target_date" stroke="#475569" />
              <YAxis domain={[0, 1]} stroke="#475569" />
              <Line type="monotone" dataKey="readiness_score" stroke="#f97316" strokeWidth={5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'steps'} onClose={() => setActiveModal(null)} title="Pasos">
        <div className="h-[400px] w-full bg-slate-950/50 p-6 rounded-[2rem] border border-slate-800">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={biometricTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke="#475569" tickFormatter={(str) => new Date(str).toLocaleDateString()} />
              <YAxis stroke="#475569" domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '1rem' }}
                formatter={(val: number) => [val.toLocaleString() + " pasos", "Pasos"]}
              />
              <Bar dataKey="steps" fill="#f97316" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'sleep'} onClose={() => setActiveModal(null)} title="Análisis de Sueño">
        <div className="h-[400px] w-full bg-slate-950/50 p-6 rounded-[2rem] border border-slate-800">
          <div className="flex justify-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#312e81]" />
              <span className="text-[10px] font-black uppercase text-slate-400">Profundo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#4338ca]" />
              <span className="text-[10px] font-black uppercase text-slate-400">REM</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#6366f1]" />
              <span className="text-[10px] font-black uppercase text-slate-400">Ligero</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#94a3b8]" />
              <span className="text-[10px] font-black uppercase text-slate-400">Despierto</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={biometricTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke="#475569" />
              <YAxis stroke="#475569" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '1rem' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              />
              <Bar dataKey="sleep_deep" name="Profundo" stackId="sleep" fill="#312e81" />
              <Bar dataKey="sleep_rem" name="REM" stackId="sleep" fill="#4338ca" />
              <Bar dataKey="sleep_light" name="Ligero" stackId="sleep" fill="#6366f1" />
              <Bar dataKey="sleep_awake" name="Despierto" stackId="sleep" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Modal>

      {/* Modal de Confirmación de Borrado "Bonito" */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Eliminación">
        <div className="text-center py-6">
          <div className="bg-danger/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 border border-danger/20">
            <Trash2 className="w-10 h-10 text-danger animate-pulse" />
          </div>
          <p className="text-xl font-bold text-white mb-2">¿Estás completamente seguro?</p>
          <p className="text-slate-400 mb-10 max-w-sm mx-auto">
            Esta acción eliminará permanentemente el log de actividad y recalculará tus métricas de fatiga. No se puede deshacer.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-5 rounded-3xl transition-all"
            >
              CANCELAR
            </button>
            <button 
              onClick={deleteActivity}
              className="flex-1 bg-danger hover:bg-red-600 text-white font-black py-5 rounded-3xl shadow-xl shadow-danger/20 transition-all"
            >
              SÍ, ELIMINAR
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default Dashboard
