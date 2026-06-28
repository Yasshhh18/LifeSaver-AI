// ─── AI Roadmap Edge Function ───────────────────────────────────────────────────
// Generates project/goal roadmaps with weekly milestones using Gemini 2.5 Pro.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const GEMINI_MODEL = 'gemini-2.5-pro'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const { topic, goalId } = await req.json()
    if (!topic && !goalId) {
      return new Response(JSON.stringify({ error: 'topic or goalId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch goal details if goalId provided
    let goalTitle = topic || ''
    let goalContext = ''
    if (goalId) {
      const { data: goal } = await supabaseAdmin
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single()

      if (goal) {
        goalTitle = goal.title
        goalContext = `
Goal Category: ${goal.category}
Current Progress: ${goal.progress_percent}%
Target Date: ${goal.target_date ? new Date(goal.target_date).toLocaleDateString() : 'Not set'}
Description: ${goal.description || 'No description'}`
      }
    }

    // Fetch user settings for personalization
    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const userType = settings?.user_type || 'developer'

    const prompt = `You are an expert project planner. Generate a structured 4-week roadmap for the following goal/project.

Goal: "${goalTitle}"
${goalContext}
User Type: ${userType}

Generate a JSON response with EXACTLY this structure (no markdown, no code blocks, just raw JSON):
{
  "title": "${goalTitle}",
  "probability": <success probability 0-100>,
  "weeks": [
    {
      "name": "Week 1: <theme>",
      "tasks": [
        "<specific actionable task 1>",
        "<specific actionable task 2>",
        "<specific actionable task 3>"
      ]
    },
    {
      "name": "Week 2: <theme>",
      "tasks": ["<task>", "<task>", "<task>"]
    },
    {
      "name": "Week 3: <theme>",
      "tasks": ["<task>", "<task>", "<task>"]
    },
    {
      "name": "Week 4: <theme>",
      "tasks": ["<task>", "<task>", "<task>"]
    }
  ]
}

Guidelines:
- Make tasks specific, actionable, and achievable within a week
- Tailor tasks to a ${userType} profile
- Build tasks progressively (foundations first, polish last)
- Each week should have 3-4 specific tasks
- Success probability should be realistic based on the goal complexity`

    const geminiResponse = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
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

    let roadmap
    try {
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      roadmap = JSON.parse(cleanJson)
    } catch {
      console.error('Failed to parse roadmap JSON:', responseText)
      return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(roadmap), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Roadmap error:', error)
    return new Response(JSON.stringify({ error: 'Internal error', message: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
