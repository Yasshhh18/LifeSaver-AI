import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ShieldAlert, ArrowRight, Calendar, CheckCircle2, AlertTriangle, Play, Loader2, Brain, Clock, Timer } from 'lucide-react'
import { generateRecoveryPlan, generateSmartRecovery } from '@/services/geminiService'
import { getTasks } from '@/services/dataService'
import { useAuth } from '@/contexts/AuthContext'
import type { RecoveryPlan, Task, SmartRecovery } from '@/types/database'

export default function EmergencyPage() {
  const navigate = useNavigate()
  const [taskName, setTaskName] = useState('')
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<RecoveryPlan | null>(null)
  const { user } = useAuth()

  // Smart Recovery state
  const [atRiskTasks, setAtRiskTasks] = useState<Task[]>([])
  const [loadingAtRisk, setLoadingAtRisk] = useState(true)
  const [smartRecovery, setSmartRecovery] = useState<SmartRecovery | null>(null)
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [searchParams] = useSearchParams()

  // Pre-fill from URL params (from proactive notifications)
  useEffect(() => {
    const taskParam = searchParams.get('task')
    const deadlineParam = searchParams.get('deadline')
    if (taskParam) setTaskName(decodeURIComponent(taskParam))
    if (deadlineParam) {
      // Convert ISO date to yyyy-MM-dd for the date input
      const date = new Date(decodeURIComponent(deadlineParam))
      if (!isNaN(date.getTime())) {
        setDeadline(date.toISOString().split('T')[0])
      }
    }
  }, [searchParams])

  // Auto-detect at-risk tasks
  useEffect(() => {
    if (!user) return
    const loadAtRisk = async () => {
      setLoadingAtRisk(true)
      try {
        const tasks = await getTasks(user.uid)
        const now = new Date()
        const risky = tasks.filter(t => {
          if (t.status === 'completed') return false
          if (t.priority === 'critical') return true
          if (t.due_date && new Date(t.due_date) < now) return true // overdue
          if (t.due_date && (new Date(t.due_date).getTime() - now.getTime()) < 2 * 24 * 60 * 60 * 1000 && t.priority === 'high') return true // due within 2 days
          return false
        })
        setAtRiskTasks(risky)
      } catch (err) {
        console.error('Failed to load at-risk tasks:', err)
      } finally {
        setLoadingAtRisk(false)
      }
    }
    loadAtRisk()
  }, [user])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskName || !deadline || !user) return
    setLoading(true)
    try {
      const result = await generateRecoveryPlan(user.uid, taskName, deadline)
      setPlan(result)
    } catch (error) {
      console.error('Failed to generate plan:', error)
      alert("Failed to generate plan. Please try again. Error: " + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleSmartRecovery = async (task: Task) => {
    if (!user) return
    setSelectedTask(task.id)
    setRecoveryLoading(true)
    setSmartRecovery(null)
    try {
      const result = await generateSmartRecovery(user.uid, task.title)
      setSmartRecovery(result)
    } catch (err) {
      console.error('Smart recovery failed:', err)
    } finally {
      setRecoveryLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-sm font-bold mb-4 border border-amber-200">
          <Zap className="w-4 h-4" /> Save My Deadline™
        </div>
        <h1 className="text-3xl font-extrabold text-foreground mb-3">Emergency Recovery Mode</h1>
        <p className="text-muted-foreground">Panicking? Breathe. Tell AI what's due and when. We'll build a survival plan.</p>
      </div>

      {/* Auto-Detected At-Risk Tasks */}
      {!plan && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 shadow-card border border-surface-container-high relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1.5" style={{ background: 'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 10px, #fef3c7 10px, #fef3c7 20px)' }} />
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-lg text-foreground">Auto-Detected At-Risk Tasks</h2>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-black tracking-wider uppercase ml-auto">AI Scan</span>
          </div>
          {loadingAtRisk ? (
            <div className="flex items-center gap-3 py-6 justify-center">
              <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
              <p className="text-sm text-muted-foreground">Scanning your tasks for risks...</p>
            </div>
          ) : atRiskTasks.length > 0 ? (
            <div className="space-y-3">
              {atRiskTasks.map(task => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date()
                return (
                  <div key={task.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isOverdue ? 'bg-red-50/50 border-red-200' : 'bg-amber-50/50 border-amber-200'}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${isOverdue ? 'text-red-500' : 'text-amber-500'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{task.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className={`font-black uppercase ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>{isOverdue ? 'OVERDUE' : task.priority}</span>
                          {task.due_date && (
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(task.due_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSmartRecovery(task)}
                      disabled={recoveryLoading && selectedTask === task.id}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                        isOverdue 
                          ? 'bg-red-600 text-white hover:bg-red-700 shadow-md' 
                          : 'bg-amber-600 text-white hover:bg-amber-700 shadow-md'
                      } disabled:opacity-50`}
                    >
                      {recoveryLoading && selectedTask === task.id ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                      ) : (
                        <><Zap className="w-3.5 h-3.5" /> Save This</>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-foreground">No at-risk tasks detected!</p>
              <p className="text-xs text-muted-foreground mt-1">Your deadlines are under control. Keep it up!</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Smart Recovery Result */}
      <AnimatePresence>
        {smartRecovery && !plan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl p-6 shadow-card border border-primary-200 relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-primary-700" />
              <h2 className="font-bold text-lg text-foreground">Smart Recovery: {smartRecovery.task_title}</h2>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-2xl p-4 bg-surface-container-low border border-surface-container-high text-center">
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Risk</p>
                <p className={`text-2xl font-black ${smartRecovery.current_risk > 60 ? 'text-red-600' : 'text-amber-600'}`}>{smartRecovery.current_risk}%</p>
              </div>
              <div className="rounded-2xl p-4 bg-surface-container-low border border-surface-container-high text-center">
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Success</p>
                <p className="text-2xl font-black text-emerald-600">{smartRecovery.success_probability}%</p>
              </div>
              <div className="rounded-2xl p-4 bg-surface-container-low border border-surface-container-high text-center">
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">ETA</p>
                <p className="text-sm font-black text-foreground mt-1">{smartRecovery.estimated_completion}</p>
              </div>
            </div>

            {/* AI Message */}
            <div className="rounded-2xl p-4 bg-primary-50 border border-primary-200 mb-6">
              <p className="text-sm font-semibold text-primary-900">"{smartRecovery.motivational_message}"</p>
            </div>

            {/* Focus Blocks */}
            <div className="mb-6">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">📋 Suggested Focus Blocks</h3>
              <div className="space-y-2">
                {smartRecovery.suggested_focus_blocks.map((block, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-surface-container-high">
                    <span className="text-xs font-mono text-muted-foreground w-16">{block.start_time}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">{block.task}</p>
                    </div>
                    <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">{block.duration_minutes}m</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recovery Schedule */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">📅 Recovery Schedule</h3>
              <div className="space-y-3">
                {smartRecovery.recovery_schedule.map((day, i) => (
                  <div key={i} className="rounded-xl p-4 bg-surface-container-low border border-surface-container-high">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-foreground">{day.day}</span>
                      <span className="text-xs text-muted-foreground">{day.focus_hours}h focus</span>
                    </div>
                    <div className="space-y-1">
                      {day.tasks.map((t, j) => (
                        <p key={j} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-primary-600 flex-shrink-0" /> {t}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSmartRecovery(null)}
              className="mt-4 text-xs text-muted-foreground hover:text-foreground font-bold cursor-pointer"
            >
              ← Back to at-risk tasks
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Emergency Input */}
      {!plan && !smartRecovery && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-surface-container-high max-w-2xl mx-auto relative overflow-hidden">
          {/* Danger stripes top */}
          <div className="absolute top-0 inset-x-0 h-1.5" style={{ background: 'repeating-linear-gradient(45deg, #ba1a1a, #ba1a1a 10px, #ffdad6 10px, #ffdad6 20px)' }} />
          
          <h3 className="font-bold text-sm text-muted-foreground mb-4">Or enter a custom deadline:</h3>
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">What needs to be done?</label>
              <input type="text" placeholder="e.g. Finalize Q3 Marketing Report" className="input-base"
                value={taskName} onChange={(e) => setTaskName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">When is the hard deadline?</label>
              <input type="date" className="input-base"
                value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
            </div>
            
            <div className="pt-4">
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-bold transition-all shadow-medium"
                style={{ background: 'linear-gradient(135deg, #ba1a1a 0%, #d96520 100%)' }}>
                {loading ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                    Generating Recovery Plan...
                  </>
                ) : (
                  <>Generate Survival Plan <Zap className="w-5 h-5 fill-current" /></>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {plan && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          
          {/* Header Dashboard */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-card border border-surface-container-high">
              <div className="flex items-center gap-2 text-muted-foreground mb-1"><Calendar className="w-4 h-4"/> Days Left</div>
              <div className="text-3xl font-extrabold text-foreground">{plan.days_remaining}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-card border border-surface-container-high">
              <div className="flex items-center gap-2 text-muted-foreground mb-1"><ShieldAlert className="w-4 h-4"/> Risk Level</div>
              <div className={`text-3xl font-extrabold capitalize ${plan.risk_level === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>{plan.risk_level}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-card border border-surface-container-high">
              <div className="flex items-center gap-2 text-muted-foreground mb-1"><CheckCircle2 className="w-4 h-4"/> Success Prob.</div>
              <div className="text-3xl font-extrabold text-primary-700">{plan.success_probability}%</div>
            </div>
          </div>

          {/* AI Message */}
          <div className="glass-dark rounded-2xl p-6 border-primary-200">
            <p className="text-lg font-medium text-primary-900">"{plan.motivational_message}"</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Priority Actions */}
            <div>
              <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" /> Triage: Do this first
              </h3>
              <div className="space-y-4">
                {plan.priority_actions.map((action, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    className="bg-white rounded-xl p-4 shadow-card border border-surface-container-high relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400" />
                    <div className="pl-3">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-foreground text-sm">{action.title}</h4>
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{action.due_by}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{action.description}</p>
                      <button className="text-xs font-bold text-primary-700 hover:text-primary-800 flex items-center gap-1 transition-colors">
                        <Play className="w-3 h-3 fill-current" /> Start Deep Work ({action.estimated_hours}h)
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right: Daily Schedule */}
            <div>
              <h3 className="font-bold text-lg text-foreground mb-4">Daily Execution Plan</h3>
              <div className="relative border-l-2 border-surface-container-high ml-3 space-y-6">
                {plan.daily_schedule.map((day, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                    className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-primary-600" />
                    <div className="mb-3">
                      <span className="font-bold text-foreground">{day.day}</span>
                      <span className="text-sm text-muted-foreground ml-2">{day.date} • {day.focus_hours}h focus required</span>
                    </div>
                    <div className="space-y-2">
                      {day.tasks.map((task, j) => (
                        <div key={j} className="flex gap-3 text-sm p-2 rounded-lg hover:bg-surface-container-low transition-colors">
                          <span className="text-muted-foreground font-mono text-xs w-16 pt-0.5">{task.time}</span>
                          <div>
                            <p className={`font-medium ${task.priority === 'critical' ? 'text-foreground' : 'text-muted-foreground'}`}>{task.task}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{task.duration}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-center pt-6 border-t border-surface-container-high">
            <button className="btn-primary" onClick={() => navigate('/app/dashboard')}>
              Add Plan to Dashboard
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
