import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Brain, Send, X, Bot, ArrowRight, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { chatWithAI } from '@/services/geminiService'

interface AskLifeSaverProps {
  isOpen: boolean
  onClose: () => void
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AskLifeSaver({ isOpen, onClose }: AskLifeSaverProps) {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // AI settings and details
  const [aiConfig, setAiConfig] = useState({ coachTone: 'mentor', userType: 'developer' })
  const [profile, setProfile] = useState({ name: 'User' })
  const { user } = useAuth()

  useEffect(() => {
    const loadConfig = () => {
      const savedAi = localStorage.getItem('ls_ai')
      const savedProfile = localStorage.getItem('ls_profile')
      if (savedAi) {
        try { setAiConfig(JSON.parse(savedAi)) } catch (e) {}
      }
      if (savedProfile) {
        try { setProfile(JSON.parse(savedProfile)) } catch (e) {}
      }
    }
    loadConfig()
    window.addEventListener('ai_settings_updated', loadConfig)
    window.addEventListener('profile_updated', loadConfig)
    return () => {
      window.removeEventListener('ai_settings_updated', loadConfig)
      window.removeEventListener('profile_updated', loadConfig)
    }
  }, [])

  // Generate welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const firstNames = profile.name.split(' ')[0]
      const welcomeMessages: Record<string, string> = {
        mentor: `Hello, ${firstNames}. I am your Zen Mentor. I've analyzed your ${aiConfig.userType} workload for today. Take a slow breath. What is feeling heavy that I can help clarify or simplify?`,
        coach: `Hey ${firstNames}! Let's locked in today. Your ${aiConfig.userType} stats are in, and we have targets to secure. What plan or prioritize recovery do you need right now?`,
        friend: `Hey ${firstNames}! 😊 How's it going? Just check in on your garden and goals. Need some help deciding what to work on next, or just want to chat through a study block?`,
        manager: `Good morning, ${firstNames}. Profile type: ${aiConfig.userType} active. AI management assistant online. Specify query regarding active task backlog, deadline forecasting, or recovery logs.`
      }

      setMessages([
        { 
          role: 'assistant', 
          content: welcomeMessages[aiConfig.coachTone] || welcomeMessages['mentor'] 
        }
      ])
    }
  }, [isOpen, aiConfig, profile])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = async (text: string) => {
    if (!text.trim() || !user) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setQuery('')
    setIsTyping(true)

    try {
      const historyForAi = messages.map(m => ({ role: m.role, content: m.content }))
      const reply = await chatWithAI(user.uid, text, historyForAi)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (error: any) {
      console.error('AskLifeSaver chat error:', error)
      const errDetail = error?.message || error?.toString() || 'Unknown error'
      setMessages(prev => [...prev, { role: 'assistant', content: `Connection error. Details: ${errDetail}` }])
    } finally {
      setIsTyping(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-32px)] h-[500px] flex flex-col bg-white/95 backdrop-blur-md border border-surface-container-high rounded-3xl shadow-large overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-container bg-surface-container-low/60 relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-forest-gradient flex items-center justify-center shadow-glow-green animate-pulse-soft">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-foreground">Ask LifeSaver</h4>
            <span className="text-[9px] uppercase tracking-wide text-primary-750 font-bold block leading-none mt-0.5">
              {aiConfig.coachTone === 'mentor' ? 'Zen Mentor' :
               aiConfig.coachTone === 'coach' ? 'No-Nonsense Coach' :
               aiConfig.coachTone === 'friend' ? 'Calm Friend' : 'Strict Manager'} mode
            </span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-surface-container transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-surface-container-low/10">
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 shrink-0 text-xs mt-1">
                🤖
              </div>
            )}
            
            <div className={`p-3 rounded-2xl text-xs max-w-[80%] leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-primary-700 text-white font-medium rounded-tr-none shadow-soft'
                : 'bg-white text-foreground border border-surface-container-high rounded-tl-none shadow-sm font-semibold'
            }`}>
              {msg.content.split('\n').map((line, idx) => (
                <p key={idx} className={idx > 0 ? 'mt-1.5' : ''}>{line}</p>
              ))}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-6 h-6 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 shrink-0 text-xs">
              🤖
            </div>
            <div className="bg-white text-muted-foreground border border-surface-container-high px-4 py-2.5 rounded-2xl rounded-tl-none text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0.15s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0.3s' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length === 1 && !isTyping && (
        <div className="px-4 py-2 bg-surface-container-low/30 border-t border-surface-container/60 overflow-x-auto whitespace-nowrap flex gap-2 scrollbar-none">
          {[
            { label: '🎯 Next Task?', q: 'What should I work on right now?' },
            { label: '📅 Prioritize?', q: 'Prioritize my tasks' },
            { label: '⚠️ Recovery Plan?', q: 'Create a recovery plan for my deadline' },
            { label: '🌿 Garden Status?', q: 'How is my garden doing?' }
          ].map((prompt) => (
            <button
              key={prompt.label}
              onClick={() => handleSend(prompt.q)}
              className="px-2.5 py-1 bg-white border border-surface-container rounded-full text-[10px] font-bold text-primary-750 hover:bg-primary-50 hover:border-primary-300 transition-colors"
            >
              {prompt.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <div className="p-3 border-t border-surface-container bg-white flex gap-2">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask LifeSaver..."
          onKeyDown={(e) => e.key === 'Enter' && handleSend(query)}
          className="flex-1 input-base py-2 px-3 text-xs"
        />
        <button 
          onClick={() => handleSend(query)}
          className="w-8 h-8 rounded-xl bg-forest-gradient text-white flex items-center justify-center shadow-medium hover:scale-105 active:scale-95 transition-all"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
