// ─── AI Chat Edge Function ──────────────────────────────────────────────────────
// Handles chat messages by fetching user data and calling Gemini API.
// The GEMINI_API_KEY is stored as a secret and never exposed to the frontend.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Use Gemini 2.5 Flash for chat (fast, efficient)
const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify user auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create Supabase client with user's JWT to get their identity
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = user.id

    // 2. Parse request
    const { message, conversationHistory = [], source = 'chat' } = await req.json()

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Fetch user's data from database using service role (bypasses RLS)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const [
      settingsResult,
      tasksResult,
      goalsResult,
      focusResult,
      gardenResult,
      progressResult,
    ] = await Promise.all([
      supabaseAdmin.from('user_settings').select('*').eq('user_id', userId).single(),
      supabaseAdmin.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabaseAdmin.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabaseAdmin.from('focus_sessions').select('*').eq('user_id', userId).order('started_at', { ascending: false }).limit(20),
      supabaseAdmin.from('garden_progress').select('*').eq('user_id', userId).single(),
      supabaseAdmin.from('progress_logs').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(14),
    ])

    const settings = settingsResult.data
    const tasks = tasksResult.data ?? []
    const goals = goalsResult.data ?? []
    const focusSessions = focusResult.data ?? []
    const garden = gardenResult.data
    const progressLogs = progressResult.data ?? []

    // 4. Build context-rich system prompt
    const userName = settings?.full_name || user.email?.split('@')[0] || 'User'
    const coachTone = settings?.coach_tone || 'mentor'
    const userType = settings?.user_type || 'developer'
    const now = new Date()

    const incompleteTasks = tasks.filter((t: any) => t.status !== 'completed')
    const completedTasks = tasks.filter((t: any) => t.status === 'completed')
    const overdueTasks = incompleteTasks.filter((t: any) => t.due_date && new Date(t.due_date) < now)
    const urgentTasks = incompleteTasks.filter((t: any) => t.priority === 'critical' || t.priority === 'high')

    const totalFocusMinutes = focusSessions
      .filter((s: any) => s.status === 'completed')
      .reduce((sum: number, s: any) => sum + (s.actual_duration_minutes || 0), 0)

    const activeGoals = goals.filter((g: any) => g.status === 'active')

    const toneInstructions: Record<string, string> = {
      mentor: 'You are a calm, wise Zen Mentor. Speak with warmth, encourage balance, and guide gently. Use metaphors about growth and nature. Be thoughtful and measured.',
      coach: 'You are a sharp, results-driven Coach. Be direct, motivating, and action-oriented. Push for execution. Use energetic language. No fluff, all substance.',
      friend: 'You are a warm, supportive Friend. Be encouraging, use casual language, emojis occasionally, and genuinely care about their wellbeing. Be relatable and uplifting.',
      manager: 'You are a professional, analytical Manager. Be structured, data-driven, and precise. Use metrics, prioritization frameworks, and efficiency-focused language.',
    }

    const systemPrompt = `You are Sage, an AI productivity coach inside LifeSaver AI.

${toneInstructions[coachTone] || toneInstructions.mentor}

User Profile:
- Name: ${userName}
- Type: ${userType}
- Current Date/Time: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}

=== USER'S CURRENT DATA ===

TASKS (${tasks.length} total, ${incompleteTasks.length} incomplete, ${overdueTasks.length} overdue):
${incompleteTasks.length > 0
  ? incompleteTasks.slice(0, 15).map((t: any) => `- [${t.priority?.toUpperCase()}] "${t.title}" — Status: ${t.status}${t.due_date ? `, Due: ${new Date(t.due_date).toLocaleDateString()}` : ''}${t.estimated_minutes ? `, Est: ${t.estimated_minutes}min` : ''}`).join('\n')
  : '- No incomplete tasks'}

COMPLETED RECENTLY: ${completedTasks.length} tasks completed

GOALS (${activeGoals.length} active):
${activeGoals.length > 0
  ? activeGoals.map((g: any) => `- "${g.title}" (${g.category}) — ${g.progress_percent}% complete${g.target_date ? `, Target: ${new Date(g.target_date).toLocaleDateString()}` : ''}`).join('\n')
  : '- No active goals'}

FOCUS SESSIONS (recent):
- Total focus time (last 7 days): ${totalFocusMinutes} minutes
- Sessions completed: ${focusSessions.filter((s: any) => s.status === 'completed').length}

GARDEN & GAMIFICATION:
- Level: ${garden?.level ?? 1}
- XP: ${garden?.xp ?? 0}
- Plants grown: ${garden?.total_plants ?? 0}
- Current streak: ${garden?.current_streak ?? 0} days
- Longest streak: ${garden?.longest_streak ?? 0} days

PRODUCTIVITY (last 14 days):
${progressLogs.length > 0
  ? progressLogs.slice(0, 7).map((l: any) => `- ${l.date}: ${l.tasks_completed} tasks, ${l.focus_minutes}min focus${l.mood_score ? `, mood: ${l.mood_score}/5` : ''}`).join('\n')
  : '- No recent productivity data'}

=== INSTRUCTIONS ===
1. Generate personalized, actionable responses based on the REAL data above.
2. Reference actual task names, goal titles, and real statistics when relevant.
3. NEVER fabricate tasks or goals the user doesn't have.
4. If the user has no data yet, acknowledge it and encourage them to add tasks/goals.
5. For scheduling questions, create schedules based on their actual tasks and estimated times.
6. For progress questions, calculate real completion rates from their data.
7. Keep responses concise but helpful. Use markdown formatting for lists and structure.
8. If asked about the garden, reference their actual level, streak, and plant count.
9. When suggesting what to work on, prioritize by: overdue > critical > high > medium > low.
10. Be encouraging and constructive, never judgmental about incomplete tasks.`

    // 5. Build conversation for Gemini
    const geminiContents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I am Sage, ready to assist with personalized productivity guidance based on real user data.' }] },
    ]

    // Add conversation history (last 10 messages for context window efficiency)
    const recentHistory = conversationHistory.slice(-10)
    for (const msg of recentHistory) {
      geminiContents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })
    }

    // Add current message
    geminiContents.push({
      role: 'user',
      parts: [{ text: message }],
    })

    // 6. Call Gemini API
    const geminiResponse = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: {
          temperature: 0.8,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    })

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text()
      console.error('Gemini API error:', errorBody)
      return new Response(JSON.stringify({ error: 'AI service temporarily unavailable', details: errorBody }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const geminiData = await geminiResponse.json()
    const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I was unable to generate a response. Please try again.'

    // 7. Save conversation to database
    await Promise.all([
      supabaseAdmin.from('ai_conversations').insert({
        user_id: userId,
        role: 'user',
        content: message,
        source,
      }),
      supabaseAdmin.from('ai_conversations').insert({
        user_id: userId,
        role: 'assistant',
        content: reply,
        source,
      }),
    ])

    // 8. Return response
    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('AI Chat error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error', message: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
