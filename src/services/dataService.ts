import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, setDoc, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import type { Task, Goal, Milestone, FocusSession, ProgressLog, GardenProgress, GardenItem } from '@/types/database'

// ─── Data Service — All Firestore CRUD operations ───────────────────────────────
// Replaces all localStorage calls with real database queries.

// ─── Tasks ──────────────────────────────────────────────────────────────────────

export async function getTasks(userId: string): Promise<Task[]> {
  const q = query(
    collection(db, 'tasks'),
    where('user_id', '==', userId)
  )
  const snap = await getDocs(q)
  const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task))

  // Sort client-side to avoid requiring a Firestore composite index
  return tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
  const now = new Date().toISOString()
  const docRef = await addDoc(collection(db, 'tasks'), {
    ...task,
    tags: task.tags || [],
    created_at: now,
    updated_at: now,
  })
  return { id: docRef.id, ...task, created_at: now, updated_at: now } as Task
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  await updateDoc(doc(db, 'tasks', id), {
    ...updates,
    updated_at: new Date().toISOString(),
  })
}

export async function deleteTask(id: string): Promise<void> {
  await deleteDoc(doc(db, 'tasks', id))
}

// ─── Goals ──────────────────────────────────────────────────────────────────────

export async function getGoals(userId: string): Promise<Goal[]> {
  const q = query(
    collection(db, 'goals'),
    where('user_id', '==', userId)
  )
  const snap = await getDocs(q)
  const goals = snap.docs.map(d => ({ id: d.id, ...d.data() } as Goal))
  return goals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function createGoal(goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>): Promise<Goal> {
  const now = new Date().toISOString()
  const docRef = await addDoc(collection(db, 'goals'), {
    ...goal,
    created_at: now,
    updated_at: now,
  })
  return { id: docRef.id, ...goal, created_at: now, updated_at: now } as Goal
}

export async function updateGoal(id: string, updates: Partial<Goal>): Promise<void> {
  await updateDoc(doc(db, 'goals', id), {
    ...updates,
    updated_at: new Date().toISOString(),
  })
}

export async function deleteGoal(id: string): Promise<void> {
  await deleteDoc(doc(db, 'goals', id))
}

// ─── Milestones ─────────────────────────────────────────────────────────────────

export async function getMilestones(goalId: string): Promise<Milestone[]> {
  const q = query(
    collection(db, 'milestones'),
    where('goal_id', '==', goalId)
  )
  const snap = await getDocs(q)
  const milestones = snap.docs.map(d => ({ id: d.id, ...d.data() } as Milestone))
  return milestones.sort((a, b) => a.order_index - b.order_index)
}

export async function createMilestonesBatch(milestones: Omit<Milestone, 'id' | 'created_at'>[]): Promise<Milestone[]> {
  const now = new Date().toISOString()
  const results: Milestone[] = []
  for (const m of milestones) {
    const docRef = await addDoc(collection(db, 'milestones'), {
      ...m,
      created_at: now,
    })
    results.push({ id: docRef.id, ...m, created_at: now } as Milestone)
  }
  return results
}

export async function updateMilestone(id: string, updates: Partial<Milestone>): Promise<void> {
  await updateDoc(doc(db, 'milestones', id), updates)
}

// ─── Focus Sessions ─────────────────────────────────────────────────────────────

export async function getFocusSessions(userId: string, maxResults = 20): Promise<FocusSession[]> {
  const q = query(
    collection(db, 'focus_sessions'),
    where('user_id', '==', userId)
  )
  const snap = await getDocs(q)
  const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() } as FocusSession))
  return sessions
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, maxResults)
}

export async function getRecentFocusMinutes(userId: string, days = 7): Promise<number> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString()

  const q = query(
    collection(db, 'focus_sessions'),
    where('user_id', '==', userId),
    where('status', '==', 'completed')
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => d.data() as FocusSession)
    .filter(s => s.started_at >= sinceStr)
    .reduce((sum, d) => sum + (d.actual_duration_minutes || 0), 0)
}

