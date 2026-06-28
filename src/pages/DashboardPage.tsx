import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, Circle, Zap, Brain, Target, Leaf,
  Clock, Flame, AlertTriangle, ChevronRight, Plus, Mic, MicOff, Volume2, Send, X, Star, Camera, Loader2, Heart, Timer, Sparkles
} from 'lucide-react'
import { mockRecommendations, mockDashboardStats, mockGarden } from '@/services/mockData'
import { formatRelativeDate } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { getTasks, createTask, updateTask, createGoal, deleteTask, getGoals, deleteGoal } from '@/services/dataService'
import { extractTasksFromImage, generateDailyBriefing, generateBurnoutAssessment } from '@/services/geminiService'
import type { Task, DailyBriefing, BurnoutReport, MorningBriefing } from '@/types/database'
import { type PrioritizedTasks } from '@/services/proactiveEngine'
import ProductTour from '@/components/ProductTour'
import TimeSimulatorModal from '@/components/TimeSimulatorModal'

const priorityColors: Record<string, string> = {
  critical: 'text-red-650 bg-red-500/10 border-red-500/25',
  high: 'text-amber-650 bg-amber-500/10 border-amber-500/25',
  medium: 'text-blue-650 bg-blue-500/10 border-blue-500/25',
  low: 'text-green-650 bg-green-500/10 border-green-500/25',
}

function StatCard({ icon, label, value, sub, color, delay }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.03, y: -4, boxShadow: '0 20px 30px rgba(0,0,0,0.06)' }}
      className="rounded-2xl p-5 border border-white/40 relative overflow-hidden transition-all duration-300 shadow-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(246, 252, 244, 0.65) 100%)',
        backdropFilter: 'blur(16px)'
      }}
    >
      <div className="absolute top-[-20px] right-[-20px] w-16 h-16 rounded-full bg-primary-200/10 blur-[15px] pointer-events-none" />
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 shadow-md ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-black text-foreground tracking-tight leading-none">{value}</p>
      <p className="text-sm font-bold text-foreground mt-2">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1" style={{ color: 'rgba(0,0,0,0.5)' }}>{sub}</p>}
    </motion.div>
  )
}

// ── ONBOARDING MODAL COMPONENT REMOVED (DUPLICATE) ─────────────────────────

