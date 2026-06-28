// ─── Proactive AI Engine ────────────────────────────────────────────────────────
// Event-driven singleton that watches user data mutations and fires intelligent
// notifications when risk thresholds are crossed. All risk math is client-side
// (zero API calls). AI-generated insight messages are rate-limited and cached.

import { getTasks, getGoals, getGardenProgress } from './dataService'
import type { Task, Goal, ProactiveNotification, ProactiveNotificationType } from '@/types/database'

// ─── Risk Calculation Utilities ─────────────────────────────────────────────────

export interface RiskSnapshot {
  deadlineRisk: number        // 0-100
  workloadRisk: number        // 0-100
  burnoutScore: number        // 0-100
  completionProbability: number // 0-100
  overdueTasks: Task[]
  criticalTasks: Task[]
  totalIncompleteHours: number
}

function calculateTaskUrgency(task: Task): number {
  if (!task.due_date) return 0
  const hoursRemaining = Math.max(0, (new Date(task.due_date).getTime() - Date.now()) / (1000 * 60 * 60))
  return Math.min(100, Math.max(0, 100 - hoursRemaining * 4))
}

function calculatePriorityScore(task: Task): number {
  const scores: Record<string, number> = { critical: 100, high: 75, medium: 50, low: 25 }
  const urgency = calculateTaskUrgency(task)
  const importance = scores[task.priority] ?? 25
  const effort = Math.min(100, (task.estimated_minutes || 30) / 2)
  return urgency * 0.5 + importance * 0.3 + effort * 0.2
}

export function computeRiskSnapshot(tasks: Task[]): RiskSnapshot {
  const now = new Date()
  const incomplete = tasks.filter(t => t.status !== 'completed')
  const overdueTasks = incomplete.filter(t => t.due_date && new Date(t.due_date) < now)
  const criticalTasks = incomplete.filter(t => t.priority === 'critical' || calculateTaskUrgency(t) > 80)

  const totalIncompleteHours = incomplete.reduce((sum, t) => sum + ((t.estimated_minutes || 30) / 60), 0)

  // Deadline risk: weighted by how many tasks are overdue or near-due
  const nearDueTasks = incomplete.filter(t => t.due_date && calculateTaskUrgency(t) > 50)
  const deadlineRisk = incomplete.length > 0
    ? Math.min(100, Math.round(((overdueTasks.length * 2 + nearDueTasks.length) / Math.max(incomplete.length, 1)) * 50 + overdueTasks.length * 10))
    : 0

  // Workload risk: based on total hours vs reasonable daily capacity (6h)
  const workloadRisk = Math.min(100, Math.round((totalIncompleteHours / 6) * 25))

  // Burnout score: composite of overdue pressure, task density, and streak
  const burnoutScore = Math.min(100, Math.round(
    overdueTasks.length * 15 +
    (incomplete.length > 8 ? 20 : incomplete.length > 5 ? 10 : 0) +
    (criticalTasks.length * 10) +
    (workloadRisk > 60 ? 15 : 0)
  ))

  const completionProbability = Math.max(0, 100 - deadlineRisk)

  return { deadlineRisk, workloadRisk, burnoutScore, completionProbability, overdueTasks, criticalTasks, totalIncompleteHours }
}

// ─── Priority Sorting ───────────────────────────────────────────────────────────

export interface PrioritizedTasks {
  doNow: Task[]
  doToday: Task[]
  scheduleLater: Task[]
  sortedAll: Task[]
}

export function prioritizeTasks(tasks: Task[]): PrioritizedTasks {
  const incomplete = tasks.filter(t => t.status !== 'completed')
  const scored = incomplete.map(t => ({ task: t, score: calculatePriorityScore(t) }))
  scored.sort((a, b) => b.score - a.score)

  const sortedAll = scored.map(s => s.task)
  const doNow = scored.filter(s => s.score >= 70).map(s => s.task)
  const doToday = scored.filter(s => s.score >= 40 && s.score < 70).map(s => s.task)
  const scheduleLater = scored.filter(s => s.score < 40).map(s => s.task)

  return { doNow, doToday, scheduleLater, sortedAll }
}

// ─── Proactive Engine Singleton ─────────────────────────────────────────────────

export class ProactiveEngine {
  private static instance: ProactiveEngine
  private userId: string | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private recentNotifications: Map<string, number> = new Map() // type -> timestamp
  private periodicTimer: ReturnType<typeof setInterval> | null = null
  private lastRisk: RiskSnapshot | null = null