export async function createFocusSession(session: Omit<FocusSession, 'id'>): Promise<FocusSession> {
  const docRef = await addDoc(collection(db, 'focus_sessions'), session)
  return { id: docRef.id, ...session } as FocusSession
}

export async function updateFocusSession(id: string, updates: Partial<FocusSession>): Promise<void> {
  await updateDoc(doc(db, 'focus_sessions', id), updates)
}

// ─── Progress Logs ──────────────────────────────────────────────────────────────

export async function getProgressLogs(userId: string, days = 14): Promise<ProgressLog[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().split('T')[0]

  const q = query(
    collection(db, 'progress_logs'),
    where('user_id', '==', userId)
  )
  const snap = await getDocs(q)
  const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProgressLog))
  return logs
    .filter(l => l.date >= sinceStr)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function upsertProgressLog(userId: string, date: string, data: Partial<ProgressLog>): Promise<void> {
  const docId = `${userId}_${date}`
  await setDoc(doc(db, 'progress_logs', docId), {
    user_id: userId,
    date,
    ...data,
    created_at: new Date().toISOString(),
  }, { merge: true })
}

// ─── Garden Progress ────────────────────────────────────────────────────────────

export async function getGardenProgress(userId: string): Promise<GardenProgress | null> {
  const snap = await getDoc(doc(db, 'garden_progress', userId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as unknown as GardenProgress
}

export async function updateGardenProgress(userId: string, updates: Partial<GardenProgress>): Promise<void> {
  await updateDoc(doc(db, 'garden_progress', userId), {
    ...updates,
    updated_at: new Date().toISOString(),
  })
}

// ─── Garden Items ───────────────────────────────────────────────────────────────

export async function getGardenItems(userId: string): Promise<GardenItem[]> {
  const q = query(
    collection(db, 'garden_items'),
    where('user_id', '==', userId)
  )
  const snap = await getDocs(q)
  const items = snap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      type: data.type,
      emoji: data.emoji,
      name: data.name,
      earned_at: data.earned_at,
      task_id: data.task_id,
      position: { x: data.position_x || 50, y: data.position_y || 50 },
    } as GardenItem
  })
  return items.sort((a, b) => new Date(a.earned_at).getTime() - new Date(b.earned_at).getTime())
}

export async function createGardenItem(userId: string, item: Omit<GardenItem, 'id' | 'earned_at'>): Promise<void> {
  await addDoc(collection(db, 'garden_items'), {
    user_id: userId,
    type: item.type,
    emoji: item.emoji,
    name: item.name,
    task_id: item.task_id || null,
    position_x: item.position.x,
    position_y: item.position.y,
    earned_at: new Date().toISOString(),
  })
}

// ─── User Settings ──────────────────────────────────────────────────────────────

export interface UserSettings {
  full_name: string
  email?: string
  avatar_url?: string
  timezone?: string
  coach_tone: string
  user_type: string
  voice_enabled: boolean
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) return null
  return snap.data() as UserSettings
}

export async function updateUserSettings(userId: string, updates: Partial<UserSettings>): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    ...updates,
    updated_at: new Date().toISOString(),
  })
}

// ─── AI Conversations ───────────────────────────────────────────────────────────

export interface AIConversationMessage {
  id?: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  source: 'chat' | 'voice' | 'ask_lifesaver'
  created_at: string
}

export async function getConversationHistory(userId: string, source: string, maxResults = 50): Promise<AIConversationMessage[]> {
  const q = query(
    collection(db, 'ai_conversations'),
    where('user_id', '==', userId),
    where('source', '==', source)
  )
  const snap = await getDocs(q)
  const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AIConversationMessage))
  return msgs
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-maxResults)
}

export async function saveConversationMessage(message: Omit<AIConversationMessage, 'id' | 'created_at'>): Promise<void> {
  await addDoc(collection(db, 'ai_conversations'), {
    ...message,
    created_at: new Date().toISOString(),
  })
}

