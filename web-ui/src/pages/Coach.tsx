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
    const interval = setInterval(() => {
      if (profile) fetchDataSecundario()
    }, 10000) // Poll cada 10s si ya hay perfil
    return () => clearInterval(interval)
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

  const handleDeleteTechnique = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta técnica de tu inventario?")) return
    try {
      await axios.delete(`${API_BASE_URL}/coach/techniques/${id}`)
      fetchDataSecundario()
    } catch (err) {
      console.error("Error deleting technique:", err)
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
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 p-10 rounded-[3rem] text-center animate-pulse">
              <p className="text-slate-500 font-black uppercase text-xs tracking-[0.3em]">Generando táctica diaria...</p>
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
                      className="p-2 text-slate-700 hover:text-danger hover:bg-danger/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
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

          {/* Próximas funcionalidades (Placeholders) */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/20 border border-slate-800/50 p-6 rounded-[2rem] text-center opacity-40 grayscale group cursor-not-allowed">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Riesgo Lesión</p>
              <div className="w-8 h-px bg-slate-800 mx-auto mb-2"></div>
              <p className="text-[9px] text-slate-600 uppercase font-bold">Monitorización ACWR</p>
            </div>
            <div className="bg-slate-900/20 border border-slate-800/50 p-6 rounded-[2rem] text-center opacity-40 grayscale group cursor-not-allowed">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Progreso Grados</p>
              <div className="w-8 h-px bg-slate-800 mx-auto mb-2"></div>
              <p className="text-[9px] text-slate-600 uppercase font-bold">Camino al Dan</p>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default Coach
