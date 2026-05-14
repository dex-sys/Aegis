import { useState, useEffect } from 'react'
import { Utensils, Save, Clock, Zap, Flame, Pill, Brain, ChevronRight, Activity, Plus, Trash2 } from 'lucide-react'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:3001/api'

const Nutrition = () => {
  console.log("DEBUG: Rendering Nutrition Page");
  const [mealText, setMealText] = useState("")
  const [isSavingMeal, setIsSavingMeal] = useState(false)
  const [nutritionLogs, setNutritionLogs] = useState<any[]>([])
  
  // Suplementos
  const [supplementForm, setSupplementForm] = useState({ name: "", amount: "", unit: "gr" })
  const [isSavingSupp, setIsSavingSupp] = useState(false)
  const [supplementLogs, setSupplementLogs] = useState<any[]>([])

  // Consejos IA
  const [advice, setAdvice] = useState<any>(null)
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false)
  const [adviceError, setAdviceError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      console.log("DEBUG: Fetching nutrition logs...");
      const [nutri, supp] = await Promise.all([
        axios.get(`${API_BASE_URL}/nutrition`),
        axios.get(`${API_BASE_URL}/supplements`)
      ])
      console.log("DEBUG: Received meals:", nutri.data.length);
      setNutritionLogs(nutri.data)
      setSupplementLogs(supp.data)
    } catch (err) {
      console.error("Error fetching nutrition/supplements:", err)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleMealSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mealText.trim()) return
    setIsSavingMeal(true)
    try {
      await axios.post(`${API_BASE_URL}/nutrition`, { raw_text: mealText })
      setMealText("")
      fetchData()
    } catch (err) {
      console.error("Error saving meal:", err)
    } finally {
      setIsSavingMeal(false)
    }
  }

  const deleteMeal = async (id: string) => {
    console.error("DEBUG: INICIANDO PETICIÓN DELETE PARA:", id);
    try {
      await axios.delete(`${API_BASE_URL}/nutrition/${id}`);
      console.log("DEBUG: DELETE EXITOSO EN SERVIDOR");
      
      // Forzamos una actualización del estado local inmediatamente para feedback visual
      setNutritionLogs(prev => prev.filter(log => log.id !== id));
      
      // Y refrescamos del servidor tras un breve instante
      setTimeout(fetchData, 500);
    } catch (err) {
      console.error("DEBUG: ERROR EN PETICIÓN DELETE:", err);
      alert("Error al borrar. Mira la consola.");
    }
  }

  const handleSuppSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplementForm.name || !supplementForm.amount) return
    setIsSavingSupp(true)
    try {
      await axios.post(`${API_BASE_URL}/supplements`, {
        item_name: supplementForm.name,
        amount: parseFloat(supplementForm.amount),
        unit: supplementForm.unit
      })
      setSupplementForm({ name: "", amount: "", unit: "gr" })
      fetchData()
    } catch (err) {
      console.error("Error saving supplement:", err)
    } finally {
      setIsSavingSupp(false)
    }
  }

  const generateAdvice = async () => {
    setIsGeneratingAdvice(true)
    setAdvice(null)
    setAdviceError(null)
    try {
      const res = await axios.get(`${API_BASE_URL}/nutrition/advice`)
      setAdvice(res.data)
    } catch (err: any) {
      console.error("Error generating advice:", err)
      setAdviceError("No se pudo conectar con el motor de inferencia. Verifica que el servidor API esté activo.")
    } finally {
      setIsGeneratingAdvice(false)
    }
  }

  const dailyTotals = Array.isArray(nutritionLogs) ? nutritionLogs
    .filter(log => log.timestamp && new Date(log.timestamp).toDateString() === new Date().toDateString())
    .reduce((acc, log) => ({
      kcal: acc.kcal + (Number(log.kcal) || 0),
      protein: acc.protein + (Number(log.protein_g) || 0),
      carbs: acc.carbs + (Number(log.carbs_g) || 0),
      fats: acc.fats + (Number(log.fats_g) || 0)
    }), { kcal: 0, protein: 0, carbs: 0, fats: 0 }) : { kcal: 0, protein: 0, carbs: 0, fats: 0 }

  return (
    <div className="space-y-12 pb-20">
      {/* Nutrition Summary */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 flex items-center gap-2">
            <Flame className="w-3 h-3 text-orange-500" /> Calorías Hoy
          </p>
          <p className="text-4xl font-black text-white">{dailyTotals.kcal} <span className="text-lg text-slate-600">kcal</span></p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl border-b-4 border-b-blue-500">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Proteínas</p>
          <p className="text-3xl font-black text-white">{dailyTotals.protein}g</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl border-b-4 border-b-green-500">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Carbohidratos</p>
          <p className="text-3xl font-black text-white">{dailyTotals.carbs}g</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl border-b-4 border-b-yellow-500">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Grasas</p>
          <p className="text-3xl font-black text-white">{dailyTotals.fats}g</p>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Left: Input Forms */}
        <div className="space-y-8">
          {/* Meal Form */}
          <div className="bg-slate-900/50 border border-slate-800 p-10 rounded-[3rem] shadow-2xl backdrop-blur-sm">
            <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-8 flex items-center gap-3">
              <Utensils className="text-primary w-6 h-6" /> Registro Comida
            </h2>
            <form onSubmit={handleMealSubmit} className="space-y-6">
              <textarea
                className="w-full h-40 bg-slate-950 border border-slate-800 p-6 rounded-[2rem] text-white outline-none focus:border-primary transition-all resize-none"
                placeholder="Ej: 200g pechuga pollo y arroz..."
                value={mealText}
                onChange={(e) => setMealText(e.target.value)}
              />
              <button type="submit" disabled={isSavingMeal} className="w-full bg-primary text-slate-950 font-black py-6 rounded-[2rem] flex items-center justify-center gap-3 hover:scale-[1.02] transition-all">
                <Save className="w-5 h-5" /> {isSavingMeal ? 'GUARDANDO...' : 'REGISTRAR'}
              </button>
            </form>
          </div>

          {/* Supplement Form */}
          <div className="bg-slate-900/50 border border-slate-800 p-10 rounded-[3rem] shadow-2xl backdrop-blur-sm">
            <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-8 flex items-center gap-3">
              <Pill className="text-indigo-400 w-6 h-6" /> Suplementos
            </h2>
            <form onSubmit={handleSuppSubmit} className="space-y-4">
              <input 
                type="text" placeholder="Suplemento (ej: Creatina)"
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none"
                value={supplementForm.name}
                onChange={(e) => setSupplementForm({...supplementForm, name: e.target.value})}
              />
              <div className="flex gap-4">
                <input 
                  type="number" placeholder="Cant."
                  className="flex-1 bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none"
                  value={supplementForm.amount}
                  onChange={(e) => setSupplementForm({...supplementForm, amount: e.target.value})}
                />
                <select 
                  className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none"
                  value={supplementForm.unit}
                  onChange={(e) => setSupplementForm({...supplementForm, unit: e.target.value})}
                >
                  <option value="gr">gr</option>
                  <option value="mg">mg</option>
                  <option value="ml">ml</option>
                  <option value="caps">caps</option>
                </select>
              </div>
              <button type="submit" disabled={isSavingSupp} className="w-full bg-indigo-600 text-white font-black py-6 rounded-[2rem] flex items-center justify-center gap-3 hover:scale-[1.02] transition-all">
                <Plus className="w-5 h-5" /> {isSavingSupp ? 'GUARDANDO...' : 'AÑADIR'}
              </button>
            </form>
          </div>
        </div>

        {/* Center/Right: IA Advice & Logs */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* IA Tactical Advice */}
          <div 
            onClick={() => !isGeneratingAdvice && generateAdvice()}
            className={`bg-indigo-900/20 border border-indigo-500/30 p-10 rounded-[3rem] shadow-2xl backdrop-blur-xl relative overflow-hidden group transition-all ${!isGeneratingAdvice ? 'cursor-pointer hover:border-indigo-500/50' : ''}`}
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <Brain className="w-32 h-32 text-indigo-400" />
            </div>
            
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                <Zap className="text-indigo-400 w-6 h-6 fill-indigo-400" /> Consejo Táctico
              </h2>
              <button 
                onClick={generateAdvice}
                disabled={isGeneratingAdvice}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-indigo-500/20"
              >
                {isGeneratingAdvice ? 'CONSULTANDO...' : 'GENERAR AHORA'}
              </button>
            </div>

            {isGeneratingAdvice ? (
              <div className="text-center py-12 relative z-10 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-indigo-400 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
                  Aegis está procesando tus métricas biológicas...
                </p>
              </div>
            ) : adviceError ? (
              <div className="text-center py-10 relative z-10 animate-in fade-in duration-300">
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem]">
                  <p className="text-red-400 font-black uppercase tracking-widest text-[10px] mb-2">Error de Sistema</p>
                  <p className="text-slate-300 text-sm">{adviceError}</p>
                </div>
              </div>
            ) : advice ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-slate-950/60 p-6 rounded-[2rem] border border-indigo-500/20">
                  <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] mb-3">Próxima Comida</p>
                  <p className="text-xl font-bold text-white leading-snug">{advice.food_recommendation}</p>
                </div>
                <div className="bg-slate-950/60 p-6 rounded-[2rem] border border-indigo-500/20">
                  <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] mb-3">Suplementación</p>
                  <p className="text-xl font-bold text-white leading-snug">{advice.supplement_recommendation}</p>
                </div>
                <div className="md:col-span-2 bg-indigo-500/10 p-6 rounded-[2rem] border border-indigo-500/20 italic">
                  <p className="text-sm text-indigo-200">"{advice.rationale}"</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 opacity-40">
                <p className="uppercase font-black text-xs tracking-widest">Haz clic en generar para recibir instrucciones de Aegis</p>
              </div>
            )}
          </div>

          {/* Combined Logs List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Meal Logs */}
            <div className="space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-4">
                <Utensils className="w-4 h-4 text-primary" /> Historial Comidas
              </h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {Array.isArray(nutritionLogs) && nutritionLogs.map(log => (
                  <div key={log.id} className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl group relative transition-all hover:border-slate-700">
                    <div className="flex justify-between items-start mb-2 mr-10">
                      <div className="flex items-center gap-2 text-primary">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">
                          {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mb-4 italic pr-8">"{log.raw_text}"</p>

                    {/* Botón de Borrado con debug directo */}
                    <button 
                      type="button"
                      onClick={(e) => {
                        console.error("BUTTON CLICKED FOR:", log.id);
                        e.stopPropagation();
                        e.preventDefault();
                        deleteMeal(log.id);
                      }}
                      className="absolute top-4 right-4 p-2 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all z-[999] cursor-pointer shadow-sm border border-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex justify-between items-end mr-2">
                      <span className="text-2xl font-black text-white">{log.kcal} <span className="text-[10px] text-slate-600">KCAL</span></span>
                      <div className="flex gap-2">
                        {['protein_g', 'carbs_g', 'fats_g'].map(m => (
                          <span key={m} className="text-[8px] bg-slate-800 px-2 py-1 rounded-lg text-slate-300 uppercase font-bold">{log[m]}g</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {(!Array.isArray(nutritionLogs) || nutritionLogs.length === 0) && (
                  <p className="text-center text-slate-600 text-xs py-10 uppercase font-black italic">Sin registros de comida</p>
                )}
              </div>
            </div>

            {/* Supplement Logs */}
            <div className="space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-4">
                <Pill className="w-4 h-4 text-indigo-400" /> Suplementos Hoy
              </h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {supplementLogs.map(log => (
                  <div key={log.id} className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl flex justify-between items-center">
                    <div>
                      <p className="text-sm font-black text-white uppercase tracking-tight">{log.item_name}</p>
                      <p className="text-[10px] text-slate-500 font-bold">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-indigo-400">{log.amount}{log.unit}</span>
                    </div>
                  </div>
                ))}
                {supplementLogs.length === 0 && (
                  <p className="text-center text-slate-600 text-xs py-10 uppercase font-black italic">Sin suplementación</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default Nutrition
