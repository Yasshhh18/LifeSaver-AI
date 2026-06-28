import type { RecoveryPlan, Goal, Milestone } from '@/types/database'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ─── AI Service (Mock) ─────────────────────────────────────────────────────────
// Replace these functions with real AI API calls (OpenAI / Gemini) when ready.

export async function generateRecoveryPlan(taskName: string, deadline: string): Promise<RecoveryPlan> {
  await delay(2000) // Simulate AI thinking
  const daysRemaining = Math.max(1, Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  return {
    deadline,
    task_name: taskName,
    risk_level: daysRemaining <= 2 ? 'critical' : daysRemaining <= 5 ? 'high' : 'medium',
    days_remaining: daysRemaining,
    success_probability: Math.min(95, 40 + daysRemaining * 8),
    motivational_message: `You have ${daysRemaining} days and that's enough. Many great things have been accomplished under pressure. Let's build a plan that works.`,
    priority_actions: [
      {
        order: 1,
        title: 'Define the minimum viable outcome',
        description: `What's the bare minimum that makes "${taskName}" a success? Strip everything non-essential.`,
        estimated_hours: 0.5,
        due_by: 'Today',
      },
      {
        order: 2,
        title: 'Block your deep work time',
        description: 'Schedule 2-3 hour uninterrupted blocks. Turn off notifications. This is your core execution time.',
        estimated_hours: 1,
        due_by: 'Today',
      },
      {
        order: 3,
        title: 'Complete the hardest 20% first',
        description: 'Identify the most complex or risky part and tackle it tomorrow morning when energy is highest.',
        estimated_hours: 3,
        due_by: 'Tomorrow',
      },
      {
        order: 4,
        title: 'Review and polish',
        description: 'Polish your work, check for quality, and prepare any supporting materials.',
        estimated_hours: 2,
        due_by: `Day ${Math.max(2, daysRemaining - 1)}`,
      },
      {
        order: 5,
        title: 'Final review and delivery',
        description: 'Final check, buffer for any last-minute issues, and submit/deliver with confidence.',
        estimated_hours: 1,
        due_by: `Day ${daysRemaining}`,
      },
    ],
    daily_schedule: Array.from({ length: Math.min(daysRemaining, 5) }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() + i)
      return {
        day: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'long' }),
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        focus_hours: i === 0 ? 3 : 4,
        tasks: [
          {
            time: '9:00 AM',
            task: i === 0 ? 'Plan & outline your approach' : 'Deep work session — core task',
            duration: '2h',
            priority: 'critical' as const,
          },
          {
            time: '11:00 AM',
            task: 'Short break + review progress',
            duration: '15m',
            priority: 'low' as const,
          },
          {
            time: '2:00 PM',
            task: i < daysRemaining - 1 ? 'Continue execution' : 'Review and finalize',
            duration: '1.5h',
            priority: 'high' as const,
          },
          {
            time: '4:00 PM',
            task: 'Log progress, plan for tomorrow',
            duration: '15m',
            priority: 'medium' as const,
          },
        ],
      }
    }),
  }
}

export async function breakGoalIntoMilestones(goal: Goal): Promise<Milestone[]> {
  await delay(1500)
  const milestonesMap: Record<string, Milestone[]> = {
    career: [
      { id: 'm1', goal_id: goal.id, title: 'Polish your resume', description: 'ATS-optimized resume with quantified achievements', completed: false, order_index: 0, created_at: new Date().toISOString() },
      { id: 'm2', goal_id: goal.id, title: 'Build a portfolio project', description: 'A full-stack project that showcases your skills', completed: false, order_index: 1, created_at: new Date().toISOString() },
      { id: 'm3', goal_id: goal.id, title: 'Optimize LinkedIn profile', description: 'Professional headline, summary, and skills', completed: false, order_index: 2, created_at: new Date().toISOString() },
      { id: 'm4', goal_id: goal.id, title: 'Apply to 20+ positions', description: 'Targeted applications with personalized cover letters', completed: false, order_index: 3, created_at: new Date().toISOString() },
      { id: 'm5', goal_id: goal.id, title: 'Prepare for interviews', description: 'Practice DSA, system design, and behavioral questions', completed: false, order_index: 4, created_at: new Date().toISOString() },
    ],
    project: [
      { id: 'm1', goal_id: goal.id, title: 'Define product scope & MVP', description: 'Core features only — what solves the problem?', completed: false, order_index: 0, created_at: new Date().toISOString() },
      { id: 'm2', goal_id: goal.id, title: 'Build the MVP', description: 'Functional product with core feature working', completed: false, order_index: 1, created_at: new Date().toISOString() },
      { id: 'm3', goal_id: goal.id, title: 'Get first 10 beta users', description: 'Share in communities, get feedback', completed: false, order_index: 2, created_at: new Date().toISOString() },
      { id: 'm4', goal_id: goal.id, title: 'Set up payments', description: 'Stripe integration, pricing page, and checkout', completed: false, order_index: 3, created_at: new Date().toISOString() },
      { id: 'm5', goal_id: goal.id, title: 'Launch publicly', description: 'Product Hunt, Twitter/X, communities', completed: false, order_index: 4, created_at: new Date().toISOString() },
    ],
  }

  return milestonesMap[goal.category] || [
    { id: 'm1', goal_id: goal.id, title: 'Research and define the goal clearly', description: 'Understand what success looks like', completed: false, order_index: 0, created_at: new Date().toISOString() },
    { id: 'm2', goal_id: goal.id, title: 'Create an action plan', description: 'Break it into weekly milestones', completed: false, order_index: 1, created_at: new Date().toISOString() },
    { id: 'm3', goal_id: goal.id, title: 'Execute phase 1', description: 'First 33% of the work', completed: false, order_index: 2, created_at: new Date().toISOString() },
    { id: 'm4', goal_id: goal.id, title: 'Execute phase 2', description: 'Middle 33% of the work', completed: false, order_index: 3, created_at: new Date().toISOString() },
    { id: 'm5', goal_id: goal.id, title: 'Final push & completion', description: 'Last stretch — review, refine, complete', completed: false, order_index: 4, created_at: new Date().toISOString() },
  ]
}

export async function predictDeadlineRisk(taskTitle: string, dueDate: string, estimatedMinutes: number): Promise<number> {
  await delay(800)
  const daysLeft = Math.max(0, (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const hoursNeeded = estimatedMinutes / 60
  const hoursAvailable = daysLeft * 6 // assume 6 productive hours per day
  const ratio = hoursNeeded / Math.max(hoursAvailable, 0.1)
  return Math.min(100, Math.round(ratio * 60 + (daysLeft < 2 ? 30 : 0)))
}

export async function generateDailyFocusPlan(tasks: { title: string; priority: string; estimatedMinutes: number }[]) {
  await delay(1200)
  const sorted = [...tasks].sort((a, b) => {
    const priority = { critical: 0, high: 1, medium: 2, low: 3 }
    return (priority[a.priority as keyof typeof priority] ?? 3) - (priority[b.priority as keyof typeof priority] ?? 3)
  })
  return {
    total_focus_minutes: sorted.reduce((sum, t) => sum + t.estimatedMinutes, 0),
    recommended_order: sorted,
    focus_tip: 'Start with your most important task in the first 90 minutes. Your brain is sharpest then.',
    break_schedule: '25 min focus → 5 min break → repeat 4x → 20 min long break',
  }
}
