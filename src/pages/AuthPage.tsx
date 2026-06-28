import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Eye, EyeOff, ArrowLeft, Leaf } from 'lucide-react'

export default function AuthPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const { signIn, signUp, signInWithGoogle, signInAsGuest } = useAuth()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    
    let result
    if (tab === 'signin') {
      result = await signIn(form.email, form.password)
    } else {
      result = await signUp(form.email, form.password, form.name)
    }
    
    if (result.error) {
      setErrorMsg(result.error)
      setLoading(false)
    } else {
      navigate('/app/dashboard')
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setErrorMsg(null)
    const { error } = await signInWithGoogle()
    if (error) {
      setErrorMsg(error)
      setLoading(false)
    } else {
      navigate('/app/dashboard')
    }
  }

  const handleGuestSignIn = async () => {
    setLoading(true)
    setErrorMsg(null)
    const { error } = await signInAsGuest()
    if (error) {
      setErrorMsg(error)
      setLoading(false)
    } else {
      navigate('/app/dashboard')
    }
  }
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(160deg, #154212 0%, #2d5a27 40%, #3b6934 70%, #084042 100%)' }}>
        {/* Animated orbs */}
        <div className="absolute top-20 right-16 w-72 h-72 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #bcf0ae 0%, transparent 70%)' }} />
        <div className="absolute bottom-32 left-8 w-56 h-56 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #9acbcd 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white text-xl">LifeSaver AI</span>
        </div>

        {/* Quote block */}
        <div className="relative z-10">
          <div className="glass-dark rounded-3xl p-8 mb-6">
            <div className="text-5xl mb-4">🌳</div>
            <blockquote className="text-white/90 text-xl font-semibold leading-relaxed mb-4">
              "Every task you complete plants a seed. Watch your effort bloom into something beautiful."
            </blockquote>
            <p className="text-white/50 text-sm">— LifeSaver AI, your calm productivity partner</p>
          </div>

          {/* Mini garden preview */}
          <div className="flex items-end justify-center gap-3 h-16">
            {['🌱', '🌿', '🌳', '🌲', '🌻', '🌸', '🌱'].map((e, i) => (
              <motion.span key={i} className="text-2xl"
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2.5 + i * 0.3, delay: i * 0.2 }}>
                {e}
              </motion.span>
            ))}
          </div>
          <div className="h-3 rounded-full mt-1" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { v: '50K+', l: 'Users' },
            { v: '98%', l: 'Deadlines met' },
            { v: '500K', l: 'Plants grown' },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="text-2xl font-extrabold text-white">{s.v}</div>
              <div className="text-xs text-white/50 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Back button */}
          <button onClick={() => navigate('/')} className="btn-ghost text-sm mb-8 -ml-2">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </button>

          {/* Logo (mobile) */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-forest-gradient flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground text-lg">LifeSaver <span className="text-gradient-forest">AI</span></span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-surface-container-low rounded-xl mb-8 border border-surface-container-high">
            {(['signin', 'signup'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  tab === t ? 'bg-white shadow-soft text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {t === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={tab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}>

              <div className="mb-6">
                <h1 className="text-2xl font-extrabold text-foreground mb-1">
                  {tab === 'signin' ? 'Welcome back 👋' : 'Start your journey 🌱'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {tab === 'signin'
                    ? 'Sign in to your LifeSaver AI account'
                    : 'Create your free account — no credit card needed'}
                </p>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {tab === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                    <input type="text" placeholder="Yash Patil" className="input-base"
                      value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <input type="email" placeholder="yash@example.com" className="input-base"
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} placeholder="••••••••" className="input-base pr-12"
                      value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {tab === 'signin' && (
                    <a href="#" className="text-xs text-primary-700 hover:underline float-right mt-1">Forgot password?</a>
                  )}
                </div>

                <button type="submit" disabled={loading}
                  className="btn-primary w-full py-3.5 text-base justify-center mt-2 disabled:opacity-70">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      {tab === 'signin' ? 'Signing in...' : 'Creating account...'}
                    </span>
                  ) : (
                    tab === 'signin' ? 'Sign In' : 'Create Free Account'
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-surface-container-high" />
                <span className="text-xs text-muted-foreground">or continue with</span>
                <div className="flex-1 h-px bg-surface-container-high" />
              </div>

              {/* Google */}
              <button onClick={handleGoogleSignIn} disabled={loading} type="button"
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg border border-surface-container-highest hover:bg-surface-container-low transition-colors font-medium text-sm text-foreground disabled:opacity-70">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              {/* Terms note */}
              {tab === 'signup' && (
                <p className="text-xs text-center text-muted-foreground mt-4">
                  By creating an account, you agree to our{' '}
                  <a href="#" className="text-primary-700 hover:underline">Terms</a> and{' '}
                  <a href="#" className="text-primary-700 hover:underline">Privacy Policy</a>
                </p>
              )}

              {/* Try demo */}
              <div className="mt-6 text-center">
                <button type="button" onClick={handleGuestSignIn} disabled={loading}
                  className="text-sm text-muted-foreground hover:text-primary-700 transition-colors flex items-center gap-1 mx-auto disabled:opacity-50">
                  <Leaf className="w-3.5 h-3.5" /> Try the demo without signing up
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
