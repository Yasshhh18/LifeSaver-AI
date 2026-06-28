import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts'
import { 
  Calendar, TrendingUp, TrendingDown, Clock, Target, 
  Brain, ShieldAlert, RefreshCw, Sparkles, Heart, Activity, Loader2, Award, CheckCircle2, Star
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getProgressLogs, getFocusSessions, getTasks, getGoals, getGardenProgress } from '@/services/dataService'
import { generateWeeklyReview, generateProductivityInsights } from '@/services/geminiService'
import type { WeeklyReview, InsightCard, ProgressLog } from '@/types/database'

const insightColorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  green: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', iconBg: 'bg-emerald-100' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-100' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', iconBg: 'bg-amber-100' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', iconBg: 'bg-purple-100' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', iconBg: 'bg-rose-100' },
}

const gradeColors: Record<string, string> = {
  'A+': 'text-emerald-600', 'A': 'text-emerald-600', 'B+': 'text-blue-600',
  'B': 'text-blue-600', 'C': 'text-amber-600', 'D': 'text-red-600',
}

export default function AnalyticsPage() {
  const { user } = useAuth()

  // Real data states
  const [focusData, setFocusData] = useState<{ name: string; minutes: number }[]>([])
  const [completionData, setCompletionData] = useState<{ name: string; completed: number; overdue: number }[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [realStats, setRealStats] = useState({ tasksCompleted: 0, totalTasks: 0, focusHours: 0, streak: 0, activeGoals: 0 })

  // AI states
  const [weeklyReview, setWeeklyReview] = useState<WeeklyReview | null>(null)
  const [reviewLoading, setReviewLoading] = useState(true)
  const [insights, setInsights] = useState<InsightCard[]>([])
  const [insightsLoading, setInsightsLoading] = useState(true)

  const handleForceRefresh = async () => {
    if (!user) return
    setReviewLoading(true)
    try {
      const { db } = await import('@/services/firebase')
      const { doc, deleteDoc } = await import('firebase/firestore')
      
      // Invalidate both caches in Firestore
      await Promise.all([
        deleteDoc(doc(db, 'ai_cache', `${user.uid}_weekly_review`)),
        deleteDoc(doc(db, 'ai_cache', `${user.uid}_productivity_insights`))
      ])
      
      // Request fresh analyses from Gemini
      const review = await generateWeeklyReview(user.uid)
      setWeeklyReview(review)
      
      const result = await generateProductivityInsights(user.uid)
      const cards = Array.isArray(result) ? result : ((result as any)?.insights || [])
      setInsights(cards)
    } catch (err) {
      console.error('Failed to force refresh weekly review:', err)
    } finally {
      setReviewLoading(false)
    }
  }

  // Load real Firebase data
  useEffect(() => {
    if (!user) return

    const loadData = async (cancelled: boolean) => {
      setStatsLoading(true)
      try {
        const [tasks, progressLogs, focusSessions, goals, garden] = await Promise.all([
          getTasks(user.uid),
          getProgressLogs(user.uid, 14),
          getFocusSessions(user.uid, 50),
          getGoals(user.uid),
          getGardenProgress(user.uid),
        ])

        if (cancelled) return

        // Build focus chart data from progress logs
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (6 - i))
          return d
        })

        const focusChart = last7Days.map(d => {
          const dateStr = d.toISOString().split('T')[0]
          const log = progressLogs.find(l => l.date === dateStr)
          return { name: dayNames[d.getDay()], minutes: log?.focus_minutes || 0 }
        })
        setFocusData(focusChart)

        // Build weekly completion data (last 4 weeks)
        const weekAgo = (weeks: number) => {
          const d = new Date()
          d.setDate(d.getDate() - weeks * 7)
          return d
        }
        const compChart = [4, 3, 2, 1].map(w => {
          const start = weekAgo(w)
          const end = weekAgo(w - 1)
          const weekTasks = tasks.filter(t => {
            const updatedAt = new Date(t.updated_at)
            return updatedAt >= start && updatedAt < end
          })
          return {
            name: `Week ${5 - w}`,
            completed: weekTasks.filter(t => t.status === 'completed').length,
            overdue: weekTasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()).length,
          }
        })
        setCompletionData(compChart)

        // Real stats
        const weekAgoDate = new Date()
        weekAgoDate.setDate(weekAgoDate.getDate() - 7)
        const recentCompleted = tasks.filter(t => t.status === 'completed' && new Date(t.updated_at) >= weekAgoDate)
        const totalFocusMins = focusSessions
          .filter(s => s.status === 'completed' && new Date(s.started_at) >= weekAgoDate)
          .reduce((sum, s) => sum + (s.actual_duration_minutes || 0), 0)

        setRealStats({
          tasksCompleted: recentCompleted.length,
          totalTasks: tasks.length,
          focusHours: Math.round(totalFocusMins / 60 * 10) / 10,
          streak: garden?.current_streak ?? 0,
          activeGoals: goals.filter(g => g.status === 'active').length,
        })
      } catch (err) {
        console.error('Failed to load analytics data:', err)
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    }

    const loadAI = async (cancelled: boolean) => {
      // Weekly Review
      setReviewLoading(true)
      try {
        const review = await generateWeeklyReview(user.uid)
        if (!cancelled) setWeeklyReview(review)
      } catch (err) {
        console.error('Failed to load weekly review:', err)
      } finally {
        if (!cancelled) setReviewLoading(false)
      }

      // Productivity Insights
      setInsightsLoading(true)
      try {
        const result = await generateProductivityInsights(user.uid)
        // Ensure it's an array to prevent .map crashes if Gemini wraps it in an object
        const cards = Array.isArray(result) ? result : ((result as any)?.insights || [])
        if (!cancelled) setInsights(cards)
      } catch (err) {
        console.error('Failed to load insights:', err)
      } finally {
        if (!cancelled) setInsightsLoading(false)
      }
    }

    let isCancelled = false
    loadData(isCancelled)
    loadAI(isCancelled)

    const handleUpdate = () => {
      if (user) {
        loadData(false)
        loadAI(false)
      }
    }

    window.addEventListener('tasks_updated', handleUpdate)
    window.addEventListener('garden_updated', handleUpdate)

    return () => {
      isCancelled = true
      window.removeEventListener('tasks_updated', handleUpdate)
      window.removeEventListener('garden_updated', handleUpdate)
    }
  }, [user])

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Analytics & Insights</h1>
        <p className="text-sm text-muted-foreground">AI-powered analysis of your productivity, powered by real data.</p>
      </div>

      {/* AI Weekly Review Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-6 border shadow-xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(238, 242, 255, 0.6) 100%)',
          borderColor: 'rgba(99, 102, 241, 0.2)',
          backdropFilter: 'blur(20px)'
        }}
      >
        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 rounded-full bg-indigo-200/15 blur-[50px] pointer-events-none" />
        <div className="flex items-center gap-2 mb-5 w-full justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-widest text-indigo-700">AI Weekly Review</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-black tracking-wider uppercase">Gemini</span>
          </div>
          <button 
            onClick={handleForceRefresh}
            disabled={reviewLoading}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-700 hover:text-indigo-900 transition-colors bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${reviewLoading ? 'animate-spin' : ''}`} />
            Recalculate
          </button>
        </div>

        {reviewLoading ? (
          <div className="flex items-center gap-3 py-8 justify-center animate-pulse">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <p className="text-sm font-bold text-foreground">Sage is analyzing your week...</p>
          </div>
        ) : weeklyReview ? (
          <div className="space-y-6">
            {/* Grade + Achievement */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="w-16 h-16 rounded-2xl bg-white border border-surface-container-high flex items-center justify-center shadow-md">
                <span className={`text-3xl font-black ${gradeColors[weeklyReview?.overall_grade as string] || 'text-foreground'}`}>{weeklyReview?.overall_grade || '-'}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground flex items-center gap-1.5"><Award className="w-4 h-4 text-amber-500" /> {weeklyReview?.biggest_achievement || 'Awaiting data for achievements'}</p>
                <p className="text-xs text-muted-foreground mt-1">Most productive day: <span className="font-bold text-foreground">{weeklyReview?.most_productive_day || 'N/A'}</span></p>
              </div>
            </div>

            {/* Stat Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl p-3 bg-white border border-surface-container-high text-center shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Tasks Done</p>
                <p className="text-xl font-black text-emerald-600">{weeklyReview?.tasks_completed || 0}</p>
              </div>
              <div className="rounded-xl p-3 bg-white border border-surface-container-high text-center shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Focus Hours</p>
                <p className="text-xl font-black text-blue-600">{weeklyReview?.total_focus_hours || 0}h</p>
              </div>
              <div className="rounded-xl p-3 bg-white border border-surface-container-high text-center shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Goals</p>
                <p className="text-xl font-black text-purple-600">{Array.isArray(weeklyReview.goals_progressed) ? weeklyReview.goals_progressed.length : 0}</p>
              </div>
              <div className="rounded-xl p-3 bg-white border border-surface-container-high text-center shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Streak</p>
                <p className="text-xl font-black text-amber-600">{realStats.streak}🔥</p>
              </div>
            </div>

            {/* Goals Progress */}
            {Array.isArray(weeklyReview.goals_progressed) && weeklyReview.goals_progressed.length > 0 && (
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">🎯 Goal Progress</p>
                <div className="flex flex-wrap gap-2">
                  {weeklyReview.goals_progressed.map((g, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                      {g.title}: {g.progress_change}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AI Advice */}
            <div className="rounded-2xl p-4 bg-indigo-50/60 border border-indigo-200">
              <p className="text-xs font-black uppercase tracking-wider text-indigo-600 mb-1">💡 Sage's Advice</p>
              <p className="text-sm font-semibold text-foreground leading-relaxed">{weeklyReview?.personalized_advice || 'Keep up the good work! Add more tasks to get personalized advice.'}</p>
            </div>

            {/* Areas for Improvement */}
            {Array.isArray(weeklyReview.areas_for_improvement) && weeklyReview.areas_for_improvement.length > 0 && (
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">📈 Areas to Improve</p>
                <div className="space-y-1.5">
                  {weeklyReview.areas_for_improvement.map((area, i) => (
                    <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-amber-500 flex-shrink-0" /> {area}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Unable to generate weekly review.</p>
        )}
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Tasks This Week', value: realStats.tasksCompleted, icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Total Tasks', value: realStats.totalTasks, icon: <Target className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Focus Hours', value: `${realStats.focusHours}h`, icon: <Clock className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50' },
          { label: 'Active Goals', value: realStats.activeGoals, icon: <Star className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50' },
          { label: 'Streak', value: `${realStats.streak}🔥`, icon: <Activity className="w-4 h-4" />, color: 'text-rose-600 bg-rose-50' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 shadow-card border border-surface-container-high"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color} mb-2`}>{stat.icon}</div>
            <p className="text-xl font-black text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Focus Time Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl p-6 shadow-card border border-surface-container-high"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-primary-700" />
            <h2 className="font-bold text-sm text-foreground">Focus Time (7 Days)</h2>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary-100 text-primary-700 font-black tracking-wider uppercase ml-auto">Real Data</span>
          </div>
          {statsLoading ? (
            <div className="h-48 flex items-center justify-center animate-pulse">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={focusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 600 }}
                  formatter={(value: number) => [`${value} min`, 'Focus Time']}
                />
                <Area type="monotone" dataKey="minutes" stroke="#10b981" fill="url(#focusGradient)" strokeWidth={2} />
                <defs>
                  <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Task Completion Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-6 shadow-card border border-surface-container-high"
        >
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-sm text-foreground">Task Completion (4 Weeks)</h2>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-black tracking-wider uppercase ml-auto">Real Data</span>
          </div>
          {statsLoading ? (
            <div className="h-48 flex items-center justify-center animate-pulse">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={completionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 600 }}
                />
                <Bar dataKey="completed" fill="#6366f1" radius={[6, 6, 0, 0]} name="Completed" />
                <Bar dataKey="overdue" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Overdue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* AI Productivity Insights */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h2 className="font-bold text-lg text-foreground">AI Productivity Insights</h2>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-600 text-white font-black tracking-wider uppercase">Gemini</span>
        </div>

        {insightsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl p-5 border border-surface-container-high animate-pulse bg-white">
                <div className="w-10 h-10 rounded-xl bg-gray-100 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : Array.isArray(insights) && insights.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {insights.map((card, i) => {
              const colors = insightColorMap[card?.color] || insightColorMap.blue
              return (
                <motion.div
                  key={card?.id || i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`rounded-2xl p-5 border shadow-card ${colors.bg} ${colors.border}`}
                >
                  <div className={`w-10 h-10 rounded-xl ${colors.iconBg} flex items-center justify-center mb-3 text-lg`}>
                    {card?.icon}
                  </div>
                  <h3 className={`font-bold text-sm ${colors.text} mb-1`}>{card?.title}</h3>
                  <p className="text-xs text-foreground font-semibold mb-2">{card?.insight}</p>
                  <div className={`text-2xl font-black ${colors.text} mb-2`}>{card?.metric}</div>
                  <p className="text-[10px] text-muted-foreground">{card?.recommendation}</p>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Unable to generate insights. Add more tasks and focus sessions for better analysis.</p>
        )}
      </div>
    </div>
  )
}
