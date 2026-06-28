import { AIManager } from './ai/AIManager'
import { getTasks, getGoals, getFocusSessions, getGardenProgress, getProgressLogs, getUserSettings, getCachedAIResponse, setCachedAIResponse, getWeeklyStats } from './dataService'
import type { RecoveryPlan, Goal, Milestone, DailyBriefing, NextAction, TimeSimulation, SmartRecovery, WeeklyReview, InsightCard, BurnoutReport, MorningBriefing, AdaptiveRoadmapUpdate } from '@/types/database'

const aiManager = AIManager.getInstance();

// ─── Build User Context ─────────────────────────────────────────────────────────

async function buildUserContext(userId: string): Promise<string> {
  try {
    const [settings, tasks, goals, focusSessions, garden, progressLogs] = await Promise.all([
      getUserSettings(userId).catch(() => null),
      getTasks(userId).catch(() => []),
      getGoals(userId).catch(() => []),
      getFocusSessions(userId, 20).catch(() => []),
      getGardenProgress(userId).catch(() => null),
      getProgressLogs(userId, 14).catch(() => []),
    ])

    const userName = settings?.full_name || 'User'
    const coachTone = settings?.coach_tone || 'mentor'
    const userType = settings?.user_type || 'developer'
    const now = new Date()

    const incompleteTasks = tasks.filter(t => t.status !== 'completed')
    const completedTasks = tasks.filter(t => t.status === 'completed')
    const overdueTasks = incompleteTasks.filter(t => t.due_date && new Date(t.due_date) < now)
    const activeGoals = goals.filter(g => g.status === 'active')

    const totalFocusMinutes = focusSessions
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + (s.actual_duration_minutes || 0), 0)

    const toneInstructions: Record<string, string> = {
      mentor: 'You are a calm, wise Zen Mentor. Speak with warmth, encourage balance, and guide gently. Use metaphors about growth and nature. Be thoughtful and measured.',
      coach: 'You are a sharp, results-driven Coach. Be direct, motivating, and action-oriented. Push for execution. Use energetic language. No fluff, all substance.',
      friend: 'You are a warm, supportive Friend. Be encouraging, use casual language, emojis occasionally, and genuinely care about their wellbeing. Be relatable and uplifting.',
      manager: 'You are a professional, analytical Manager. Be structured, data-driven, and precise. Use metrics, prioritization frameworks, and efficiency-focused language.',
    }

    return `You are Sage, an AI productivity coach inside LifeSaver AI.

${toneInstructions[coachTone] || toneInstructions.mentor}

User Profile:
- Name: ${userName}
- Type: ${userType}
- Current Date/Time: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}

=== USER'S CURRENT DATA ===

TASKS (${tasks.length} total, ${incompleteTasks.length} incomplete, ${overdueTasks.length} overdue):
${incompleteTasks.length > 0
  ? incompleteTasks.slice(0, 15).map(t => `- [${t.priority?.toUpperCase()}] "${t.title}" — Status: ${t.status}${t.due_date ? `, Due: ${new Date(t.due_date).toLocaleDateString()}` : ''}${t.estimated_minutes ? `, Est: ${t.estimated_minutes}min` : ''}`).join('\n')
  : '- No incomplete tasks'}

COMPLETED RECENTLY: ${completedTasks.length} tasks completed

GOALS (${activeGoals.length} active):
${activeGoals.length > 0
  ? activeGoals.map(g => `- "${g.title}" (${g.category}) — ${g.progress_percent}% complete${g.target_date ? `, Target: ${new Date(g.target_date).toLocaleDateString()}` : ''}`).join('\n')
  : '- No active goals'}

FOCUS SESSIONS (recent):
- Total focus time (recent): ${totalFocusMinutes} minutes
- Sessions completed: ${focusSessions.filter(s => s.status === 'completed').length}

GARDEN & GAMIFICATION:
- Level: ${garden?.level ?? 1}
- XP: ${garden?.xp ?? 0}
- Plants grown: ${garden?.total_plants ?? 0}
- Current streak: ${garden?.current_streak ?? 0} days
- Longest streak: ${garden?.longest_streak ?? 0} days

PRODUCTIVITY (last 14 days):
${progressLogs.length > 0
  ? progressLogs.slice(0, 7).map(l => `- ${l.date}: ${l.tasks_completed} tasks, ${l.focus_minutes}min focus${l.mood_score ? `, mood: ${l.mood_score}/5` : ''}`).join('\n')
  : '- No recent productivity data'}

=== INSTRUCTIONS ===
1. Generate personalized, actionable responses based on the REAL data above.
2. Reference actual task names, goal titles, and real statistics when relevant.
3. NEVER fabricate tasks or goals the user doesn't have.
4. If the user has no data yet, acknowledge it warmly and encourage them to add tasks/goals.
5. For scheduling questions, create schedules based on their actual tasks and estimated times.
6. For progress questions, calculate real completion rates from their data.
7. Keep responses EXTREMELY short and conversational (1-2 sentences max). Do not write long paragraphs.
8. If asked about the garden, reference their actual level, streak, and plant count.
9. When suggesting what to work on, prioritize by: overdue > critical > high > medium > low.
10. Be encouraging and constructive, never judgmental about incomplete tasks.`
  } catch (error) {
    console.error('Error building user context:', error)
    return 'You are Sage, an AI productivity coach. The user data could not be loaded. Respond helpfully and encourage the user to add tasks and goals.'
  }
}

