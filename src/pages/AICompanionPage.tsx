import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Brain, MessageSquare, Volume2, VolumeX, Send, Target, 
  AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, 
  User, Settings, Sparkles, Wand2, Plus, Zap, Mic
} from 'lucide-react'
import { mockGoals } from '@/services/mockData'
import { formatRelativeDate } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { chatWithAI, generateRoadmap } from '@/services/geminiService'
import { getConversationHistory, saveConversationMessage, getGoals } from '@/services/dataService'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface Goal {
  id: string
  title: string
  category: string
  progress_percent: number
  target_date?: string
}

export default function AICompanionPage() {
  const navigate = useNavigate()
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Tab State: conversation | planner | settings
  const [activeTab, setActiveTab] = useState<'conversation' | 'planner' | 'settings'>('conversation')

  // Configurations
  const [profile, setProfile] = useState({ name: 'User' })
  const [aiConfig, setAiConfig] = useState({ 
    coachTone: 'mentor', 
    userType: 'developer',
    voiceEnabled: true 
  })

  // Chat Conversation State
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const { user } = useAuth()

  // Goals & Roadmaps Planner State
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoalId, setSelectedGoalId] = useState<string>('')
  const [roadmapTopic, setRoadmapTopic] = useState('')
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false)
  const [generatedRoadmap, setGeneratedRoadmap] = useState<any>(null)

  // Load configs & goals
  useEffect(() => {
    const loadData = async () => {
      const savedProfile = localStorage.getItem('ls_profile')
      const savedAi = localStorage.getItem('ls_ai')

      if (savedProfile) {
        try { setProfile(JSON.parse(savedProfile)) } catch (e) { console.error(e) }
      }
      if (savedAi) {
        try { 
          const parsed = JSON.parse(savedAi)
          setAiConfig(prev => ({ ...prev, ...parsed }))
        } catch (e) { console.error(e) }
      }
      
      if (user) {
        try {
          const fetchedGoals = await getGoals(user.uid)
          setGoals(fetchedGoals.length > 0 ? fetchedGoals : mockGoals)
        } catch (e) {
          console.error(e)
          setGoals(mockGoals)
        }
      } else {
        setGoals(mockGoals)
      }
    }

    loadData()
    window.addEventListener('profile_updated', loadData)
    window.addEventListener('ai_settings_updated', loadData)
    window.addEventListener('goals_updated', loadData)

    return () => {
      window.removeEventListener('profile_updated', loadData)
      window.removeEventListener('ai_settings_updated', loadData)
      window.removeEventListener('goals_updated', loadData)
    }
  }, [])

  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return
      try {
        const history = await getConversationHistory(user.uid, 'chat', 50)
        if (history.length > 0) {
          setMessages(history.map(m => ({
            id: m.id || Math.random().toString(),
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })))
        }
      } catch (e) {
        console.error('Failed to load chat history:', e)
      }
    }
    loadHistory()
  }, [user])

  // Auto scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Initialize welcome message
  useEffect(() => {
    if (messages.length === 0 && profile.name) {
      const first = profile.name.split(' ')[0]
      const welcome: Record<string, string> = {
        mentor: `Hello, ${first}. I am Sage, your guide to balanced growth. Let's take a deep breath. Focus is not about force; it is about ease. How can I help you clear your mind today?`,
        coach: `What's up, ${first}! Sage here. We have milestones in focus and goals to hit. Let's optimize your ${aiConfig.userType} workload. What are we taking down first?`,
        friend: `Hey ${first}! Sage here. Great to chat with you today! 😊 How are you feeling? If you're stuck on a task or just want to chat through a mental block, I'm right here.`,
        manager: `Cultivator ${first} identified. Role: ${aiConfig.userType}. Sage assistant interface online. Specify query to retrieve backlog prioritization analytics or goal structures.`
      }
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: welcome[aiConfig.coachTone] || welcome['mentor'],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    }
  }, [profile, aiConfig.coachTone])

  // Spoken voice synthesis helper
  const speakVoice = (text: string) => {
    if (!aiConfig.voiceEnabled || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.98
    utterance.pitch = 1.05
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.lang.startsWith('en'))
    if (preferredVoice) utterance.voice = preferredVoice
    window.speechSynthesis.speak(utterance)
  }

  // Handle Chat message submit
  const handleSendChat = async (text: string) => {
    if (!text.trim() || !user) return

    const userMessage: Message = {
      id: 'm_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMessage])
    setChatInput('')
    setIsTyping(true)

    try {
      // Save user message to DB
      await saveConversationMessage({
        user_id: user.uid,
        role: 'user',
        content: text,
        source: 'chat'
      })

      // Get real AI response using context history
      const historyForAi = messages.map(m => ({ role: m.role, content: m.content }))
      const reply = await chatWithAI(user.uid, text, historyForAi)

      const sageMessage: Message = {
        id: 's_' + Date.now(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setMessages(prev => [...prev, sageMessage])
      speakVoice(reply)

      // Save AI message to DB
      await saveConversationMessage({
        user_id: user.uid,
        role: 'assistant',
        content: reply,
        source: 'chat'
      })
    } catch (error) {
      console.error('AI chat error:', error)
      const errorMsg: Message = {
        id: 'e_' + Date.now(),
        role: 'assistant',
        content: 'I am sorry, my connection seems to be interrupted. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
    }
  }

  // Generate Goal Roadmap (AI Planner)
  const handleGenerateRoadmap = async () => {
    const topic = roadmapTopic || (selectedGoalId ? goals.find(g => g.id === selectedGoalId)?.title : '')
    if (!topic || !user) return

    setIsGeneratingRoadmap(true)
    
    try {
      const roadmap = await generateRoadmap(user.uid, topic, selectedGoalId)
      setGeneratedRoadmap(roadmap)
      speakVoice(`Roadmap for "${topic}" generated. Success probability is estimated at ${roadmap.probability}%.`)
    } catch (error) {
      console.error('Failed to generate roadmap:', error)
      alert("Failed to generate roadmap. Please try again.")
    } finally {
      setIsGeneratingRoadmap(false)
    }
  }

  // Apply Generated Tasks to Dashboard Tasks
  const handleApplyRoadmapTasks = () => {
    if (!generatedRoadmap) return

    const rawTasks = localStorage.getItem('ls_tasks')
    const currentTasks = rawTasks ? JSON.parse(rawTasks) : []

    // Map roadmap tasks into Database Tasks structure
    const newTasks = generatedRoadmap.weeks.flatMap((w: any, weekIdx: number) => 
      w.tasks.map((t: string, taskIdx: number) => ({
        id: `t_road_${Date.now()}_${weekIdx}_${taskIdx}`,
        user_id: 'u1',
        title: `[${w.name.split(':')[0]}] ${t}`,
        description: `Roadmap subtask for "${generatedRoadmap.title}"`,
        status: 'todo' as const,
        priority: weekIdx === 0 ? 'high' : 'medium',
        tags: ['roadmap', generatedRoadmap.title.toLowerCase().substring(0, 10)],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
    )

    const updated = [...currentTasks, ...newTasks]
    localStorage.setItem('ls_tasks', JSON.stringify(updated))
    window.dispatchEvent(new Event('tasks_updated'))

    speakVoice("Roadmap tasks successfully queued into your active priority list.")
    alert("Applied tasks to Priority list! Check your Dashboard.")
  }

  // Update AI Settings globally
  const updateAiSettings = (updates: Partial<typeof aiConfig>) => {
    const next = { ...aiConfig, ...updates }
    setAiConfig(next)
    localStorage.setItem('ls_ai', JSON.stringify(next))
    window.dispatchEvent(new Event('ai_settings_updated'))
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex justify-between items-center pb-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Brain className="w-8 h-8 text-primary-700 animate-float" />
            AI Coach Companion
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1.5">
            Interact with Sage, configure your coach persona, and generate custom roadmap plans.
          </p>
        </div>
        
        {/* Tab Selector */}
        <div className="flex rounded-full p-1 bg-black/5 border border-black/5" style={{ background: 'rgba(0,0,0,0.05)', backdropFilter: 'blur(8px)' }}>
          {[
            { id: 'conversation', label: 'Chat' },
            { id: 'planner', label: 'Roadmaps' },
            { id: 'settings', label: 'Coach Style' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-extrabold cursor-pointer transition-all duration-300 ${
                activeTab === t.id 
                  ? 'bg-primary-700 text-white shadow' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid content */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Selected Tab Area */}
        <div className="lg:col-span-2 flex flex-col min-h-[500px]">
          
          {/* TAB 1: CONVERSATION CHAT SCREEN */}
          {activeTab === 'conversation' && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/50 overflow-hidden flex flex-col flex-1 shadow-xl bg-white/40 backdrop-blur-md"
            >
              {/* Chat Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container-high bg-white/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold">🌿</div>
                  <div>
                    <h3 className="font-extrabold text-sm text-foreground">Sage</h3>
                    <span className="text-[9px] uppercase tracking-wider font-black text-emerald-600">Active Coach: {aiConfig.coachTone}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => updateAiSettings({ voiceEnabled: !aiConfig.voiceEnabled })}
                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                    aiConfig.voiceEnabled 
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-700' 
                      : 'bg-white border-black/10 text-muted-foreground'
                  }`}
                  title={aiConfig.voiceEnabled ? "Mute Spoken Voice Output" : "Enable Spoken Voice Output"}
                >
                  {aiConfig.voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>

              {/* Chat Log Message Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[360px]" style={{ minHeight: '300px' }}>
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs shrink-0 self-end">
                        🍃
                      </div>
                    )}
                    <div className="flex flex-col space-y-1 max-w-[75%]">
                      <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary-700 text-white font-semibold rounded-br-none shadow-md'
                          : 'bg-white border border-black/10 text-foreground rounded-bl-none shadow-sm font-semibold'
                      }`} style={{ color: msg.role === 'user' ? '#ffffff' : '#1b1c1a' }}>
                        {msg.content}
                      </div>
                      <span className={`text-[8px] font-bold ${msg.role === 'user' ? 'text-right' : 'text-left'} text-muted-foreground/60`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs shrink-0 self-end">
                      🍃
                    </div>
                    <div className="bg-white border border-black/10 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1.5 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0s' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Footer Form */}
              <div className="p-4 border-t border-white/40 bg-white/40 flex gap-2">
                <button
                  onClick={() => window.dispatchEvent(new Event('open_voice_ai'))}
                  className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center hover:bg-emerald-200 transition-colors cursor-pointer"
                  title="Speak voice command"
                >
                  <Mic className="w-4 h-4 animate-pulse-soft" />
                </button>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat(chatInput)}
                  placeholder="Ask Sage about your focus schedule, DBMS slides, or garden status..."
                  className="flex-1 bg-white border border-black/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-emerald-500 placeholder-black/30 text-foreground"
                />
                <button
                  onClick={() => handleSendChat(chatInput)}
                  className="w-10 h-10 rounded-xl bg-primary-700 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer border-none"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 2: AI GOAL ROADMAP PLANNER */}
          {activeTab === 'planner' && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/50 p-6 shadow-xl bg-white/40 backdrop-blur-md space-y-6 flex-1"
            >
              <div>
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-1.5">
                  <Wand2 className="w-5 h-5 text-emerald-700" /> Sage Roadmap Planner
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Let Sage build a structured, milestone-driven layout plan for any project or custom goal.</p>
              </div>

              {/* Goal Planner Input Controls */}
              <div className="grid sm:grid-cols-2 gap-4 bg-white/30 p-4 rounded-2xl border border-white/35">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Select Active Goal</label>
                  <select
                    value={selectedGoalId}
                    onChange={(e) => {
                      setSelectedGoalId(e.target.value)
                      setRoadmapTopic('')
                    }}
                    className="w-full bg-white border border-black/10 rounded-xl p-2.5 text-xs text-foreground focus:outline-none"
                  >
                    <option value="">-- Choose Goal --</option>
                    {goals.map(g => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Or Type Custom Project</label>
                  <input
                    type="text"
                    value={roadmapTopic}
                    onChange={(e) => {
                      setRoadmapTopic(e.target.value)
                      setSelectedGoalId('')
                    }}
                    placeholder="e.g. Learn Rust programming, Launch App"
                    className="w-full bg-white border border-black/10 rounded-xl p-2.5 text-xs text-foreground focus:outline-none placeholder-black/25"
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end pt-1">
                  <button
                    onClick={handleGenerateRoadmap}
                    disabled={isGeneratingRoadmap || (!selectedGoalId && !roadmapTopic.trim())}
                    className="bg-primary-700 text-white rounded-xl px-5 py-2.5 text-xs font-bold hover:scale-103 transition-transform cursor-pointer disabled:opacity-50 disabled:scale-100 flex items-center gap-2 border-none shadow-md"
                  >
                    <Wand2 className="w-4 h-4" /> 
                    {isGeneratingRoadmap ? 'Generating Plan…' : 'Generate AI Roadmap'}
                  </button>
                </div>
              </div>

              {/* Generated Roadmap Display */}
              <AnimatePresence>
                {generatedRoadmap && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-black/10 pb-3">
                      <div>
                        <h4 className="font-extrabold text-sm text-foreground">Plan: {generatedRoadmap.title}</h4>
                        <span className="text-[9px] font-black text-emerald-700 block mt-0.5">EST. SUCCESS SCORE: {generatedRoadmap.probability}%</span>
                      </div>
                      <button
                        onClick={handleApplyRoadmapTasks}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer border-none flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Apply to Dashboard Tasks
                      </button>
                    </div>

                    {/* Timeline Weeks grid */}
                    <div className="grid sm:grid-cols-2 gap-5 mt-4">
                      {generatedRoadmap.weeks.map((w: any, idx: number) => (
                        <div key={idx} className="p-5 rounded-2xl border border-white/60 bg-white/40 shadow-sm hover:shadow-md hover:bg-white/60 transition-all duration-300">
                          <h5 className="font-extrabold text-sm text-primary-950 flex items-center gap-2 mb-4">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-[10px]">
                              W{idx + 1}
                            </span>
                            {w.name}
                          </h5>
                          <ul className="space-y-3 text-xs text-foreground/80 font-medium">
                            {w.tasks.map((task: string, taskIdx: number) => (
                              <li key={taskIdx} className="flex items-start gap-2.5 leading-relaxed bg-white/50 p-2.5 rounded-xl border border-white/40">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                <span className="pt-px">{task}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* TAB 3: COACH persona SETTINGS */}
          {activeTab === 'settings' && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/50 p-6 shadow-xl bg-white/40 backdrop-blur-md space-y-6 flex-1"
            >
              <div>
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-1.5">
                  <Settings className="w-5 h-5 text-primary-700 animate-spin-slow" /> Coach Personality Configuration
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Customize Sage's advice tone and context profile.</p>
              </div>

              {/* Tone Selection Cards */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Select AI Tone</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'mentor', title: 'Zen Mentor 🧘‍♂️', desc: 'Calming, sustainable guidance' },
                    { id: 'coach', title: 'Hard Coach ⚡', desc: 'Sharp target-focused targets' },
                    { id: 'friend', title: 'Soothing Friend 🤝', desc: 'Warm supportive check-ins' },
                    { id: 'manager', title: 'Strict Manager 💼', desc: 'Analytical workload forecasts' }
                  ].map(tone => (
                    <button
                      key={tone.id}
                      onClick={() => updateAiSettings({ coachTone: tone.id })}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between min-h-[90px] cursor-pointer transition-all duration-300 ${
                        aiConfig.coachTone === tone.id
                          ? 'border-primary-500 bg-primary-500/10 shadow-md ring-1 ring-primary-500'
                          : 'border-white/50 bg-white/10 hover:bg-white/30'
                      }`}
                    >
                      <span className="font-extrabold text-xs text-foreground block">{tone.title}</span>
                      <span className="text-[9px] text-muted-foreground leading-snug mt-1.5 block">{tone.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* User Profile Selection */}
              <div className="space-y-3 pt-3 border-t border-black/5">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Your Profile Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'student', title: 'Student 📚', desc: 'Academics & study schedules' },
                    { id: 'developer', title: 'Developer 💻', desc: 'Deep focus coding blocks' },
                    { id: 'freelancer', title: 'Freelancer 🎨', desc: 'Client project delivery pacing' },
                    { id: 'entrepreneur', title: 'Entrepreneur 🚀', desc: 'Product scope & MVP targets' }
                  ].map(profileType => (
                    <button
                      key={profileType.id}
                      onClick={() => updateAiSettings({ userType: profileType.id })}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between min-h-[90px] cursor-pointer transition-all duration-300 ${
                        aiConfig.userType === profileType.id
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-md ring-1 ring-emerald-500'
                          : 'border-white/50 bg-white/10 hover:bg-white/30'
                      }`}
                    >
                      <span className="font-extrabold text-xs text-foreground block">{profileType.title}</span>
                      <span className="text-[9px] text-muted-foreground leading-snug mt-1.5 block">{profileType.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

        </div>

        {/* Right 1 Column: AI insights & Mood Card */}
        <div className="space-y-4">
          
          {/* Daily Affirmation Dialogue Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="rounded-3xl border border-white/50 p-5 shadow-xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(246, 252, 244, 0.65) 100%)',
              backdropFilter: 'blur(20px)'
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-primary-855">Sage's Affirmation</span>
            </div>
            <p className="text-xs font-semibold text-foreground italic leading-relaxed">
              "Your work is not a race. You grow just like the flowers in our garden—one drop of focus at a time."
            </p>
          </motion.div>

          {/* Recovery Recommendations */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}
            className="rounded-3xl border border-white/50 p-5 shadow-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(246, 252, 244, 0.65) 100%)',
              backdropFilter: 'blur(20px)'
            }}
          >
            <div className="flex items-center gap-2 mb-3.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h4 className="font-extrabold text-sm text-foreground">Stress Recovery Analysis</h4>
            </div>
            
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold">Stress Indicator</span>
                <span className="text-emerald-700 font-extrabold">34% (Sustainable)</span>
              </div>
              <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: '34%' }} />
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed font-semibold">
                Your estimated focus workload is 4.5 hours. Sage suggests taking a 5-minute Pomodoro break every 25 minutes to protect your energy blocks.
              </p>
              
              <button
                onClick={() => navigate('/app/focus')}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-primary-50 border border-primary-300 text-primary-850 hover:bg-primary-100 transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-primary-755" /> Configure Focus Sound
              </button>
            </div>
          </motion.div>

          {/* Active Goals summary */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.16 }}
            className="rounded-3xl border border-white/50 p-5 shadow-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(246, 252, 244, 0.65) 100%)',
              backdropFilter: 'blur(20px)'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary-700" />
                <h4 className="font-extrabold text-sm text-foreground">Goal Progress</h4>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground cursor-pointer" onClick={() => navigate('/app/goals')} />
            </div>

            <div className="space-y-3">
              {goals.slice(0, 2).map((g, i) => (
                <div key={g.id} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-foreground">
                    <span className="truncate max-w-[150px]">{g.title}</span>
                    <span>{g.progress_percent}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
                    <div className="h-full rounded-full bg-primary-700" style={{ width: `${g.progress_percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>

      </div>

    </div>
  )
}
