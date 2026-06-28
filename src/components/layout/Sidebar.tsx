import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Target, Leaf, BarChart3,
  Timer, Zap, X, Sparkles, Settings, Brain
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
  { label: 'Focus', path: '/app/focus', icon: Timer },
  { label: 'Goals', path: '/app/goals', icon: Target },
  { label: 'My Garden', path: '/app/garden', icon: Leaf },
  { label: 'AI Coach', path: '/app/ai', icon: Brain },
  { label: 'Analytics', path: '/app/analytics', icon: BarChart3 },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onOpenSettings: () => void
  onOpenProfile: () => void
}

export default function Sidebar({ isOpen, onClose, onOpenSettings, onOpenProfile }: SidebarProps) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState({ name: 'User', email: 'No email' })
  const [gardenLevel, setGardenLevel] = useState(1)

  useEffect(() => {
    const updateProfile = () => {
      const savedProfile = localStorage.getItem('ls_profile')
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile)
          setProfile({
            name: parsed.name || 'User',
            email: parsed.email || 'No email'
          })
        } catch (e) {
          console.error(e)
        }
      }
    }

    const updateGarden = () => {
      const savedGarden = localStorage.getItem('ls_garden')
      if (savedGarden) {
        try {
          const parsed = JSON.parse(savedGarden)
          if (parsed.level) setGardenLevel(parsed.level)
        } catch (e) {}
      }
    }

    updateProfile()
    updateGarden()
    window.addEventListener('profile_updated', updateProfile)
    window.addEventListener('garden_updated', updateGarden)
    return () => {
      window.removeEventListener('profile_updated', updateProfile)
      window.removeEventListener('garden_updated', updateGarden)
    }
  }, [])

  const sidebarContent = (
    <div className="flex flex-col h-full w-full bg-white border-r border-surface-container-high overflow-hidden">
      {/* Logo */}
      <div className="flex items-center justify-between p-5 border-b border-surface-container-high">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-forest-gradient flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm text-foreground">LifeSaver</span>
            <span className="text-xs font-label text-primary-700 block leading-none">AI</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-surface-container transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => onClose()}
            className={({ isActive }) =>
              cn('sidebar-item group', isActive && 'active')
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn(
                  'w-4.5 h-4.5 flex-shrink-0',
                  isActive ? 'text-primary-700' : 'text-muted-foreground group-hover:text-primary-700'
                )} />
                <span>{item.label}</span>
                {item.label === 'My Garden' && (
                  <span className="ml-auto text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-label">
                    Lv {gardenLevel}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Settings Button */}
        <button
          onClick={() => { onOpenSettings(); onClose(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer text-muted-foreground hover:bg-surface-container/50 hover:text-foreground mt-2"
        >
          <Settings className="w-4.5 h-4.5 flex-shrink-0" />
          <span>Settings</span>
        </button>
      </nav>

      {/* Emergency CTA */}
      <div className="p-4 border-t border-surface-container-high">
        <button
          onClick={() => { navigate('/app/emergency'); onClose() }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group"
          style={{
            background: 'linear-gradient(135deg, rgba(186,26,26,0.08) 0%, rgba(244,132,58,0.08) 100%)',
            border: '1px solid rgba(186,26,26,0.2)',
            color: '#ba1a1a',
          }}
        >
          <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Save My Deadline™
        </button>
      </div>

      {/* User card */}
      <div className="p-4 border-t border-surface-container-high">
        <div 
          onClick={() => { onOpenProfile(); onClose(); }}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
          title="My Profile"
        >
          <div className="w-8 h-8 rounded-full bg-forest-gradient flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{profile.name}</p>
            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 w-72 z-50 lg:hidden shadow-large"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
