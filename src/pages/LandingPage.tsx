import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import {
  ArrowRight, Play, Sparkles, Shield, Zap, Target, Timer,
  TreePine, CheckCircle2, Star, ChevronDown, Brain,
  TrendingUp, Calendar, Leaf
} from 'lucide-react'

// ── Floating Card ─────────────────────────────────────────────────────────────
function FloatingCard({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={`glass rounded-2xl p-4 shadow-medium absolute ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transition: { delay: delay + 1.2, duration: 0.6 } }}
      style={{ animation: `float ${6 + delay}s ease-in-out ${delay}s infinite` }}
    >
      {children}
    </motion.div>
  )
}

// ── Feature Card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, description, accent, delay }: {
  icon: React.ElementType; title: string; description: string; accent: string; delay: number
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative bg-white rounded-2xl p-6 shadow-card border border-surface-container-high overflow-hidden group cursor-default"
      style={{ transform: hovered ? 'translateY(-4px)' : 'translateY(0)', transition: 'all 0.25s ease', boxShadow: hovered ? '0 8px 40px rgba(45,90,39,0.14)' : undefined }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'radial-gradient(ellipse at top left, rgba(188,240,174,0.12) 0%, transparent 70%)' }} />
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-bold text-lg text-foreground mb-2">{title}</h3>
      <p className="text-body-sm text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  )
}

// ── Testimonial Card ──────────────────────────────────────────────────────────
function TestimonialCard({ name, role, quote, avatar, delay }: {
  name: string; role: string; quote: string; avatar: string; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-2xl p-6 shadow-card border border-surface-container-high"
    >
      <div className="flex gap-0.5 mb-4">
        {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
      </div>
      <p className="text-body-sm text-muted-foreground leading-relaxed mb-4 italic">"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #154212 0%, #3b8f31 100%)' }}>
          {avatar}
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
      </div>
    </motion.div>
  )
}

// ── Step Card ─────────────────────────────────────────────────────────────────
function StepCard({ num, title, desc, delay }: { num: string; title: string; desc: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="flex gap-5"
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-forest-gradient flex items-center justify-center text-white font-bold text-lg shadow-glow-green">
        {num}
      </div>
      <div>
        <h3 className="font-bold text-foreground mb-1">{title}</h3>
        <p className="text-body-sm text-muted-foreground">{desc}</p>
      </div>
    </motion.div>
  )
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const { signInAsGuest } = useAuth()
  const [loadingDemo, setLoadingDemo] = useState(false)

  const handleGuestSignIn = async () => {
    setLoadingDemo(true)
    const { error } = await signInAsGuest()
    if (!error) {
      navigate('/app/dashboard')
    } else {
      console.error(error)
      setLoadingDemo(false)
    }
  }
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -80])
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -140])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  // 3D tilt effect on hero card and image sequence frame
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])
  
  // Preloading progress state
  const [loadedCount, setLoadedCount] = useState(0)
  const [isAnimationReady, setIsAnimationReady] = useState(false)
  const totalFrames = 120

  useEffect(() => {
    let active = true
    let loaded = 0

    imagesRef.current = new Array(totalFrames)

    const handleLoadOrError = () => {
      if (!active) return
      loaded++
      setLoadedCount(loaded)
      if (loaded === totalFrames) {
        setIsAnimationReady(true)
      }
    }

    for (let i = 1; i <= totalFrames; i++) {
      const img = new Image()
      img.onload = handleLoadOrError
      img.onerror = handleLoadOrError
      
      const num = i.toString().padStart(3, '0')
      img.src = `/assets/hero-images/ezgif-frame-${num}.jpg`
      
      imagesRef.current[i - 1] = img
    }

    return () => {
      active = false
    }
  }, [])

  // Canvas Resize Observer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      
      const targetWidth = Math.floor(rect.width * dpr)
      const targetHeight = Math.floor(rect.height * dpr)
      
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth
        canvas.height = targetHeight
      }
    }

    resizeCanvas()

    const observer = new ResizeObserver(() => {
      resizeCanvas()
    })

    if (canvas.parentElement) {
      observer.observe(canvas.parentElement)
    }

    window.addEventListener('resize', resizeCanvas)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  // Decoupled Animation & Frame Interpolation Loop
  useEffect(() => {
    if (!isAnimationReady) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let startTime: number | null = null
    const fps = 24

    const drawFrame = (time: number) => {
      if (startTime === null) {
        startTime = time
      }
      
      const elapsed = time - startTime
      const exactFrame = (elapsed / 1000 * fps) % totalFrames
      
      const frame1 = Math.floor(exactFrame)
      const frame2 = (frame1 + 1) % totalFrames
      const t = exactFrame - frame1 // Interpolation factor (0 to 1)

      const img1 = imagesRef.current[frame1]
      const img2 = imagesRef.current[frame2]

      const isReady = (img?: HTMLImageElement) => img && img.complete && img.naturalWidth > 0

      if (isReady(img1)) {
        // Calculate scaling (object-cover equivalent)
        const scale = Math.max(canvas.width / img1.naturalWidth, canvas.height / img1.naturalHeight)
        const w = img1.naturalWidth * scale
        const h = img1.naturalHeight * scale
        const x = (canvas.width - w) / 2
        const y = (canvas.height - h) / 2

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        // Draw the first frame fully opaque (covers everything, no clear needed!)
        ctx.globalAlpha = 1.0
        ctx.drawImage(img1, x, y, w, h)

        // Draw the second frame with transparency on top for smooth blending
        if (isReady(img2) && t > 0.01) {
          ctx.globalAlpha = t
          const scale2 = Math.max(canvas.width / img2.naturalWidth, canvas.height / img2.naturalHeight)
          const w2 = img2.naturalWidth * scale2
          const h2 = img2.naturalHeight * scale2
          const x2 = (canvas.width - w2) / 2
          const y2 = (canvas.height - h2) / 2
          ctx.drawImage(img2, x2, y2, w2, h2)
        }
      }

      ctx.globalAlpha = 1.0
      animationFrameId = requestAnimationFrame(drawFrame)
    }

    animationFrameId = requestAnimationFrame(drawFrame)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [isAnimationReady])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    // Tilt (for floating cards)
    const x = ((e.clientY - rect.top) / rect.height - 0.5) * 12
    const y = ((e.clientX - rect.left) / rect.width - 0.5) * -12
    setTilt({ x, y })
  }

  return (
    <div className="bg-background min-h-screen overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-12 py-4">
          <div className={`rounded-2xl px-5 py-3 flex items-center justify-between transition-all duration-300 ${
            isScrolled 
              ? "bg-white/70 backdrop-blur-md border border-surface-container-high/60 shadow-[0_4px_30px_rgba(0,0,0,0.02)]" 
              : "bg-black/15 backdrop-blur-md border border-white/10"
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-forest-gradient flex items-center justify-center shadow-glow-green">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className={`font-bold text-lg transition-colors duration-300 ${
                isScrolled ? "text-foreground" : "text-white"
              }`}>
                LifeSaver <span className={isScrolled ? "text-gradient-forest" : "text-gradient-forest brightness-125"}>AI</span>
              </span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
              <a href="#features" className={`transition-colors duration-300 ${isScrolled ? "text-muted-foreground hover:text-foreground" : "text-white/80 hover:text-white"}`}>Features</a>
              <a href="#how" className={`transition-colors duration-300 ${isScrolled ? "text-muted-foreground hover:text-foreground" : "text-white/80 hover:text-white"}`}>How it works</a>
              <a href="#garden" className={`transition-colors duration-300 ${isScrolled ? "text-muted-foreground hover:text-foreground" : "text-white/80 hover:text-white"}`}>Garden</a>
              <a href="#testimonials" className={`transition-colors duration-300 ${isScrolled ? "text-muted-foreground hover:text-foreground" : "text-white/80 hover:text-white"}`}>Reviews</a>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/auth')} 
                className={`text-sm hidden sm:flex font-medium px-4 py-2 rounded-lg transition-all duration-300 ${
                  isScrolled 
                    ? "text-muted-foreground hover:bg-surface-container hover:text-foreground" 
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                Sign in
              </button>
              <button onClick={() => navigate('/auth')} className="btn-primary text-sm py-2 px-5">Get Started Free</button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-20 pb-20 overflow-hidden">
        
        {/* Fullscreen 3D Image Sequence */}
        <div className="absolute inset-0 bg-black z-0">
          <canvas 
            ref={canvasRef} 
            className={`w-full h-full object-cover transition-opacity duration-1000 ${
              isAnimationReady ? 'opacity-90' : 'opacity-0'
            }`}
          />
          {/* Gradient overlay to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/80 z-10" />

          {/* Premium Loading Overlay */}
          <div 
            className={`absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-20 transition-all duration-1000 ease-out pointer-events-none ${
              isAnimationReady ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="max-w-md w-full px-6 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-forest-gradient flex items-center justify-center shadow-glow-green animate-pulse">
                <Leaf className="w-6 h-6 text-white animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div className="text-center">
                <h3 className="text-white font-bold text-lg mb-1">Cultivating your space</h3>
                <p className="text-white/60 text-sm">Preparing high-fidelity 3D sequence...</p>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-2 relative">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300 shadow-glow-green" 
                  style={{ width: `${Math.round((loadedCount / totalFrames) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-white/40 font-mono mt-1">
                {loadedCount} / {totalFrames} frames
              </span>
            </div>
          </div>
        </div>

        <motion.div style={{ opacity }} className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 w-full text-center mt-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-bold mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Productivity
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.08] tracking-tight mb-6 drop-shadow-lg"
          >
            Breathe Easy.<br />
            <span className="text-gradient-forest brightness-125">Never Miss</span><br />
            Another Deadline.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-xl text-white/80 leading-relaxed mb-8 max-w-2xl mx-auto font-medium"
          >
            LifeSaver AI helps you plan smarter, stay focused, and finish important work on time — without the anxiety.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap justify-center gap-4 mb-10"
          >
            <button onClick={() => navigate('/app/dashboard')} className="btn-primary text-base px-8 py-4 group">
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="flex items-center gap-2 text-base px-8 py-4 rounded-xl font-bold bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white transition-colors">
              <Play className="w-4 h-4 fill-current" />
              Watch Demo
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex items-center justify-center gap-6 text-sm text-white/70"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary-400" />
              <span>Free forever plan</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary-400" />
              <span>No credit card needed</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/70"
        >
          <span className="text-xs font-label">Scroll to explore</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Social Proof Bar ── */}
      <section className="py-8 border-y border-surface-container-high bg-surface-container-low/50">
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm text-muted-foreground">
            <span className="font-label uppercase tracking-wider">Trusted by students & creators at</span>
            {['MIT', 'Stanford', 'IIT', 'Y Combinator', 'Harvard', 'Google'].map((org) => (
              <span key={org} className="font-bold text-foreground opacity-40 hover:opacity-70 transition-opacity cursor-default">{org}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="section-padding">
        <div className="container-max px-4 sm:px-6 lg:px-12 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="badge-forest mb-4">Core Features</div>
            <h2 className="text-headline-xl font-extrabold text-foreground mb-4">Everything you need to stay ahead</h2>
            <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
              Six powerful AI tools working together to protect your time, your goals, and your peace of mind.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard icon={Brain} title="Smart Planning" accent="bg-primary-50 text-primary-700" delay={0}
              description="Describe your goal. AI breaks it into subtasks, estimates effort, and creates a realistic action plan — in seconds." />
            <FeatureCard icon={Shield} title="Deadline Protection" accent="bg-red-50 text-red-700" delay={0.1}
              description="AI predicts your deadline risk before it's too late. Get priority scores, early warnings, and recovery suggestions." />
            <FeatureCard icon={Zap} title="Save My Deadline™" accent="bg-amber-50 text-amber-700" delay={0.2}
              description="Emergency mode. Enter a deadline and get an instant recovery plan, priority order, and daily action steps." />
            <FeatureCard icon={Calendar} title="Daily Focus" accent="bg-tertiary-50 text-tertiary-700" delay={0.3}
              description="See today's most important tasks, get AI-curated focus recommendations, and track your daily productivity." />
            <FeatureCard icon={Target} title="Goal Paths" accent="bg-secondary-50 text-secondary-700" delay={0.4}
              description="Enter a big goal like 'Get an Internship'. AI generates a complete path: resume, portfolio, LinkedIn, interviews." />
            <FeatureCard icon={Timer} title="Focus Sessions" accent="bg-primary-50 text-primary-700" delay={0.5}
              description="Pomodoro timer, Deep Work mode, and focus tracking. Every session grows your Progress Garden." />
          </div>
        </div>
      </section>

      {/* ── Progress Garden Showcase ── */}
      <section id="garden" className="section-padding bg-gradient-to-b from-surface-container-low to-background">
        <div className="container-max px-4 sm:px-6 lg:px-12 mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="badge-forest mb-4">
                <Leaf className="w-3 h-3" />
                Unique Feature
              </div>
              <h2 className="text-headline-xl font-extrabold text-foreground mb-4">Your work becomes a garden</h2>
              <p className="text-body-lg text-muted-foreground mb-6 leading-relaxed">
                Every task you complete plants something new. Build streaks to grow bushes and trees.
                Your Progress Garden is a visual record of everything you've accomplished.
              </p>
              <div className="space-y-4 mb-8">
                {[
                  { icon: '🌱', label: 'Complete a task', desc: 'A new sprout appears' },
                  { icon: '🌿', label: '7-day streak', desc: 'A lush bush blooms' },
                  { icon: '🌳', label: 'Finish a major milestone', desc: 'A great tree grows tall' },
                ].map((item) => (
                  <div key={item.icon} className="flex items-center gap-4 p-3 rounded-xl bg-white border border-surface-container-high">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/app/garden')} className="btn-primary">
                <TreePine className="w-4 h-4" /> Grow My Garden
              </button>
            </motion.div>

            {/* Garden preview */}
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative h-80 bg-white rounded-3xl overflow-hidden shadow-large border border-surface-container-high"
            >
              {/* Sky */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #b9ecee 0%, #e0f4f5 40%, #f0fafa 60%, #84c878 60%, #3b8f31 75%, #154212 100%)' }} />
              {/* Sun */}
              <div className="absolute top-6 right-10 w-14 h-14 rounded-full bg-amber-300 opacity-80" style={{ boxShadow: '0 0 30px rgba(251,191,36,0.5)' }} />
              {/* Clouds */}
              <div className="absolute top-8 left-12 w-16 h-6 bg-white/80 rounded-full" />
              <div className="absolute top-10 left-8 w-10 h-5 bg-white/60 rounded-full" />
              {/* Plants */}
              <div className="absolute bottom-12 inset-x-0 flex justify-around items-end px-4">
                <span className="text-5xl plant-tree" style={{ animationDelay: '0s' }}>🌳</span>
                <span className="text-4xl plant-bush" style={{ animationDelay: '0.5s' }}>🌿</span>
                <span className="text-5xl plant-tree" style={{ animationDelay: '1s' }}>🌲</span>
                <span className="text-3xl plant-bush" style={{ animationDelay: '0.3s' }}>🪴</span>
                <span className="text-3xl plant-plant" style={{ animationDelay: '0.8s' }}>🌻</span>
              </div>
              <div className="absolute bottom-6 inset-x-0 flex justify-around items-end px-8">
                <span className="text-2xl plant-sprout" style={{ animationDelay: '0.2s' }}>🌱</span>
                <span className="text-2xl plant-sprout" style={{ animationDelay: '1.2s' }}>🌱</span>
                <span className="text-xl plant-sprout" style={{ animationDelay: '0.6s' }}>🌸</span>
                <span className="text-2xl plant-sprout" style={{ animationDelay: '0.9s' }}>🌺</span>
              </div>
              {/* Streak badge */}
              <div className="absolute top-4 left-4 glass rounded-xl px-3 py-2">
                <p className="text-xs font-bold text-foreground">🔥 5-day streak</p>
                <p className="text-xs text-muted-foreground">14 plants grown</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how" className="section-padding bg-surface-container-low/40">
        <div className="container-max px-4 sm:px-6 lg:px-12 mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="badge-forest mb-4">How It Works</div>
            <h2 className="text-headline-xl font-extrabold text-foreground mb-4">From stressed to in control in 3 steps</h2>
          </motion.div>
          <div className="max-w-2xl mx-auto space-y-10">
            <StepCard num="1" title="Add your tasks and goals" desc="Tell LifeSaver AI what you're working on. No rigid templates — just describe your work naturally." delay={0} />
            <div className="flex justify-center"><div className="w-0.5 h-8 bg-surface-container-highest" /></div>
            <StepCard num="2" title="AI builds your plan" desc="Our AI analyzes priorities, deadlines, and your capacity to create a calm, achievable daily plan." delay={0.1} />
            <div className="flex justify-center"><div className="w-0.5 h-8 bg-surface-container-highest" /></div>
            <StepCard num="3" title="Focus, complete, and grow" desc="Work through your plan, track progress, and watch your virtual garden grow with every win." delay={0.2} />
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="section-padding">
        <div className="container-max px-4 sm:px-6 lg:px-12 mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="badge-forest mb-4">Reviews</div>
            <h2 className="text-headline-xl font-extrabold text-foreground mb-4">People who breathe easy now</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <TestimonialCard delay={0} name="Priya Sharma" role="CS Student, IIT Mumbai"
              avatar="P" quote="I used Save My Deadline™ the night before my capstone submission. It gave me a clear plan and I actually submitted on time. I was in tears of relief." />
            <TestimonialCard delay={0.1} name="Alex Chen" role="Freelance Designer"
              avatar="A" quote="The Progress Garden is genius. I never thought seeing a little 🌱 appear would motivate me more than a checkbox, but here we are. I'm obsessed." />
            <TestimonialCard delay={0.2} name="Rahul Verma" role="Startup Founder"
              avatar="R" quote="LifeSaver AI reduced my deadline anxiety by 80%. The risk prediction feature alone is worth it — I know weeks in advance if I'm going to be in trouble." />
            <TestimonialCard delay={0.3} name="Sarah Kim" role="Product Manager"
              avatar="S" quote="Finally an app that doesn't make me feel guilty for falling behind. The AI is encouraging, not judgmental. It's like having a calm mentor in my pocket." />
            <TestimonialCard delay={0.4} name="Marcus Johnson" role="PhD Student"
              avatar="M" quote="The Goal Paths feature mapped out my entire dissertation process. It broke a 3-year project into weekly milestones I could actually manage." />
            <TestimonialCard delay={0.5} name="Aisha Patel" role="Full-Stack Developer"
              avatar="A" quote="Pomodoro + garden = perfect combo. I'm getting more done than ever, and my virtual garden is beautiful. My friends are jealous of my 🌳 count." />
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 bg-forest-gradient">
        <div className="container-max px-4 sm:px-6 lg:px-12 mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { value: '50,000+', label: 'Active users', icon: '👥' },
              { value: '2.4M', label: 'Tasks completed', icon: '✅' },
              { value: '98%', label: 'Deadlines met', icon: '🎯' },
              { value: '500K+', label: 'Plants grown', icon: '🌱' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="text-3xl mb-1">{stat.icon}</div>
                <div className="text-3xl font-extrabold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-primary-200">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section-padding bg-surface-container-low/40">
        <div className="container-max px-4 sm:px-6 lg:px-12 mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-2xl mx-auto">
            <div className="text-5xl mb-6">🌿</div>
            <h2 className="text-headline-xl font-extrabold text-foreground mb-4">Ready to breathe easy?</h2>
            <p className="text-body-lg text-muted-foreground mb-8">
              Join 50,000+ people who use LifeSaver AI to stay calm, focused, and ahead of every deadline.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={() => navigate('/auth')} className="btn-primary text-base px-8 py-4 group">
                Start Free Today
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={handleGuestSignIn} disabled={loadingDemo} className="btn-secondary text-base px-8 py-4 disabled:opacity-70">
                {loadingDemo ? <span className="animate-spin w-4 h-4 border-2 border-primary-700 border-t-transparent rounded-full inline-block" /> : <TrendingUp className="w-4 h-4" />} Try the Demo
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Free plan • No credit card • Cancel anytime</p>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 border-t border-surface-container-high">
        <div className="container-max px-4 sm:px-6 lg:px-12 mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-forest-gradient flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-foreground">LifeSaver <span className="text-gradient-forest">AI</span></span>
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Blog</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-xs text-muted-foreground">© 2025 LifeSaver AI. Made with 🌱</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
