import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Timer, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Loader2, Sparkles, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { generateTimeSimulation } from '@/services/geminiService'
import type { TimeSimulation } from '@/types/database'

interface TimeSimulatorModalProps {
  onClose: () => void
}

const quickScenarios = [
  "What if I skip studying today?",
  "What if I delay my top task by 1 day?",
  "Can I finish everything by Friday?",
  "What if I take the afternoon off?",
  "What if I work 2 extra hours today?",
]

export default function TimeSimulatorModal({ onClose }: TimeSimulatorModalProps) {
  const { user } = useAuth()
  const [scenario, setScenario] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TimeSimulation | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSimulate = async (text: string) => {
    if (!user || !text.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const sim = await generateTimeSimulation(user.uid, text.trim())
      setResult(sim)
    } catch (err) {
      console.error('Time simulation failed:', err)
      setError('Simulation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const verdictConfig = {
    safe: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '✅', label: 'Safe to proceed' },
    risky: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: '⚠️', label: 'Proceed with caution' },
    dangerous: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: '🚨', label: 'High risk — not recommended' },
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-container-high bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Timer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-lg text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>AI Time Simulator</h2>
              <p className="text-xs text-muted-foreground">See how decisions affect your deadlines</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors cursor-pointer">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!result && !loading && (
            <>
              {/* Input */}
              <div>
                <label className="text-sm font-bold text-foreground block mb-2">What scenario do you want to simulate?</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSimulate(scenario)}
                    placeholder='e.g. "What if I skip studying today?"'
                    className="flex-1 px-4 py-3 rounded-xl border border-surface-container-high bg-surface-container-low text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400"
                  />
                  <button
                    onClick={() => handleSimulate(scenario)}
                    disabled={!scenario.trim()}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-lg"
                  >
                    <Sparkles className="w-4 h-4" /> Simulate
                  </button>
                </div>
              </div>

              {/* Quick Scenarios */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Quick scenarios</p>
                <div className="flex flex-wrap gap-2">
                  {quickScenarios.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setScenario(s); handleSimulate(s) }}
                      className="px-3 py-2 rounded-lg border border-purple-200 bg-purple-50/50 text-xs font-semibold text-purple-800 hover:bg-purple-100 transition-all cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
                  {error}
                </div>
              )}
            </>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-4" />
              <p className="font-bold text-foreground">Simulating timeline...</p>
              <p className="text-xs text-muted-foreground mt-1">Sage is analyzing your tasks and deadlines</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* Verdict Banner */}
              <div className={`rounded-2xl p-4 border ${verdictConfig[result.verdict].bg} ${verdictConfig[result.verdict].border} flex items-center gap-3`}>
                <span className="text-2xl">{verdictConfig[result.verdict].icon}</span>
                <div>
                  <p className={`font-black text-sm ${verdictConfig[result.verdict].color}`}>{verdictConfig[result.verdict].label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{result.scenario}</p>
                </div>
              </div>

              {/* Before/After Comparison */}
              <div className="grid grid-cols-2 gap-4">
                {/* Current State */}
                <div className="rounded-2xl p-5 border border-surface-container-high bg-white shadow-md">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">📊 Current State</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Deadline Risk</span>
                      <span className="text-sm font-extrabold text-foreground">{result.current_state.overall_risk}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/5 overflow-hidden">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: `${result.current_state.overall_risk}%` }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Success Prob.</span>
                      <span className="text-sm font-extrabold text-emerald-700">{result.current_state.success_probability}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Overdue</span>
                      <span className="text-sm font-extrabold text-foreground">{result.current_state.overdue_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Workload</span>
                      <span className="text-sm font-extrabold text-foreground">{result.current_state.workload_hours}h</span>
                    </div>
                  </div>
                </div>

                {/* Simulated State */}
                <div className={`rounded-2xl p-5 border shadow-md ${result.verdict === 'dangerous' ? 'border-red-200 bg-red-50/30' : result.verdict === 'risky' ? 'border-amber-200 bg-amber-50/30' : 'border-emerald-200 bg-emerald-50/30'}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">🔮 Simulated State</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Deadline Risk</span>
                      <span className={`text-sm font-extrabold flex items-center gap-1 ${result.simulated_state.overall_risk > result.current_state.overall_risk ? 'text-red-600' : 'text-emerald-600'}`}>
                        {result.simulated_state.overall_risk}%
                        {result.simulated_state.overall_risk > result.current_state.overall_risk
                          ? <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                          : <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-black/5 overflow-hidden">
                      <div className={`h-2 rounded-full ${result.simulated_state.overall_risk > 60 ? 'bg-red-500' : result.simulated_state.overall_risk > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${result.simulated_state.overall_risk}%` }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Success Prob.</span>
                      <span className={`text-sm font-extrabold ${result.simulated_state.success_probability < result.current_state.success_probability ? 'text-red-600' : 'text-emerald-700'}`}>
                        {result.simulated_state.success_probability}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Overdue</span>
                      <span className={`text-sm font-extrabold ${result.simulated_state.overdue_count > result.current_state.overdue_count ? 'text-red-600' : 'text-foreground'}`}>
                        {result.simulated_state.overdue_count}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Workload</span>
                      <span className="text-sm font-extrabold text-foreground">{result.simulated_state.workload_hours}h</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Impact Summary */}
              <div className="rounded-2xl p-4 bg-surface-container-low border border-surface-container-high">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">💡 Impact Analysis</p>
                <p className="text-sm font-semibold text-foreground leading-relaxed">{result.impact_summary}</p>
              </div>

              {/* Recovery Suggestions */}
              {result.recovery_suggestions.length > 0 && (
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">🛡️ Recovery Suggestions</p>
                  <div className="space-y-2">
                    {result.recovery_suggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-surface-container-high">
                        <CheckCircle2 className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs font-semibold text-foreground">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Try Another */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => { setResult(null); setScenario('') }}
                  className="px-5 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-800 text-xs font-bold hover:bg-purple-100 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Timer className="w-3.5 h-3.5" /> Try Another Scenario
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
