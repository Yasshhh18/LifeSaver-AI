import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target, Plus, ChevronDown, CheckCircle2, Bot, 
  ArrowRight, Brain, Sparkles, Calendar, TrendingUp, X, CheckSquare, PlusCircle, Loader2, MessageSquare, AlertTriangle
} from 'lucide-react'
import { mockGoals } from '@/services/mockData'
import { formatRelativeDate } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { getGoals, createGoal, updateGoal } from '@/services/dataService'
import { generateRoadmap, chatWithAI, generateAdaptiveRoadmapUpdate } from '@/services/geminiService'
import type { Goal, AdaptiveRoadmapUpdate } from '@/types/database'

// Goal interface is imported from database types
interface MilestoneSubTask {
  id: string
  title: string
  completed: boolean
}

interface AIMilestone {
  id: string
  title: string
  description: string
  week: string
  completed: boolean
  subtasks: MilestoneSubTask[]
}

interface GoalRoadmap {
  milestones: AIMilestone[]
  successProbability: number
  completionDate: string
}

// Legacy Mock AI removed
import { useToast } from '@/contexts/ToastContext'

export default function GoalsPage() {
  const { toast } = useToast()
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  
  // Roadmap cache map (goalId -> Roadmap)
  const [roadmaps, setRoadmaps] = useState<Record<string, GoalRoadmap>>({})
  const [loadingAI, setLoadingAI] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // AI Coach state
  const [showCoachModal, setShowCoachModal] = useState(false)
  const [coachLoading, setCoachLoading] = useState(false)
  const [coachResponse, setCoachResponse] = useState<string | null>(null)

  // Adaptive Roadmap state
  const [adaptiveUpdate, setAdaptiveUpdate] = useState<AdaptiveRoadmapUpdate | null>(null)
  const [adaptingRoadmap, setAdaptingRoadmap] = useState(false)
  const [showAdaptiveView, setShowAdaptiveView] = useState(false)

  // New Goal Form State
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalDesc, setNewGoalDesc] = useState('')
  const [newGoalCategory, setNewGoalCategory] = useState<'career' | 'project' | 'study'>('career')
  const [newGoalTargetDate, setNewGoalTargetDate] = useState(
    new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const { user } = useAuth()

  useEffect(() => {
    const loadGoalsData = async () => {
      if (!user) return
      
      try {
        let fetchedGoals = await getGoals(user.uid)
        
        // Auto-seed mock goals if empty to show features
        if (fetchedGoals.length === 0) {
          for (const mockGoal of mockGoals) {
            const { id, user_id, created_at, updated_at, ...goalData } = mockGoal as any
            await createGoal({ ...goalData, user_id: user.uid })
          }
          fetchedGoals = await getGoals(user.uid)
        }

        setGoals(fetchedGoals)

        // Automatically select first goal if none selected
        if (fetchedGoals.length > 0 && !selectedGoal) {
          setSelectedGoal(fetchedGoals[0])
        }

        const savedRoadmaps = localStorage.getItem('ls_roadmaps')
        if (savedRoadmaps) {
          setRoadmaps(JSON.parse(savedRoadmaps))
        }
      } catch (e) {
        console.error('Failed to load goals:', e)
      }
    }

    loadGoalsData()
  }, [user])

  const handleSelectGoal = (goal: Goal) => {
    setSelectedGoal(goal)
  }

  // Add subtask as task to Dashboard list
  const handleAddAsDashboardTask = (taskTitle: string) => {
    const savedTasks = localStorage.getItem('ls_tasks')
    const currentTasks = savedTasks ? JSON.parse(savedTasks) : []
    
    const newTask = {
      id: 't_g_' + Date.now() + Math.random().toString(36).substr(2, 4),
      user_id: 'u1',
      title: taskTitle,
      description: `From Goal Milestone: ${selectedGoal?.title}`,
      status: 'todo' as const,
      priority: 'high' as const,
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const updated = [...currentTasks, newTask]
    localStorage.setItem('ls_tasks', JSON.stringify(updated))
    window.dispatchEvent(new Event('tasks_updated'))
    toast(`"${taskTitle}" added to your Daily Brief tasks! 🚀`, 'success')
  }

  // Toggle milestone subtask completion
  const handleToggleSubTask = (milestoneId: string, subTaskId: string) => {
    if (!selectedGoal) return

    const currentRoadmap = roadmaps[selectedGoal.id]
    if (!currentRoadmap) return

    const updatedMilestones = currentRoadmap.milestones.map(ms => {
      if (ms.id === milestoneId) {
        const updatedSubtasks = ms.subtasks.map(st => 
          st.id === subTaskId ? { ...st, completed: !st.completed } : st
        )
        const allCompleted = updatedSubtasks.every(st => st.completed)
        return {
          ...ms,
          subtasks: updatedSubtasks,
          completed: allCompleted
        }
      }
      return ms
    })

    const updatedRoadmap = {
      ...currentRoadmap,
      milestones: updatedMilestones
    }

    // Calculate overall Goal progress percentage
    const totalSubtasks = updatedMilestones.reduce((acc, ms) => acc + ms.subtasks.length, 0)
    const completedSubtasks = updatedMilestones.reduce(
      (acc, ms) => acc + ms.subtasks.filter(st => st.completed).length, 0
    )
    const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0

    // Update States
    const updatedRoadmapsMap = {
      ...roadmaps,
      [selectedGoal.id]: updatedRoadmap
    }
    setRoadmaps(updatedRoadmapsMap)
    localStorage.setItem('ls_roadmaps', JSON.stringify(updatedRoadmapsMap))

    const updatedGoals = goals.map(g => 
      g.id === selectedGoal.id ? { ...g, progress_percent: progressPercent } : g
    )
    setGoals(updatedGoals)
    setSelectedGoal({ ...selectedGoal, progress_percent: progressPercent })
    
    // Update goal in Firebase
    updateGoal(selectedGoal.id, { progress_percent: progressPercent }).catch(console.error)

    // Dispatch global sync event
    window.dispatchEvent(new Event('goals_updated'))

    // Increment garden plant if progress is 100%
    if (progressPercent === 100) {
      const savedGarden = localStorage.getItem('ls_garden')
      const garden = savedGarden ? JSON.parse(savedGarden) : { total_plants: 14, level: 3, current_streak: 5 }
      garden.total_plants = (garden.total_plants || 0) + 5 // +5 plants for goal completion (Tree equivalent)
      localStorage.setItem('ls_garden', JSON.stringify(garden))
      window.dispatchEvent(new Event('garden_updated'))
    }
  }

  // Create Goal Roadmap via AI Planner
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGoalTitle || !user) return

    setLoadingAI(true)
    setShowAddModal(false)

    try {
      const targetIso = new Date(newGoalTargetDate).toISOString()

      const newGoalParams = {
        user_id: user.uid,
        title: newGoalTitle,
        description: newGoalDesc || `Roadmap to ${newGoalTitle}`,
        category: newGoalCategory,
        progress_percent: 0,
        target_date: targetIso,
        status: 'in_progress',
        ai_generated: true
      }
      
      const createdGoal = await createGoal(newGoalParams as any)

      // Use real Gemini API
      const aiPlanResponse = await generateRoadmap(user.uid, newGoalTitle, createdGoal.id)
      
      const mappedMilestones = aiPlanResponse.weeks.map((w: any, idx: number) => ({
        id: `ams_${Date.now()}_${idx}`,
        title: w.name,
        description: `Actionable tasks for ${w.name}`,
        week: w.name,
        completed: false,
        subtasks: w.tasks.map((t: string, tidx: number) => ({
          id: `ast_${Date.now()}_${idx}_${tidx}`,
          title: t,
          completed: false
        }))
      }))
      
      const aiPlan: GoalRoadmap = {
        milestones: mappedMilestones,
        successProbability: aiPlanResponse.probability,
        completionDate: targetIso.split('T')[0]
      }

      // Update LocalStorage and State
      const updatedGoals = [createdGoal, ...goals]
      const updatedRoadmaps = { ...roadmaps, [createdGoal.id]: aiPlan }

      setGoals(updatedGoals)
      setRoadmaps(updatedRoadmaps)
      localStorage.setItem('ls_roadmaps', JSON.stringify(updatedRoadmaps))

      setSelectedGoal(createdGoal)
    } catch (error) {
      console.error('Failed to create goal:', error)
      toast("Failed to generate goal. Please try again.", "error")
    } finally {
      setLoadingAI(false)
    }

    // Reset Form
    setNewGoalTitle('')
    setNewGoalDesc('')
    setNewGoalCategory('career')

    window.dispatchEvent(new Event('goals_updated'))
    toast(`Goal roadmap created for "${newGoalTitle}"!`, 'success')
  }

  const activeRoadmap = selectedGoal ? roadmaps[selectedGoal.id] : null
  
  const handleGenerateMissingRoadmap = async (goalId: string) => {
    const goal = goals.find(g => g.id === goalId)
    if (!goal || !user) return

    setLoadingAI(true)
    try {
      const aiPlanResponse = await generateRoadmap(user.uid, goal.title, goal.id)
      
      const mappedMilestones = aiPlanResponse.weeks.map((w: any, idx: number) => ({
        id: `ams_${Date.now()}_${idx}`,
        title: w.name,
        description: `Actionable tasks for ${w.name}`,
        week: w.name,
        completed: false,
        subtasks: w.tasks.map((t: string, tidx: number) => ({
          id: `ast_${Date.now()}_${idx}_${tidx}`,
          title: t,
          completed: false
        }))
      }))
      
      const targetIso = goal.target_date || new Date().toISOString()
      
      const aiPlan: GoalRoadmap = {
        milestones: mappedMilestones,
        successProbability: aiPlanResponse.probability,
        completionDate: targetIso.split('T')[0]
      }

      const updatedRoadmaps = { ...roadmaps, [goal.id]: aiPlan }
      setRoadmaps(updatedRoadmaps)
      localStorage.setItem('ls_roadmaps', JSON.stringify(updatedRoadmaps))
      
      toast(`Roadmap generated for "${goal.title}"!`, 'success')
    } catch (error) {
      console.error('Failed to generate roadmap:', error)
      toast("Failed to generate roadmap. Please try again.", "error")
    } finally {
      setLoadingAI(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr,420px] gap-6 max-w-6xl mx-auto relative">
      {/* Left: Active Goals List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-foreground">My Goals</h2>
            <p className="text-xs text-muted-foreground mt-0.5">High-level milestones planned by LifeSaver AI</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary py-2 px-4 text-xs shadow-soft font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Goal Planner
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <motion.div key={goal.id}
              onClick={() => handleSelectGoal(goal)}
              className={`bg-white rounded-2xl p-5 shadow-card border cursor-pointer transition-all ${
                selectedGoal?.id === goal.id 
                  ? 'border-primary-500 ring-2 ring-primary-100' 
                  : 'border-surface-container-high hover:border-primary-300'
              }`}>
              <div className="flex justify-between items-start mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                  goal.category === 'career' ? 'bg-primary-50' : goal.category === 'project' ? 'bg-amber-50' : 'bg-tertiary-50'
                }`}>
                  {goal.category === 'career' ? '💼' : goal.category === 'project' ? '🚀' : '📚'}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  goal.progress_percent === 100 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-primary-50 text-primary-700'
                }`}>
                  {goal.progress_percent}%
                </span>
              </div>
              <h3 className="font-extrabold text-foreground text-sm line-clamp-1">{goal.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[32px]">{goal.description}</p>
              
              <div className="mt-4 pt-3 border-t border-surface-container-high flex justify-between items-center text-xs text-muted-foreground">
                <span>{goal.target_date ? formatRelativeDate(goal.target_date) : 'No date'}</span>
                <span className="capitalize font-semibold text-primary-750">{goal.category}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right: Goal Path / Milestones */}
      <div className="bg-white rounded-3xl p-6 shadow-card border border-surface-container-high relative overflow-hidden flex flex-col min-h-[400px] lg:h-[calc(100vh-120px)] lg:sticky lg:top-24">
        
        {/* Empty State */}
        {!selectedGoal && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-surface-container-lowest z-10">
            <Target className="w-12 h-12 text-surface-container-highest mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">Select a Goal</h3>
            <p className="text-sm text-muted-foreground">Choose a goal from the list to view its path or use AI to generate milestones.</p>
          </div>
        )}

        {/* Path View */}
        {selectedGoal && (
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col">
            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low border border-surface-container-high text-xs font-bold text-foreground mb-2.5">
                <Brain className="w-3.5 h-3.5 text-primary-700 animate-pulse-soft" /> AI Goal Path Planner
              </div>
              <h3 className="text-lg font-extrabold text-foreground leading-tight mb-1">{selectedGoal.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{selectedGoal.description}</p>
            </div>

            {/* AI Success Probability & Predicted completion date */}
            {activeRoadmap && (
              <div className="p-3 bg-surface-container-low border border-surface-container rounded-2xl mb-4 text-xs flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Success Probability</span>
                    <span className="font-extrabold text-primary-700 text-sm block mt-0.5">
                      📈 {activeRoadmap.successProbability}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Est. Completion</span>
                    <span className="font-extrabold text-foreground text-sm block mt-0.5">
                      📅 {activeRoadmap.completionDate}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      if (!user || !selectedGoal) return
                      setShowCoachModal(true)
                      setCoachLoading(true)
                      setCoachResponse(null)
                      try {
                        let contextString = ""
                        if (activeRoadmap) {
                          const currentMilestone = activeRoadmap.milestones.find(ms => !ms.completed)
                          if (currentMilestone) {
                            const pendingTasks = currentMilestone.subtasks.filter(st => !st.completed).map(st => st.title)
                            contextString = `My current focus is "${currentMilestone.title}" (Tasks: ${pendingTasks.join(', ')}).`
                          }
                        }

                        const prompt = `I am working on my goal: "${selectedGoal.title}". It's currently at ${selectedGoal.progress_percent}% completion. ${contextString}

Give me:
1. A short motivating message (2-3 sentences, be direct and practical — NO metaphors, NO nature references, NO poetry)
2. One specific blocker I might face
3. One practical fix for that blocker

Keep it under 80 words total. Use simple, clear language. Use 1-2 emojis max. Be like a straightforward friend, not a philosopher.`
                        
                        const response = await chatWithAI(user.uid, prompt)
                        setCoachResponse(response)
                      } catch (err) {
                        console.error('Coach failed:', err)
                        setCoachResponse('Failed to reach your coach. Try again later.')
                      } finally {
                        setCoachLoading(false)
                      }
                    }}
                    className="flex-1 flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all font-bold cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Consult Coach
                  </button>
                  <button
                    onClick={async () => {
                      if (!user || !selectedGoal || !activeRoadmap) return
                      setAdaptingRoadmap(true)
                      setAdaptiveUpdate(null)
                      setShowAdaptiveView(true)
                      try {
                        console.log('[AdaptRoadmap] Starting...')
                        const originalWeeks = activeRoadmap.milestones.map(ms => ({
                          name: ms.week || ms.title,
                          tasks: ms.subtasks.map(st => st.title)
                        }))
                        const completed = activeRoadmap.milestones.filter(ms => ms.completed).map(ms => ms.title)
                        const missed = activeRoadmap.milestones.filter(ms => !ms.completed).map(ms => ms.title)
                        console.log('[AdaptRoadmap] Calling AI with', { originalWeeks: originalWeeks.length, completed: completed.length, missed: missed.length })
                        const result = await generateAdaptiveRoadmapUpdate(user.uid, selectedGoal.title, originalWeeks, completed, missed)
                        console.log('[AdaptRoadmap] AI result:', JSON.stringify(result).substring(0, 300))
                        if (result && result.adjusted_weeks) {
                          setAdaptiveUpdate(result)
                          toast('Roadmap adapted successfully! ✨', 'success')
                        } else {
                          console.error('[AdaptRoadmap] Result missing adjusted_weeks:', result)
                          throw new Error('AI returned incomplete data')
                        }
                      } catch (err: any) {
                        console.error('[AdaptRoadmap] Failed:', err)
                        toast(`Adapt Roadmap failed: ${err?.message || 'Unknown error'}`, 'error')
                        // Generate a smart local fallback from existing roadmap data
                        const fallbackWeeks = activeRoadmap.milestones.map(ms => ({
                          name: ms.week || ms.title,
                          tasks: ms.subtasks.map(st => st.title),
                          status: ms.completed ? 'completed' as const : 
                                  ms.subtasks.some(st => st.completed) ? 'behind' as const : 
                                  'adjusted' as const
                        }))
                        setAdaptiveUpdate({
                          original_title: selectedGoal.title,
                          adjusted_weeks: fallbackWeeks,
                          recovery_suggestions: [
                            'Focus on completing one task at a time',
                            'Break larger tasks into smaller subtasks',
                            'Set specific daily time blocks for this goal'
                          ],
                          updated_probability: Math.max(10, (activeRoadmap.successProbability || 50) - 10),
                          reasoning: `AI generation encountered an issue (${err?.message || 'unknown'}). Showing your current roadmap status as a fallback. Click "Adapt Roadmap" again to retry with AI.`
                        })
                      } finally {
                        setAdaptingRoadmap(false)
                      }
                    }}
                    disabled={adaptingRoadmap}
                    className="flex-1 flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all font-bold cursor-pointer disabled:opacity-50"
                  >
                    {adaptingRoadmap ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Adapt Roadmap
                  </button>
                </div>
              </div>
            )}

            {/* Behind Schedule Banner */}
            {activeRoadmap && activeRoadmap.milestones.some(ms => !ms.completed) && selectedGoal.progress_percent < 50 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-3 bg-amber-50 border border-amber-200 flex items-center gap-3 mb-4"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-800">Your roadmap for "{selectedGoal.title}" may be behind schedule.</p>
                  <p className="text-[10px] text-amber-600 mt-0.5">Click "Adapt Roadmap" above to let Sage adjust your plan based on actual progress.</p>
                </div>
              </motion.div>
            )}

            {/* Adaptive Roadmap View */}
            {showAdaptiveView && (
              <div className="mb-4">
                  <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <h4 className="text-sm font-bold text-amber-800">Adapted Roadmap</h4>
                      </div>
                      <button onClick={() => setShowAdaptiveView(false)} className="text-[10px] font-bold text-amber-600 hover:text-amber-800 cursor-pointer">Close</button>
                    </div>
                    {adaptingRoadmap ? (
                      <div className="flex items-center justify-center py-6 gap-2">
                        <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                        <span className="text-sm font-bold text-amber-700">Sage is adapting your plan...</span>
                      </div>
                    ) : adaptiveUpdate ? (() => {
                      // Normalize weeks data - handle different possible response shapes
                      const weeks = adaptiveUpdate.adjusted_weeks 
                        || (adaptiveUpdate as any).adjustedWeeks 
                        || (adaptiveUpdate as any).weeks 
                        || [];
                      const normalizedWeeks = Array.isArray(weeks) ? weeks.map((w: any) => ({
                        name: w.name || w.week || w.title || 'Unnamed Week',
                        tasks: Array.isArray(w.tasks) ? w.tasks : 
                               Array.isArray(w.items) ? w.items : [],
                        status: w.status || 'on_track'
                      })) : [];
                      const probability = adaptiveUpdate.updated_probability 
                        ?? (adaptiveUpdate as any).updatedProbability 
                        ?? (adaptiveUpdate as any).probability ?? 0;
                      const suggestions = adaptiveUpdate.recovery_suggestions 
                        || (adaptiveUpdate as any).recoverySuggestions 
                        || (adaptiveUpdate as any).suggestions 
                        || [];
                      const reasoning = adaptiveUpdate.reasoning 
                        || (adaptiveUpdate as any).summary 
                        || '';

                      return (
                        <div className="space-y-3">
                          {reasoning && <p className="text-xs text-amber-800 italic">{reasoning}</p>}
                          
                          {normalizedWeeks.length > 0 ? (
                            <div className="space-y-2">
                              {normalizedWeeks.map((week: any, i: number) => (
                                <div key={i} className={`rounded-xl p-3 border ${
                                  week.status === 'completed' ? 'bg-emerald-50 border-emerald-200' :
                                  week.status === 'behind' ? 'bg-red-50 border-red-200' :
                                  week.status === 'adjusted' ? 'bg-amber-50 border-amber-300' :
                                  'bg-white border-gray-200'
                                }`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold">{week.name}</span>
                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                      week.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                      week.status === 'behind' ? 'bg-red-100 text-red-700' :
                                      week.status === 'adjusted' ? 'bg-amber-100 text-amber-700' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>{week.status}</span>
                                  </div>
                                  <div className="space-y-0.5">
                                    {week.tasks.map((task: any, j: number) => (
                                      <p key={j} className="text-[10px] text-muted-foreground">• {typeof task === 'string' ? task : task?.title || task?.name || JSON.stringify(task)}</p>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-xl p-3 border border-amber-300 bg-amber-50">
                              <p className="text-xs text-amber-700 font-bold mb-1">⚠️ AI returned data but no weekly plan was found.</p>
                              <p className="text-[10px] text-amber-600 break-all">{JSON.stringify(adaptiveUpdate).substring(0, 400)}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            <div className="flex-1 rounded-lg p-2 bg-emerald-50 border border-emerald-200 text-center">
                              <p className="text-[9px] font-black text-emerald-600 uppercase">Updated Probability</p>
                              <p className="text-sm font-black text-emerald-700">{probability}%</p>
                            </div>
                            {Array.isArray(suggestions) && suggestions.length > 0 && (
                            <div className="flex-1 rounded-lg p-2 bg-blue-50 border border-blue-200">
                              <p className="text-[9px] font-black text-blue-600 uppercase mb-0.5">Recovery Tips</p>
                              {suggestions.slice(0, 2).map((s: string, i: number) => (
                                <p key={i} className="text-[10px] text-blue-700">• {s}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })() : (
                      <p className="text-xs text-amber-600 text-center py-4">Could not adapt the roadmap. Try again.</p>
                    )}
                  </div>
              </div>
            )}

            {/* Timeline View */}
            <div className="mt-2 flex-1">
              {loadingAI ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                    <Bot className="w-8 h-8 text-primary-500" />
                  </motion.div>
                  <p className="text-sm font-medium">AI is breaking down your goal...</p>
                </div>
              ) : activeRoadmap ? (
                <div className="relative border-l-2 border-surface-container-high ml-4 space-y-6 pb-6">
                  {activeRoadmap.milestones.map((ms) => (
                    <div key={ms.id} className="relative pl-6 group">
                      
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 bg-white transition-colors ${
                        ms.completed ? 'border-primary-600 bg-primary-600' : 'border-surface-container-highest group-hover:border-primary-400'
                      }`}>
                        {ms.completed && <CheckCircle2 className="w-3.5 h-3.5 text-white absolute -left-0.5 -top-0.5" />}
                      </div>

                      <div className="bg-surface-container-low rounded-xl p-3.5 border border-surface-container-high group-hover:border-primary-200 transition-colors">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <h4 className={`font-bold text-xs ${ms.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {ms.title}
                          </h4>
                          {ms.week !== ms.title && (
                            <span className="text-[9px] font-bold text-primary-750 bg-primary-50 px-1.5 py-0.5 rounded">
                              {ms.week}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-3">{ms.description}</p>
                        
                        {/* Milestone Subtasks checklist */}
                        <div className="space-y-2 pt-2 border-t border-surface-container-high/60">
                          {ms.subtasks.map((st) => (
                            <div key={st.id} className="group/task flex items-start justify-between gap-2 text-xs py-0.5">
                              <label className="flex items-start gap-2 cursor-pointer select-none">
                                <input 
                                  type="checkbox"
                                  checked={st.completed}
                                  onChange={() => handleToggleSubTask(ms.id, st.id)}
                                  className="w-3.5 h-3.5 text-primary-600 rounded border-surface-container accent-primary-700 cursor-pointer mt-0.5 flex-shrink-0"
                                />
                                <span className={st.completed ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}>
                                  {st.title}
                                </span>
                              </label>
                              
                              {!st.completed && (
                                <button 
                                  onClick={() => handleAddAsDashboardTask(st.title)}
                                  className="text-[10px] text-primary-700 font-bold hover:text-primary-800 flex items-center gap-0.5 opacity-0 group-hover/task:opacity-100 transition-opacity flex-shrink-0"
                                  title="Add as actionable task to Dashboard"
                                >
                                  <PlusCircle className="w-3 h-3" /> Add Task
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Final target */}
                  <div className="relative pl-6 pt-4">
                    <div className="absolute -left-[13px] top-5 w-6 h-6 rounded-full bg-forest-gradient border-2 border-white flex items-center justify-center shadow-glow-green">
                      <Target className="w-3 h-3 text-white" />
                    </div>
                    <p className="font-extrabold text-sm text-foreground">Goal Completed!</p>
                    <p className="text-[10px] text-muted-foreground">Estimated: {selectedGoal.target_date ? formatRelativeDate(selectedGoal.target_date) : 'No date'}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 mb-4">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-xl font-black text-foreground mb-2">No Roadmap Yet</h4>
                  <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">Let LifeSaver AI analyze this goal and generate a step-by-step path to success.</p>
                  <button 
                    onClick={() => handleGenerateMissingRoadmap(selectedGoal.id)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" /> Generate AI Goal Planner
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Custom Goal Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white/95 border border-surface-container-high rounded-3xl p-6 w-full max-w-md shadow-large z-10 overflow-hidden relative"
            >
              <button 
                onClick={() => setShowAddModal(false)} 
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-surface-container transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary-700" />
                <h3 className="font-extrabold text-lg text-foreground">AI Goal Planner</h3>
              </div>

              <form onSubmit={handleCreateGoal} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">What goal are you aiming for?</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Get software engineering internship"
                    value={newGoalTitle} 
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    className="input-base text-xs py-2.5 px-3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Brief Description</label>
                  <textarea 
                    rows={2}
                    placeholder="Describe any target parameters or projects..."
                    value={newGoalDesc} 
                    onChange={(e) => setNewGoalDesc(e.target.value)}
                    className="input-base text-xs py-2.5 px-3 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Goal Category</label>
                    <select
                      value={newGoalCategory}
                      onChange={(e) => setNewGoalCategory(e.target.value as any)}
                      className="input-base text-xs py-2 px-3 bg-white"
                    >
                      <option value="career">💼 Career</option>
                      <option value="project">🚀 Project</option>
                      <option value="study">📚 Study</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Target Date</label>
                    <input 
                      type="date" 
                      value={newGoalTargetDate} 
                      onChange={(e) => setNewGoalTargetDate(e.target.value)}
                      className="input-base text-xs py-2 px-3 bg-white"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="btn-primary w-full text-xs py-3 rounded-xl font-bold flex items-center justify-center gap-2 mt-2"
                >
                  <Sparkles className="w-4 h-4 text-accent" /> Generate AI Roadmap
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Coach Modal */}
      <AnimatePresence>
        {showCoachModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowCoachModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 z-10 overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
              
              <button 
                onClick={() => setShowCoachModal(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-foreground leading-tight">Sage Coach</h3>
                  <p className="text-xs text-muted-foreground">Strategic advice for {selectedGoal?.title}</p>
                </div>
              </div>

              {coachLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                  <p className="text-sm font-bold text-foreground">Sage is analyzing your goal...</p>
                </div>
              ) : (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 shadow-inner">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                    {coachResponse}
                  </p>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowCoachModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs hover:opacity-90 transition-all cursor-pointer shadow-md"
                >
                  Got it, thanks!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
