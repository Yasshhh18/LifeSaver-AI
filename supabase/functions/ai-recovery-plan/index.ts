// ─── AI Recovery Plan Edge Function ─────────────────────────────────────────────
// Generates structured emergency recovery plans using Gemini 2.5 Pro.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Use Gemini 2.5 Pro for complex structured generation
const GEMINI_MODEL = 'gemini-2.5-pro'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Parse request
    const { taskName, deadline } = await req.json()
    if (!taskName || !deadline) {
      return new Response(JSON.stringify({ error: 'taskName and deadline are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Fetch user's current workload for context
    const [tasksResult, settingsResult] = await Promise.all([
      supabaseAdmin.from('tasks').select('*').eq('user_id', user.id).neq('status', 'completed'),
      supabaseAdmin.from('user_settings').select('*').eq('user_id', user.id).single(),
    ])

    const existingTasks = tasksResult.data ?? []
    const settings = settingsResult.data
    const userName = settings?.full_name || user.email?.split('@')[0] || 'User'
    const daysRemaining = Math.max(1, Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

    // 4. Build prompt for structured recovery plan
    const prompt = `You are an AI productivity expert. Generate a detailed emergency recovery plan for a user who is behind on a deadline.

User: ${userName}
Task: "${taskName}"
Deadline: ${deadline} (${daysRemaining} days remaining)
Current workload: ${existingTasks.length} other incomplete tasks

Existing tasks they need to juggle:
${existingTasks.slice(0, 10).map((t: any) => `- "${t.title}" (${t.priority} priority${t.due_date ? `, due ${new Date(t.due_date).toLocaleDateString()}` : ''})`).join('\n')}

Generate a JSON response with EXACTLY this structure (no markdown, no code blocks, just raw JSON):
{
  "deadline": "${deadline}",
  "task_name": "${taskName}",
  "risk_level": "low|medium|high|critical",
  "days_remaining": ${daysRemaining},
  "success_probability": <number 0-100>,
  "motivational_message": "<encouraging personalized message>",
  "priority_actions": [
    {
      "order": 1,
      "title": "<action title>",
      "description": "<specific actionable description>",
      "estimated_hours": <number>,
      "due_by": "<Today|Tomorrow|Day N>"
    }
  ],
  "daily_schedule": [
    {
      "day": "<Today|Tomorrow|weekday name>",
      "date": "<Mon DD>",
      "focus_hours": <number>,
      "tasks": [
        {
          "time": "<HH:MM AM/PM>",
          "task": "<specific task description>",
          "duration": "<Xh or Xm>",
          "priority": "critical|high|medium|low"
        }
      ]
    }
  ]
}

Guidelines:
- Generate 3-5 priority actions
- Generate daily schedules for up to ${Math.min(daysRemaining, 5)} days
- Each day should have 3-5 tasks
- Be realistic about time estimates
- Consider their existing workload
- Set risk_level based on days remaining and task complexity
- Make the motivational message personal and encouraging`

    // 5. Call Gemini API
    const geminiResponse = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text()
      console.error('Gemini API error:', errorBody)
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const geminiData = await geminiResponse.json()
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!responseText) {
      return new Response(JSON.stringify({ error: 'Empty AI response' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 6. Parse JSON response (handle markdown code blocks if present)
    let plan
    try {
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      plan = JSON.parse(cleanJson)
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON:', responseText)
      return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(plan), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Recovery plan error:', error)
    return new Response(JSON.stringify({ error: 'Internal error', message: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
