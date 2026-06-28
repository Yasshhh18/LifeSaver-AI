import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Settings2, Sliders, Volume2, Sparkles, 
  ShieldAlert, Save, RefreshCw, CheckCircle2 
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { mockTasks, mockGoals, mockFocusSessions, mockProgressLogs, mockGarden } from '@/services/mockData'
import { createTask, createGoal, createFocusSession, upsertProgressLog } from '@/services/dataService'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/services/firebase'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'focus' | 'ai' | 'system'>('focus')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Settings State loaded from localStorage or defaults
  const [focusConfig, setFocusConfig] = useState({
    workDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    soundtrack: 'lofi',
    autoStartBreaks: true,
    autoStartSessions: false
  })

  const [aiConfig, setAiConfig] = useState({
    coachTone: 'mentor',
    userType: 'developer',
    frequency: 'balanced',
    voicePrompt: true,
    deadlineAlerts: true
  })

  const [systemConfig, setSystemConfig] = useState({
    theme: 'parchment',
    showConfetti: true,
    weeklyDigest: true
  })

  // Load from localStorage
  useEffect(() => {
    const savedFocus = localStorage.getItem('ls_focus')
    const savedAi = localStorage.getItem('ls_ai')
    const savedSystem = localStorage.getItem('ls_system')

    if (savedFocus) setFocusConfig(JSON.parse(savedFocus))
    if (savedAi) setAiConfig(JSON.parse(savedAi))
    if (savedSystem) setSystemConfig(JSON.parse(savedSystem))
  }, [isOpen])

  const triggerToast = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const handleSave = (section: string) => {
    if (section === 'focus') {
      localStorage.setItem('ls_focus', JSON.stringify(focusConfig))
      triggerToast('Timer and audio preferences updated! ⏱️')
      window.dispatchEvent(new Event('focus_settings_updated'))
    } else if (section === 'ai') {
      localStorage.setItem('ls_ai', JSON.stringify(aiConfig))
      triggerToast('AI Coach recalibrated! 🤖')
      window.dispatchEvent(new Event('ai_settings_updated'))
    } else if (section === 'system') {
      localStorage.setItem('ls_system', JSON.stringify(systemConfig))
      triggerToast('System preferences saved!')
      
      // Apply theme changes to document body if dark/light
      if (systemConfig.theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  const handleResetGarden = () => {
    if (window.confirm('Are you sure you want to reset your virtual garden? This will clear your plant count and streak, and cannot be undone.')) {
      localStorage.removeItem('ls_garden')
      triggerToast('Your Progress Garden has been reset to seed level. 🌱')
    }
  }

  const handleSeedData = async () => {
    if (!user) return;
    if (!window.confirm('This will add mock data to your account. Proceed?')) return;
    
    try {
      triggerToast('Seeding data... Please wait ⏳')
      
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

      // Expire AI Cache so it recalculates instantly
      await setDoc(doc(db, 'ai_cache', `${user.uid}_weekly_review`), { expires_at: new Date(0).toISOString() }, { merge: true })
      await setDoc(doc(db, 'ai_cache', `${user.uid}_productivity_insights`), { expires_at: new Date(0).toISOString() }, { merge: true })
      await setDoc(doc(db, 'ai_cache', `${user.uid}_daily_briefing`), { expires_at: new Date(0).toISOString() }, { merge: true })
      
      triggerToast('Mock data seeded successfully! 🚀 Please refresh the page.')
    } catch (err) {
      console.error(err);
      triggerToast('Error seeding data. Check console.')
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-white/95 border border-surface-container-high rounded-3xl w-full max-w-2xl max-h-[85vh] h-[85vh] md:h-[540px] shadow-large z-10 overflow-hidden flex flex-col relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-surface-container-high bg-surface-container-low/50">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary-700" />
                <h2 className="font-extrabold text-lg text-foreground">App Settings</h2>
              </div>
              <button 
                onClick={onClose} 
                className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar Navigation */}
              <div className="w-44 border-r border-surface-container-high p-4 flex flex-col gap-1 bg-surface-container-low/30">
                <button
                  onClick={() => setActiveTab('focus')}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'focus' 
                      ? 'bg-primary-50 text-primary-850 font-bold border-l-2 border-primary-600' 
                      : 'text-muted-foreground hover:bg-surface-container/50 hover:text-foreground'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  Focus Timer
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'ai' 
                      ? 'bg-primary-50 text-primary-855 font-bold border-l-2 border-primary-600' 
                      : 'text-muted-foreground hover:bg-surface-container/50 hover:text-foreground'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  AI Assistant
                </button>
                <button
                  onClick={() => setActiveTab('system')}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'system' 
                      ? 'bg-primary-50 text-primary-860 font-bold border-l-2 border-primary-600' 
                      : 'text-muted-foreground hover:bg-surface-container/50 hover:text-foreground'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  Preferences
                </button>
              </div>

              {/* Tab Viewport */}
              <div className="flex-1 overflow-y-auto p-6 bg-white">
                {/* 1. FOCUS TIMER TAB */}
                {activeTab === 'focus' && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="font-bold text-base text-foreground mb-1">Focus Timer Customization</h3>
                      <p className="text-xs text-muted-foreground">Adjust intervals and sounds to match your work rhythm</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1.5">Focus (Min)</label>
                        <input 
                          type="number" 
                          min="5" 
                          max="180"
                          value={focusConfig.workDuration}
                          onChange={(e) => setFocusConfig({ ...focusConfig, workDuration: parseInt(e.target.value) || 25 })}
                          className="input-base text-sm py-2 px-3"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1.5">Short Break</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="45"
                          value={focusConfig.shortBreak}
                          onChange={(e) => setFocusConfig({ ...focusConfig, shortBreak: parseInt(e.target.value) || 5 })}
                          className="input-base text-sm py-2 px-3"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1.5">Long Break</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="60"
                          value={focusConfig.longBreak}
                          onChange={(e) => setFocusConfig({ ...focusConfig, longBreak: parseInt(e.target.value) || 15 })}
                          className="input-base text-sm py-2 px-3"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <label className="block text-xs font-semibold text-foreground">Session Background Sound</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'none', label: '🔇 No Audio' },
                          { id: 'lofi', label: '🎧 Lofi Beats' },
                          { id: 'rain', label: '🌧️ Cozy Rain' },
                          { id: 'forest', label: '🌲 Forest Birds' },
                        ].map((sound) => (
                          <button
                            key={sound.id}
                            onClick={() => setFocusConfig({ ...focusConfig, soundtrack: sound.id })}
                            className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left ${
                              focusConfig.soundtrack === sound.id
                                ? 'bg-primary-50 text-primary-800 border-primary-400 shadow-sm'
                                : 'bg-white border-surface-container-high text-muted-foreground hover:bg-surface-container-low'
                            }`}
                          >
                            {sound.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-foreground">Auto-start Breaks</p>
                          <p className="text-[10px] text-muted-foreground">Instantly start rest when timer finishes</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={focusConfig.autoStartBreaks}
                          onChange={(e) => setFocusConfig({ ...focusConfig, autoStartBreaks: e.target.checked })}
                          className="w-4 h-4 rounded text-primary-600 border-surface-container-high accent-primary-700 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-foreground">Auto-start Sessions</p>
                          <p className="text-[10px] text-muted-foreground">Automatically loop back to work sessions</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={focusConfig.autoStartSessions}
                          onChange={(e) => setFocusConfig({ ...focusConfig, autoStartSessions: e.target.checked })}
                          className="w-4 h-4 rounded text-primary-600 border-surface-container-high accent-primary-700 cursor-pointer"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => handleSave('focus')}
                      className="btn-primary w-full text-sm py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 mt-2"
                    >
                      <Save className="w-4 h-4" /> Save Timer Settings
                    </button>
                  </div>
                )}

                {/* 2. AI ASSISTANT TAB */}
                {activeTab === 'ai' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-base text-foreground mb-1">AI Personalization</h3>
                      <p className="text-xs text-muted-foreground">Configure your AI persona and coaching companion</p>
                    </div>

                    {/* User Type Segment */}
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-foreground">My Profile Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'student', title: 'Student 🎓', desc: 'Focuses on courses, exams, & assignments' },
                          { id: 'developer', title: 'Developer 💻', desc: 'Focuses on coding, projects, & commits' },
                          { id: 'freelancer', title: 'Freelancer 💼', desc: 'Focuses on clients, contracts, & delivery' },
                          { id: 'entrepreneur', title: 'Entrepreneur 🚀', desc: 'Focuses on business growth & product MVPs' },
                        ].map((type) => (
                          <div 
                            key={type.id}
                            onClick={() => setAiConfig({ ...aiConfig, userType: type.id })}
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

                    {/* AI Personality Segment */}
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-foreground">AI Personality Mode</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'mentor', title: 'Zen Mentor 🌿', desc: 'Calm, supportive, and balanced advice.' },
                          { id: 'coach', title: 'No-Nonsense Coach ⚡', desc: 'Direct, metric-driven, and high energy.' },
                          { id: 'friend', title: 'Calm Friend 🤝', desc: 'Casual, friendly, and highly empathetic.' },
                          { id: 'manager', title: 'Strict Manager 👔', desc: 'Task-focused, formal, and deadline-obsessed.' },
                        ].map((tone) => (
                          <div 
                            key={tone.id}
                            onClick={() => setAiConfig({ ...aiConfig, coachTone: tone.id })}
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

                    {/* Settings Toggles */}
                    <div className="space-y-2 pt-2 border-t border-surface-container">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-foreground">Voice Prompt Reminders</p>
                          <p className="text-[10px] text-muted-foreground">Receive spoken tips during focus cycles</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={aiConfig.voicePrompt}
                          onChange={(e) => setAiConfig({ ...aiConfig, voicePrompt: e.target.checked })}
                          className="w-4 h-4 rounded text-primary-600 border-surface-container-high accent-primary-700 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-foreground">Active Deadline Forecasting</p>
                          <p className="text-[10px] text-muted-foreground">Alert me early if goals are falling behind schedule</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={aiConfig.deadlineAlerts}
                          onChange={(e) => setAiConfig({ ...aiConfig, deadlineAlerts: e.target.checked })}
                          className="w-4 h-4 rounded text-primary-600 border-surface-container-high accent-primary-700 cursor-pointer"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => handleSave('ai')}
                      className="btn-primary w-full text-sm py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Apply Coach Calibration
                    </button>
                  </div>
                )}

                {/* 3. PREFERENCES / SYSTEM TAB */}
                {activeTab === 'system' && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="font-bold text-base text-foreground mb-1">Preferences & Environment</h3>
                      <p className="text-xs text-muted-foreground">Adjust system preferences and reset workspace details</p>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-xs font-semibold text-foreground">Interface Theme</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'parchment', label: '🌾 Parchment' },
                          { id: 'light', label: '☀️ Classic' },
                          { id: 'dark', label: '🌲 Forest Dark' },
                        ].map((theme) => (
                          <button
                            key={theme.id}
                            onClick={() => setSystemConfig({ ...systemConfig, theme: theme.id })}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                              systemConfig.theme === theme.id
                                ? 'bg-primary-50 text-primary-800 border-primary-400 shadow-sm'
                                : 'bg-white border-surface-container-high text-muted-foreground hover:bg-surface-container-low'
                            }`}
                          >
                            {theme.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-foreground">Completion Celebration Confetti</p>
                          <p className="text-[10px] text-muted-foreground">Trigger confetti when completing primary tasks</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={systemConfig.showConfetti}
                          onChange={(e) => setSystemConfig({ ...systemConfig, showConfetti: e.target.checked })}
                          className="w-4 h-4 rounded text-primary-600 border-surface-container-high accent-primary-700 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-foreground">Weekly Digest Reports</p>
                          <p className="text-[10px] text-muted-foreground">Send detailed email summary of garden growth</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={systemConfig.weeklyDigest}
                          onChange={(e) => setSystemConfig({ ...systemConfig, weeklyDigest: e.target.checked })}
                          className="w-4 h-4 rounded text-primary-600 border-surface-container-high accent-primary-700 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-surface-container-high space-y-3">
                      <h4 className="font-bold text-xs text-red-700 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" /> Danger Zone
                      </h4>
                      <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-red-50/50 border border-red-200">
                        <div>
                          <p className="text-xs font-bold text-foreground">Reset virtual garden</p>
                          <p className="text-[10px] text-muted-foreground">Remove all flowers, trees, and progress stats</p>
                        </div>
                        <button 
                          onClick={handleResetGarden}
                          className="px-3 py-1.5 rounded-lg border border-red-300 text-xs font-semibold text-red-700 bg-white hover:bg-red-50 transition-colors flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3 h-3" /> Reset Garden
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-amber-50/50 border border-amber-200 mt-3">
                        <div>
                          <p className="text-xs font-bold text-foreground">Seed Mock Data</p>
                          <p className="text-[10px] text-muted-foreground">Populate your dashboard with sample data</p>
                        </div>
                        <button 
                          onClick={handleSeedData}
                          className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-semibold text-amber-700 bg-white hover:bg-amber-50 transition-colors flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3 h-3" /> Seed Data
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleSave('system')}
                      className="btn-primary w-full text-sm py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 mt-2"
                    >
                      <Save className="w-4 h-4" /> Save System Settings
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Notification Toast */}
            <AnimatePresence>
              {showToast && (
                <motion.div 
                  initial={{ opacity: 0, y: 50, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30, scale: 0.95 }}
                  className="absolute bottom-4 right-4 bg-primary-800 text-white font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-large border border-primary-700 text-xs z-50 animate-pulse-soft"
                >
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                  <span>{toastMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