  private readonly DEBOUNCE_MS = 300
  private readonly DEDUP_WINDOW_MS = 30 * 60 * 1000 // 30 minutes
  private readonly PERIODIC_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

  private constructor() {}

  static getInstance(): ProactiveEngine {
    if (!ProactiveEngine.instance) {
      ProactiveEngine.instance = new ProactiveEngine()
    }
    return ProactiveEngine.instance
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  initialize(userId: string) {
    this.userId = userId

    // Listen to data mutation events
    window.addEventListener('tasks_updated', this.handleDataChange)
    window.addEventListener('goals_updated', this.handleDataChange)

    // Run initial assessment
    this.runAssessment()

    // Start periodic suggestion timer
    this.periodicTimer = setInterval(() => this.runPeriodicSuggestions(), this.PERIODIC_INTERVAL_MS)
  }

  destroy() {
    window.removeEventListener('tasks_updated', this.handleDataChange)
    window.removeEventListener('goals_updated', this.handleDataChange)
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    if (this.periodicTimer) clearInterval(this.periodicTimer)
    this.userId = null
    this.lastRisk = null
  }

  // ─── Event Handlers ─────────────────────────────────────────────────────────

  private handleDataChange = () => {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => this.runAssessment(), this.DEBOUNCE_MS)
  }

  // ─── Core Assessment ────────────────────────────────────────────────────────

  private async runAssessment() {
    if (!this.userId) return

    try {
      const tasks = await getTasks(this.userId)
      const risk = computeRiskSnapshot(tasks)
      const priorities = prioritizeTasks(tasks)

      // Emit priority recalculation
      window.dispatchEvent(new CustomEvent('priorities_recalculated', {
        detail: priorities
      }))

      // Check for proactive notifications
      this.checkDeadlineCritical(tasks, risk)
      this.checkOverdueAlert(risk)
      this.checkBurnoutWarning(risk)
      this.checkRiskIncrease(risk)

      this.lastRisk = risk
    } catch (err) {
      console.error('[ProactiveEngine] Assessment failed:', err)
    }
  }

  // ─── Notification Checks ────────────────────────────────────────────────────

  private checkDeadlineCritical(tasks: Task[], risk: RiskSnapshot) {
    const now = Date.now()
    for (const task of tasks) {
      if (task.status === 'completed' || !task.due_date) continue
      const hoursRemaining = (new Date(task.due_date).getTime() - now) / (1000 * 60 * 60)

      if (hoursRemaining > 0 && hoursRemaining < 24 && (task.priority === 'high' || task.priority === 'critical')) {
        const hoursStr = hoursRemaining < 1 ? `${Math.round(hoursRemaining * 60)} minutes` : `${Math.round(hoursRemaining)} hours`
        this.emitNotification({
          type: 'deadline_critical',
          title: `⚠️ "${task.title}" is due in ${hoursStr}`,
          message: `This ${task.priority} priority task hasn't been completed yet. Would you like me to generate a recovery plan?`,
          reasoning: `Flagged because there are only ${hoursStr} remaining, it's ${task.priority} priority, and your current workload includes ${risk.criticalTasks.length} other critical tasks. Completion probability: ${risk.completionProbability}%.`,
          severity: hoursRemaining < 6 ? 'critical' : 'warning',
          action: {
            label: 'Save My Deadline™',
            route: `/app/emergency?task=${encodeURIComponent(task.title)}&deadline=${encodeURIComponent(task.due_date)}`
          },
          task_id: task.id
        })
        break // Only one deadline notification at a time
      }
    }
  }

  private checkOverdueAlert(risk: RiskSnapshot) {
    if (risk.overdueTasks.length > 0) {
      const titles = risk.overdueTasks.slice(0, 3).map(t => `"${t.title}"`).join(', ')
      this.emitNotification({
        type: 'overdue_alert',
        title: `📋 ${risk.overdueTasks.length} overdue task${risk.overdueTasks.length > 1 ? 's' : ''} need attention`,
        message: `${titles}${risk.overdueTasks.length > 3 ? ` and ${risk.overdueTasks.length - 3} more` : ''} are past their deadline. Let's review and reschedule.`,
        reasoning: `These tasks passed their due dates. Overdue tasks increase your overall deadline risk to ${risk.deadlineRisk}% and burnout score to ${risk.burnoutScore}%.`,
        severity: risk.overdueTasks.length > 3 ? 'critical' : 'warning',
        action: { label: 'Review Tasks', route: '/app/dashboard' }
      })
    }
  }

