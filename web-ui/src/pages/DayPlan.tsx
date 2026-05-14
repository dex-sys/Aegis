import { useState, useEffect } from 'react'
import { Calendar, Send, CheckCircle2, Circle, Brain, Zap, Utensils, Coffee, Clock, Target, AlertTriangle, ChevronUp, ChevronDown, Edit3 } from 'lucide-react'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:3001/api'

const DayPlan = () => {
  const [briefing, setBriefing] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [planData, setPlanData] = useState<{plan: any, tasks: any[]}>({ plan: null, tasks: [] })
  const [loading, setLoading] = useState(true)

  const fetchPlan = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/plan/today`)
      setPlanData(res.data)
      if (res.data.plan && !briefing) {
        setBriefing(res.data.plan.raw_briefing)
      }
      // Colapsar automáticamente si ya hay un plan completado con tareas y no estamos editando
      if (res.data.plan?.status === 'completed' && res.data.tasks.length > 0 && !isGenerating && briefing) {
        setIsCollapsed(true)
      }
    } catch (err) {
      console.error("Error fetching plan:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlan()
    const interval = setInterval(fetchPlan, 5000) // Polling más frecuente (5s) para feedback de status
    return () => clearInterval(interval)
  }, [])

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!briefing.trim()) return
    
    // 1. Feedback inmediato local
    setIsGenerating(true)
    setPlanData(prev => ({
      ...prev,
      plan: { ...prev.plan, status: 'processing' }
    }))
    setIsCollapsed(true) // Colapsar para ver el cargador

    try {
      await axios.post(`${API_BASE_URL}/plan/generate`, { raw_briefing: briefing })
      // 2. Refrescar inmediatamente para sincronizar con el status del servidor
      await fetchPlan()
    } catch (err) {
      console.error("Error generating plan:", err)
      alert("Error al conectar con el servidor.")
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleTask = async (id: string, currentStatus: boolean) => {
    try {
      await axios.patch(`${API_BASE_URL}/plan/tasks/${id}/complete`, { is_completed: !currentStatus })
      fetchPlan()
    } catch (err) {
      console.error("Error toggling task:", err)
    }
  }

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'cognitive': return <Brain className="text-blue-400" />
      case 'physical': return <Zap className="text-orange-500" />
      case 'leisure': return <Coffee className="text-green-400" />
      case 'admin': return <Target className="text-purple-400" />
      default: return <Clock className="text-slate-400" />
    }
  }

  if (loading) return <div className="text-white p-20 text-center animate-pulse uppercase font-black tracking-widest">Cargando Misión...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {/* Header briefing collapsible */}
      <section className={`bg-slate-900/50 border border-slate-800 rounded-[3rem] shadow-2xl backdrop-blur-sm transition-all duration-500 overflow-hidden ${isCollapsed ? 'p-6' : 'p-10'}`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className={`font-black uppercase tracking-tighter text-white flex items-center gap-4 transition-all ${isCollapsed ? 'text-xl' : 'text-3xl'}`}>
            <Calendar className={`${isCollapsed ? 'w-5 h-5' : 'w-8 h-8'} text-primary transition-all`} /> 
            {isCollapsed ? 'Misión Activa' : 'Misión del Día'}
          </h1>
          
          {planData.plan && (
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="bg-slate-800/50 hover:bg-slate-800 p-3 rounded-2xl text-slate-400 hover:text-primary transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
            >
              {isCollapsed ? <><Edit3 className="w-4 h-4" /> Modificar Briefing</> : <><ChevronUp className="w-4 h-4" /> Minimizar</>}
            </button>
          )}
        </div>

        <div className={`transition-all duration-500 overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}`}>
          <form onSubmit={handleGeneratePlan} className="space-y-6">
            <textarea
              className="w-full h-32 bg-slate-950 border border-slate-800 p-6 rounded-[2rem] text-white outline-none focus:border-primary transition-all resize-none"
              placeholder="¿Qué tienes planeado para hoy? (ej: Estudiar termodinámica, judo a las 19h...)"
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={isGenerating || !briefing.trim() || planData.plan?.status === 'processing'} 
              className="w-full bg-primary text-slate-950 font-black py-6 rounded-[2rem] flex items-center justify-center gap-3 hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              <Send className="w-5 h-5" /> {isGenerating || planData.plan?.status === 'processing' ? 'ANALIZANDO CONTEXTO...' : 'GENERAR PLAN TÁCTICO'}
            </button>
          </form>
        </div>

        {isCollapsed && briefing && (
          <p className="text-slate-500 text-xs italic line-clamp-1 opacity-60">"{briefing}"</p>
        )}
      </section>

      {/* Estado de Generación / Timeline */}
      {planData.plan?.status === 'processing' || isGenerating ? (
        <div className="text-center py-24 bg-slate-900/20 rounded-[3rem] border border-dashed border-primary/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 animate-pulse"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin mx-auto mb-8"></div>
            <h2 className="text-primary font-black uppercase tracking-[0.3em] text-sm mb-3 animate-pulse">
              Analizando Perfil Biométrico
            </h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] max-w-xs mx-auto leading-relaxed">
              Aegis está cruzando tu briefing con niveles de fatiga, ACWR y recuperación de sueño...
            </p>
            <div className="mt-8 flex justify-center gap-2">
              <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1 h-1 bg-primary rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      ) : planData.plan?.status === 'error' ? (
        <div className="text-center py-20 bg-red-900/10 rounded-[3rem] border border-red-500/20">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 font-black uppercase tracking-widest text-xs">
            Error en el análisis táctico. Por favor, re-genera el plan.
          </p>
        </div>
      ) : planData.tasks.length > 0 ? (
        <section className="space-y-6 relative">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-slate-800 z-0"></div>
          
          {planData.tasks.map((task, index) => (
            <div key={task.id} className="relative z-10 flex gap-8 group">
              <div className="mt-1">
                <div className="w-16 h-16 bg-slate-950 border-4 border-slate-900 rounded-2xl flex items-center justify-center shadow-xl group-hover:border-primary transition-colors">
                  {getTaskIcon(task.type)}
                </div>
              </div>
              
              <div className={`flex-1 bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] transition-all hover:bg-slate-900/60 ${task.is_completed ? 'opacity-50' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1 block">
                      {task.scheduled_time.substring(0, 5)} — {task.type}
                    </span>
                    <h3 className={`text-xl font-bold text-white ${task.is_completed ? 'line-through decoration-primary' : ''}`}>
                      {task.title}
                    </h3>
                  </div>
                  <button 
                    onClick={() => toggleTask(task.id, task.is_completed)}
                    className="text-primary hover:scale-110 transition-transform"
                  >
                    {task.is_completed ? <CheckCircle2 className="w-8 h-8" /> : <Circle className="w-8 h-8 text-slate-700 hover:text-primary transition-colors" />}
                  </button>
                </div>
                
                <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 flex gap-3 items-start">
                  <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <span className="text-primary font-bold uppercase text-[9px] mr-2">Razonamiento Aegis:</span>
                    {task.ai_rationale}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : briefing && !isGenerating ? (
        <div className="text-center py-20 opacity-30">
           <p className="uppercase font-black text-sm tracking-[0.3em]">No se han podido generar tareas para este briefing</p>
        </div>
      ) : (
        <div className="text-center py-20 opacity-30">
          <Target className="w-20 h-20 mx-auto mb-6 text-slate-500" />
          <p className="uppercase font-black text-sm tracking-[0.3em]">Sin misión asignada para hoy</p>
        </div>
      )}
    </div>
  )
}

export default DayPlan