export async function clearConversationHistory(userId: string, source: string): Promise<void> {
  const q = query(
    collection(db, 'ai_conversations'),
    where('user_id', '==', userId),
    where('source', '==', source)
  )
  const snap = await getDocs(q)
  for (const d of snap.docs) {
    await deleteDoc(d.ref)
  }
}

// ─── Dashboard Stats (computed) ─────────────────────────────────────────────────

export async function getDashboardStats(userId: string) {
  const [tasks, garden, progressLogs] = await Promise.all([
    getTasks(userId),
    getGardenProgress(userId),
    getProgressLogs(userId, 7),
  ])

  const todayStr = new Date().toISOString().split('T')[0]
  const incompleteTasks = tasks.filter(t => t.status !== 'completed')
  const todayTasks = tasks.filter(t => t.due_date?.startsWith(todayStr) || t.status === 'in_progress')
  const todayCompleted = todayTasks.filter(t => t.status === 'completed').length
  const overdueTasks = incompleteTasks.filter(t => t.due_date && new Date(t.due_date) < new Date())
  const riskScore = Math.min(100, Math.round((overdueTasks.length / Math.max(incompleteTasks.length, 1)) * 100))

  const weekFocusMinutes = progressLogs.reduce((s, l) => s + (l.focus_minutes || 0), 0)

  return {
    todayTasksCompleted: todayCompleted,
    todayTasksTotal: todayTasks.length || tasks.length,
    weekFocusMinutes,
    currentStreak: garden?.current_streak ?? 0,
    weeklyGoalProgress: Math.round(
      progressLogs.length > 0
        ? (progressLogs.reduce((s, l) => s + l.tasks_completed, 0) / progressLogs.length) * 10
        : 0
    ),
    riskScore,
    plantsGrown: garden?.total_plants ?? 0,
  }
}

// ─── AI Response Caching ────────────────────────────────────────────────────────

export async function getCachedAIResponse<T>(userId: string, type: string): Promise<T | null> {
  try {
    const docId = `${userId}_${type}`
    const snap = await getDoc(doc(db, 'ai_cache', docId))
    if (!snap.exists()) return null
    const data = snap.data()
    // Check TTL
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null // expired
    }
    return data.response as T
  } catch {
    return null
  }
}

export async function setCachedAIResponse(userId: string, type: string, response: any, ttlMinutes: number): Promise<void> {
  const docId = `${userId}_${type}`
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()
  await setDoc(doc(db, 'ai_cache', docId), {
    user_id: userId,
    type,
    response,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  })
}

// ─── Weekly Stats Aggregation ───────────────────────────────────────────────────

export async function getWeeklyStats(userId: string) {
  const [tasks, focusSessions, progressLogs, goals, garden] = await Promise.all([
    getTasks(userId),
    getFocusSessions(userId, 50),
    getProgressLogs(userId, 7),
    getGoals(userId),
    getGardenProgress(userId),
  ])

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const completedThisWeek = tasks.filter(t =>
    t.status === 'completed' && new Date(t.updated_at) >= weekAgo
  )
  const overdueTasks = tasks.filter(t =>
    t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()
  )
  const totalFocusMinutes = focusSessions
    .filter(s => s.status === 'completed' && new Date(s.started_at) >= weekAgo)
    .reduce((sum, s) => sum + (s.actual_duration_minutes || 0), 0)

  // Find most productive day
  const dayMap: Record<string, number> = {}
  for (const log of progressLogs) {
    dayMap[log.date] = (dayMap[log.date] || 0) + log.tasks_completed + Math.floor(log.focus_minutes / 30)
  }
  const mostProductiveDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0]

  return {
    tasks_completed: completedThisWeek.length,
    total_tasks: tasks.length,
    overdue_count: overdueTasks.length,
    focus_minutes: totalFocusMinutes,
    most_productive_day: mostProductiveDay ? mostProductiveDay[0] : 'N/A',
    active_goals: goals.filter(g => g.status === 'active').length,
    garden_level: garden?.level ?? 1,
    current_streak: garden?.current_streak ?? 0,
    progress_logs: progressLogs,
  }
}