  private checkBurnoutWarning(risk: RiskSnapshot) {
    if (risk.burnoutScore > 60) {
      this.emitNotification({
        type: 'burnout_warning',
        title: '💛 Burnout risk is elevated',
        message: `Your burnout score is ${risk.burnoutScore}/100. Consider taking a short break to recharge — you'll be more productive after.`,
        reasoning: `Calculated from ${risk.overdueTasks.length} overdue tasks, ${risk.criticalTasks.length} critical tasks, and ${Math.round(risk.totalIncompleteHours)}h of pending work. A 10-minute break can boost focus by ~20%.`,
        severity: risk.burnoutScore > 80 ? 'critical' : 'warning',
        action: { label: 'Take a Break', route: '/app/focus' }
      })
    }
  }

  private checkRiskIncrease(risk: RiskSnapshot) {
    if (this.lastRisk && risk.deadlineRisk > this.lastRisk.deadlineRisk + 15) {
      this.emitNotification({
        type: 'risk_increase',
        title: '📈 Deadline risk just increased',
        message: `Your overall deadline risk jumped from ${this.lastRisk.deadlineRisk}% to ${risk.deadlineRisk}%. New tasks or approaching deadlines are adding pressure.`,
        reasoning: `The risk increased because ${risk.criticalTasks.length} tasks are now critical and you have ${Math.round(risk.totalIncompleteHours)}h of work remaining. Starting your top priority now would reduce risk significantly.`,
        severity: risk.deadlineRisk > 70 ? 'critical' : 'warning',
        action: { label: 'View Priorities', route: '/app/dashboard' }
      })
    }
  }

  // ─── Periodic Suggestions (Phase 4) ─────────────────────────────────────────

  private async runPeriodicSuggestions() {
    if (!this.userId) return

    try {
      const tasks = await getTasks(this.userId)
      const risk = computeRiskSnapshot(tasks)
      const incomplete = tasks.filter(t => t.status !== 'completed')

      // Focus suggestion: if there are incomplete tasks
      if (incomplete.length > 0) {
        const topTask = incomplete.sort((a, b) => calculatePriorityScore(b) - calculatePriorityScore(a))[0]
        const estMin = topTask.estimated_minutes || 30
        this.emitNotification({
          type: 'focus_suggestion',
          title: `🎯 Ready to focus on "${topTask.title}"?`,
          message: `This is your highest-priority task right now. It needs about ${estMin} minutes of focused work.`,
          reasoning: `Selected because it has the highest combined urgency and importance score. Completing it reduces your deadline risk by approximately ${Math.min(30, Math.round(100 / Math.max(incomplete.length, 1)))}%.`,
          severity: 'info',
          action: { label: 'Start Focus', route: '/app/focus' }
        })
      }

      // Break suggestion if burnout is high
      if (risk.burnoutScore > 50) {
        this.emitNotification({
          type: 'break_suggestion',
          title: '☕ Time for a quick break?',
          message: `You've been working hard. A 10-minute break now will boost your next focus session.`,
          reasoning: `Your burnout score is ${risk.burnoutScore}/100. Research shows short breaks between intense work sessions improve focus by 15-25%.`,
          severity: 'info',
          action: { label: 'Relax Mode', route: '/app/focus' }
        })
      }
    } catch (err) {
      console.error('[ProactiveEngine] Periodic suggestions failed:', err)
    }
  }

  // ─── Notification Emission ──────────────────────────────────────────────────

  private emitNotification(data: Omit<ProactiveNotification, 'id' | 'dismissed' | 'created_at'>) {
    // Deduplication check
    const lastEmitted = this.recentNotifications.get(data.type)
    if (lastEmitted && Date.now() - lastEmitted < this.DEDUP_WINDOW_MS) {
      return // Skip — already notified recently
    }

    const notification: ProactiveNotification = {
      ...data,
      id: `pn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      dismissed: false,
      created_at: new Date().toISOString()
    }

    this.recentNotifications.set(data.type, Date.now())

    window.dispatchEvent(new CustomEvent('proactive_notification', {
      detail: notification
    }))
  }
}
