import { useState, useEffect } from 'react'
import { Dumbbell, Trophy, Activity, Info, Save, Star, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:3001/api'

const Coach = () => {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [recommendation, setRecommendation] = useState<any>(null)
  const [techniques, setTechniques] = useState<any[]>([])
  const [showTechForm, setShowTechForm] = useState(false)
  
  // Feedback state
  const [feedback, setFeedback] = useState<any>(null)
  const [tachiSuccess, setTachiSuccess] = useState(false)
  const [neSuccess, setNeSuccess] = useState(false)
  const [feedbackNotes, setFeedbackNotes] = useState('')
  const [isSavingFeedback, setIsSavingFeedback] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Form states
  const [belt, setBelt] = useState('Blanco')
  const [weight, setWeight] = useState('-73kg')
  const [style, setStyle] = useState('')
  const [injuries, setInjuries] = useState('')
  const [goals, setGoals] = useState('')

  // Tech form state
  const [newTechName, setNewTechName] = useState('')
  const [newTechCat, setNewTechCat] = useState('Tachi-waza')
  const [newTechMastery, setNewTechMastery] = useState(3)

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/coach/profile`)
      if (res.data.profile) {
        const p = res.data.profile
        setProfile(p)
        setBelt(p.belt_rank)
        setWeight(p.weight_category)
        setStyle(p.preferred_style)
        setInjuries(p.injury_history)
        setGoals(p.goals)
        
        setLoading(false)
        fetchDataSecundario()
      } else {
        setLoading(false)
      }
    } catch (err) {
      console.error("Error fetching coach data:", err)
      setLoading(false)
    }
  }

  const fetchDataSecundario = async () => {
    try {
      const results = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/coach/recommendation`),
        axios.get(`${API_BASE_URL}/coach/techniques`),
        axios.get(`${API_BASE_URL}/coach/feedback/today`)
      ])
      
      if (results[0].status === 'fulfilled') setRecommendation(results[0].value.data)
      if (results[1].status === 'fulfilled') setTechniques(results[1].value.data)
      if (results[2].status === 'fulfilled' && results[2].value.data) {
        const feed = results[2].value.data
        setFeedback(feed)
        setTachiSuccess(feed.tachi_waza_success)
        setNeSuccess(feed.ne_waza_success)
        setFeedbackNotes(feed.notes || '')
      }
    } catch (err) {
      console.error("Error fetching technical data:", err)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [profile?.id])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Saving profile with data:", { belt, weight, style, injuries, goals })
    setIsSavingProfile(true)
    try {
      await axios.post(`${API_BASE_URL}/coach/profile`, {
        belt_rank: belt,
        weight_category: weight,
        preferred_style: style,
        injury_history: injuries,
        goals: goals
      })
      await fetchProfile()
      alert("Perfil actualizado correctamente.")
    } catch (err: any) {
      console.error("Error saving profile:", err)
      alert("Error al guardar el perfil: " + (err.response?.data?.error || err.message))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleAddTechnique = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post(`${API_BASE_URL}/coach/techniques`, {
        name: newTechName,
        category: newTechCat,
        mastery_level: newTechMastery
      })
      setNewTechName('')
      setNewTechMastery(3)
      setShowTechForm(false)
      fetchDataSecundario() // Recargar técnicas
    } catch (err) {
      console.error("Error adding technique:", err)
    }
  }

  const handleUpdateMastery = async (id: string, level: number) => {
    try {
      await axios.patch(`${API_BASE_URL}/coach/techniques/${id}`, {
        mastery_level: level
      })
      fetchDataSecundario()
    } catch (err) {
      console.error("Error updating mastery:", err)
    }
  }

  const [isGenerating, setIsGenerating] = useState(false)
  const [genStep, setGenStep] = useState(0)

  const handleGenerateRecommendation = async () => {
    setIsGenerating(true)
    setGenStep(1)
    
    // Simular pasos para feedback visual (la IA tarda 20-40s)
    const steps = [
      "Analizando biometría y ACWR...",
      "Recuperando historial de Randori...",
      "Consultando motor de IA Gemini...",
      "Sincronizando táctica diaria..."
    ]
    
    let currentStep = 0
    const interval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        currentStep++
        setGenStep(currentStep + 1)
      }
    }, 5000)

    try {
      const res = await axios.post(`${API_BASE_URL}/coach/recommendation/generate`)
      setRecommendation(res.data)
      setGenStep(0)
    } catch (err: any) {
      console.error("Error generating recommendation:", err)
      alert("Error al generar: " + (err.response?.data?.error || err.message))
    } finally {
      clearInterval(interval)
      setIsGenerating(false)
    }
  }

  const handleDeleteTechnique = async (id: string) => {
    console.log("DEBUG: Attempting to delete technique with ID:", id);
    try {
      const res = await axios.delete(`${API_BASE_URL}/coach/techniques/${id}`)
      console.log("DEBUG: Delete response:", res.data);
      // Actualizar estado local inmediatamente para feedback visual instantáneo
      setTechniques(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      console.error("DEBUG: Error deleting technique:", err)
    }
  }

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingFeedback(true)
    try {
      await axios.post(`${API_BASE_URL}/coach/feedback`, {
        tachi_waza_success: tachiSuccess,
        ne_waza_success: neSuccess,
        notes: feedbackNotes
      })
      const feedRes = await axios.get(`${API_BASE_URL}/coach/feedback/today`)
      setFeedback(feedRes.data)
    } catch (err) {
      console.error("Error saving feedback:", err)
    } finally {
      setIsSavingFeedback(false)
    }
  }

  if (loading) return <div className="text-white p-20 text-center animate-pulse uppercase font-black tracking-widest">Iniciando protocolo de entrenamiento...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {!profile ? (
        <section className="bg-slate-900/50 border border-slate-800 p-12 rounded-[3rem] shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-6 mb-10">
            <div className="bg-primary/20 p-4 rounded-3xl border border-primary/30">
              <Dumbbell className="text-primary w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Configuración Judoka</h1>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Protocolo de Onboarding Técnico</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase text-slate-500 ml-4">Grado (Cinturón)</label>
              <select 
                value={belt}
                onChange={(e) => setBelt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-5 rounded-[1.5rem] text-white outline-none focus:border-primary transition-all appearance-none"
              >
                <option value="Blanco">Blanco</option>
                <option value="Amarillo">Amarillo</option>
                <option value="Naranja">Naranja</option>
                <option value="Verde">Verde</option>
                <option value="Azul">Azul</option>
                <option value="Marrón">Marrón</option>
                <option value="Negro">Negro (Dan)</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase text-slate-500 ml-4">Categoría de Peso</label>
              <input 
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="ej: -81kg"
                className="w-full bg-slate-950 border border-slate-800 p-5 rounded-[1.5rem] text-white outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="text-xs font-black uppercase text-slate-500 ml-4">Estilo de Lucha / Tokui-Waza</label>
              <textarea 
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="ej: Especialista en Seoi-Nage, fuerte en Ne-waza..."
                className="w-full h-32 bg-slate-950 border border-slate-800 p-6 rounded-[2rem] text-white outline-none focus:border-primary transition-all resize-none"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="text-xs font-black uppercase text-slate-500 ml-4">Historial de Lesiones</label>
              <input 
                type="text"
                value={injuries}
                onChange={(e) => setInjuries(e.target.value)}
                placeholder="ej: Rodilla derecha operada, hombro inestable..."
                className="w-full bg-slate-950 border border-slate-800 p-5 rounded-[1.5rem] text-white outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="text-xs font-black uppercase text-slate-500 ml-4">Objetivos a Corto Plazo</label>
              <input 
                type="text"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="ej: Competir en el nacional, sacar el cinturón negro..."
                className="w-full bg-slate-950 border border-slate-800 p-5 rounded-[1.5rem] text-white outline-none focus:border-primary transition-all"
              />
            </div>

            <button 
              type="submit" 
              disabled={isSavingProfile}
              className={`md:col-span-2 bg-primary text-slate-950 font-black py-6 rounded-[2rem] flex items-center justify-center gap-3 hover:scale-[1.02] transition-all ${isSavingProfile ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save className="w-5 h-5" /> {isSavingProfile ? 'GUARDANDO...' : 'GUARDAR PERFIL TÁCTICO'}
            </button>
          </form>
        </section>
      ) : (
        <div className="space-y-12">
          {/* Header Resumen */}
          <div className="flex justify-between items-center bg-slate-900/40 p-8 rounded-[3rem] border border-slate-800">
            <div className="flex gap-6 items-center">
              <div className="w-16 h-16 bg-primary/10 border-2 border-primary/20 rounded-2xl flex items-center justify-center text-primary font-black text-2xl shadow-inner uppercase">
                {profile.belt_rank[0]}
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Judoka {profile.belt_rank}</h2>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">{profile.weight_category} | {profile.preferred_style}</p>
              </div>
            </div>
            <button 
              onClick={() => setProfile(null)}
              className="bg-slate-800/50 hover:bg-slate-800 p-4 rounded-2xl text-slate-400 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
            >
              <Info className="w-5 h-5" /> Editar Perfil
            </button>
          </div>

          {/* Recomendación Diaria */}
          {recommendation ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center px-4">
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-[0.3em]">Táctica Consolidada</h3>
                <button 
                  onClick={handleGenerateRecommendation}
                  disabled={isGenerating}
                  className="text-[9px] font-black uppercase tracking-widest bg-slate-800 hover:bg-primary hover:text-slate-950 px-4 py-2 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-slate-950 rounded-full animate-ping"></div>
                      {genStep === 1 ? 'Analizando...' : genStep === 2 ? 'Historial...' : genStep === 3 ? 'Gemini...' : 'Sincronizando...'}
                    </span>
                  ) : <><Activity className="w-3 h-3" /> Regenerar Táctica</>}
                </button>
              </div>
              <section className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-700">
                {/* ... (rest of recommendation section) ... */}
                <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] space-y-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                    <Activity className="w-20 h-20 text-primary" />
                  </div>
                  <span className="bg-primary/10 text-primary text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest border border-primary/20">
                    Foco Tachi-Waza (Pie)
                  </span>
                  <h3 className="text-3xl font-black text-white leading-tight uppercase tracking-tighter">
                    {recommendation.tachi_waza_focus}
                  </h3>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] space-y-6 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                    <Star className="w-20 h-20 text-blue-400" />
                  </div>
                  <span className="bg-blue-400/10 text-blue-400 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest border border-blue-400/20">
                    Foco Ne-Waza (Suelo)
                  </span>
                  <h3 className="text-3xl font-black text-white leading-tight uppercase tracking-tighter">
                    {recommendation.ne_waza_focus}
                  </h3>
                </div>

                <div className="md:col-span-2 bg-slate-950/50 border border-slate-800 p-8 rounded-[2.5rem] flex items-start gap-6">
                  <div className="bg-primary/20 p-3 rounded-2xl">
                    <AlertCircle className="text-primary w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-primary font-black uppercase text-[10px] tracking-widest block mb-1">Razonamiento Estratégico Aegis</span>
                    <p className="text-slate-300 text-sm leading-relaxed italic">"{recommendation.rationale}"</p>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 p-12 rounded-[3rem] text-center space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
                <Activity className={`w-10 h-10 text-primary ${isGenerating ? 'animate-spin' : 'animate-pulse'}`} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                  {isGenerating ? 'Sincronizando con Gemini' : 'No hay táctica para hoy'}
                </h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                  {isGenerating 
                    ? (genStep === 1 ? 'Analizando biometría y ACWR...' : genStep === 2 ? 'Recuperando historial de Randori...' : genStep === 3 ? 'Consultando motor de IA Gemini...' : 'Sincronizando táctica diaria...')
                    : 'Inicia el motor de IA para analizar tu estado biométrico y técnico'}
                </p>
              </div>
              <button 
                onClick={handleGenerateRecommendation}
                disabled={isGenerating}
                className={`bg-primary text-slate-950 font-black px-12 py-5 rounded-[2rem] uppercase tracking-widest hover:scale-[1.05] transition-all flex items-center gap-4 mx-auto ${isGenerating ? 'opacity-50' : ''}`}
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-4 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    ESTADO: {genStep * 25}%
                  </>
                ) : (
                  <>
                    <Dumbbell className="w-6 h-6" /> GENERAR TÁCTICA DIARIA
                  </>
                )}
              </button>
            </div>
          )}

          {/* Feedback de Randori */}
          {recommendation && (
            <section className="bg-slate-950 border border-slate-800 p-10 rounded-[3rem] space-y-8">
              <div className="flex items-center gap-4">
                <div className="bg-success/20 p-3 rounded-2xl">
                  <CheckCircle2 className="text-success w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Feedback de Randori</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">¿Has logrado aplicar el foco técnico hoy?</p>
                </div>
              </div>

              <form onSubmit={handleSaveFeedback} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button 
                    type="button"
                    onClick={() => setTachiSuccess(!tachiSuccess)}
                    className={`p-6 rounded-2xl border transition-all flex items-center justify-between group ${tachiSuccess ? 'bg-primary/20 border-primary text-primary' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                  >
                    <span className="font-black uppercase text-xs">Foco Pie Aplicado</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${tachiSuccess ? 'border-primary bg-primary' : 'border-slate-700'}`}>
                      {tachiSuccess && <CheckCircle2 className="w-4 h-4 text-slate-950" />}
                    </div>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setNeSuccess(!neSuccess)}
                    className={`p-6 rounded-2xl border transition-all flex items-center justify-between group ${neSuccess ? 'bg-blue-400/20 border-blue-400 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                  >
                    <span className="font-black uppercase text-xs">Foco Suelo Aplicado</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${neSuccess ? 'border-blue-400 bg-blue-400' : 'border-slate-700'}`}>
                      {neSuccess && <CheckCircle2 className="w-4 h-4 text-slate-950" />}
                    </div>
                  </button>
                </div>

                <textarea 
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  placeholder="Notas sobre las sensaciones, qué falló, qué funcionó..."
                  className="w-full h-32 bg-slate-900 border border-slate-800 p-6 rounded-[2rem] text-white outline-none focus:border-primary transition-all resize-none text-sm"
                />

                <button 
                  type="submit"
                  disabled={isSavingFeedback}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3"
                >
                  {isSavingFeedback ? 'GUARDANDO...' : feedback ? 'ACTUALIZAR FEEDBACK' : 'GUARDAR FEEDBACK'}
                </button>
              </form>
            </section>
          )}

          {/* Inventario Técnico */}
          <section className="bg-slate-900/30 border border-slate-800 p-10 rounded-[3rem]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-3">
                <Trophy className="text-primary w-5 h-5" /> Inventario Técnico
              </h3>
              <button 
                onClick={() => setShowTechForm(!showTechForm)}
                className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-slate-950 transition-all"
              >
                {showTechForm ? 'CANCELAR' : 'AÑADIR TÉCNICA'}
              </button>
            </div>

            {showTechForm && (
              <form onSubmit={handleAddTechnique} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-slate-950 p-6 rounded-3xl border border-slate-800 animate-in fade-in slide-in-from-top-4 duration-300">
                <input 
                  type="text" 
                  placeholder="Nombre técnica (ej: Osoto-gari)"
                  className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-sm outline-none focus:border-primary text-white"
                  value={newTechName}
                  onChange={(e) => setNewTechName(e.target.value)}
                  required
                />
                <select 
                  className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-sm outline-none focus:border-primary text-white"
                  value={newTechCat}
                  onChange={(e) => setNewTechCat(e.target.value)}
                >
                  <option value="Tachi-waza">Tachi-waza (Pie)</option>
                  <option value="Ne-waza">Ne-waza (Suelo)</option>
                </select>
                <select 
                  className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-sm outline-none focus:border-primary text-white"
                  value={newTechMastery}
                  onChange={(e) => setNewTechMastery(parseInt(e.target.value))}
                >
                  <option value="1">Maestría 1 (Novato)</option>
                  <option value="2">Maestría 2 (Básico)</option>
                  <option value="3">Maestría 3 (Intermedio)</option>
                  <option value="4">Maestría 4 (Avanzado)</option>
                  <option value="5">Maestría 5 (Tokui-Waza)</option>
                </select>
                <button type="submit" className="bg-primary text-slate-950 font-black rounded-xl text-[10px] uppercase">GUARDAR</button>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {techniques.map((tech) => (
                <div key={tech.id} className="flex justify-between items-center bg-slate-950/40 p-5 rounded-2xl border border-slate-800/50 group hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => handleDeleteTechnique(tech.id)}
                      className="p-2 text-slate-700 hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                      title="Eliminar técnica"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-600 block mb-0.5 tracking-widest">{tech.category}</span>
                      <p className="font-bold text-slate-200 uppercase text-xs tracking-tight">{tech.name}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button 
                        key={s} 
                        onClick={() => handleUpdateMastery(tech.id, s)}
                        className={`w-2.5 h-2.5 rounded-full transition-all hover:scale-125 ${s <= tech.mastery_level ? 'bg-primary shadow-[0_0_8px_rgba(255,87,51,0.4)]' : 'bg-slate-800'}`}
                      ></button>
                    ))}
                  </div>
                </div>
              ))}
              {techniques.length === 0 && (
                <p className="col-span-2 text-center py-10 text-slate-600 text-[10px] uppercase font-black tracking-[0.3em] italic border border-dashed border-slate-800 rounded-3xl">
                  Inicia tu inventario técnico para personalizar el coaching
                </p>
              )}
            </div>
          </section>

          {/* Métricas de Riesgo y Progreso */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Riesgo de Lesión (ACWR)</p>
                  <h4 className="text-3xl font-black text-white">
                    {recommendation?.acwr || '1.0'}
                  </h4>
                </div>
                <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase ${
                  (recommendation?.acwr || 1) > 1.5 ? 'bg-danger/20 text-danger border border-danger/30' :
                  (recommendation?.acwr || 1) > 1.3 ? 'bg-warning/20 text-warning border border-warning/30' :
                  'bg-success/20 text-success border border-success/30'
                }`}>
                  {(recommendation?.acwr || 1) > 1.5 ? 'Crítico' : (recommendation?.acwr || 1) > 1.3 ? 'Alto' : 'Óptimo'}
                </div>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    (recommendation?.acwr || 1) > 1.5 ? 'bg-danger' : (recommendation?.acwr || 1) > 1.3 ? 'bg-warning' : 'bg-success'
                  }`}
                  style={{ width: `${Math.min(100, (recommendation?.acwr || 1) * 50)}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-500 mt-4 leading-tight italic">
                {(recommendation?.acwr || 1) > 1.5 ? '¡PELIGRO! Carga aguda demasiado alta. Riesgo inminente de lesión.' : (recommendation?.acwr || 1) > 1.3 ? 'Atención: Estás en la zona de sobreesfuerzo.' : 'Carga de trabajo equilibrada. Sigue con el protocolo.'}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Puntos de Maestría Acumulados</p>
                  <h4 className="text-3xl font-black text-white">
                    {techniques.reduce((acc, t) => acc + t.mastery_level, 0)} <span className="text-sm text-slate-600">pts</span>
                  </h4>
                </div>
                <div className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-full text-[10px] font-black uppercase">
                  Camino al Dan
                </div>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-1000"
                  style={{ width: `${Math.min(100, (techniques.reduce((acc, t) => acc + t.mastery_level, 0) / 100) * 100)}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-500 mt-4 leading-tight italic">
                {techniques.length < 5 ? 'Añade más técnicas para completar tu repertorio base.' : 'Sigue perfeccionando tus técnicas para subir de grado.'}
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default Coach
