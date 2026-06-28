// ─── Database Types ────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  timezone: string
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'overdue'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Task {
  id: string
  user_id: string
  goal_id?: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  due_date?: string
  estimated_minutes?: number
  actual_minutes?: number
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  completed: boolean
  order_index: number
  created_at: string
}

export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled'
export type GoalCategory = 'career' | 'education' | 'health' | 'personal' | 'project' | 'finance' | 'other'

export interface Goal {
  id: string
  user_id: string
  title: string
  description?: string
  category: GoalCategory
  status: GoalStatus
  target_date?: string
  progress_percent: number
  ai_generated: boolean
  created_at: string
  updated_at: string
}

export interface Milestone {
  id: string
  goal_id: string
  title: string
  description?: string
  completed: boolean
  due_date?: string
  order_index: number
  created_at: string
}

export type FocusMode = 'pomodoro' | 'deep_work' | 'custom'
export type FocusStatus = 'active' | 'completed' | 'interrupted'

export interface FocusSession {
  id: string
  user_id: string
  task_id?: string
  mode: FocusMode
  planned_duration_minutes: number
  actual_duration_minutes?: number
  status: FocusStatus
  started_at: string
  ended_at?: string
  notes?: string
}

export interface ProgressLog {
  id: string
  user_id: string
  date: string
  tasks_completed: number
  focus_minutes: number
  mood_score?: number
  notes?: string
  created_at: string
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface RiskScore {
  id: string
  user_id: string
  task_id: string
  risk_level: RiskLevel
  risk_score: number // 0-100
  factors: string[]
  predicted_completion_date?: string
  ai_suggestions: string[]
  calculated_at: string
}

export type GardenItemType = 'seed' | 'sprout' | 'plant' | 'bush' | 'tree'

export interface GardenProgress {
  id: string
  user_id: string
  total_plants: number
  current_streak: number
  longest_streak: number
  total_tasks_completed: number
  garden_items: GardenItem[]
  level: number
  xp: number
  updated_at: string
}

export interface GardenItem {
  id: string
  type: GardenItemType
  emoji: string
  name: string
  earned_at: string
  task_id?: string
  position: { x: number; y: number }
}

export interface AIRecommendation {
  id: string
  user_id: string
  type: 'task_order' | 'break_suggestion' | 'deadline_warning' | 'goal_insight' | 'recovery_plan'
  title: string
  content: string
  action_items: string[]
  priority: 'low' | 'medium' | 'high'
  dismissed: boolean
  created_at: string
}

// ─── Recovery Plan Types ───────────────────────────────────────────────────────

export interface RecoveryPlan {
  deadline: string
  task_name: string
  risk_level: RiskLevel
  days_remaining: number
  priority_actions: PriorityAction[]
  daily_schedule: DailySchedule[]
  success_probability: number
  motivational_message: string
}

export interface PriorityAction {
  order: number
  title: string
  description: string
  estimated_hours: number
  due_by: string
}

export interface DailySchedule {
  day: string
  date: string
  tasks: ScheduleTask[]
  focus_hours: number
}

export interface ScheduleTask {
  time: string
  task: string
  duration: string
  priority: TaskPriority
}

// ─── UI Types ──────────────────────────────────────────────────────────────────

export interface NavItem {
  label: string
  path: string
  icon: string
  badge?: number
}

export interface StatsCard {
  label: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: string
  color: 'green' | 'warm' | 'sky' | 'neutral'
}

export interface TimerState {
  mode: FocusMode
  minutes: number
  seconds: number
  isRunning: boolean
  cyclesCompleted: number
  totalFocusMinutes: number
}

// ─── AI Feature Response Types ─────────────────────────────────────────────────

export interface DailyBriefing {
  top_priority: { task_title: string; reason: string }
  estimated_workload_hours: number
  highest_risk_deadline: { task_title: string; due_date: string; risk_percent: number } | null
  suggested_focus: { duration_minutes: number; best_time: string; task_title: string }
  motivational_message: string
  quick_wins: string[]
  overall_risk_score: number
}

export interface NextAction {
  task_title: string
  reasoning: string
  risk_reduction_percent: number
  estimated_minutes: number
  category: string
}

export interface TimeSimulation {
  scenario: string
  current_state: {
    overall_risk: number
    success_probability: number
    overdue_count: number
    workload_hours: number
  }
  simulated_state: {
    overall_risk: number
    success_probability: number
    overdue_count: number
    workload_hours: number
  }
  impact_summary: string
  recovery_suggestions: string[]
  verdict: 'safe' | 'risky' | 'dangerous'
}

export interface SmartRecovery {
  task_title: string
  current_risk: number
  recovery_schedule: { day: string; focus_hours: number; tasks: string[] }[]
  new_priorities: { title: string; priority: string; reason: string }[]
  suggested_focus_blocks: { start_time: string; duration_minutes: number; task: string }[]
  estimated_completion: string
  success_probability: number
  motivational_message: string
}

export interface WeeklyReview {
  biggest_achievement: string
  most_productive_day: string
  total_focus_hours: number
  tasks_completed: number
  goals_progressed: { title: string; progress_change: string }[]
  areas_for_improvement: string[]
  personalized_advice: string
  overall_grade: string
}

export interface InsightCard {
  id: string
  icon: string
  title: string
  insight: string
  metric: string
  recommendation: string
  color: 'green' | 'blue' | 'amber' | 'purple' | 'rose'
}

export interface BurnoutReport {
  burnout_score: number
  stress_level: 'low' | 'moderate' | 'high' | 'critical'
  contributing_factors: string[]
  recovery_recommendations: string[]
  positive_signs: string[]
}

// ─── Proactive AI Agent Types ──────────────────────────────────────────────────

export type ProactiveNotificationType =
  | 'deadline_critical'
  | 'risk_increase'
  | 'burnout_warning'
  | 'recovery_suggestion'
  | 'priority_shift'
  | 'focus_suggestion'
  | 'break_suggestion'
  | 'overdue_alert'

export interface ProactiveNotification {
  id: string
  type: ProactiveNotificationType
  title: string
  message: string
  reasoning: string
  severity: 'info' | 'warning' | 'critical'
  action?: { label: string; route: string }
  task_id?: string
  dismissed: boolean
  created_at: string
}

export interface MorningBriefing extends DailyBriefing {
  greeting: string
  overdue_tasks: { title: string; days_overdue: number }[]
  productivity_summary: string
  burnout_level: string
  ai_recommendation: string
}

export interface AdaptiveRoadmapUpdate {
  original_title: string
  adjusted_weeks: { name: string; tasks: string[]; status: 'completed' | 'on_track' | 'behind' | 'adjusted' }[]
  recovery_suggestions: string[]
  updated_probability: number
  reasoning: string
}
