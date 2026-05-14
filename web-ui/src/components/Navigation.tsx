import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Utensils, Calendar, Dumbbell } from 'lucide-react'

const Navigation = () => {
  const location = useLocation()
  
  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/plan', label: 'Plan Operativo', icon: Calendar },
    { to: '/coach', label: 'Entrenador', icon: Dumbbell },
    { to: '/nutrition', label: 'Nutrición', icon: Utensils },
  ]

  return (
    <nav className="flex gap-2 mb-8 bg-slate-900/40 p-2 rounded-[2rem] border border-slate-800 w-fit">
      {links.map((link) => {
        const Icon = link.icon
        const isActive = location.pathname === link.to
        return (
          <Link
            key={link.to}
            to={link.to}
            className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black uppercase text-xs tracking-widest transition-all ${
              isActive 
                ? 'bg-primary text-slate-950 shadow-lg shadow-primary/20' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}

export default Navigation
