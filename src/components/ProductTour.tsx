import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Mic, Target, Leaf, ChevronRight, ChevronLeft, X } from 'lucide-react'

interface ProductTourProps {
  onClose: () => void
}

export default function ProductTour({ onClose }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const [selectedTone, setSelectedTone] = useState(() => {
    try {
      const saved = localStorage.getItem('ls_ai')
      return saved ? JSON.parse(saved).coachTone || 'mentor' : 'mentor'
    } catch {
      return 'mentor'
    }
  })

  const handleSelectTone = (tone: string) => {
    setSelectedTone(tone)
    try {
      const saved = localStorage.getItem('ls_ai')
      const config = saved ? JSON.parse(saved) : { userType: 'developer' }
      config.coachTone = tone
      localStorage.setItem('ls_ai', JSON.stringify(config))
      window.dispatchEvent(new Event('ai_settings_updated'))
    } catch (e) {
      console.error('Error updating AI tone:', e)
    }
  }

  const steps = [
    {
      title: 'AI Personality Mode 🧠',
      description: (
        <div className="flex flex-col gap-3 mt-2 text-sm text-left">
          {[
            { id: 'mentor', icon: '🌿', name: 'Zen Mentor', desc: 'Calm, supportive, and balanced advice.' },
            { id: 'coach', icon: '⚡', name: 'No-Nonsense Coach', desc: 'Direct, metric-driven, and high energy.' },
            { id: 'friend', icon: '🤝', name: 'Calm Friend', desc: 'Casual, friendly, and highly empathetic.' },
            { id: 'manager', icon: '👔', name: 'Strict Manager', desc: 'Task-focused, formal, and deadline-driven.' },
          ].map(persona => (
            <button
              key={persona.id}
              onClick={() => handleSelectTone(persona.id)}
              className={`flex items-start gap-2 p-2.5 rounded-xl border transition-all text-left w-full cursor-pointer ${
                selectedTone === persona.id 
                  ? 'bg-primary-50 border-primary-500 shadow-sm ring-1 ring-primary-500' 
                  : 'bg-black/5 border-black/5 hover:bg-black/10'
              }`}
            >
              <span className="text-xl leading-none">{persona.icon}</span> 
              <div className="flex-1">
                <span className={`font-bold block mb-0.5 ${selectedTone === persona.id ? 'text-primary-900' : 'text-foreground'}`}>
                  {persona.name}
                </span>
                <span className={`${selectedTone === persona.id ? 'text-primary-800' : 'text-muted-foreground'}`}>
                  {persona.desc}
                </span>
              </div>
            </button>
          ))}
        </div>
      ),
      icon: <Brain className="w-8 h-8 text-primary-600" />
    },
    {
      title: 'Talk to Sage: Voice AI 🎙️',
      description: 'Click "Talk to Sage" to interact with our Voice AI. Sage remembers your goals and gives you real-time verbal coaching.',
      icon: <Mic className="w-8 h-8 text-emerald-600" />
    },
    {
      title: 'Smart Goal Decomposition 🎯',
      description: 'Head over to the Goals tab. Let our AI break down your massive projects into bite-sized, actionable daily tasks instantly.',
      icon: <Target className="w-8 h-8 text-amber-600" />
    },
    {
      title: 'Gamified Progress Garden 🌱',
      description: 'Every task you complete waters your digital garden. Build your streak, watch your plants grow, and stay consistently motivated!',
      icon: <Leaf className="w-8 h-8 text-green-600" />
    }
  ]

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onClose()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl z-10 overflow-hidden relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-muted-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center mb-6 shadow-sm">
            {steps[currentStep].icon}
          </div>
          
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-2xl font-black text-foreground mb-3 leading-tight">
              {steps[currentStep].title}
            </h2>
            <div className="text-muted-foreground text-base leading-relaxed">
              {steps[currentStep].description}
            </div>
          </motion.div>
        </div>

        <div className="px-8 py-5 bg-surface-container-low/30 border-t border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep ? 'w-6 bg-primary-600' : 'w-1.5 bg-black/10'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`p-2 rounded-full transition-colors ${
                currentStep === 0 ? 'text-black/10' : 'text-foreground hover:bg-black/5'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={nextStep}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors shadow-md active:scale-95"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              {currentStep !== steps.length - 1 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
