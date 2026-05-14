import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Zap } from 'lucide-react'
import Navigation from './components/Navigation'
import Dashboard from './pages/Dashboard'
import Nutrition from './pages/Nutrition'
import DayPlan from './pages/DayPlan'
import Coach from './pages/Coach'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 p-4 md:p-12 text-slate-100 selection:bg-primary/30 font-sans">
        {/* Shared Aegis Header */}
        <header className="mb-12">
          <h1 className="text-5xl font-black text-white tracking-tight flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-2xl border border-primary/20">
              <Zap className="text-primary w-10 h-10 fill-primary/10" />
            </div>
            PROYECTO <span className="text-primary">AEGIS</span>
          </h1>
          <p className="text-slate-400 mt-3 font-semibold tracking-wide uppercase text-sm">
            Quantified Self <span className="text-slate-600">|</span> Decision Support System
          </p>
        </header>

        <Navigation />

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/plan" element={<DayPlan />} />
          <Route path="/coach" element={<Coach />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
