import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import SettingsModal from './SettingsModal'
import ProfileModal from './ProfileModal'
import AskLifeSaver from './AskLifeSaver'
import { useState, useEffect, useRef } from 'react'
import { Sparkles, Mic, MicOff, Send, X, Brain, Zap, Loader2, ChevronDown, AlertTriangle, Info, ShieldAlert } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { createTask } from '@/services/dataService'
import { chatWithAI } from '@/services/geminiService'
import { generateWhatShouldIDoNow } from '@/services/geminiService'
import { ProactiveEngine } from '@/services/proactiveEngine'
import type { NextAction, ProactiveNotification } from '@/types/database'

export default function AppLayout() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  const navigate = useNavigate()
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle')
  const [sageVoiceReply, setSageVoiceReply] = useState('')
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null)
  const [manualCommand, setManualCommand] = useState('')
  // What Should I Do Now?
  const [whatNowOpen, setWhatNowOpen] = useState(false)
  const [whatNowLoading, setWhatNowLoading] = useState(false)
  const [whatNowResult, setWhatNowResult] = useState<NextAction | null>(null)

  // ─── Proactive Notification System ──────────────────────────────────────────
  const [proactiveNotifications, setProactiveNotifications] = useState<ProactiveNotification[]>([])
  const [expandedReasoning, setExpandedReasoning] = useState<string | null>(null)

  // Initialize Proactive Engine when user is available
  useEffect(() => {
    if (!user) return
    const engine = ProactiveEngine.getInstance()
    engine.initialize(user.uid)

    // Listen for proactive notifications
    const handleNotification = (e: Event) => {
      const notification = (e as CustomEvent<ProactiveNotification>).detail
      setProactiveNotifications(prev => {
        const updated = [notification, ...prev].slice(0, 3) // max 3
        return updated
      })

      // Auto-dismiss after 15 seconds
      setTimeout(() => {
        setProactiveNotifications(prev => prev.filter(n => n.id !== notification.id))
      }, 15000)
    }

    window.addEventListener('proactive_notification', handleNotification)

    return () => {
      engine.destroy()
      window.removeEventListener('proactive_notification', handleNotification)
    }
  }, [user])

  const dismissNotification = (id: string) => {
    setProactiveNotifications(prev => prev.filter(n => n.id !== id))
  }

  const speak = (text: string, onEnd?: () => void) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      setSageVoiceReply(text)
      setVoiceStatus('speaking')

      utterance.onend = () => {
        if (onEnd) onEnd()
      }
      utterance.onerror = () => {
        if (onEnd) onEnd()
      }

      const voices = window.speechSynthesis.getVoices()
      const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Calming') || v.lang.startsWith('en'))
      if (preferredVoice) utterance.voice = preferredVoice
      utterance.rate = 0.95
      utterance.pitch = 1.05
      window.speechSynthesis.speak(utterance)
    } else {
      setSageVoiceReply(text)
      setVoiceStatus('idle')
      if (onEnd) setTimeout(onEnd, 3000)
    }
  }

  const handleProcessVoiceCommand = (command: string) => {
    setVoiceStatus('processing')
    const lower = command.toLowerCase().trim()

    if (lower.includes('focus') || lower.includes('pomodoro') || lower.includes('study')) {
      speak("Navigating to Focus Mode. Let's block out distractions.", () => {
        setIsVoiceActive(false)
        navigate('/app/focus')
      })
      return
    }
    if (lower.includes('garden') || lower.includes('tree') || lower.includes('plant')) {
      speak("Opening your garden sanctuary. Let's see how the tree of life is doing.", () => {
        setIsVoiceActive(false)
        navigate('/app/garden')
      })
      return
    }
    if (lower.includes('emergency') || lower.includes('deadline') || lower.includes('save me')) {
      speak("Activating emergency mode! Breathe easy, let's secure your deliverables.", () => {
        setIsVoiceActive(false)
        navigate('/app/emergency')
      })
      return
    }
    if (lower.includes('dashboard') || lower.includes('home') || lower.includes('back')) {
      speak("Opening your main dashboard.", () => {
        setIsVoiceActive(false)
        navigate('/app/dashboard')
      })
      return
    }
    if (lower.includes('goals') || lower.includes('target') || lower.includes('milestone')) {
      speak("Opening your goals list.", () => {
        setIsVoiceActive(false)
        navigate('/app/goals')
      })
      return
    }
    if (lower.includes('companion') || lower.includes('coach') || lower.includes('talk to sage') || lower.includes('chat sage')) {
      speak("Opening the AI Coach Companion Hub.", () => {
        setIsVoiceActive(false)
        navigate('/app/ai')
      })
      return
    }

    if (lower.includes('water') || lower.includes('water tree')) {
      const raw = localStorage.getItem('ls_garden')
      let garden = raw ? JSON.parse(raw) : { level: 1, xp: 0, current_streak: 0, total_plants: 0 }
      garden.xp = (garden.xp || 0) + 500
      localStorage.setItem('ls_garden', JSON.stringify(garden))
      window.dispatchEvent(new Event('garden_updated'))
      speak("Watering completed. Your tree absorbs the light! +500 XP gained.", () => {
        setVoiceStatus('idle')
      })
      return
    }

    const addTaskTrigger = ['add task', 'create task', 'add a task', 'add a tas']
    const triggered = addTaskTrigger.find(t => lower.includes(t))

    if (triggered) {
      let title = lower.split(triggered)[1]?.trim()
      if (!title || title.length < 2) title = 'New task'

      title = title.charAt(0).toUpperCase() + title.slice(1)
      const priorityOptions = ['low', 'medium', 'high', 'critical']
      const randomPriority = priorityOptions[Math.floor(Math.random() * priorityOptions.length)] as any

      if (user) {
        createTask({
          user_id: user.uid,
          title,
          description: 'Added via Sage Voice AI Command',
          status: 'todo',
          priority: randomPriority,
          tags: []
        }).then(() => {
          window.dispatchEvent(new Event('tasks_updated'))
          speak(`Task added successfully: "${title}". I've queued it into your list.`, () => {
            setVoiceStatus('idle')
          })
        }).catch(err => {
          console.error('Voice task add error:', err)
          speak("Sorry, I had trouble adding the task to your database. Please try again.", () => {
            setVoiceStatus('idle')
          })
        })
      } else {
        speak("I couldn't add the task because you are not logged in.", () => setVoiceStatus('idle'))
      }
      return
    }

    if (user) {
      const voicePrompt = command + '\n\n(IMPORTANT: Keep your response short, conversational, and under 2 sentences since this is being spoken out loud via voice.)'
      chatWithAI(user.uid, voicePrompt, [])
        .then(reply => {
          speak(reply, () => setVoiceStatus('idle'))
        })
        .catch(err => {
          console.error('Voice AI chat error:', err)
          speak("I had a little trouble connecting to my brain. Please try again.", () => setVoiceStatus('idle'))
        })
    } else {
      speak("I hear you. Focus is a muscle — let's work on one small thing next.", () => setVoiceStatus('idle'))
    }
  }

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const rec = new SpeechRecognition()
      rec.continuous = false
      rec.interimResults = false
      rec.lang = 'en-US'

      rec.onstart = () => {
        setVoiceStatus('listening')
        setVoiceText('Listening… speak now')
        setSageVoiceReply('')
      }
      rec.onerror = (e: any) => {
        console.error(e)
        setVoiceStatus('idle')
        setVoiceText('Voice error occurred. Try again or type below.')
      }
      rec.onend = () => {
        setVoiceStatus(prev => prev === 'listening' ? 'idle' : prev)
      }
      rec.onresult = (event: any) => {
        const result = event.results[0][0].transcript
        setVoiceText(result)
        handleProcessVoiceCommand(result)
      }
      setRecognitionInstance(rec)
    }
  }, [])

  const handleStartVoice = () => {
    if (recognitionInstance) {
      try {
        recognitionInstance.start()
      } catch (e) {
        console.error(e)
      }
    } else {
      setVoiceStatus('idle')
      setVoiceText('Voice recognition is not supported in this browser. Try typing below.')
    }
  }

  const handleStopVoice = () => {
    if (recognitionInstance) {
      recognitionInstance.stop()
    }
    setVoiceStatus('idle')
  }

  useEffect(() => {
    if (isVoiceActive) {
      const t = setTimeout(() => {
        handleStartVoice()
      }, 400)
      return () => clearTimeout(t)
    } else {
      handleStopVoice()
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [isVoiceActive])

  useEffect(() => {
    const handleOpenVoice = () => setIsVoiceActive(true)
    window.addEventListener('open_voice_ai', handleOpenVoice)
    return () => window.removeEventListener('open_voice_ai', handleOpenVoice)
  }, [recognitionInstance])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCommand.trim()) return
    const cmd = manualCommand.trim()
    setManualCommand('')
    setVoiceText(cmd)
    handleProcessVoiceCommand(cmd)
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Ambient background glassmorphism blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Top right green blob */}
          <div className="absolute top-[-10%] right-[5%] w-[450px] h-[450px] rounded-full bg-primary-200/20 blur-[130px] animate-pulse-soft" />
          {/* Top left warm orange blob */}
          <div className="absolute top-[5%] left-[-5%] w-[380px] h-[380px] rounded-full bg-secondary-200/15 blur-[110px] animate-float-delayed" />
          {/* Middle sky blue blob */}
          <div className="absolute top-[25%] left-[30%] w-[350px] h-[350px] rounded-full bg-tertiary-200/15 blur-[120px] animate-float" />
        </div>

        <main className="flex-1 overflow-y-auto relative z-10 pb-24 lg:pb-0">
          <TopBar
            onMenuClick={() => setSidebarOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenProfile={() => setProfileOpen(true)}
          />
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Profile Modal */}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* ── Proactive AI Notification Cards ── */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3 max-w-[380px] w-full pointer-events-none">
        <AnimatePresence mode="popLayout">
          {proactiveNotifications.map((notification) => {
            const severityStyles = {
              info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: <Info className="w-4 h-4 text-blue-600" />, accent: 'text-blue-700' },
              warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: <AlertTriangle className="w-4 h-4 text-amber-600" />, accent: 'text-amber-700' },
              critical: { bg: 'bg-red-50', border: 'border-red-200', icon: <ShieldAlert className="w-4 h-4 text-red-600" />, accent: 'text-red-700' },
            }
            const style = severityStyles[notification.severity]

            return (
              <motion.div
                key={notification.id}
                layout
                initial={{ opacity: 0, x: -80, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -80, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className={`pointer-events-auto rounded-2xl p-4 ${style.bg} ${style.border} border shadow-xl backdrop-blur-md`}
              >
                {/* Header */}
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex-shrink-0">{style.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-bold ${style.accent} truncate`}>{notification.title}</p>
                      <button
                        onClick={() => dismissNotification(notification.id)}
                        className="w-5 h-5 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 cursor-pointer flex-shrink-0"
                      >
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{notification.message}</p>
                  </div>
                </div>

                {/* Expandable Reasoning */}
                <button
                  onClick={() => setExpandedReasoning(expandedReasoning === notification.id ? null : notification.id)}
                  className="flex items-center gap-1 mt-2 text-[10px] font-bold text-muted-foreground/70 hover:text-muted-foreground cursor-pointer transition-colors"
                >
                  <Brain className="w-3 h-3" />
                  Why?
                  <ChevronDown className={`w-3 h-3 transition-transform ${expandedReasoning === notification.id ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {expandedReasoning === notification.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-[10px] text-muted-foreground/80 mt-1.5 leading-relaxed italic bg-black/[0.03] rounded-lg p-2">
                        {notification.reasoning}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Button */}
                {notification.action && (
                  <button
                    onClick={() => {
                      dismissNotification(notification.id)
                      navigate(notification.action!.route)
                    }}
                    className={`mt-2.5 w-full py-2 rounded-xl text-xs font-bold ${style.bg} ${style.accent} border ${style.border} hover:opacity-80 transition-all cursor-pointer flex items-center justify-center gap-1.5`}
                  >
                    <Zap className="w-3 h-3" />
                    {notification.action.label}
                  </button>
                )}

                {/* Sage AI Badge */}
                <div className="flex items-center gap-1 mt-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500/20 flex items-center justify-center text-[6px]">🌿</div>
                  <span className="text-[8px] font-bold text-emerald-700/50 uppercase tracking-wider">Sage AI Agent</span>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Floating AI Action Buttons */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        {/* What Should I Do Now? */}
        <button
          onClick={async () => {
            if (!user) return
            setWhatNowOpen(true)
            setWhatNowLoading(true)
            setWhatNowResult(null)
            try {
              const result = await generateWhatShouldIDoNow(user.uid)
              setWhatNowResult(result)
            } catch (err) {
              console.error('What Now failed:', err)
            } finally {
              setWhatNowLoading(false)
            }
          }}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl rounded-full w-12 h-12 flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer border border-indigo-500/20"
          style={{ boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)' }}
          title="What should I do now?"
        >
          <Zap className="w-5 h-5" />
        </button>

        {/* Floating Voice Assistant Button */}
        <button
          onClick={() => setIsVoiceActive(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xl rounded-full w-12 h-12 flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer border border-emerald-500/20"
          style={{ boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)' }}
          title="Talk to Sage (Voice AI)"
        >
          <Mic className="w-5 h-5 animate-pulse-soft" />
        </button>

        {/* Floating AI Text Assistant Button */}
        <button
          onClick={() => setAskOpen(!askOpen)}
          className="bg-forest-gradient text-white shadow-large rounded-full px-4 py-3.5 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-glow-green font-bold text-xs cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-accent animate-pulse-soft" />
          Ask LifeSaver
        </button>
      </div>

      {/* "What Now?" Result Overlay */}
      <AnimatePresence>
        {whatNowOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setWhatNowOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-surface-container-high bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-black text-sm text-foreground">What Should I Do Now?</h3>
                </div>
                <button onClick={() => setWhatNowOpen(false)} className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6">
                {whatNowLoading ? (
                  <div className="flex flex-col items-center py-8">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                    <p className="text-sm font-bold text-foreground">Analyzing your priorities...</p>
                    <p className="text-xs text-muted-foreground mt-1">Sage is reviewing all your tasks and deadlines</p>
                  </div>
                ) : whatNowResult ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl p-4 bg-indigo-50 border border-indigo-200">
                      <p className="text-xs font-black uppercase tracking-wider text-indigo-600 mb-1">Do This Now</p>
                      <p className="text-base font-black text-foreground">{whatNowResult.task_title}</p>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{whatNowResult.reasoning}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                        <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Risk Reduction</p>
                        <p className="text-lg font-black text-emerald-700">{whatNowResult.risk_reduction_percent}%</p>
                      </div>
                      <div className="flex-1 rounded-xl bg-blue-50 border border-blue-200 p-3 text-center">
                        <p className="text-[9px] font-black uppercase tracking-wider text-blue-600">Est. Time</p>
                        <p className="text-lg font-black text-blue-700">{whatNowResult.estimated_minutes}m</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setWhatNowOpen(false); navigate('/app/focus') }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Zap className="w-4 h-4" /> Start Focus Session
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Could not analyze your tasks. Try again later.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating AI Assistant Panel */}
      <AskLifeSaver isOpen={askOpen} onClose={() => setAskOpen(false)} />

      {/* ── GLOBAL VOICE AI HUD OVERLAY ── */}
      <AnimatePresence>
        {isVoiceActive && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-auto bg-black/50 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="w-full max-w-lg rounded-3xl p-6 border border-emerald-500/25 shadow-2xl relative"
              style={{ background: 'rgba(6,20,10,0.96)', backdropFilter: 'blur(24px)', boxShadow: '0 0 50px rgba(16,185,129,0.3)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">🌿</div>
                  <div>
                    <h3 className="font-bold text-sm leading-none" style={{ color: '#ffffff' }}>Sage Voice</h3>
                    <span className="text-[9px] font-semibold mt-0.5 block" style={{ color: '#34d399' }}>Garden Assistant AI</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsVoiceActive(false)}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all cursor-pointer border-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Speech Waveform Visualizer */}
              <div className="flex items-end justify-center gap-1.5 h-16 my-6">
                {[...Array(9)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 bg-emerald-500 rounded-full"
                    style={{ minHeight: 8 }}
                    animate={voiceStatus === 'listening' ? {
                      height: [8, 48 - (i % 3) * 12, 12 + (i % 2) * 16, 8],
                    } : voiceStatus === 'speaking' ? {
                      height: [8, 36 - (i % 2) * 8, 8],
                    } : {
                      height: 8
                    }}
                    transition={{
                      duration: voiceStatus === 'listening' ? 0.6 + i * 0.08 : 0.8,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  />
                ))}
              </div>

              {/* Status & Speech Log */}
              <div className="space-y-4 mb-6">
                {/* Voice Input Log */}
                <div className="rounded-2xl p-4 bg-white/5 border border-white/10 min-h-[70px]">
                  <span className="text-[9px] font-black uppercase tracking-wider block mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {voiceStatus === 'listening' ? '🔴 Listening' : '🎤 Speech Heard'}
                  </span>
                  <p className="text-sm font-semibold italic" style={{ color: voiceStatus === 'listening' ? 'rgba(255,255,255,0.6)' : '#ffffff' }}>
                    "{voiceText || 'Say something like: \"Add task complete database slides\"'}"
                  </p>
                </div>

                {/* Sage Reply Log */}
                {sageVoiceReply && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-4 bg-emerald-500/10 border border-emerald-500/25 min-h-[60px]"
                  >
                    <span className="text-[9px] font-black uppercase tracking-wider block mb-1 text-emerald-400">
                      🟢 Sage Response
                    </span>
                    <p className="text-sm font-semibold" style={{ color: '#e2fcf0' }}>
                      {sageVoiceReply}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Manual fall-back Input & Recording Controls */}
              <div className="space-y-4">
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={manualCommand}
                    onChange={(e) => setManualCommand(e.target.value)}
                    placeholder="Or type voice command directly here..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-white/30"
                  />
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border-none"
                  >
                    <Send className="w-3.5 h-3.5" /> Send
                  </button>
                </form>

                <div className="flex gap-2 justify-center">
                  {voiceStatus === 'listening' ? (
                    <button
                      onClick={handleStopVoice}
                      className="px-5 py-2 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <MicOff className="w-3.5 h-3.5" /> Stop Mic
                    </button>
                  ) : (
                    <button
                      onClick={handleStartVoice}
                      className="px-5 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Mic className="w-3.5 h-3.5" /> Start Mic
                    </button>
                  )}
                </div>

                {/* Command Cheatsheet Help */}
                <div className="rounded-2xl p-4 bg-white/[0.02] border border-white/5 text-[10px] text-white/50 space-y-1">
                  <p className="font-bold text-white/70 block mb-1">💡 Voice Command Cheatsheet:</p>
                  <p>• <span className="text-emerald-400 font-semibold">"add task [title]"</span> — Queues a new task to your dashboard</p>
                  <p>• <span className="text-emerald-400 font-semibold">"water tree"</span> — Waters the Tree of Life in your garden (+500 XP)</p>
                  <p>• <span className="text-emerald-400 font-semibold">"start focus"</span> / <span className="text-emerald-400 font-semibold">"focus"</span> — Navigates to Focus Mode</p>
                  <p>• <span className="text-emerald-400 font-semibold">"open garden"</span> — Navigates to My Garden</p>
                  <p>• <span className="text-emerald-400 font-semibold">"emergency"</span> — Navigates to Save My Deadline™ Page</p>
                  <p>• <span className="text-emerald-400 font-semibold">"companion"</span> — Navigates to the AI Coach Hub</p>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