import { useToast } from '@/contexts/ToastContext'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [profile, setProfile] = useState({ name: 'User' })
  const [aiConfig, setAiConfig] = useState({ coachTone: 'mentor', userType: 'developer' })
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeTaskTab, setActiveTaskTab] = useState<'doNow' | 'doToday' | 'scheduleLater'>('doToday')
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  
  // Custom Task Input State
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [gardenStats, setGardenStats] = useState({ level: 1, plants: 0, streak: 0 })
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showTour, setShowTour] = useState(false)

  // AI-powered state
  const [aiBriefing, setAiBriefing] = useState<DailyBriefing | null>(null)
  const [briefingLoading, setBriefingLoading] = useState(true)
  const [burnoutReport, setBurnoutReport] = useState<BurnoutReport | null>(null)
  const [burnoutLoading, setBurnoutLoading] = useState(true)
  const [showTimeSimulator, setShowTimeSimulator] = useState(false)
  const [showMorningBriefing, setShowMorningBriefing] = useState(false)

  // Check if we should show the morning briefing modal (once per calendar day)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const lastBriefingDate = localStorage.getItem('last_briefing_date')
    if (lastBriefingDate !== today) {
      // Delay slightly so onboarding takes priority
      const timer = setTimeout(() => {
        if (!showOnboarding) setShowMorningBriefing(true)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [showOnboarding])

  // Listen for live priority recalculations from the Proactive Engine
  useEffect(() => {
    const handlePriorities = (e: Event) => {
      const detail = (e as CustomEvent<PrioritizedTasks>).detail
      if (detail) {
        // Update categorized tasks will happen via the existing categorizeTasks function
        // But we can trigger a re-render by refreshing tasks from the event
        window.dispatchEvent(new Event('tasks_updated'))
      }
    }
    window.addEventListener('priorities_recalculated', handlePriorities)
    return () => window.removeEventListener('priorities_recalculated', handlePriorities)
  }, [])

  const handleOpenVoiceAssistant = () => {
    window.dispatchEvent(new Event('open_voice_ai'))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setIsScanning(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const base64Data = (event.target?.result as string).split(',')[1]
        const extracted = await extractTasksFromImage(base64Data, file.type)
        
        if (extracted.length > 0) {
          // Save all extracted tasks to Firebase
          await Promise.all(extracted.map(t => createTask({
            user_id: user.uid,
            title: t.title,
            description: 'Scanned via Magic Whiteboard 📸',
            status: 'todo',
            priority: t.priority,
            estimated_minutes: t.estimated_minutes,
            tags: ['AI-Scanned']
          })))
          
          window.dispatchEvent(new Event('tasks_updated'))
          toast(`Successfully extracted and added ${extracted.length} tasks!`, 'success')
        } else {
          toast("I couldn't find any clear tasks in that image. Try another one!", 'error')
        }
      } catch (error) {
        console.error("Magic scan error:", error)
        toast("Failed to scan image. Please try again.", 'error')
      } finally {
        setIsScanning(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  // Load configuration and tasks
  useEffect(() => {
    const loadConfig = () => {
      const savedProfile = localStorage.getItem('ls_profile')
      const savedAi = localStorage.getItem('ls_ai')
      const savedGarden = localStorage.getItem('ls_garden')
      if (savedProfile) {
        try {
          setProfile(JSON.parse(savedProfile))
        } catch (e) {
          console.error(e)
        }
      }
      if (savedAi) {
        try {
          setAiConfig(JSON.parse(savedAi))
        } catch (e) {
          console.error(e)
        }
      }
      if (savedGarden) {
        try {
          const parsed = JSON.parse(savedGarden)
          setGardenStats({ 
            level: parsed.level || 1, 
            plants: parsed.total_plants || 0, 
            streak: parsed.current_streak || 0 
          })
        } catch (e) {
          console.error(e)
        }
      }
    }

    const loadTasks = async () => {
      if (!user) return
      
      // Always show onboarding for new users or if flag is missing.
      // For Guest/Demo users, we always show it if sessionStorage hasn't recorded it for this session yet,
      // so they can choose their role and see the corresponding demo screens.
      const isGuest = user.displayName === 'Guest' || user.isAnonymous
      const onboardingDoneLocal = localStorage.getItem('onboarding_done') === 'true'
      const onboardingDoneSession = sessionStorage.getItem('onboarding_done_session') === 'true'

      if (!onboardingDoneLocal || (isGuest && !onboardingDoneSession)) {
        setShowOnboarding(true)
      }

      try {
        const fetchedTasks = await getTasks(user.uid)
        setTasks(fetchedTasks)
        
        // Safety check: if user already has tasks, they are a returning user. 
        // Hide onboarding to prevent wiping their real data, unless they specifically want it.
        if (fetchedTasks.length > 0 && !isGuest) {
          setShowOnboarding(false)
          localStorage.setItem('onboarding_done', 'true')
        }
      } catch (e) {
        console.error('Error fetching tasks:', e)
      }
    }

    loadConfig()
    loadTasks()

    // Listen to live updates
    window.addEventListener('profile_updated', loadConfig)
    window.addEventListener('ai_settings_updated', loadConfig)
    window.addEventListener('garden_updated', loadConfig)
    window.addEventListener('tasks_updated', loadTasks)

    return () => {
      window.removeEventListener('profile_updated', loadConfig)
      window.removeEventListener('ai_settings_updated', loadConfig)
      window.removeEventListener('garden_updated', loadConfig)
      window.removeEventListener('tasks_updated', loadTasks)
    }
  }, [user])

  const handleToggleTask = async (id: string) => {
    const taskToUpdate = tasks.find(t => t.id === id)
    if (!taskToUpdate) return
    const newStatus = taskToUpdate.status === 'completed' ? 'todo' : 'completed'
    
    // Optimistic update
    const updated = tasks.map(t => t.id === id ? { ...t, status: newStatus as 'todo' | 'in_progress' | 'completed' } : t)
    setTasks(updated)
    
    try {
      await updateTask(id, { status: newStatus })
      window.dispatchEvent(new Event('tasks_updated'))
      toast(newStatus === 'completed' ? 'Task completed! 🌿' : 'Task restored.')
    } catch (e) {
      console.error('Error updating task:', e)
      toast('Failed to update task status.', 'error')
      // Revert if error
      setTasks(tasks)
    }
  }

  const submitNewTask = async () => {
    if (!user || !newTaskTitle.trim()) {
      setIsAddingTask(false)
      return
    }
    
    const newTaskParams = {
      user_id: user.uid,
      title: newTaskTitle.trim(),
      description: 'Added via Dashboard',
      status: 'todo' as const,
      priority: newTaskPriority,
      due_date: newTaskPriority === 'critical' || newTaskPriority === 'high' 
        ? new Date(Date.now() + 1.5 * 24 * 60 * 60 * 1000).toISOString() 
        : undefined,
      tags: [] as string[],
    }
    
    try {
      const savedTask = await createTask(newTaskParams)
      setTasks(prev => [...prev, savedTask])
      window.dispatchEvent(new Event('tasks_updated'))
      toast(`Task "${newTaskTitle.trim()}" added successfully!`)
      setNewTaskTitle('')
      setNewTaskPriority('medium')
      setIsAddingTask(false)
    } catch (e) {
      console.error('Error adding task:', e)
      toast('Failed to add task.', 'error')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submitNewTask()
    if (e.key === 'Escape') {
      setIsAddingTask(false)
      setNewTaskTitle('')
    }
  }

  const handleCompleteOnboarding = async (role: string) => {
    if (!user) return
    setIsScanning(true)
    
    // Set AI Config
    const newAiConfig = { ...aiConfig, userType: role }
    setAiConfig(newAiConfig)
    localStorage.setItem('ls_ai', JSON.stringify(newAiConfig))
    window.dispatchEvent(new Event('ai_settings_updated'))

    // Generate specific demo tasks
    const baseTasks = [
      { title: 'Try out the Magic Whiteboard scan! 📸', description: 'Click the green camera icon on the Dashboard to auto-extract tasks from a photo.', priority: 'critical', status: 'todo' },
      { title: 'Set up your first AI Goal 🎯', description: 'Go to the Goals tab and generate an intelligent AI roadmap.', priority: 'high', status: 'todo' },
      { title: 'Explore the Focus room 🎵', description: 'Listen to Lofi beats or Rain sounds while completing this task.', priority: 'medium', status: 'in_progress' },
    ]
    
    const roleTasks: Record<string, any[]> = {
      student: [
        { title: 'Study for Calculus Midterm 📚', description: 'Review chapters 4 and 5', priority: 'high', status: 'todo' },
        { title: 'Submit Physics Lab Report 🧪', description: 'Due tonight at 11:59 PM', priority: 'critical', status: 'todo' },
        { title: 'Read History Chapter 6 📖', description: 'Take notes on the Industrial Revolution', priority: 'medium', status: 'todo' },
        { title: 'Group Project Meeting 🤝', description: 'Sync with team on presentation slides', priority: 'medium', status: 'todo' },
        { title: 'Apply for Summer Internships 💼', description: 'Send out 3 applications', priority: 'high', status: 'todo' }
      ],
      developer: [
        { title: 'Refactor Authentication API 🔒', description: 'Move to JWT based auth', priority: 'high', status: 'todo' },
        { title: 'Fix CSS layout bug on mobile 📱', description: 'Dashboard overflows on iPhone SE', priority: 'medium', status: 'todo' },
        { title: 'Review PR #42 from John 👀', description: 'Check the new payment gateway integration', priority: 'medium', status: 'todo' },
        { title: 'Deploy v2.1 to Production 🚀', description: 'Ensure all tests pass before merge', priority: 'critical', status: 'todo' },
        { title: 'Write Unit Tests for Cart 🧪', description: 'Increase test coverage to 80%', priority: 'low', status: 'todo' }
      ],
      freelancer: [
        { title: 'Send invoice to Client A 💰', description: 'For December consulting', priority: 'high', status: 'todo' },
        { title: 'Draft proposal for new project 📝', description: 'Website redesign for local bakery', priority: 'medium', status: 'todo' },
        { title: 'Update Portfolio Website ✨', description: 'Add 3 new recent case studies', priority: 'low', status: 'todo' },
        { title: 'Client Onboarding Call 📞', description: 'Discuss scope for Q1 marketing', priority: 'high', status: 'todo' },
        { title: 'Finalize Logo Revisions 🎨', description: 'Implement feedback on the primary mark', priority: 'critical', status: 'todo' }
      ],
      entrepreneur: [
        { title: 'Review Q3 Pitch Deck 📊', description: 'Update financial projections', priority: 'high', status: 'todo' },
        { title: 'Analyze user growth metrics 📈', description: 'Focus on churn rate', priority: 'critical', status: 'todo' },
        { title: 'Sync with Co-founder 🗣️', description: 'Discuss product roadmap for next month', priority: 'medium', status: 'todo' },
        { title: 'Interview Marketing Lead Candidate 👔', description: '11:00 AM on Zoom', priority: 'high', status: 'todo' },
        { title: 'Draft Investor Update Email ✉️', description: 'Highlight our 20% MoM growth', priority: 'medium', status: 'todo' }
      ]
    }
    
    const tasksToCreate = [...baseTasks, ...(roleTasks[role] || [])]
    
    try {
      // 1. Wipe previous tasks and goals first to prevent duplication
      const [existingTasks, existingGoals] = await Promise.all([
        getTasks(user.uid),
        getGoals(user.uid)
      ])
      await Promise.all([
        ...existingTasks.map(t => deleteTask(t.id)),
        ...existingGoals.map(g => deleteGoal(g.id))
      ])

      // 2. Create tasks
      await Promise.all(tasksToCreate.map(t => {
        const now = new Date()
        let dueDays = 0
        if (t.priority === 'critical') dueDays = 0
        else if (t.priority === 'high') dueDays = 1
        else if (t.priority === 'medium') dueDays = 3
        else dueDays = 7
        
        const dueDate = new Date(now.setDate(now.getDate() + dueDays)).toISOString()

        return createTask({
          user_id: user.uid,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          due_date: dueDate,
          estimated_minutes: 30,
          tags: ['demo']
        })
      }))
      
      const roleGoals: Record<string, any[]> = {
        student: [
          { title: 'Ace the Semester 🎓', description: 'Maintain a 3.8 GPA across all core subjects', category: 'education', status: 'active', progress_percent: 45, ai_generated: false },
          { title: 'Learn React ⚛️', description: 'Complete the advanced front-end web development course', category: 'education', status: 'active', progress_percent: 20, ai_generated: false }
        ],
        developer: [
          { title: 'Launch Side Project 🚀', description: 'Finish the MVP and deploy my new SaaS app', category: 'project', status: 'active', progress_percent: 60, ai_generated: false },
          { title: 'Master System Design 🏗️', description: 'Read Designing Data-Intensive Applications', category: 'career', status: 'active', progress_percent: 30, ai_generated: false }
        ],
        freelancer: [
          { title: 'Hit $10k MRR 💰', description: 'Sign 3 new high-ticket retainer clients this quarter', category: 'finance', status: 'active', progress_percent: 80, ai_generated: false },
          { title: 'Revamp Portfolio 🎨', description: 'Showcase recent enterprise work with detailed case studies', category: 'career', status: 'active', progress_percent: 10, ai_generated: false }
        ],
        entrepreneur: [
          { title: 'Seed Funding Round 📈', description: 'Raise $500k to expand the engineering team', category: 'finance', status: 'active', progress_percent: 40, ai_generated: false },
          { title: 'MVP Launch 🚀', description: 'Onboard the first 100 beta users and gather feedback', category: 'project', status: 'active', progress_percent: 85, ai_generated: false }
        ]
      }
      
      const goalsToCreate = roleGoals[role] || []
      await Promise.all(goalsToCreate.map(g => {
        const now = new Date()
        const targetDate = new Date(now.setMonth(now.getMonth() + (Math.floor(Math.random() * 6) + 1))).toISOString()
        return createGoal({
          user_id: user.uid,
          title: g.title,
          description: g.description,
          category: g.category,
          status: g.status,
          target_date: targetDate,
          progress_percent: g.progress_percent,
          ai_generated: g.ai_generated
        })
      }))
      
      localStorage.setItem('onboarding_done', 'true')
      sessionStorage.setItem('onboarding_done_session', 'true')
      setShowOnboarding(false)
      window.dispatchEvent(new Event('tasks_updated'))
      window.dispatchEvent(new Event('goals_updated'))
      
      // Auto-trigger tour after onboarding finishes!
      setTimeout(() => setShowTour(true), 300)
    } catch (e) {
      console.error('Error creating demo tasks:', e)
    } finally {
      setIsScanning(false)
    }
  }

  // Load real AI-powered briefing and burnout assessment
  useEffect(() => {
    if (!user) return
    let cancelled = false

    const loadAIFeatures = async () => {
      // Load Daily Briefing
      setBriefingLoading(true)
      try {
        const briefing = await generateDailyBriefing(user.uid)
        if (!cancelled) setAiBriefing(briefing)
      } catch (err) {
        console.error('Failed to load AI briefing:', err)
      } finally {
        if (!cancelled) setBriefingLoading(false)
      }

      // Load Burnout Assessment
      setBurnoutLoading(true)
      try {
        const burnout = await generateBurnoutAssessment(user.uid)
        if (!cancelled) setBurnoutReport(burnout)
      } catch (err) {
        console.error('Failed to load burnout assessment:', err)
      } finally {
        if (!cancelled) setBurnoutLoading(false)
      }
    }

    loadAIFeatures()
    return () => { cancelled = true }
  }, [user])

  // Fallback brief values used while loading
  const aiBrief = {
    summary: aiBriefing?.motivational_message || 'Loading your personalized AI briefing...',
    workloadMsg: aiBriefing ? `Estimated workload: ${aiBriefing.estimated_workload_hours}h of focus today.` : 'Analyzing your workload...',
    riskScore: aiBriefing?.overall_risk_score ?? 0,
    recommendedTask: aiBriefing?.top_priority?.task_title || 'Loading...',
    estimatedTime: aiBriefing ? `${aiBriefing.estimated_workload_hours}h` : '—',
  }

  // Dynamic insights from AI briefing
  const dynamicInsights = aiBriefing ? [
    {
      id: 'top_priority',
      title: `🎯 Top Priority: ${aiBriefing.top_priority.task_title}`,
      content: aiBriefing.top_priority.reason,
    },
    ...(aiBriefing.highest_risk_deadline ? [{
      id: 'deadline_risk',
      title: `⚠️ At Risk: ${aiBriefing.highest_risk_deadline.task_title}`,
      content: `Due ${aiBriefing.highest_risk_deadline.due_date} — Risk: ${aiBriefing.highest_risk_deadline.risk_percent}%`,
    }] : [{
      id: 'no_risk',
      title: '✅ No Deadline Pressure',
      content: 'All your deadlines are under control. Great time to tackle some quick wins!',
    }]),
    ...(aiBriefing.quick_wins && aiBriefing.quick_wins.length > 0 ? [{
      id: 'quick_wins',
      title: '⚡ Quick Wins Available',
      content: aiBriefing.quick_wins.join(' • '),
    }] : []),
  ] : [
    { id: 'loading_1', title: '🧠 Analyzing your tasks...', content: 'Sage is reviewing your schedule and priorities.' },
    { id: 'loading_2', title: '📊 Calculating risks...', content: 'Checking deadlines and workload balance.' },
  ]

  // AI Priority Engine Categorizer
  const categorizeTasks = (tasksList: typeof tasks) => {
    const incomplete = tasksList.filter(t => t.status !== 'completed')
    const doNow = incomplete.filter(t => t.priority === 'critical' || (t.priority === 'high' && t.due_date))
    const doToday = incomplete.filter(t => !doNow.includes(t) && (t.priority === 'high' || t.priority === 'medium'))
    const scheduleLater = incomplete.filter(t => !doNow.includes(t) && !doToday.includes(t))
    return { doNow, doToday, scheduleLater }
  }

  const categorized = categorizeTasks(tasks)
  const activeTasks = categorized[activeTaskTab]

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Morning Briefing Modal */}
      <AnimatePresence>
        {showMorningBriefing && !showOnboarding && aiBriefing && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl z-10 overflow-hidden relative"
            >
              {/* Decorative gradient header */}
              <div className="h-28 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #154212 0%, #2d5a27 40%, #3b6934 70%, #084042 100%)' }}>
                <div className="absolute top-4 right-6 w-20 h-20 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
                <div className="relative z-10 p-6 pb-0">
                  <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">AI Daily Briefing</p>
                  <h2 className="text-white text-xl font-black mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {(aiBriefing as any).greeting || `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${profile.name}! ✨`}
                  </h2>
                </div>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* AI Recommendation */}
                {(aiBriefing as any).ai_recommendation && (
                  <div className="rounded-2xl p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700 mb-1">🧠 Sage Recommends</p>
                    <p className="text-sm font-semibold text-emerald-900">{(aiBriefing as any).ai_recommendation}</p>
                  </div>
                )}

                {/* Top Priority */}
                <div className="rounded-2xl p-4 bg-indigo-50 border border-indigo-200">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-1">🎯 Top Priority</p>
                  <p className="text-sm font-bold text-foreground">{aiBriefing.top_priority.task_title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{aiBriefing.top_priority.reason}</p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl p-3 bg-amber-50 border border-amber-200 text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Workload</p>
                    <p className="text-lg font-black text-amber-800">{aiBriefing.estimated_workload_hours}h</p>
                  </div>
                  <div className="rounded-xl p-3 bg-rose-50 border border-rose-200 text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-rose-600">Risk</p>
                    <p className={`text-lg font-black ${aiBriefing.overall_risk_score > 60 ? 'text-red-600' : aiBriefing.overall_risk_score > 30 ? 'text-amber-700' : 'text-emerald-700'}`}>{aiBriefing.overall_risk_score}%</p>
                  </div>
                  <div className="rounded-xl p-3 bg-purple-50 border border-purple-200 text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-purple-600">Burnout</p>
                    <p className={`text-sm font-black capitalize ${(aiBriefing as any).burnout_level === 'critical' ? 'text-red-600' : (aiBriefing as any).burnout_level === 'high' ? 'text-amber-600' : 'text-emerald-600'}`}>{(aiBriefing as any).burnout_level || 'low'}</p>
                  </div>
                </div>

                {/* Overdue Tasks */}
                {(aiBriefing as any).overdue_tasks && Array.isArray((aiBriefing as any).overdue_tasks) && (aiBriefing as any).overdue_tasks.length > 0 && (
                  <div className="rounded-2xl p-3 bg-red-50 border border-red-200">
                    <p className="text-[9px] font-black uppercase tracking-widest text-red-600 mb-2">⚠️ Overdue</p>
                    {(aiBriefing as any).overdue_tasks.slice(0, 3).map((t: any, i: number) => (
                      <p key={i} className="text-xs text-red-800 font-semibold">• {t.title} <span className="text-red-500">({t.days_overdue}d overdue)</span></p>
                    ))}
                  </div>
                )}

                {/* Productivity Summary */}
                {(aiBriefing as any).productivity_summary && (
                  <p className="text-xs text-muted-foreground italic leading-relaxed">📊 {(aiBriefing as any).productivity_summary}</p>
                )}

                {/* Motivational Message */}
                <p className="text-sm font-semibold text-foreground text-center leading-relaxed">
                  {aiBriefing.motivational_message}
                </p>

                {/* Dismiss Button */}
                <button
                  onClick={() => {
                    localStorage.setItem('last_briefing_date', new Date().toISOString().split('T')[0])
                    setShowMorningBriefing(false)
                  }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white cursor-pointer transition-all hover:opacity-90 active:scale-[0.98] shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #154212 0%, #2d5a27 50%, #084042 100%)' }}
                >
                  Let's Go! 🚀
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Onboarding Modal Overlay */}
      <AnimatePresence>
        {showOnboarding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl z-10 overflow-hidden relative p-8"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-forest-gradient flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-black text-foreground mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Welcome to LifeSaver AI! 🌱</h2>
                <p className="text-muted-foreground">To tailor your dashboard and goals, tell me what best describes you.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'student', title: 'Student 🎓', desc: 'Focuses on courses, exams, & assignments' },
                  { id: 'developer', title: 'Developer 💻', desc: 'Focuses on coding, projects, & commits' },
                  { id: 'freelancer', title: 'Freelancer 💼', desc: 'Focuses on clients, contracts, & delivery' },
                  { id: 'entrepreneur', title: 'Entrepreneur 🚀', desc: 'Focuses on business growth & product MVPs' },
                ].map((type) => (
                  <button 
                    key={type.id}
                    onClick={() => handleCompleteOnboarding(type.id)}
                    disabled={isScanning}
                    className="p-5 rounded-2xl border border-surface-container-high bg-surface-container-low/50 hover:bg-primary-50 hover:border-primary-300 transition-all text-left flex flex-col gap-1 group cursor-pointer"
                  >
                    <span className="text-lg font-bold text-foreground group-hover:text-primary-800">{type.title}</span>
                    <span className="text-xs text-muted-foreground">{type.desc}</span>
                  </button>
                ))}
              </div>
              
              {isScanning && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                  <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-4" />
                  <p className="font-bold text-foreground">Customizing your experience...</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── GREETING HEADER BANNED ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Welcome back, <span className="text-primary-800">{profile.name}</span> ✨
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1.5 italic">
            "Your consistency is your strength. Let's make today count."
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-0 w-full md:w-auto">
          <button
            onClick={() => setShowTimeSimulator(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-full border border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100 font-extrabold text-xs transition-all shadow-sm cursor-pointer"
          >
            <Timer className="w-3.5 h-3.5" /> Time Simulator
          </button>
          <button
            onClick={() => setShowTour(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-full border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 font-extrabold text-xs transition-all shadow-sm cursor-pointer"
          >
            Guide Me
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('onboarding_done')
              sessionStorage.removeItem('onboarding_done_session')
              setShowOnboarding(true)
            }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-full border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 font-extrabold text-xs transition-all shadow-sm cursor-pointer"
          >
            Reset Demo
          </button>
          <button
            onClick={handleOpenVoiceAssistant}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary-300 bg-primary-50 text-primary-850 hover:bg-primary-100 font-extrabold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
            style={{ border: '1px solid rgba(21, 66, 18, 0.2)', background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(240, 248, 235, 0.9))' }}
          >
            <Mic className="w-4 h-4 text-primary-700 animate-pulse" />
            <span>Talk to Sage</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary-700 text-white font-black tracking-widest uppercase ml-1">Voice AI</span>
          </button>
        </div>
      </div>

      {/* AI Daily Brief Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-6 border shadow-xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(220, 245, 215, 0.55) 100%)',
          borderColor: 'rgba(74, 222, 128, 0.3)',
          backdropFilter: 'blur(20px)'
        }}
      >
        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 rounded-full bg-primary-200/20 blur-[50px] pointer-events-none" />
        <div className="absolute bottom-[-50px] left-[20%] w-36 h-36 rounded-full bg-secondary-200/10 blur-[40px] pointer-events-none" />
        
        {briefingLoading ? (
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative z-10 animate-pulse">
            <div className="flex-1 space-y-3 w-full">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary-700 animate-spin" />
                <span className="text-xs font-black uppercase tracking-widest text-primary-800">Sage is thinking...</span>
              </div>
              <div className="h-4 bg-primary-100/60 rounded-lg w-3/4" />
              <div className="h-3 bg-primary-100/40 rounded-lg w-1/2" />
            </div>
            <div className="flex gap-4 flex-shrink-0">
              <div className="w-32 h-12 bg-primary-100/30 rounded-lg" />
              <div className="w-24 h-12 bg-primary-100/30 rounded-lg" />
              <div className="w-24 h-12 bg-primary-100/30 rounded-lg" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative z-10">
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary-700" />
                <span className="text-xs font-black uppercase tracking-widest text-primary-800">AI Daily Briefing</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-black tracking-wider uppercase">Live</span>
                <button 
                  onClick={handleOpenVoiceAssistant}
                  className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/20 text-[9px] font-bold text-emerald-800 hover:bg-emerald-500/25 transition-all cursor-pointer"
                >
                  <Mic className="w-2.5 h-2.5 text-emerald-600" /> Listen
                </button>
              </div>
              <p className="text-sm font-semibold text-foreground leading-relaxed">
                {aiBrief.summary}
              </p>
              <p className="text-xs font-bold text-muted-foreground/80">
                {aiBrief.workloadMsg}
              </p>
              {aiBriefing?.suggested_focus && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                    💡 Focus {aiBriefing.suggested_focus.duration_minutes}min on "{aiBriefing.suggested_focus.task_title}" — Best time: {aiBriefing.suggested_focus.best_time}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 items-center border-t md:border-t-0 md:border-l border-green-500/15 pt-4 md:pt-0 md:pl-6 flex-shrink-0 w-full md:w-auto">
              {/* Recommended Next Task */}
              <div className="min-w-[150px]">
                <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest block">Recommended Next</span>
                <span className="text-xs font-bold text-primary-900 block truncate max-w-[180px] mt-1" title={aiBrief.recommendedTask}>
                  🎯 {aiBrief.recommendedTask}
                </span>
              </div>

              {/* Workload */}
              <div className="min-w-[100px]">
                <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest block">Est. Workload</span>
                <span className="text-xs font-bold text-foreground mt-1 block">
                  ⏱️ {aiBrief.estimatedTime}
                </span>
              </div>

              {/* Deadline Risk Score */}
              <div className="min-w-[100px]">
                <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest block">Deadline Risk</span>
                <span className={`text-xs font-bold mt-1 block ${aiBrief.riskScore > 60 ? 'text-red-600' : aiBrief.riskScore > 30 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {aiBrief.riskScore > 60 ? '🔴' : aiBrief.riskScore > 30 ? '⚠️' : '🟢'} {aiBrief.riskScore}/100
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard delay={0} icon={<CheckCircle2 className="w-5 h-5" />} color="bg-emerald-500/15 text-emerald-700"
          label="Tasks Completed" value={`${tasks.filter(t => t.status === 'completed').length}/${Math.max(1, tasks.length)}`}
          sub="Updated live" />
        <StatCard delay={0.05} icon={<Clock className="w-5 h-5" />} color="bg-blue-500/15 text-blue-700"
          label="Focus Time" value={`${Math.floor((gardenStats.plants * 25) / 60)}h ${(gardenStats.plants * 25) % 60}m`} sub="Estimated from plants" />
        <StatCard delay={0.1} icon={<Flame className="w-5 h-5" />} color="bg-orange-500/15 text-orange-700"
          label="Current Streak" value={`${gardenStats.streak} days 🔥`} sub={`Best: ${gardenStats.streak > 0 ? gardenStats.streak + 2 : 0} days`} />
        <StatCard delay={0.15} icon={<Leaf className="w-5 h-5" />} color="bg-emerald-500/15 text-emerald-700"
          label="Tree Level" value={`Lv. ${gardenStats.level} 🌳`} sub={`${gardenStats.plants * 25} total XP`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Tasks & Priority Engine */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-3xl border border-white/50 overflow-hidden flex flex-col min-h-[420px] shadow-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(248, 253, 245, 0.6) 100%)',
            backdropFilter: 'blur(20px)'
          }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container-high/60 bg-white/40">
            <div>
              <h2 className="font-extrabold text-foreground flex items-center gap-1.5 text-base">
                <Brain className="w-4.5 h-4.5 text-primary-700" /> AI Priority Engine
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Tasks auto-categorized by urgency & priority</p>
            </div>
            <button onClick={() => navigate('/app/focus')} className="badge-forest text-xs cursor-pointer hover:opacity-85 transition-opacity px-3.5 py-1.5 rounded-full font-bold">
              ⚡ Focus Mode
            </button>
          </div>

          {/* AI Priority Tabs */}
          <div className="flex border-b border-surface-container-high/50 px-4 sm:px-6 bg-white/20 overflow-x-auto custom-scrollbar no-scrollbar">
            {[
              { id: 'doNow', label: 'Do Now 🚨', count: categorized.doNow.length, color: 'text-red-750 border-red-500' },
              { id: 'doToday', label: 'Do Today 📅', count: categorized.doToday.length, color: 'text-primary-800 border-primary-600' },
              { id: 'scheduleLater', label: 'Schedule Later ⏳', count: categorized.scheduleLater.length, color: 'text-muted-foreground border-surface-dim' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTaskTab(tab.id as any)}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all -mb-px flex items-center gap-1.5 cursor-pointer ${
                  activeTaskTab === tab.id
                    ? `${tab.color.split(' ')[0]} ${tab.color.split(' ')[1]}`
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                  activeTaskTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-black/10 text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="divide-y divide-white/40 flex-1">
            {activeTasks.length > 0 ? (
              activeTasks.map((task, i) => (
                <motion.div key={task.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-white/30 transition-colors group">
                  <button 
                    onClick={() => handleToggleTask(task.id)}
                    className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2 transition-all cursor-pointer ${
                      task.status === 'completed' ? 'bg-primary-700 border-primary-700' : 'border-black/15 hover:border-primary-400'
                    }`}
                  >
                    {task.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {task.title}
                    </p>
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">Due: {formatRelativeDate(task.due_date)}</p>
                    )}
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-black flex-shrink-0 uppercase ${priorityColors[task.priority]}`}>
                    {task.priority}
                  </span>
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <span className="text-3xl mb-2">🌱</span>
                <p className="text-sm font-bold text-foreground">No pending tasks in this category!</p>
                <p className="text-xs text-muted-foreground mt-1">Excellent work keeping your dashboard clear.</p>
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-white/30 bg-white/40 flex items-center justify-between">
            <button 
              onClick={() => setIsAddingTask(true)}
              className="flex items-center gap-2 text-xs text-primary-800 hover:text-primary-950 font-black transition-colors cursor-pointer bg-white px-3 py-1.5 rounded-lg shadow-sm border border-primary-200"
            >
              <Plus className="w-4 h-4" /> Add custom task
            </button>
            
            {/* Magic Whiteboard Button */}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleImageUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-black uppercase tracking-wider transition-all shadow-sm disabled:opacity-50"
            >
              {isScanning ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Scanning...</>
              ) : (
                <><Camera className="w-3.5 h-3.5" /> Magic Scan</>
              )}
            </button>
          </div>
        </motion.div>

        {/* Right column */}
        <div className="space-y-4">
          {/* AI Recommendations */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-3xl border border-white/50 overflow-hidden shadow-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(248, 253, 245, 0.6) 100%)',
              backdropFilter: 'blur(20px)'
            }}
          >
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/30 bg-white/20">
              <Brain className="w-4 h-4 text-primary-700" />
              <h2 className="font-bold text-sm text-foreground">AI Insights</h2>
            </div>
            <div className="divide-y divide-white/30">
              {dynamicInsights.map((rec) => (
                <div key={rec.id} className="px-5 py-3.5 hover:bg-white/40 transition-colors cursor-pointer">
                  <p className="text-sm font-bold text-foreground mb-1">{rec.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{rec.content}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Risk Meter */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="rounded-3xl border border-white/50 p-5 shadow-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(248, 253, 245, 0.6) 100%)',
              backdropFilter: 'blur(20px)'
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="font-bold text-sm text-foreground">Deadline Risk</h2>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Overall risk score</span>
              <span className="text-amber-700 font-extrabold text-sm">{aiBrief.riskScore}/100</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden bg-black/10 mb-3">
              <motion.div className="h-3 rounded-full animate-pulse-soft"
                style={{ background: 'linear-gradient(90deg, #3b8f31, #f4843a)' }}
                initial={{ width: 0 }}
                animate={{ width: `${aiBrief.riskScore}%` }}
                transition={{ duration: 1, delay: 0.6 }} />
            </div>
            <p className="text-xs text-muted-foreground mb-3">Medium risk — 1 deadline approaching</p>
            <button onClick={() => navigate('/app/emergency')}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all hover:shadow-md cursor-pointer"
              style={{ background: 'rgba(186,26,26,0.08)', color: '#ba1a1a', border: '1px solid rgba(186,26,26,0.2)' }}>
              <Zap className="w-3.5 h-3.5" /> Save My Deadline™
            </button>
          </motion.div>

          {/* AI Burnout / Wellness Check */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
            className="rounded-3xl border border-white/50 p-5 shadow-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(248, 253, 245, 0.6) 100%)',
              backdropFilter: 'blur(20px)'
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Heart className={`w-4 h-4 ${burnoutReport && burnoutReport.burnout_score > 60 ? 'text-red-500 animate-pulse' : 'text-rose-500'}`} />
              <h2 className="font-bold text-sm text-foreground">Wellness Check</h2>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-black tracking-wider uppercase ml-auto">AI</span>
            </div>
            {burnoutLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-8 bg-rose-100/40 rounded-lg w-1/3" />
                <div className="h-3 bg-rose-100/30 rounded-lg w-full" />
                <div className="h-3 bg-rose-100/30 rounded-lg w-2/3" />
              </div>
            ) : burnoutReport ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Burnout risk</span>
                  <span className={`font-extrabold text-sm capitalize ${burnoutReport.stress_level === 'critical' ? 'text-red-600' : burnoutReport.stress_level === 'high' ? 'text-amber-600' : burnoutReport.stress_level === 'moderate' ? 'text-yellow-600' : 'text-emerald-600'}`}>
                    {burnoutReport.stress_level}
                  </span>
                </div>
                <div className="h-3 rounded-full overflow-hidden bg-black/10">
                  <motion.div className="h-3 rounded-full"
                    style={{ background: burnoutReport.burnout_score > 60 ? 'linear-gradient(90deg, #ef4444, #dc2626)' : burnoutReport.burnout_score > 30 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #10b981, #f59e0b)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${burnoutReport.burnout_score}%` }}
                    transition={{ duration: 1, delay: 0.5 }} />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  {burnoutReport.positive_signs.slice(0, 2).map((sign, i) => (
                    <p key={i} className="flex items-center gap-1"><span className="text-emerald-500">✓</span> {sign}</p>
                  ))}
                  {burnoutReport.contributing_factors.slice(0, 1).map((factor, i) => (
                    <p key={i} className="flex items-center gap-1"><span className="text-amber-500">!</span> {factor}</p>
                  ))}
                </div>
                {burnoutReport.burnout_score > 50 && (
                  <button onClick={() => navigate('/app/focus')}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer mt-1">
                    <Heart className="w-3 h-3" /> Take a Break
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Unable to load wellness data.</p>
            )}
          </motion.div>

          {/* Deep Work Quick-Start */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="rounded-3xl border border-white/50 p-5 cursor-pointer hover:shadow-2xl transition-all shadow-xl group"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(248, 253, 245, 0.6) 100%)',
              backdropFilter: 'blur(20px)'
            }}
            onClick={() => navigate('/app/focus')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-700" />
                <h2 className="font-bold text-sm text-foreground">Deep Work</h2>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-600 transition-colors" />
            </div>
            
            <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100/50 relative overflow-hidden transition-all group-hover:bg-purple-100/40">
               <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:scale-110">
                 <Brain className="w-14 h-14 text-purple-600" />
               </div>
               <p className="text-sm font-bold text-purple-900 relative z-10">Enter Flow State</p>
               <p className="text-xs text-purple-700/80 mt-1 relative z-10 max-w-[150px] leading-relaxed">
                 Block distractions, play lofi, and focus on your top priority.
               </p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">Ready for a focus session?</span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full group-hover:bg-purple-600 group-hover:text-white transition-colors">
                Start Timer
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Goals Overview */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="rounded-3xl border border-white/50 overflow-hidden shadow-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(248, 253, 245, 0.6) 100%)',
          backdropFilter: 'blur(20px)'
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/30 bg-white/20">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary-700" />
            <h2 className="font-extrabold text-foreground text-sm">Active Goals</h2>
          </div>
          <button onClick={() => navigate('/app/goals')}
            className="text-xs text-primary-700 hover:text-primary-900 font-bold flex items-center gap-1 cursor-pointer">
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="divide-y divide-white/30">
          <div className="px-6 py-4 text-center">
            <p className="text-sm font-semibold text-muted-foreground">Goals sync is handled in the Goals tab</p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showTour && <ProductTour onClose={() => setShowTour(false)} />}
      </AnimatePresence>

      {/* Add Task Modal */}
      <AnimatePresence>
        {isAddingTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsAddingTask(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl z-10 overflow-hidden relative"
            >
              <div className="p-5 border-b border-surface-container-high bg-surface-container-low/50 flex justify-between items-center">
                <h3 className="font-bold text-foreground">Create New Task</h3>
                <button onClick={() => setIsAddingTask(false)} className="p-1 rounded hover:bg-surface-container cursor-pointer transition-colors">
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Task Name</label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. Finish the presentation for Friday"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitNewTask()}
                    className="w-full bg-surface-container-low border border-surface-container-high text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-medium placeholder:text-muted-foreground/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Priority</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['low', 'medium', 'high', 'critical'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setNewTaskPriority(p)}
                        className={`py-2.5 rounded-xl border text-xs font-black transition-all capitalize cursor-pointer flex items-center justify-center gap-1.5 ${
                          newTaskPriority === p 
                            ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm'
                            : 'bg-white border-surface-container-high text-muted-foreground hover:bg-surface-container-low'
                        }`}
                      >
                        {p === 'low' && '🟢'}
                        {p === 'medium' && '🔵'}
                        {p === 'high' && '🟠'}
                        {p === 'critical' && '🔴'}
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={submitNewTask}
                  className="w-full py-3.5 mt-2 rounded-xl bg-primary-600 text-white font-black hover:bg-primary-700 transition-all shadow-md active:scale-[0.98] cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #154212 0%, #2d5a27 100%)' }}
                >
                  Create Task
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Time Simulator Modal */}
      <AnimatePresence>
        {showTimeSimulator && (
          <TimeSimulatorModal onClose={() => setShowTimeSimulator(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
