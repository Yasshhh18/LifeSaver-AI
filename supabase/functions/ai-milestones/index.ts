// ─── AI Milestones Edge Function ────────────────────────────────────────────────
// Breaks goals into ordered milestones using Gemini 2.5 Flash.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const GEMINI_MODEL = 'gemini-2.5-flash'
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

    const { goalId, goalTitle, goalCategory, goalDescription, targetDate } = await req.json()

    if (!goalTitle) {
      return new Response(JSON.stringify({ error: 'goalTitle is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prompt = `Generate 5 ordered milestones for the following goal. Each milestone should be a clear, achievable checkpoint.

Goal: "${goalTitle}"
Category: ${goalCategory || 'general'}
Description: ${goalDescription || 'No description provided'}
Target Date: ${targetDate ? new Date(targetDate).toLocaleDateString() : 'Not set'}

Generate a JSON array with EXACTLY this structure (no markdown, no code blocks, just raw JSON):
[
  {
    "title": "<milestone title>",
    "description": "<specific 1-2 sentence description>",
    "order_index": 0
  },
  {
    "title": "<milestone title>",
    "description": "<specific description>",
    "order_index": 1
  }
]

Guidelines:
- Generate exactly 5 milestones
- Order from first step to completion
- Make each milestone specific and measurable
- Tailor to the goal category (${goalCategory || 'general'})
- Each milestone should take roughly equal effort
- Descriptions should be actionable, not vague`

    const geminiResponse = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
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

    let milestones
    try {
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      milestones = JSON.parse(cleanJson)
    } catch {
      console.error('Failed to parse milestones JSON:', responseText)
      return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Add goal_id and other fields to each milestone
    const enrichedMilestones = milestones.map((m: any, i: number) => ({
      id: crypto.randomUUID(),
      goal_id: goalId || '',
      title: m.title,
      description: m.description,
      completed: false,
      order_index: m.order_index ?? i,
      created_at: new Date().toISOString(),
    }))

    return new Response(JSON.stringify(enrichedMilestones), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Milestones error:', error)
    return new Response(JSON.stringify({ error: 'Internal error', message: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
