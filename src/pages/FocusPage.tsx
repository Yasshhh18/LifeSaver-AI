import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, Pause, Square, Coffee, Brain, CheckCircle2, 
  Volume2, Sparkles, Award, Star, Compass, RefreshCw, X 
} from 'lucide-react'
import { mockTasks } from '@/services/mockData'
import { useToast } from '@/contexts/ToastContext'

type Mode = 'pomodoro' | 'shortBreak' | 'longBreak' | 'deepWork'

export default function FocusPage() {
  const { toast } = useToast()
  const [mode, setMode] = useState<Mode>('pomodoro')
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [cycles, setCycles] = useState(0)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<typeof mockTasks>([])

  // Audio Playback State
  const [soundtrack, setSoundtrack] = useState('none')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // AI settings
  const [aiConfig, setAiConfig] = useState({ coachTone: 'mentor', userType: 'developer' })

  // Post Session Modal State
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [lastSessionDuration, setLastSessionDuration] = useState(25)
  const [lastSessionMode, setLastSessionMode] = useState<Mode>('pomodoro')

  const audioUrls: Record<string, string> = {
    none: '',
    lofi: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
    rain: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg'
  }

  const modes: Record<Mode, { label: string; min: number; color: string }> = {
    pomodoro: { label: 'Pomodoro', min: 25, color: 'text-primary-700 border-primary-600 bg-primary-50' },
    shortBreak: { label: 'Short Break', min: 5, color: 'text-tertiary-700 border-tertiary-600 bg-tertiary-50' },
    longBreak: { label: 'Long Break', min: 15, color: 'text-tertiary-700 border-tertiary-600 bg-tertiary-50' },
    deepWork: { label: 'Deep Work', min: 90, color: 'text-secondary-700 border-secondary-600 bg-secondary-50' },
  }

  // Load configuration, tasks, and sync in real-time
  useEffect(() => {
    const loadConfig = () => {
      const savedAi = localStorage.getItem('ls_ai')
      const savedFocus = localStorage.getItem('ls_focus')
      if (savedAi) {
        try { setAiConfig(JSON.parse(savedAi)) } catch (e) { console.error(e) }
      }
      if (savedFocus) {
        try {
          const parsed = JSON.parse(savedFocus)
          if (parsed.soundtrack) setSoundtrack(parsed.soundtrack)
        } catch (e) {
          console.error(e)
        }
      }
    }

    const loadTasks = () => {
      const savedTasks = localStorage.getItem('ls_tasks')
      if (savedTasks) {
        try {
          const parsed = JSON.parse(savedTasks)
          setTasks(parsed)
          const firstIncomplete = parsed.find((t: any) => t.status !== 'completed')
          if (firstIncomplete) setSelectedTaskId(firstIncomplete.id)
        } catch (e) {
          console.error(e)
        }
      } else {
        setTasks(mockTasks)
        const firstIncomplete = mockTasks.find(t => t.status !== 'completed')
        if (firstIncomplete) setSelectedTaskId(firstIncomplete.id)
      }
    }

    loadConfig()
    loadTasks()

    window.addEventListener('ai_settings_updated', loadConfig)
    window.addEventListener('focus_settings_updated', loadConfig)
    window.addEventListener('tasks_updated', loadTasks)

    return () => {
      window.removeEventListener('ai_settings_updated', loadConfig)
      window.removeEventListener('focus_settings_updated', loadConfig)
      window.removeEventListener('tasks_updated', loadTasks)
    }
  }, [])

  // Sync Timer Duration with selected mode
  useEffect(() => {
    setTimeLeft(modes[mode].min * 60)
    setIsRunning(false)
  }, [mode])

  // Manage Audio Playback
  useEffect(() => {
    if (!audioRef.current) return
    
    if (soundtrack === 'none' || !isRunning) {
      audioRef.current.pause()
    } else {
      audioRef.current.src = audioUrls[soundtrack]
      audioRef.current.load()
      audioRef.current.volume = 1.0 // Ambient tracks need full volume
      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch(err => console.error('Audio playback failed:', err))
      }
    }
  }, [soundtrack, isRunning])

  const handleToggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id)
    const newStatus = task?.status === 'completed' ? 'todo' : 'completed'
    const updated = tasks.map(t => t.id === id ? { ...t, status: newStatus as any } : t)
    setTasks(updated)
    localStorage.setItem('ls_tasks', JSON.stringify(updated))
    window.dispatchEvent(new Event('tasks_updated'))
    toast(newStatus === 'completed' ? 'Task completed! 🌿' : 'Task restored.')
  }

  // Timer Core Interval Loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    } else if (timeLeft === 0) {
      if (isRunning) {
        setIsRunning(false)
        setLastSessionDuration(modes[mode].min)
        setLastSessionMode(mode)
        setShowSummaryModal(true)

        // Increment Garden counts when actual sessions complete
        if (mode === 'pomodoro' || mode === 'deepWork') {
          setCycles((c) => c + 1)
          const savedGarden = localStorage.getItem('ls_garden')
          const garden = savedGarden ? JSON.parse(savedGarden) : { total_plants: 14, level: 3, current_streak: 5 }
          garden.total_plants = (garden.total_plants || 0) + 1
          localStorage.setItem('ls_garden', JSON.stringify(garden))
          window.dispatchEvent(new Event('garden_updated'))
        }
      }
    }
    return () => clearInterval(interval)
  }, [isRunning, timeLeft, mode])

  // Audio Soundtrack Playback Effect
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    if (isRunning && soundtrack !== 'none' && audioUrls[soundtrack]) {
      const audio = new Audio(audioUrls[soundtrack])
      audio.loop = true
      audio.volume = 0.35
      audioRef.current = audio
      
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay block or loading error:", err)
        })
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [isRunning, soundtrack])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const progress = 1 - timeLeft / (modes[mode].min * 60)

  // Focus Coach Insights generator
  const getCoachInsights = (userType: string, coachTone: string) => {
    const recommendations: Record<string, string> = {
      mentor: "Your focus peaks during quiet evening blocks. Prioritize your deep writing tasks then and take longer breaks during low-energy afternoons.",
      coach: "We noticed you crush tasks 30% faster in 90-minute chunks. Force yourself to complete at least two 90-min sessions today!",
      friend: "Hey! You've been doing great, but don't overwork yourself. Try setting a 25-minute Pomodoro and take a tea break right after.",
      manager: "Focus analysis suggests high completion rates on tasks scheduled before 12 PM. Shift critical deliverables to early morning blocks."
    }

    const trends: Record<string, string> = {
      student: "Peak focus hours: 8 PM - 10 PM. Best session length: 25 mins (Pomodoro). Weekly score: 88/100.",
      developer: "Peak focus hours: 2 PM - 5 PM. Best session length: 90 mins (Deep Work). Weekly score: 94/100.",
      freelancer: "Peak focus hours: 9 AM - 11 AM. Best session length: 50 mins. Weekly score: 90/100.",
      entrepreneur: "Peak focus hours: 10 PM - 12 AM. Best session length: 45 mins. Weekly score: 92/100."
    }

    return {
      recommendation: recommendations[coachTone] || recommendations['mentor'],
      trend: trends[userType] || trends['developer'],
      score: coachTone === 'coach' ? '94 (A+)' : coachTone === 'manager' ? '92 (A)' : '89 (A-)'
    }
  }

  const coachInsights = getCoachInsights(aiConfig.userType, aiConfig.coachTone)

  // AI suggestions for post-session summary
  const getSessionSuggestions = (coachTone: string, mode: Mode) => {
    const isBreak = mode === 'shortBreak' || mode === 'longBreak'
    
    if (isBreak) {
      return {
        summary: "You completed your scheduled break.",
        suggestions: "Your brain is refreshed. Get ready to lock in for another deep focus session."
      }
    }

    const suggestions: Record<string, string> = {
      mentor: "Your focus was excellent. Remember to stretch and hydrate during this break. A calm, resting mind maintains high quality.",
      coach: "Solid execution! You maintained high momentum. Take 5 minutes to stand up and reset, then let's get back in the zone.",
      friend: "Awesome job! You stuck with it for the whole session. Grab a cup of water or tea and chill for a bit, you earned it!",
      manager: "Focus interval successfully concluded. 100% of planned duration met. Proceed to scheduled rest interval immediately."
    }

    return {
      summary: `You completed a ${lastSessionDuration}-minute focus session on "${
        tasks.find(t => t.id === selectedTaskId)?.title || 'your focus target'
      }".`,
      suggestions: suggestions[coachTone] || suggestions['mentor']
    }
  }

  const postSessionInfo = getSessionSuggestions(aiConfig.coachTone, lastSessionMode)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hidden Audio Element for Soundtracks */}
      <audio ref={audioRef} loop className="hidden" />

      <div className="grid lg:grid-cols-[1fr,320px] gap-6">
        {/* Main Timer Area */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 shadow-card border border-surface-container-high flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
          
          {/* Subtle background glow based on mode */}
          <div className={`absolute inset-0 opacity-10 transition-colors duration-1000 ${
            mode === 'pomodoro' ? 'bg-primary-500' : mode === 'deepWork' ? 'bg-secondary-500' : 'bg-tertiary-500'
          }`} style={{ filter: 'blur(100px)' }} />

          {/* Mode Selector */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-surface-container-low rounded-xl mb-12 relative z-10 border border-surface-container-high">
            {(Object.entries(modes) as [Mode, typeof modes[Mode]][]).map(([key, val]) => (
              <button key={key} onClick={() => setMode(key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                  mode === key ? 'bg-white shadow-soft text-foreground font-extrabold' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {val.label}
              </button>
            ))}
          </div>

          {/* Timer Circle */}
          <div className="relative w-72 h-72 mb-12 z-10">
            <svg className="w-full h-full timer-ring">
              <circle cx="50%" cy="50%" r="48%" fill="none" strokeWidth="8" className="stroke-surface-container-high" />
              <motion.circle cx="50%" cy="50%" r="48%" fill="none" strokeWidth="8"
                className={`stroke-current ${modes[mode].color.split(' ')[0]}`}
                strokeLinecap="round" strokeDasharray="301.59" strokeDashoffset={301.59 * (1 - progress)}
                initial={{ strokeDashoffset: 301.59 }}
                animate={{ strokeDashoffset: 301.59 * (1 - progress) }}
                transition={{ duration: 1, ease: 'linear' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-extrabold tracking-tighter text-foreground mb-2 font-mono">
                {formatTime(timeLeft)}
              </span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {modes[mode].label}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 z-10">
            <button onClick={() => setIsRunning(!isRunning)}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-medium hover:scale-105 active:scale-95 transition-all ${
                isRunning ? 'bg-surface-variant text-foreground' : 'bg-forest-gradient shadow-glow-green'
              }`}>
              {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-7 h-7 ml-1" />}
            </button>
            {isRunning && (
              <button onClick={() => { setIsRunning(false); setTimeLeft(modes[mode].min * 60) }}
                className="w-12 h-12 rounded-full bg-white border border-surface-container-high flex items-center justify-center text-muted-foreground hover:bg-surface-container-low transition-colors"
                title="Reset timer"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Active Task */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-card border border-surface-container-high p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-foreground">Current Focus</h3>
            </div>
            {selectedTaskId ? (
              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high">
                <p className="text-sm font-semibold text-foreground mb-1">
                  {tasks.find(t => t.id === selectedTaskId)?.title}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span>Est: {tasks.find(t => t.id === selectedTaskId)?.estimated_minutes || 60}m</span>
                  <button 
                    onClick={() => handleToggleTask(selectedTaskId)}
                    className="flex items-center gap-1 text-primary-700 font-bold hover:text-primary-800"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground italic">No active task selected</p>
                {tasks.filter(t => t.status !== 'completed').length > 0 && (
                  <select 
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full text-xs bg-surface-container-low p-2 rounded-lg border border-surface-container-high"
                  >
                    <option value="">Select a task...</option>
                    {tasks.filter(t => t.status !== 'completed').map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </motion.div>

          {/* Focus Soundtrack Card */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl shadow-card border border-surface-container-high p-5">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-primary-700" /> Focus Soundtrack
              </h3>
              {isRunning && soundtrack !== 'none' && (
                <div className="flex gap-0.5 items-end h-3">
                  <div className="w-0.5 bg-primary-600 animate-[bounce_0.8s_infinite_100ms] h-full" />
                  <div className="w-0.5 bg-primary-600 animate-[bounce_0.8s_infinite_300ms] h-3/4" />
                  <div className="w-0.5 bg-primary-600 animate-[bounce_0.8s_infinite_200ms] h-1/2" />
                  <div className="w-0.5 bg-primary-600 animate-[bounce_0.8s_infinite_400ms] h-2/3" />
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'none', label: '🔇 Mute' },
                  { id: 'lofi', label: '🎧 Lofi' },
                  { id: 'rain', label: '🌧️ Rain' },
                ].map((track) => (
                  <button
                    key={track.id}
                    onClick={() => {
                      setSoundtrack(track.id)
                      const savedFocus = localStorage.getItem('ls_focus')
                      const current = savedFocus ? JSON.parse(savedFocus) : {}
                      current.soundtrack = track.id
                      localStorage.setItem('ls_focus', JSON.stringify(current))
                      window.dispatchEvent(new Event('focus_settings_updated'))
                    }}
                    className={`px-2 py-1.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                      soundtrack === track.id
                        ? 'bg-primary-50 text-primary-800 border-primary-300 shadow-inner-soft'
                        : 'bg-white border-surface-container text-muted-foreground hover:bg-surface-container-low'
                    }`}
                  >
                    {track.label}
                  </button>
                ))}
              </div>
              {isRunning && soundtrack !== 'none' && (
                <p className="text-[10px] text-center text-primary-750 font-semibold animate-pulse">
                  Playing ambient backdrop... 🎶
                </p>
              )}
            </div>
          </motion.div>

          {/* AI Focus Coach Card */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-card border border-surface-container-high p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-12 h-12 text-primary-700" />
            </div>
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <Brain className="w-4 h-4 text-primary-700" />
              <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">AI Focus Coach</h3>
            </div>
            <div className="space-y-2.5 relative z-10 text-xs">
              <p className="text-foreground font-medium leading-relaxed">
                "{coachInsights.recommendation}"
              </p>
              <div className="border-t border-surface-container pt-2.5 space-y-1 text-[11px] text-muted-foreground">
                <p>📈 <span className="font-semibold text-foreground">Trend:</span> {coachInsights.trend}</p>
                <p>🏆 <span className="font-semibold text-foreground">Rating:</span> {coachInsights.score}</p>
              </div>
            </div>
          </motion.div>

          {/* Session Progress */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl shadow-card border border-surface-container-high p-5">
            <h3 className="font-bold text-sm text-foreground mb-4">Daily Progress</h3>
            <div className="flex justify-between items-end mb-2">
              <span className="text-3xl font-extrabold text-foreground">{cycles}</span>
              <span className="text-sm text-muted-foreground mb-1">/ 8 Pomodoros</span>
            </div>
            <div className="flex gap-1">
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`flex-1 h-2 rounded-sm ${i < cycles ? 'bg-primary-500' : 'bg-surface-container-high'}`} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Complete {Math.max(0, 4 - cycles)} more for a long break
            </p>
          </motion.div>
        </div>
      </div>

      {/* Post-Session Summary Modal */}
      <AnimatePresence>
        {showSummaryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSummaryModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white/95 border border-surface-container-high rounded-3xl p-6 w-full max-w-md shadow-large z-10 overflow-hidden relative text-center"
            >
              <button 
                onClick={() => setShowSummaryModal(false)} 
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-surface-container transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-700 mx-auto mb-4">
                <Sparkles className="w-6 h-6" />
              </div>

              <h3 className="font-extrabold text-lg text-foreground mb-1">Session Summary</h3>
              <p className="text-xs text-muted-foreground mb-6">Let's review your focus metrics</p>

              {/* Productivity Scoring Circle */}
              <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="50%" cy="50%" r="42%" fill="none" strokeWidth="6" className="stroke-surface-container-high" />
                  <motion.circle cx="50%" cy="50%" r="42%" fill="none" strokeWidth="6"
                    className="stroke-primary-600"
                    strokeLinecap="round" 
                    strokeDasharray="237.5" 
                    initial={{ strokeDashoffset: 237.5 }}
                    animate={{ strokeDashoffset: 237.5 * (1 - 0.96) }}
                    transition={{ duration: 1, delay: 0.3 }} />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-extrabold text-foreground font-mono">96%</span>
                  <span className="text-[9px] uppercase font-bold text-primary-750 tracking-wider">Focus Score</span>
                </div>
              </div>

              {/* Summary message */}
              <div className="space-y-4 text-sm text-left bg-surface-container-low/50 border border-surface-container p-4 rounded-2xl mb-6">
                <div>
                  <p className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary-600" /> Session Log
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {postSessionInfo.summary}
                  </p>
                </div>
                
                <div className="border-t border-surface-container pt-3">
                  <p className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-primary-600" /> AI Coach Tip
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed italic">
                    "{postSessionInfo.suggestions}"
                  </p>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowSummaryModal(false)
                    // Change mode to Short Break
                    setMode('shortBreak')
                  }}
                  className="btn-primary flex-1 text-xs py-2.5 rounded-xl font-bold"
                >
                  🟢 Start My Break
                </button>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="btn-secondary text-xs py-2.5 px-4 rounded-xl font-bold"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
