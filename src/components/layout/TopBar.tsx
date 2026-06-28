import { Menu, Bell, Search, Settings, AlertTriangle, CheckCircle2, Clock, Sparkles, Brain, ChevronDown } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { getTasks } from '@/services/dataService'
import type { Task } from '@/types/database'
import { formatRelativeDate } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'
import { mockTasks, mockGoals, mockFocusSessions, mockProgressLogs, mockGarden } from '@/services/mockData'
import { createTask, createGoal, createFocusSession, upsertProgressLog } from '@/services/dataService'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/services/firebase'

interface TopBarProps {
  onMenuClick: () => void
  onOpenSettings: () => void
  onOpenProfile: () => void
}

export default function TopBar({ onMenuClick, onOpenSettings, onOpenProfile }: TopBarProps) {
  const [profileName, setProfileName] = useState('Yash Patil')
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Task[]>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isAiDropdownOpen, setIsAiDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [aiConfig, setAiConfig] = useState({ userType: 'developer', coachTone: 'mentor' })
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSeeding, setIsSeeding] = useState(false)

  const handleSeedData = async () => {
    if (!user) return;
    if (!window.confirm('This will add mock data to your account. Proceed?')) return;
    
    setIsSeeding(true)
    try {
      toast('Seeding data... Please wait ⏳', 'info')
      
      await setDoc(doc(db, 'garden_progress', user.uid), { ...mockGarden, user_id: user.uid })
      
      for (const t of mockTasks) {
        const { id, created_at, updated_at, user_id, ...taskData } = t;
        await createTask({ ...taskData, user_id: user.uid });
      }
      
      for (const g of mockGoals) {
        const { id, created_at, updated_at, user_id, ...goalData } = g;
        await createGoal({ ...goalData, user_id: user.uid });
      }
      
      for (const fs of mockFocusSessions) {
        const { id, user_id, ...fsData } = fs;
        await createFocusSession({ ...fsData, user_id: user.uid });
      }
      
      for (const pl of mockProgressLogs) {
        const { id, user_id, created_at, date, ...plData } = pl;
        await upsertProgressLog(user.uid, date, plData);
      }

      await setDoc(doc(db, 'ai_cache', `${user.uid}_weekly_review`), { expires_at: new Date(0).toISOString() }, { merge: true })
      await setDoc(doc(db, 'ai_cache', `${user.uid}_productivity_insights`), { expires_at: new Date(0).toISOString() }, { merge: true })
      await setDoc(doc(db, 'ai_cache', `${user.uid}_daily_briefing`), { expires_at: new Date(0).toISOString() }, { merge: true })
      
      toast('Mock data seeded successfully! 🚀 Refreshing...', 'success')
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      console.error(err);
      toast('Error seeding data. Check console.', 'error')
    } finally {
      setIsSeeding(false)
    }
  }

  useEffect(() => {
    const loadNotifs = async () => {
      if (!user) return
      try {
        const tasks = await getTasks(user.uid)
        setAllTasks(tasks)
        // Find critical or high priority incomplete tasks
        const important = tasks.filter(t => t.status !== 'completed' && (t.priority === 'critical' || t.priority === 'high'))
        setNotifications(important)
      } catch (err) {
        console.error(err)
      }
    }
    loadNotifs()
    window.addEventListener('tasks_updated', loadNotifs)
    return () => window.removeEventListener('tasks_updated', loadNotifs)
  }, [user])

  useEffect(() => {
    const updateProfileName = () => {
      const savedProfile = localStorage.getItem('ls_profile')
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile)
          if (parsed.name) setProfileName(parsed.name)
        } catch (e) {
          console.error(e)
        }
      }
    }

    const loadAiConfig = () => {
      const savedAi = localStorage.getItem('ls_ai')
      if (savedAi) {
        try { setAiConfig(JSON.parse(savedAi)) } catch (e) {}
      }
    }

    updateProfileName()
    loadAiConfig()
    window.addEventListener('profile_updated', updateProfileName)
    window.addEventListener('ai_settings_updated', loadAiConfig)
    return () => {
      window.removeEventListener('profile_updated', updateProfileName)
      window.removeEventListener('ai_settings_updated', loadAiConfig)
    }
  }, [])

  const handleUpdateAiConfig = (key: string, value: string) => {
    const newConfig = { ...aiConfig, [key]: value }
    setAiConfig(newConfig as any)
    
    // Merge with existing full AI config to preserve other settings like voiceEnabled
    const savedAi = localStorage.getItem('ls_ai')
    let fullConfig = newConfig
    if (savedAi) {
      try { fullConfig = { ...JSON.parse(savedAi), ...newConfig } } catch (e) {}
    }
    localStorage.setItem('ls_ai', JSON.stringify(fullConfig))
    window.dispatchEvent(new Event('ai_settings_updated'))
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false)
        setIsNotificationsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const filteredTasks = allTasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const { pathname } = useLocation()
  
  const pageTitles: Record<string, { title: string; subtitle: string }> = {
    '/app/dashboard': { title: `Good morning, ${profileName.split(' ')[0] || 'User'} 👋`, subtitle: 'Here\'s what needs your focus today' },
    '/app/focus': { title: 'Focus Sessions', subtitle: 'Enter deep work mode' },
    '/app/goals': { title: 'My Goals', subtitle: 'Your path to what matters most' },
    '/app/garden': { title: 'Progress Garden', subtitle: 'Watch your effort bloom into results' },
    '/app/analytics': { title: 'Analytics', subtitle: 'Your productivity insights' },
    '/app/emergency': { title: '⚡ Save My Deadline™', subtitle: 'Emergency recovery mode — we\'ve got you' },
  }

  const page = pageTitles[pathname] || { title: 'LifeSaver AI', subtitle: '' }

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 border-b border-white/40 bg-white/45 backdrop-blur-md sticky top-0 z-30 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-surface-container transition-colors"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground leading-tight">{page.title}</h1>
          {page.subtitle && (
            <p className="text-xs text-muted-foreground">{page.subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* AI Persona Selector */}
        <div className="relative z-50">
          <button
            onClick={() => setIsAiDropdownOpen(!isAiDropdownOpen)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-container-high bg-white text-xs font-bold text-foreground hover:bg-surface-container transition-colors shadow-sm cursor-pointer"
          >
            <Brain className="w-3.5 h-3.5 text-primary-600" />
            <span className="capitalize">{aiConfig.userType}</span>
            <span className="text-muted-foreground mx-0.5">•</span>
            <span className="capitalize">{aiConfig.coachTone}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
          </button>

          <AnimatePresence>
            {isAiDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsAiDropdownOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-[420px] bg-white rounded-2xl shadow-xl border border-surface-container-high overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-surface-container bg-surface-container-low/50">
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary-600" /> AI Persona
                    </h3>
                  </div>
                  
                  <div className="p-3 space-y-4">
                    {/* Role */}
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">My Profile Type</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'student', title: 'Student 🎓', desc: 'Focuses on courses, exams, & assignments' },
                          { id: 'developer', title: 'Developer 💻', desc: 'Focuses on coding, projects, & commits' },
                          { id: 'freelancer', title: 'Freelancer 💼', desc: 'Focuses on clients, contracts, & delivery' },
                          { id: 'entrepreneur', title: 'Entrepreneur 🚀', desc: 'Focuses on business growth & product MVPs' },
                        ].map((type) => (
                          <div 
                            key={type.id}
                            onClick={() => handleUpdateAiConfig('userType', type.id)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                              aiConfig.userType === type.id
                                ? 'bg-primary-50/50 border-primary-500 shadow-sm'
                                : 'bg-white border-surface-container-high hover:bg-surface-container-low/50'
                            }`}
                          >
                            <p className="text-xs font-bold text-foreground">{type.title}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{type.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tone */}
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">AI Personality Mode</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'mentor', title: 'Zen Mentor 🌿', desc: 'Calm, supportive, and balanced advice.' },
                          { id: 'coach', title: 'No-Nonsense Coach ⚡', desc: 'Direct, metric-driven, and high energy.' },
                          { id: 'friend', title: 'Calm Friend 🤝', desc: 'Casual, friendly, and highly empathetic.' },
                          { id: 'manager', title: 'Strict Manager 👔', desc: 'Task-focused, formal, and deadline-obsessed.' },
                        ].map((tone) => (
                          <div 
                            key={tone.id}
                            onClick={() => handleUpdateAiConfig('coachTone', tone.id)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                              aiConfig.coachTone === tone.id
                                ? 'bg-primary-50/50 border-primary-500 shadow-sm'
                                : 'bg-white border-surface-container-high hover:bg-surface-container-low/50'
                            }`}
                          >
                            <p className="text-xs font-bold text-foreground">{tone.title}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{tone.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Search */}
        <div 
          onClick={() => setIsSearchOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-high text-sm text-muted-foreground cursor-pointer hover:bg-surface-container transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search...</span>
        </div>

        {/* Notifications */}
        <div className="relative z-50">
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white animate-pulse" />
            )}
          </button>

          <AnimatePresence>
            {isNotificationsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-surface-container-high overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-surface-container bg-surface-container-low/50">
                    <h3 className="font-bold text-sm text-foreground">Important Notifications</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2">
                    {notifications.length > 0 ? (
                      <div className="space-y-1">
                        {notifications.map(task => (
                          <div key={task.id} className="p-3 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer">
                            <div className="flex items-start gap-3">
                              <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${task.priority === 'critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-foreground leading-tight mb-1">{task.title}</p>
                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
                                  <span className="flex items-center gap-1 uppercase tracking-wider text-red-600 font-black"><AlertTriangle className="w-3 h-3" /> {task.priority}</span>
                                  {task.due_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due {formatRelativeDate(task.due_date)}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center px-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-bold text-foreground">You're all caught up!</p>
                        <p className="text-xs text-muted-foreground mt-1">No critical tasks pending.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Seed Data Button */}
        <button 
          onClick={handleSeedData}
          disabled={isSeeding}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors shadow-sm cursor-pointer ${isSeeding ? 'opacity-50' : ''}`}
          title="Seed Mock Data"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isSeeding ? 'Seeding...' : 'Seed Data'}
        </button>

        {/* Settings */}
        <button 
          onClick={onOpenSettings}
          className="p-2 rounded-lg hover:bg-surface-container transition-colors text-muted-foreground hover:text-foreground"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Avatar / Profile */}
        <button 
          onClick={onOpenProfile}
          className="w-8 h-8 rounded-full bg-forest-gradient flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity focus:outline-none"
          title="My Profile"
        >
          {profileName.charAt(0).toUpperCase()}
        </button>
      </div>

      {/* Global Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/20 backdrop-blur-sm" 
              onClick={() => setIsSearchOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden flex flex-col max-h-[70vh]"
            >
              <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-container-high">
                <Search className="w-5 h-5 text-primary-600" />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Search tasks, goals, or settings..."
                  className="flex-1 bg-transparent border-none outline-none text-lg text-foreground placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <kbd className="text-[10px] bg-surface-container px-2 py-1 rounded font-mono font-bold text-muted-foreground uppercase tracking-wider">ESC</kbd>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2">
                {searchQuery.trim() === '' ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <p className="text-sm">Type anything to start searching...</p>
                  </div>
                ) : filteredTasks.length > 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Tasks ({filteredTasks.length})</div>
                    {filteredTasks.map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'completed' ? 'bg-emerald-500' : 'bg-primary-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
                          )}
                        </div>
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded border border-surface-container-high text-muted-foreground">
                          {task.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-sm font-bold text-foreground">No results found</p>
                    <p className="text-xs text-muted-foreground mt-1">Try a different search term.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  )
}