// ─── Chat with AI ───────────────────────────────────────────────────────────────

export async function chatWithAI(
  userId: string,
  message: string,
  conversationHistory: { role: string; content: string }[] = []
): Promise<string> {
  const systemPrompt = await buildUserContext(userId)
  return await aiManager.chat(systemPrompt, conversationHistory, message);
}

// ─── Generate Recovery Plan ─────────────────────────────────────────────────────

export async function generateRecoveryPlan(
  userId: string,
  taskName: string,
  deadline: string
): Promise<RecoveryPlan> {
  const daysRemaining = Math.max(1, Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  // Get user's existing workload for context
  let existingTasksContext = ''
  try {
    const tasks = await getTasks(userId)
    const incomplete = tasks.filter(t => t.status !== 'completed')
    existingTasksContext = incomplete.length > 0
      ? `\nExisting tasks the user also needs to handle:\n${incomplete.slice(0, 10).map(t => `- "${t.title}" (${t.priority} priority${t.due_date ? `, due ${new Date(t.due_date).toLocaleDateString()}` : ''})`).join('\n')}`
      : '\nThe user has no other active tasks.'
  } catch { /* ignore */ }

  const prompt = `You are an expert productivity planner. Generate a detailed emergency recovery plan.

Task: "${taskName}"
Deadline: ${deadline} (${daysRemaining} days remaining)
${existingTasksContext}

Generate a JSON response with EXACTLY this structure:
{
  "deadline": "${deadline}",
  "task_name": "${taskName}",
  "risk_level": "low" or "medium" or "high" or "critical",
  "days_remaining": ${daysRemaining},
  "success_probability": (number 0-100),
  "motivational_message": "(encouraging personalized message)",
  "priority_actions": [
    {
      "order": 1,
      "title": "(action title)",
      "description": "(specific actionable description)",
      "estimated_hours": (number),
      "due_by": "(Today/Tomorrow/Day N)"
    }
  ],
  "daily_schedule": [
    {
      "day": "(Today/Tomorrow/weekday name)",
      "date": "(Mon DD format)",
      "focus_hours": (number),
      "tasks": [
        {
          "time": "(HH:MM AM/PM)",
          "task": "(specific task description)",
          "duration": "(Xh or Xm)",
          "priority": "critical" or "high" or "medium" or "low"
        }
      ]
    }
  ]
}

Generate 3-5 priority actions and daily schedules for up to ${Math.min(daysRemaining, 5)} days. Each day should have 3-5 tasks. Be realistic.`

  return await aiManager.generateJSON(prompt);
}

// ─── Generate Roadmap ───────────────────────────────────────────────────────────

interface RoadmapResponse {
  title: string
  probability: number
  weeks: { name: string; tasks: string[] }[]
}

export async function generateRoadmap(
  userId: string,
  topic: string,
  goalId?: string
): Promise<RoadmapResponse> {
  let goalContext = ''
  if (goalId) {
    try {
      const goals = await getGoals(userId)
      const goal = goals.find(g => g.id === goalId)
      if (goal) {
        goalContext = `\nGoal Category: ${goal.category}\nCurrent Progress: ${goal.progress_percent}%\nTarget Date: ${goal.target_date ? new Date(goal.target_date).toLocaleDateString() : 'Not set'}\nDescription: ${goal.description || 'No description'}`
      }
    } catch { /* ignore */ }
  }

  let userType = 'developer'
  try {
    const settings = await getUserSettings(userId)
    if (settings) userType = settings.user_type
  } catch { /* ignore */ }

  const prompt = `Generate a structured 4-week roadmap for this goal/project.

Goal: "${topic}"
${goalContext}
User Type: ${userType}

Generate a JSON response with EXACTLY this structure:
{
  "title": "${topic}",
  "probability": (success probability 0-100),
  "weeks": [
    {
      "name": "Week 1: (theme)",
      "tasks": ["(specific actionable task)", "(task)", "(task)"]
    },
    {
      "name": "Week 2: (theme)",
      "tasks": ["(task)", "(task)", "(task)"]
    },
    {
      "name": "Week 3: (theme)",
      "tasks": ["(task)", "(task)", "(task)"]
    },
    {
      "name": "Week 4: (theme)",
      "tasks": ["(task)", "(task)", "(task)"]
    }
  ]
}

Make tasks specific, actionable, and tailored to a ${userType} profile. Each week should have 3-4 tasks.
CRITICAL: Keep each task description EXTREMELY short and punchy (maximum 7-10 words). Use concise, direct language. No long paragraphs.`

  return await aiManager.generateJSON(prompt);
}

// ─── Generate Milestones ────────────────────────────────────────────────────────

export async function generateMilestones(goal: Goal): Promise<Milestone[]> {
  const prompt = `Generate 5 ordered milestones for this goal. Each milestone should be a clear, achievable checkpoint.

Goal: "${goal.title}"
Category: ${goal.category}
Description: ${goal.description || 'No description'}
Target Date: ${goal.target_date ? new Date(goal.target_date).toLocaleDateString() : 'Not set'}

Generate a JSON array:
[
  { "title": "(milestone title)", "description": "(specific 1-2 sentence description)", "order_index": 0 },
  { "title": "(title)", "description": "(description)", "order_index": 1 },
  { "title": "(title)", "description": "(description)", "order_index": 2 },
  { "title": "(title)", "description": "(description)", "order_index": 3 },
  { "title": "(title)", "description": "(description)", "order_index": 4 }
]

Make each milestone specific, measurable, and actionable for the ${goal.category} category.`

  return await aiManager.generateJSON(prompt);
}

// ─── Extract Tasks From Image (Magic Whiteboard) ────────────────────────────────

export interface ExtractedTask {
  title: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  estimated_minutes: number
}

export async function extractTasksFromImage(base64Image: string, mimeType: string): Promise<ExtractedTask[]> {
  const prompt = `You are a productivity AI. Analyze this image (which could be a whiteboard, sticky notes, syllabus, or handwritten to-do list).
Extract all actionable tasks or assignments you can find.

Generate a JSON array of tasks with EXACTLY this structure:
[
  {
    "title": "(Clear, actionable task title)",
    "priority": "low" or "medium" or "high" or "critical",
    "estimated_minutes": (number of minutes it might take, e.g., 15, 30, 60, 120)
  }
]

If the image contains no actionable tasks, return an empty array [].
Be smart about priorities (e.g., an exam tomorrow is critical).
Return ONLY the raw JSON array. No markdown, no backticks, no explanations.`

    try {
    const tasks = await aiManager.generateJSON<ExtractedTask[]>(prompt, { 
      image: { base64: base64Image, mimeType: mimeType } 
    });
    return Array.isArray(tasks) ? tasks : [];
  } catch (error) {
    console.error('Error extracting tasks from image:', error);
    return [];
  }
}

// ─── Helper: Call Gemini with JSON response and Grok fallback ───────────────────

async function callGeminiJSON<T>(prompt: string, maxTokens = 4096): Promise<T> {
  return await aiManager.generateJSON<T>(prompt, { maxTokens });
}

// ─── 1. AI Daily Briefing ───────────────────────────────────────────────────────

export async function generateDailyBriefing(userId: string): Promise<DailyBriefing> {
  // Check cache first (30 min TTL)
  const cached = await getCachedAIResponse<DailyBriefing>(userId, 'daily_briefing')
  if (cached) return cached

  const context = await buildUserContext(userId)

  const prompt = `${context}

Based on the user's REAL data above, generate a personalized daily briefing.

Generate a JSON response with EXACTLY this structure:
{
  "top_priority": { "task_title": "(name of the most urgent task from the user's actual task list)", "reason": "(why this is the top priority, 1 sentence)" },
  "estimated_workload_hours": (number — total estimated hours of work remaining today based on incomplete tasks),
  "highest_risk_deadline": { "task_title": "(task closest to deadline)", "due_date": "(ISO date)", "risk_percent": (0-100) } or null if no deadlines,
  "suggested_focus": { "duration_minutes": (25, 45, or 90), "best_time": "(e.g. 'Morning' or 'Now')", "task_title": "(which task to focus on)" },
  "motivational_message": "(short personalized encouragement, 1-2 sentences, matching the coach tone)",
  "quick_wins": ["(easy task that can be done in <15min)", "(another quick win)"],
  "overall_risk_score": (0-100 based on overdue tasks and approaching deadlines),
  "greeting": "(personalized greeting based on time of day and coach tone, e.g. 'Good morning, {name}! ☀️')",
  "overdue_tasks": [{"title": "(overdue task name)", "days_overdue": (number)}],
  "productivity_summary": "(1-2 sentence summary of recent productivity — e.g. 'You completed 5 tasks this week, focusing mostly in the evenings.')",
  "burnout_level": "low" or "moderate" or "high" or "critical",
  "ai_recommendation": "(1-2 sentence strategic recommendation for the day — e.g. 'Focus on your DBMS assignment first to reduce deadline risk by 35%.')"
}

IMPORTANT: Use ONLY real task titles from the user's data. If user has no tasks, set top_priority task_title to "Add your first task" and overall_risk_score to 0.`

  const result = await callGeminiJSON<DailyBriefing>(prompt)
  await setCachedAIResponse(userId, 'daily_briefing', result, 30)
  return result
}

// ─── 2. What Should I Do Now? ───────────────────────────────────────────────────

export async function generateWhatShouldIDoNow(userId: string): Promise<NextAction> {
  const context = await buildUserContext(userId)

  const prompt = `${context}

The user just asked: "What should I do now?"

Analyze ALL their pending tasks, deadlines, goals, and focus history. Determine the SINGLE most important action they should take RIGHT NOW.

Generate a JSON response:
{
  "task_title": "(exact title of the task they should work on — from their actual task list)",
  "reasoning": "(2-3 sentence explanation of WHY this is the best use of their time right now — reference specific deadlines, priorities, or risk factors)",
  "risk_reduction_percent": (how much completing this task reduces their overall deadline risk, 0-100),
  "estimated_minutes": (realistic time estimate for this task),
  "category": "(work/study/personal/health)"
}

If user has NO tasks, recommend they add their first task. Be specific and actionable.`

  return await callGeminiJSON<NextAction>(prompt, 1024)
}

// ─── 3. AI Time Simulator ──────────────────────────────────────────────────────

export async function generateTimeSimulation(userId: string, scenario: string): Promise<TimeSimulation> {
  const context = await buildUserContext(userId)

  const prompt = `${context}

The user wants to simulate a "what if" scenario:
"${scenario}"

Analyze their REAL tasks, deadlines, and workload. Then simulate what would happen.

Generate a JSON response:
{
  "scenario": "${scenario}",
  "current_state": {
    "overall_risk": (current deadline risk 0-100 based on real data),
    "success_probability": (probability of completing all tasks on time 0-100),
    "overdue_count": (number of currently overdue tasks),
    "workload_hours": (total estimated work remaining in hours)
  },
  "simulated_state": {
    "overall_risk": (projected risk AFTER the scenario plays out),
    "success_probability": (projected success probability),
    "overdue_count": (projected overdue count),
    "workload_hours": (projected workload hours)
  },
  "impact_summary": "(2-3 sentence analysis of the impact — be specific about which tasks are affected)",
  "recovery_suggestions": ["(actionable recovery step 1)", "(step 2)", "(step 3)"],
  "verdict": "safe" or "risky" or "dangerous"
}

Be realistic and base ALL numbers on the user's actual task data.`

  return await callGeminiJSON<TimeSimulation>(prompt)
}

// ─── 4. AI Smart Recovery ───────────────────────────────────────────────────────

export async function generateSmartRecovery(userId: string, taskTitle: string): Promise<SmartRecovery> {
  const context = await buildUserContext(userId)

  const prompt = `${context}

The user needs a smart recovery plan for this specific at-risk task: "${taskTitle}"

Analyze their full workload and generate a practical recovery plan.

Generate a JSON response:
{
  "task_title": "${taskTitle}",
  "current_risk": (0-100 risk score for this specific task),
  "recovery_schedule": [
    { "day": "Today", "focus_hours": 3, "tasks": ["specific sub-task 1", "sub-task 2"] },
    { "day": "Tomorrow", "focus_hours": 2, "tasks": ["sub-task 3"] }
  ],
  "new_priorities": [
    { "title": "(task to deprioritize)", "priority": "low", "reason": "(why it can wait)" }
  ],
  "suggested_focus_blocks": [
    { "start_time": "9:00 AM", "duration_minutes": 45, "task": "(specific work to do)" },
    { "start_time": "10:00 AM", "duration_minutes": 45, "task": "(next block)" }
  ],
  "estimated_completion": "(e.g. 'Tomorrow by 3 PM')",
  "success_probability": (0-100),
  "motivational_message": "(encouraging 1-2 sentence message)"
}

Create 2-4 days of schedule and 3-5 focus blocks. Be realistic based on their actual workload.`

  return await callGeminiJSON<SmartRecovery>(prompt)
}

// ─── 5. AI Weekly Review ────────────────────────────────────────────────────────

export async function generateWeeklyReview(userId: string): Promise<WeeklyReview> {
  // Check cache (6 hour TTL)
  const cached = await getCachedAIResponse<WeeklyReview>(userId, 'weekly_review')
  if (cached) return cached

  const context = await buildUserContext(userId)
  const stats = await getWeeklyStats(userId)

  const prompt = `${context}

WEEKLY STATS (last 7 days):
- Tasks completed this week: ${stats.tasks_completed}
- Total tasks: ${stats.total_tasks}
- Overdue tasks: ${stats.overdue_count}
- Focus minutes: ${stats.focus_minutes}
- Most productive day: ${stats.most_productive_day}
- Active goals: ${stats.active_goals}
- Garden level: ${stats.garden_level}
- Current streak: ${stats.current_streak} days

Generate a comprehensive weekly review:
{
  "biggest_achievement": "(specific achievement referencing actual completed tasks or goals)",
  "most_productive_day": "${stats.most_productive_day}",
  "total_focus_hours": ${Math.round(stats.focus_minutes / 60 * 10) / 10},
  "tasks_completed": ${stats.tasks_completed},
  "goals_progressed": [
    { "title": "(actual goal name)", "progress_change": "(e.g. '+15%')" }
  ],
  "areas_for_improvement": ["(specific, actionable area 1)", "(area 2)"],
  "personalized_advice": "(2-3 sentences of personalized advice based on patterns — match coach tone)",
  "overall_grade": "(A+, A, B+, B, C, or D based on productivity)"
}

Use ONLY real data. If the user completed 0 tasks, be encouraging but honest.`

  const result = await callGeminiJSON<WeeklyReview>(prompt)
  await setCachedAIResponse(userId, 'weekly_review', result, 360)
  return result
}

// ─── 6. AI Productivity Insights ────────────────────────────────────────────────

export async function generateProductivityInsights(userId: string): Promise<InsightCard[]> {
  // Check cache (2 hour TTL)
  const cached = await getCachedAIResponse<InsightCard[]>(userId, 'productivity_insights')
  if (cached) return cached

  const context = await buildUserContext(userId)

  const prompt = `${context}

Analyze the user's productivity patterns DEEPLY. Look for BEHAVIORAL patterns, not just statistics.

Analyze these dimensions:
1. Peak productivity hours (when do they complete the most tasks or have longest focus sessions?)
2. Task completion patterns (do they finish easy tasks first while delaying harder ones?)
3. Day-of-week trends (which days are most/least productive?)
4. Focus session trends (are sessions getting longer or shorter over time?)
5. Procrastination patterns (do tasks sit in 'todo' for days before being started?)
6. Priority handling (do they tackle critical tasks first or avoid them?)

Generate a JSON array with EXACTLY 4 insight cards:
[
  {
    "id": "insight_1",
    "icon": "(emoji that represents this insight)",
    "title": "(short catchy title, e.g. 'Night Owl Coder' or 'Monday Slump')",
    "insight": "(specific BEHAVIORAL insight explaining the pattern, e.g. 'You complete 40% more tasks on Wednesdays. Your focus sessions are also 25% longer that day.')",
    "metric": "(key stat, e.g. '40% more productive')",
    "recommendation": "(actionable suggestion WITH reasoning, e.g. 'Schedule your hardest tasks on Wednesdays to leverage your natural rhythm. This could reduce your deadline risk by 15%.')",
    "color": "green" or "blue" or "amber" or "purple" or "rose"
  }
]

IMPORTANT: Make insights feel like a personal AI coach who deeply understands their work psychology. Explain WHY patterns exist, not just WHAT they are. If data is limited, make intelligent inferences from task types, priorities, and completion patterns.`

  const result = await callGeminiJSON<InsightCard[]>(prompt, 2048)
  await setCachedAIResponse(userId, 'productivity_insights', result, 120)
  return result
}

// ─── 7. AI Burnout Detection ────────────────────────────────────────────────────

export async function generateBurnoutAssessment(userId: string): Promise<BurnoutReport> {
  // Check cache (2 hour TTL)
  const cached = await getCachedAIResponse<BurnoutReport>(userId, 'burnout_assessment')
  if (cached) return cached

  const context = await buildUserContext(userId)

  const prompt = `${context}

Analyze the user's workload, focus sessions, task completion rate, and overdue work to assess burnout risk.

Generate a JSON response:
{
  "burnout_score": (0-100, where 0 is fully energized and 100 is severely burned out),
  "stress_level": "low" or "moderate" or "high" or "critical",
  "contributing_factors": ["(specific factor from their data, e.g. '5 overdue tasks creating pressure')", "(factor 2)", "(factor 3)"],
  "recovery_recommendations": ["(actionable recommendation 1)", "(recommendation 2)", "(recommendation 3)"],
  "positive_signs": ["(positive thing from their data, e.g. '3-day streak shows consistency')", "(positive 2)"]
}

Base the score on:
- High overdue count = +20 to score
- Long active streak = -10 (positive)
- Many tasks completed recently = -15 (positive)
- High workload with few focus sessions = +25
- Low garden activity = +10
Be fair and encouraging. If data is limited, default to a moderate score around 30.`

  const result = await callGeminiJSON<BurnoutReport>(prompt, 1024)
  await setCachedAIResponse(userId, 'burnout_assessment', result, 120)
  return result
}

// ─── 8. Morning Briefing (wraps daily briefing with MorningBriefing type) ───────

export async function generateMorningBriefing(userId: string): Promise<MorningBriefing> {
  // Re-uses the enhanced daily briefing which now returns all MorningBriefing fields
  const briefing = await generateDailyBriefing(userId)
  return briefing as unknown as MorningBriefing
}

// ─── 9. Proactive Insight (lightweight, for notifications) ──────────────────────

export async function generateProactiveInsight(
  userId: string,
  triggerEvent: string
): Promise<{ title: string; message: string; reasoning: string }> {
  // Check cache (15 min TTL)
  const cacheKey = `proactive_${triggerEvent.replace(/\s+/g, '_').substring(0, 50)}`
  const cached = await getCachedAIResponse<{ title: string; message: string; reasoning: string }>(userId, cacheKey)
  if (cached) return cached

  const context = await buildUserContext(userId)

  const prompt = `${context}

A specific event just occurred: "${triggerEvent}"

Generate a SHORT, personalized proactive notification for the user.

JSON response:
{
  "title": "(emoji + short title, max 8 words)",
  "message": "(1-2 sentence actionable message)",
  "reasoning": "(1 sentence explaining WHY this matters based on the user's real data)"
}

Be specific. Reference real task names and deadlines. Match the coach tone.`

  const result = await callGeminiJSON<{ title: string; message: string; reasoning: string }>(prompt, 512)
  await setCachedAIResponse(userId, cacheKey, result, 15)
  return result
}

// ─── 10. Adaptive Roadmap Update ────────────────────────────────────────────────

export async function generateAdaptiveRoadmapUpdate(
  userId: string,
  goalTitle: string,
  originalWeeks: { name: string; tasks: string[] }[],
  completedMilestones: string[],
  missedMilestones: string[]
): Promise<AdaptiveRoadmapUpdate> {
  const context = await buildUserContext(userId)

  const prompt = `${context}

The user has a goal: "${goalTitle}" with the following original roadmap:
${originalWeeks.map(w => `${w.name}: ${w.tasks.join(', ')}`).join('\n')}

Completed milestones: ${completedMilestones.length > 0 ? completedMilestones.join(', ') : 'None yet'}
Missed milestones: ${missedMilestones.length > 0 ? missedMilestones.join(', ') : 'None'}

The roadmap needs to be adapted based on actual progress. Generate an updated plan.

JSON response MUST strictly follow this exact structure with no markdown or additional text:
{
  "original_title": "${goalTitle}",
  "adjusted_weeks": [
    {
      "name": "Week N: (theme)",
      "tasks": ["(adjusted task)", "(task)"],
      "status": "completed"
    }
  ],
  "recovery_suggestions": ["(actionable suggestion for catching up)", "(suggestion)"],
  "updated_probability": 85,
  "reasoning": "(2-3 sentence explanation of what changed and why)"
}

Rules:
1. "status" MUST be one of: "completed", "on_track", "behind", "adjusted"
2. "updated_probability" MUST be an integer between 0 and 100 (e.g., 85). DO NOT include the '%' sign.
3. Generate 4 weeks. Mark completed weeks as "completed", keep on-track ones, and adjust/redistribute missed work into remaining weeks. Be realistic.`

  return await callGeminiJSON<AdaptiveRoadmapUpdate>(prompt)
}

