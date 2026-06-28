import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import { Droplets, Flame, Target, Brain, Star, Zap, TreePine, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { chatWithAI } from '@/services/geminiService'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night'
type Season = 'spring' | 'summer' | 'autumn' | 'winter'
type Weather = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'rainbow'

interface GardenStats {
  level: number
  xp: number
  current_streak: number
  total_tasks_completed: number
  total_focus_sessions: number
  total_goals_completed: number
  lastWatered: number
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_STATS: GardenStats = {
  level: 1, xp: 0, current_streak: 0,
  total_tasks_completed: 0, total_focus_sessions: 0,
  total_goals_completed: 0, lastWatered: 0,
}

const XP_PER_LEVEL = (level: number) => 500 + level * 100

const getTimeOfDay = (): TimeOfDay => {
  const h = new Date().getHours()
  if (h >= 5 && h < 7) return 'dawn'
  if (h >= 7 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  if (h >= 17 && h < 20) return 'evening'
  return 'night'
}

const getSeason = (): Season => {
  const m = new Date().getMonth()
  if (m >= 2 && m <= 4) return 'spring'
  if (m >= 5 && m <= 7) return 'summer'
  if (m >= 8 && m <= 10) return 'autumn'
  return 'winter'
}

const getRandomWeather = (): Weather => {
  const w: Weather[] = ['sunny', 'sunny', 'sunny', 'cloudy', 'cloudy', 'rainy', 'snowy', 'rainbow']
  return w[Math.floor(Math.random() * w.length)]
}

const SKY: Record<TimeOfDay, [string, string, string]> = {
  dawn: ['#1a0a2e', '#c2185b', '#ffe082'],
  morning: ['#1565c0', '#42a5f5', '#e3f2fd'],
  afternoon: ['#0d47a1', '#1976d2', '#b3e5fc'],
  evening: ['#4a148c', '#e65100', '#ffd54f'],
  night: ['#020514', '#0d1b2a', '#0a1f0a'],
}

const GROUND_COLORS: Record<Season, [string, string]> = {
  spring: ['#4caf50', '#388e3c'],
  summer: ['#2e7d32', '#1b5e20'],
  autumn: ['#795548', '#4e342e'],
  winter: ['#cfd8dc', '#90a4ae'],
}

const TREE_STAGES = [
  { minLevel: 1, name: 'Tiny Sprout', scale: 0.28, canopy: false, branches: 0, glowing: false, lanterns: false, magic: false },
  { minLevel: 3, name: 'Young Tree', scale: 0.46, canopy: true, branches: 1, glowing: false, lanterns: false, magic: false },
  { minLevel: 5, name: 'Growing Tree', scale: 0.63, canopy: true, branches: 2, glowing: false, lanterns: false, magic: false },
  { minLevel: 7, name: 'Maturing Tree', scale: 0.79, canopy: true, branches: 3, glowing: false, lanterns: true, magic: false },
  { minLevel: 10, name: 'Ancient Tree', scale: 0.91, canopy: true, branches: 4, glowing: true, lanterns: true, magic: false },
  { minLevel: 15, name: 'Enchanted Forest', scale: 1.00, canopy: true, branches: 4, glowing: true, lanterns: true, magic: true },
]

const CREATURE_UNLOCKS = [
  { minLevel: 1, type: 'butterfly', emoji: '🦋', label: 'Butterflies' },
  { minLevel: 3, type: 'bird', emoji: '🐦', label: 'Birds' },
  { minLevel: 5, type: 'rabbit', emoji: '🐇', label: 'Rabbits' },
  { minLevel: 7, type: 'deer', emoji: '🦌', label: 'Deer' },
  { minLevel: 10, type: 'fox', emoji: '🦊', label: 'Fox' },
  { minLevel: 12, type: 'owl', emoji: '🦉', label: 'Owl' },
]


// ── Pre-computed stable particle arrays (never recreated) ──
const STARS = Array.from({ length: 70 }, (_, i) => ({
  id: i, top: `${(i * 17.3) % 62}%`, left: `${(i * 7.9) % 100}%`,
  r: i % 6 === 0 ? 2.5 : i % 3 === 0 ? 1.8 : 1.2,
  dur: 1.5 + (i % 7) * 0.4, delay: (i * 0.25) % 4,
}))
const FIREFLIES = Array.from({ length: 18 }, (_, i) => ({
  id: i, x: 5 + (i * 4.7) % 88, y: 38 + (i * 3.3) % 45,
  dur: 4 + (i % 5) * 1.2, dx: 18 + (i % 4) * 14, dy: 10 + (i % 3) * 8, delay: (i * 0.6) % 5,
}))
const RAIN = Array.from({ length: 55 }, (_, i) => ({ id: i, x: (i * 1.83) % 100, dur: 0.38 + (i % 4) * 0.09, delay: (i * 0.055) % 1.2 }))
const SNOW = Array.from({ length: 40 }, (_, i) => ({ id: i, x: (i * 2.5) % 100, s: 3 + (i % 4) * 2, dur: 5 + (i % 8) * 1.5, delay: (i * 0.28) % 6, drift: (i % 2 === 0 ? 1 : -1) * (8 + (i % 4) * 12) }))
const SAKURA = Array.from({ length: 30 }, (_, i) => ({ id: i, x: (i * 3.3) % 100, dur: 5 + (i % 6), delay: (i * 0.35) % 5, drift: (i % 2 === 0 ? 1 : -1) * (20 + (i % 4) * 18) }))
const AUTUMN = Array.from({ length: 25 }, (_, i) => ({ id: i, x: (i * 4.1) % 100, dur: 3.5 + (i % 5), delay: (i * 0.32) % 4.5, drift: (i % 2 === 0 ? 1 : -1) * (15 + (i % 3) * 22), color: ['#d97706', '#b45309', '#ef4444', '#dc2626', '#f59e0b', '#ea580c'][i % 6] }))
const CLOUDS_DATA = [
  { id: 0, top: '8%', w: 180, dur: 45, delay: 0, scale: 1.0 },
  { id: 1, top: '15%', w: 140, dur: 60, delay: -15, scale: 0.75 },
  { id: 2, top: '6%', w: 220, dur: 38, delay: -8, scale: 1.2 },
  { id: 3, top: '20%', w: 120, dur: 52, delay: -25, scale: 0.65 },
]
const WATER_RIPPLES = Array.from({ length: 5 }, (_, i) => ({ id: i, cx: 18 + i * 14, delay: i * 0.55 }))
const FLOWERS_POS = [
  { x: '7%', bot: '19%', e: '🌸', s: 1.0 }, { x: '13%', bot: '21%', e: '🌼', s: 0.8 },
  { x: '19%', bot: '18%', e: '🌺', s: 0.9 }, { x: '4%', bot: '23%', e: '🌷', s: 0.7 },
  { x: '75%', bot: '20%', e: '🌸', s: 0.9 }, { x: '82%', bot: '17%', e: '🌼', s: 1.0 },
  { x: '88%', bot: '21%', e: '🌺', s: 0.8 }, { x: '70%', bot: '23%', e: '🌸', s: 0.7 },
  { x: '36%', bot: '12%', e: '🌷', s: 0.8 }, { x: '62%', bot: '11%', e: '🌼', s: 0.75 },
]

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function TreeOfLife({ level, isNight, stage, controls }: {
  level: number; isNight: boolean
  stage: typeof TREE_STAGES[0]; controls: ReturnType<typeof useAnimationControls>
}) {
  const leaf = level >= 10 ? '#16a34a' : '#22c55e'
  const shine = level >= 10 ? '#4ade80' : '#86efac'
  const trunk = '#7c3f14'

  return (
    <motion.div animate={controls} style={{ originX: '50%', originY: '100%', scale: stage.scale }}>
      {/* Base glow */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full blur-3xl pointer-events-none"
        style={{
          width: 260, height: 44, background: stage.glowing
            ? 'radial-gradient(ellipse, rgba(134,239,172,0.9) 0%, transparent 70%)'
            : 'radial-gradient(ellipse, rgba(74,222,128,0.5) 0%, transparent 70%)'
        }}
        animate={{ opacity: [0.4, 1, 0.4], scaleX: [1, 1.18, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <svg width={300} height={390} viewBox="0 0 300 390"
        style={{
          filter: isNight
            ? 'drop-shadow(0 0 22px rgba(134,239,172,0.55))'
            : 'drop-shadow(0 14px 28px rgba(0,0,0,0.28))'
        }}>

        {/* Ground shadow */}
        <ellipse cx="150" cy="383" rx="72" ry="9" fill="rgba(0,0,0,0.18)" />

        {/* Root flares */}
        {stage.branches >= 2 && <>
          <path d="M 132 378 C 112 384, 88 380, 70 378" stroke={trunk} strokeWidth="11" strokeLinecap="round" fill="none" />
          <path d="M 168 378 C 188 384, 212 380, 230 378" stroke={trunk} strokeWidth="11" strokeLinecap="round" fill="none" />
        </>}

        {/* Trunk */}
        <path d="M 132 378 C 130 325, 127 272, 133 218 C 138 168, 143 112, 150 66"
          stroke={trunk} strokeWidth={stage.branches >= 3 ? 27 : 21} strokeLinecap="round" fill="none" />
        <path d="M 168 378 C 170 325, 173 272, 167 218 C 162 168, 157 112, 150 66"
          stroke={trunk} strokeWidth={stage.branches >= 3 ? 27 : 21} strokeLinecap="round" fill="none" />
        {/* Trunk highlight streak */}
        <path d="M 143 360 C 146 310, 148 260, 145 210" stroke="rgba(255,200,140,0.22)" strokeWidth="5" strokeLinecap="round" fill="none" />
        {/* Bark lines */}
        <path d="M 141 322 C 146 309, 149 296, 146 280" stroke="#5a2e10" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.5" />
        <path d="M 157 284 C 162 270, 160 256, 156 242" stroke="#5a2e10" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
        <path d="M 141 238 C 145 226, 148 214, 144 200" stroke="#5a2e10" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.4" />

        {/* Branches */}
        {stage.branches >= 1 && <>
          <path d="M 138 240 C 104 212, 76 192, 53 170" stroke="#8b4513" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M 162 230 C 196 202, 224 182, 247 162" stroke="#8b4513" strokeWidth="14" strokeLinecap="round" fill="none" />
        </>}
        {stage.branches >= 2 && <>
          <path d="M 100 207 C 77 180, 61 160, 40 140" stroke="#9a5522" strokeWidth="9.5" strokeLinecap="round" fill="none" />
          <path d="M 200 197 C 223 170, 240 150, 260 130" stroke="#9a5522" strokeWidth="9.5" strokeLinecap="round" fill="none" />
        </>}
        {stage.branches >= 3 && <>
          <path d="M 150 117 C 124 96, 103 76, 86 52" stroke="#9a5522" strokeWidth="7.5" strokeLinecap="round" fill="none" />
          <path d="M 150 117 C 176 96, 197 76, 214 52" stroke="#9a5522" strokeWidth="7.5" strokeLinecap="round" fill="none" />
        </>}
        {stage.branches >= 4 && <>
          <path d="M 53 170 C 36 148, 26 130, 20 108" stroke="#9a5522" strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M 247 162 C 264 140, 274 122, 280 100" stroke="#9a5522" strokeWidth="6" strokeLinecap="round" fill="none" />
        </>}

        {/* Foliage */}
        {stage.canopy && <>
          {/* Back deep layer */}
          <ellipse cx="94" cy="184" rx="57" ry="49" fill="#166534" opacity="0.94" />
          <ellipse cx="206" cy="177" rx="57" ry="49" fill="#166534" opacity="0.94" />
          <ellipse cx="150" cy="142" rx="63" ry="55" fill="#166534" opacity="0.94" />
          {stage.branches >= 3 && <>
            <ellipse cx="44" cy="152" rx="37" ry="31" fill="#166534" opacity="0.9" />
            <ellipse cx="256" cy="145" rx="37" ry="31" fill="#166534" opacity="0.9" />
            <ellipse cx="150" cy="79" rx="41" ry="35" fill="#166534" opacity="0.9" />
          </>}
          {stage.branches >= 4 && <>
            <ellipse cx="21" cy="116" rx="29" ry="25" fill="#166534" opacity="0.87" />
            <ellipse cx="279" cy="109" rx="29" ry="25" fill="#166534" opacity="0.87" />
          </>}
          {/* Mid */}
          <ellipse cx="90" cy="168" rx="49" ry="42" fill={leaf} opacity="0.92" />
          <ellipse cx="210" cy="161" rx="49" ry="42" fill={leaf} opacity="0.92" />
          <ellipse cx="150" cy="124" rx="57" ry="49" fill={leaf} opacity="0.92" />
          {stage.branches >= 3 && <>
            <ellipse cx="41" cy="138" rx="31" ry="26" fill={leaf} opacity="0.9" />
            <ellipse cx="259" cy="131" rx="31" ry="26" fill={leaf} opacity="0.9" />
            <ellipse cx="150" cy="66" rx="35" ry="29" fill={leaf} opacity="0.87" />
          </>}
          {/* Highlight */}
          <ellipse cx="87" cy="154" rx="35" ry="29" fill={shine} opacity="0.76" />
          <ellipse cx="213" cy="147" rx="33" ry="27" fill={shine} opacity="0.76" />
          <ellipse cx="150" cy="109" rx="43" ry="37" fill={shine} opacity="0.76" />
          {stage.branches >= 3 && <>
            <ellipse cx="39" cy="127" rx="22" ry="18" fill={shine} opacity="0.7" />
            <ellipse cx="261" cy="120" rx="22" ry="18" fill={shine} opacity="0.7" />
          </>}
          {/* Specular shine */}
          <ellipse cx="140" cy="89" rx="18" ry="12" fill="rgba(255,255,255,0.22)" />
          <ellipse cx="82" cy="144" rx="14" ry="9" fill="rgba(255,255,255,0.16)" />
        </>}

        {/* Magic orbs (level 15+) */}
        {stage.magic && Array.from({ length: 14 }, (_, i) => (
          <motion.circle key={i}
            cx={70 + (i * 14.7) % 160} cy={78 + (i * 9.3) % 110} r="3.5"
            fill={i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#a78bfa' : '#34d399'}
            animate={{ opacity: [0, 1, 0], scale: [0.3, 2, 0.3] }}
            transition={{ duration: 1.8 + (i % 4) * 0.6, repeat: Infinity, delay: (i * 0.4) % 4 }} />
        ))}

        {/* Perched birds */}
        {level >= 3 && stage.canopy && <>
          <text x="57" y="155" fontSize="16" style={{ userSelect: 'none' }}>🐦</text>
          <text x="230" y="149" fontSize="13" style={{ userSelect: 'none' }}>🐦</text>
        </>}
      </svg>

      {/* Hanging Lanterns */}
      {stage.lanterns && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {[
            { l: '17%', t: '47%', h: 29, d: 0 },
            { l: '68%', t: '43%', h: 37, d: 0.7 },
            { l: '43%', t: '27%', h: 22, d: 1.4 },
          ].map((ln, i) => (
            <motion.div key={i} className="absolute flex flex-col items-center"
              style={{ left: ln.l, top: ln.t }}
              animate={{ rotate: [-6, 6, -4, 4, -6] }}
              transition={{ duration: 3.5 + i, repeat: Infinity, ease: 'easeInOut', delay: ln.d }}>
              <div className="w-[2px] bg-amber-800/70" style={{ height: ln.h }} />
              <motion.div className="w-7 h-8 rounded-b-full rounded-t-sm relative flex items-center justify-center overflow-hidden"
                style={{ background: 'radial-gradient(ellipse at 40% 35%, #fde68a, #f97316 70%)', boxShadow: '0 0 14px rgba(251,191,36,0.9), 0 0 30px rgba(251,191,36,0.5)' }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2 + i * 0.5, repeat: Infinity }}>
                <div className="w-2 h-4 bg-amber-100/70 rounded-full" />
                <div className="absolute inset-0 rounded-b-full border-2 border-amber-600/25" />
              </motion.div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function Cottage({ glowing }: { glowing: boolean }) {
  return (
    <svg width="135" height="115" viewBox="0 0 135 115" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.35))' }}>
      <rect x="18" y="52" width="99" height="63" rx="4" fill="#8B6914" />
      <rect x="18" y="52" width="99" height="63" rx="4" fill="rgba(0,0,0,0.1)" />
      <polygon points="8,54 67.5,7 127,54" fill="#5d4037" />
      <polygon points="8,54 67.5,13 127,54" fill="#795548" />
      <rect x="83" y="10" width="15" height="35" fill="#5d4037" />
      <rect x="81" y="8" width="19" height="5" rx="1" fill="#4e342e" />
      <rect x="54" y="73" width="26" height="42" rx="13" fill="#4a2c0a" />
      <rect x="56" y="75" width="22" height="40" rx="11" fill="#5d3515" />
      <circle cx="72" cy="96" r="2.5" fill="#fbbf24" />
      <rect x="24" y="60" width="23" height="19" rx="3" fill={glowing ? '#fef9c3' : '#b8d4e8'} />
      <rect x="87" y="60" width="23" height="19" rx="3" fill={glowing ? '#fef9c3' : '#b8d4e8'} />
      <line x1="35.5" y1="60" x2="35.5" y2="79" stroke="#5d4037" strokeWidth="1.5" />
      <line x1="24" y1="69.5" x2="47" y2="69.5" stroke="#5d4037" strokeWidth="1.5" />
      <line x1="98.5" y1="60" x2="98.5" y2="79" stroke="#5d4037" strokeWidth="1.5" />
      <line x1="87" y1="69.5" x2="110" y2="69.5" stroke="#5d4037" strokeWidth="1.5" />
      {glowing && <>
        <rect x="24" y="60" width="23" height="19" rx="3" fill="rgba(254,215,70,0.35)" />
        <rect x="87" y="60" width="23" height="19" rx="3" fill="rgba(254,215,70,0.35)" />
      </>}
      <path d="M 18 62 Q 11 78, 16 94 Q 10 104, 18 115" stroke="#2d6a4f" strokeWidth="2.5" fill="none" />
      <path d="M 117 66 Q 124 82, 119 98" stroke="#2d6a4f" strokeWidth="2" fill="none" />
    </svg>
  )
}

function Windmill() {
  return (
    <div className="relative" style={{ width: 84, height: 115 }}>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{ width: 22, height: 78, background: 'linear-gradient(to bottom, #d4a44c, #a07814)', borderRadius: '3px 3px 6px 6px', clipPath: 'polygon(15% 0%,85% 0%,100% 100%,0% 100%)' }} />
      <motion.div className="absolute" style={{ top: 10, left: '50%', marginLeft: -16 }}
        animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}>
        {[0, 90, 180, 270].map(a => (
          <div key={a} className="absolute origin-left"
            style={{ width: 34, height: 10, background: 'linear-gradient(to right, #f5f0e0, #d4c891)', borderRadius: '0 5px 5px 0', transform: `rotate(${a}deg) translateX(-17px)` }} />
        ))}
        <div className="absolute w-5 h-5 rounded-full bg-amber-800 border-2 border-amber-600" style={{ top: -10, left: -10 }} />
      </motion.div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-8 rounded-t-full" style={{ background: '#5d3b15' }} />
    </div>
  )
}

function Companion({ message, isWatering, onClick, isLoading }: { message: string; isWatering: boolean; onClick?: () => void; isLoading?: boolean }) {
  return (
    <div className="relative flex flex-col items-center gap-1.5 cursor-pointer" onClick={onClick}>
      <motion.div
        className="absolute px-3 py-2 rounded-2xl text-[10px] font-semibold text-emerald-900 border border-emerald-200/60 text-center leading-snug z-10 shadow-lg flex items-center justify-center gap-2"
        style={{ bottom: '100%', marginBottom: 8, width: 220, minHeight: 48, background: 'rgba(240,253,244,0.96)', backdropFilter: 'blur(10px)' }}
        key={message}
        initial={{ opacity: 0, y: 6, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}>
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : message}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-emerald-50 border-r border-b border-emerald-200/60" />
      </motion.div>

      <motion.div className="relative w-16 h-16 hover:scale-110 transition-transform"
        animate={isWatering
          ? { rotate: [-10, 10, -10], scale: [1, 1.12, 1] }
          : { y: [0, -6, 0] }}
        transition={isWatering
          ? { duration: 0.45, repeat: 4 }
          : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}>
        <div className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(ellipse at 38% 32%, #a7f3d0, #34d399 58%, #059669)' }} />
        {/* Eyes */}
        <div className="absolute flex gap-2.5" style={{ top: '34%', left: '50%', transform: 'translateX(-50%)' }}>
          {[0, 1].map(i => (
            <div key={i} className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center">
              <motion.div className="w-2 h-2 rounded-full bg-emerald-900"
                animate={{ scaleY: [1, 0.15, 1] }}
                transition={{ duration: 4.5, repeat: Infinity, delay: 2 + i * 0.1 }} />
            </div>
          ))}
        </div>
        {/* Smile */}
        <div className="absolute" style={{ bottom: '26%', left: '50%', transform: 'translateX(-50%)' }}>
          <div className="w-6 h-3 rounded-b-full border-b-2 border-x-2 border-emerald-800/70" />
        </div>
        {/* Leaf hat */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-lg select-none">🍃</div>
        {/* Aura */}
        <div className="absolute inset-0 rounded-full blur-md opacity-40"
          style={{ background: 'radial-gradient(ellipse, #6ee7b7, transparent)' }} />
      </motion.div>
      <span className="text-[9px] font-bold text-emerald-300/80 tracking-widest uppercase">Sage</span>
    </div>
  )
}

function FloatingXP({ id, amount, emoji, onDone }: { id: number; amount: number; emoji: string; onDone: () => void }) {
  return (
    <motion.div key={id}
      className="absolute left-1/2 z-50 pointer-events-none"
      style={{ bottom: '54%', transform: 'translateX(-50%)' }}
      initial={{ opacity: 0, y: 0, scale: 0.4 }}
      animate={{ opacity: [0, 1, 1, 0], y: -110, scale: [0.4, 1.25, 1.1] }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      onAnimationComplete={onDone}>
      <div className="flex items-center gap-2 px-4 py-2 rounded-full text-white font-extrabold text-sm shadow-xl"
        style={{ background: 'linear-gradient(135deg, #059669, #34d399)', boxShadow: '0 0 22px rgba(52,211,153,0.65)' }}>
        {emoji} +{amount} XP
      </div>
      {[...Array(7)].map((_, i) => (
        <motion.div key={i} className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
          style={{ background: i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#86efac' : '#a78bfa' }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: 0, x: (i % 2 === 0 ? 1 : -1) * (18 + i * 9), y: -(18 + i * 11), scale: 0 }}
          transition={{ duration: 0.85, delay: 0.08 * i }} />
      ))}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function GardenPage() {
  const [stats, setStats] = useState<GardenStats>(DEFAULT_STATS)
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(getTimeOfDay())
  const [season] = useState<Season>(getSeason())
  const [weather, setWeather] = useState<Weather>('sunny')
  const [isWatering, setIsWatering] = useState(false)
  const [waterKey, setWaterKey] = useState(0)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [levelUpNum, setLevelUpNum] = useState(1)
  const [floatingXPs, setFloatingXPs] = useState<Array<{ id: number; amount: number; emoji: string }>>([])
  
  const [companionMsg, setCompanionMsg] = useState("Hello! I'm Sage, your garden companion. Tap me to chat! 🍃")
  const [isCompanionLoading, setIsCompanionLoading] = useState(false)
  const [showCompanionChat, setShowCompanionChat] = useState(false)
  
  const [rareEvent, setRareEvent] = useState<string | null>(null)
  const { user } = useAuth()
  const treeControls = useAnimationControls()
  const xpIdRef = useRef(0)

  // Load stats & weather — reads from ALL sources so the panel is always accurate
  useEffect(() => {
    // ── Compute stats from every storage source ──────────────────────────────
    const computeStats = () => {
      // 1. Garden base: level, xp, streak
      const gardenRaw = localStorage.getItem('ls_garden')
      const garden = gardenRaw ? (() => { try { return JSON.parse(gardenRaw) } catch { return {} } })() : {}

      // 2. Tasks: count completed
      const tasksRaw = localStorage.getItem('ls_tasks')
      const tasks: Array<{ status: string }> = tasksRaw ? (() => { try { return JSON.parse(tasksRaw) } catch { return [] } })() : []
      const completedTasks = tasks.filter(t => t.status === 'completed').length

      // 3. Goals: count completed
      const goalsRaw = localStorage.getItem('ls_goals')
      const goals: Array<{ status: string }> = goalsRaw ? (() => { try { return JSON.parse(goalsRaw) } catch { return [] } })() : []
      const completedGoals = goals.filter(g => g.status === 'completed').length

      // 4. Focus sessions: count from ls_focus (array of sessions) OR garden.total_plants
      const focusRaw = localStorage.getItem('ls_focus')
      let focusSessions = 0
      if (focusRaw) {
        try {
          const f = JSON.parse(focusRaw)
          // ls_focus can be an array of sessions or an object with a sessions key
          if (Array.isArray(f)) focusSessions = f.length
          else if (f && typeof f.sessions === 'number') focusSessions = f.sessions
          else if (f && Array.isArray(f.sessions)) focusSessions = f.sessions.length
        } catch { /* noop */ }
      }
      // Fallback: FocusPage also increments garden.total_plants on each session
      if (focusSessions === 0 && garden.total_plants) {
        focusSessions = garden.total_plants
      }

      setStats(prev => ({
        ...DEFAULT_STATS,
        ...prev,
        level: garden.level ?? prev.level,
        xp: garden.xp ?? prev.xp,
        current_streak: garden.current_streak ?? prev.current_streak,
        lastWatered: garden.lastWatered ?? prev.lastWatered,
        total_tasks_completed: completedTasks > 0 ? completedTasks : (garden.total_tasks_completed ?? prev.total_tasks_completed),
        total_goals_completed: completedGoals > 0 ? completedGoals : (garden.total_goals_completed ?? prev.total_goals_completed),
        total_focus_sessions: focusSessions > 0 ? focusSessions : (garden.total_focus_sessions ?? prev.total_focus_sessions),
      }))
    }

    computeStats()

    // ── Weather ──────────────────────────────────────────────────────────────
    const cw = localStorage.getItem('ls_garden_weather')
    const cwt = localStorage.getItem('ls_garden_weather_time')
    const now = Date.now()
    if (cw && cwt && now - Number(cwt) < 30 * 60 * 1000) {
      setWeather(cw as Weather)
    } else {
      const w = getRandomWeather()
      setWeather(w)
      localStorage.setItem('ls_garden_weather', w)
      localStorage.setItem('ls_garden_weather_time', String(now))
    }

    // ── Listen to any page that can change stats ──────────────────────────────
    window.addEventListener('garden_updated', computeStats)
    window.addEventListener('tasks_updated', computeStats)
    window.addEventListener('goals_updated', computeStats)
    window.addEventListener('focus_updated', computeStats)
    return () => {
      window.removeEventListener('garden_updated', computeStats)
      window.removeEventListener('tasks_updated', computeStats)
      window.removeEventListener('goals_updated', computeStats)
      window.removeEventListener('focus_updated', computeStats)
    }
  }, [])

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setTimeOfDay(getTimeOfDay()), 60_000)
    return () => clearInterval(t)
  }, [])

  // Idle sway
  useEffect(() => {
    treeControls.start({
      rotate: [-1.5, 1.5, -1, 1, -1.5], y: [0, -3, 0, -2, 0],
      transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
    })
  }, [treeControls])

  // Fetch initial companion message on load
  useEffect(() => {
    if (!user) return
    const fetchGreeting = async () => {
      try {
        const msg = await chatWithAI(user.uid, "Give a very short 1-sentence greeting for the user entering their garden. Include one emoji.")
        setCompanionMsg(msg)
      } catch (e) {
        // use default
      }
    }
    fetchGreeting()
  }, [user])

  const handleCompanionClick = async () => {
    if (!user || isCompanionLoading) return
    setIsCompanionLoading(true)
    try {
      const prompt = `I'm in my digital garden. My garden is level ${stats.level} with a ${stats.current_streak}-day streak. The weather is ${weather} and it's ${timeOfDay}. Say something highly encouraging and magical about my progress in 1-2 sentences. Use emojis.`
      const reply = await chatWithAI(user.uid, prompt)
      setCompanionMsg(reply)
    } catch (e) {
      setCompanionMsg("The garden's magic is feeling shy right now... try again later! ✨")
    } finally {
      setIsCompanionLoading(false)
    }
  }

  // Rare events
  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() < 0.015) {
        const evts = ['goldenButterfly', 'rainbow', 'shootingStar', 'meteorShower']
        setRareEvent(evts[Math.floor(Math.random() * evts.length)])
        setTimeout(() => setRareEvent(null), 8000)
      }
    }, 60_000)
    return () => clearInterval(t)
  }, [])

  // ── Derived ──
  const isNight = timeOfDay === 'night'
  const isDawn = timeOfDay === 'dawn'
  const isEvening = timeOfDay === 'evening'

  const currentStage = useMemo(() => {
    let s = TREE_STAGES[0]
    for (const stage of TREE_STAGES) { if (stats.level >= stage.minLevel) s = stage }
    return s
  }, [stats.level])

  const nextLevelXp = XP_PER_LEVEL(stats.level)
  const xpPercent = Math.min((stats.xp / nextLevelXp) * 100, 100)
  const unlocked = CREATURE_UNLOCKS.filter(c => c.minLevel <= stats.level)
  const nextUnlock = CREATURE_UNLOCKS.find(c => c.minLevel > stats.level)

  // ── Sky gradient ──
  const skyBg = useMemo(() => {
    const [top, mid, bot] = SKY[timeOfDay]
    const [grass, ground] = GROUND_COLORS[season]
    let g = isNight
      ? `linear-gradient(180deg,${top} 0%,${mid} 38%,#0a2d18 62%,#051a08 78%,#021005 100%)`
      : `linear-gradient(180deg,${top} 0%,${mid} 38%,${bot} 60%,${grass} 76%,${ground} 100%)`
    if (weather === 'cloudy' || weather === 'rainy')
      g = `linear-gradient(rgba(70,82,102,0.42),rgba(70,82,102,0.42)),${g}`
    if (weather === 'snowy')
      g = `linear-gradient(rgba(175,195,228,0.35),rgba(175,195,228,0.35)),${g}`
    return g
  }, [timeOfDay, season, weather, isNight])

  // ── Water tree ──
  const handleWater = useCallback(() => {
    if (isWatering) return
    setIsWatering(true)
    setWaterKey(k => k + 1)

    setStats(prev => {
      let xp = prev.xp + 500
      let lvl = prev.level
      const thr = XP_PER_LEVEL(prev.level)
      if (xp >= thr) {
        lvl += 1; xp -= thr
        setShowLevelUp(true); setLevelUpNum(lvl)
        setTimeout(() => setShowLevelUp(false), 3500)
      }
      const n = { ...prev, xp, level: lvl, lastWatered: Date.now() }
      localStorage.setItem('ls_garden', JSON.stringify(n))
      return n
    })

    const id = xpIdRef.current++
    setFloatingXPs(a => [...a, { id, amount: 500, emoji: '💧' }])

    treeControls.start({
      scale: [1, 1.09, 0.94, 1.06, 1], rotate: [-4, 5, -3, 4, 0],
      transition: { duration: 0.72, ease: 'easeInOut' },
    }).then(() => treeControls.start({
      rotate: [-1.5, 1.5, -1, 1, -1.5], y: [0, -3, 0, -2, 0],
      transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
    }))

    setTimeout(() => setIsWatering(false), 2000)
  }, [isWatering, treeControls])

  const removeXP = useCallback((id: number) => {
    setFloatingXPs(a => a.filter(x => x.id !== id))
  }, [])

  const seasonLabel = { spring: '🌸 Spring', summer: '☀️ Summer', autumn: '🍂 Autumn', winter: '❄️ Winter' }[season]
  const weatherLabel = { sunny: '☀️ Sunny', cloudy: '☁️ Cloudy', rainy: '🌧️ Rain', snowy: '❄️ Snow', rainbow: '🌈 Rainbow' }[weather]
  const timeLabel = { dawn: '🌅 Dawn', morning: '🌤️ Morning', afternoon: '☀️ Afternoon', evening: '🌇 Evening', night: '🌙 Night' }[timeOfDay]
  const gardenHealth = { spring: 'Blossoming', summer: 'Thriving', autumn: 'Settling', winter: 'Resting' }[season]

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 relative select-none"
      style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

      {/* ═══════════════════════ SCENE ═══════════════════════ */}
      <motion.div className="absolute inset-0 overflow-hidden"
        animate={{ background: skyBg }} transition={{ duration: 4 }}>

        {/* Stars */}
        <AnimatePresence>
          {isNight && (
            <motion.div key="stars" className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 3 }}>
              {STARS.map(s => (
                <motion.div key={s.id} className="absolute rounded-full bg-white"
                  style={{ top: s.top, left: s.left, width: s.r * 2, height: s.r * 2 }}
                  animate={{ opacity: [0.1, 1, 0.1], scale: [0.7, 1.35, 0.7] }}
                  transition={{ duration: s.dur, repeat: Infinity, delay: s.delay }} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Shooting star */}
        <AnimatePresence>
          {rareEvent === 'shootingStar' && (
            <motion.div className="absolute pointer-events-none z-20"
              style={{ top: '8%', left: '-6%' }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: '115vw', y: '55vh', opacity: [1, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.8, ease: 'easeIn' }}>
              <div className="h-0.5 rounded-full"
                style={{ width: 160, background: 'linear-gradient(to right, transparent, white, rgba(255,255,220,0.7))' }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sun / Moon */}
        {isNight ? (
          <motion.div className="absolute top-7 right-20"
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 3 }}>
            <motion.div className="w-16 h-16 rounded-full bg-slate-100 relative"
              animate={{ boxShadow: ['0 0 20px rgba(226,232,240,0.35)', '0 0 55px rgba(226,232,240,0.7)', '0 0 20px rgba(226,232,240,0.35)'] }}
              transition={{ duration: 4, repeat: Infinity }}>
              <div className="absolute top-3 right-2.5 w-3 h-3 rounded-full bg-slate-300/28" />
              <div className="absolute top-7 right-5 w-2 h-2 rounded-full bg-slate-300/22" />
              <div className="absolute top-5 left-2.5 w-1.5 h-1.5 rounded-full bg-slate-300/18" />
            </motion.div>
          </motion.div>
        ) : (
          <div className="absolute top-6 right-16">
            <motion.div className="w-16 h-16 rounded-full"
              style={{
                background: isDawn || isEvening
                  ? 'radial-gradient(circle, #fbbf24, #f97316)'
                  : 'radial-gradient(circle, #fde68a, #fbbf24)'
              }}
              animate={{
                scale: [1, 1.06, 1], boxShadow: isDawn || isEvening
                  ? ['0 0 30px rgba(249,115,22,0.5)', '0 0 70px rgba(249,115,22,0.8)', '0 0 30px rgba(249,115,22,0.5)']
                  : ['0 0 28px rgba(251,191,36,0.4)', '0 0 65px rgba(251,191,36,0.72)', '0 0 28px rgba(251,191,36,0.4)']
              }}
              transition={{ duration: 4, repeat: Infinity }} />
            <motion.div className="absolute inset-[-14px] rounded-full border-2 border-amber-300/38"
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.72, 0.4] }} transition={{ duration: 4, repeat: Infinity }} />
            <motion.div className="absolute inset-[-26px] rounded-full border border-amber-200/18"
              animate={{ scale: [1, 1.38, 1], opacity: [0.2, 0.42, 0.2] }} transition={{ duration: 4, repeat: Infinity, delay: 0.4 }} />
          </div>
        )}

        {/* Rainbow */}
        <AnimatePresence>
          {(weather === 'rainbow' || rareEvent === 'rainbow') && (
            <motion.div className="absolute pointer-events-none z-10"
              style={{ top: '4%', left: '8%', width: '84%', height: '52%' }}
              initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} transition={{ duration: 2 }}>
              {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'].map((c, i) => (
                <div key={i} className="absolute inset-0 rounded-t-full"
                  style={{ border: `6px solid ${c}`, opacity: 0.65 - i * 0.02, transform: `scale(${1 - i * 0.065})` }} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clouds */}
        {CLOUDS_DATA.map(c => (
          <motion.div key={c.id} className="absolute pointer-events-none"
            style={{ top: c.top, scale: c.scale }}
            animate={{ x: ['-200px', '110vw'] }}
            transition={{ duration: c.dur, repeat: Infinity, ease: 'linear', delay: c.delay }}>
            <div className="relative" style={{ width: c.w, height: 55 }}>
              <div className="absolute bottom-0 rounded-full bg-white/90" style={{ width: '100%', height: 36 }} />
              <div className="absolute bottom-6 left-[14%] rounded-full bg-white/88" style={{ width: '46%', height: 42 }} />
              <div className="absolute bottom-5 left-[40%] rounded-full bg-white/84" style={{ width: '52%', height: 36 }} />
              <div className="absolute bottom-9 left-[28%] rounded-full bg-white/80" style={{ width: '32%', height: 29 }} />
            </div>
          </motion.div>
        ))}

        {/* Mountains — Far */}
        <div className="absolute pointer-events-none" style={{ bottom: '36%', left: 0, right: 0, height: '28%' }}>
          <svg viewBox="0 0 1000 200" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="mfar" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={isNight ? '#1e3a5f' : isDawn || isEvening ? '#7986cb' : '#90a4c5'} />
                <stop offset="100%" stopColor={isNight ? '#0d2137' : isDawn || isEvening ? '#5c6bc0' : '#6b8db5'} />
              </linearGradient>
            </defs>
            <polygon points="0,200 0,145 75,62 160,122 245,44 335,108 425,22 520,94 600,32 680,102 760,54 845,115 925,42 1000,85 1000,200"
              fill="url(#mfar)" />
          </svg>
        </div>

        {/* Mountains — Near */}
        <div className="absolute pointer-events-none" style={{ bottom: '30%', left: 0, right: 0, height: '22%' }}>
          <svg viewBox="0 0 1000 180" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="mnear" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={
                  isNight ? '#0f3322'
                    : season === 'autumn' ? '#5d4037'
                      : season === 'winter' ? '#78909c'
                        : '#2e7d32'} />
                <stop offset="100%" stopColor={
                  isNight ? '#051a08'
                    : season === 'autumn' ? '#4e342e'
                      : season === 'winter' ? '#546e7a'
                        : '#1b5e20'} />
              </linearGradient>
            </defs>
            <polygon points="0,180 0,122 95,52 200,104 315,32 440,95 555,22 675,84 795,37 900,88 1000,42 1000,180"
              fill="url(#mnear)" />
          </svg>
        </div>

        {/* Waterfall */}
        {stats.level >= 10 && (
          <div className="absolute pointer-events-none" style={{ right: '8%', bottom: '28%', width: 60, height: 155 }}>
            <div className="absolute top-0 w-full rounded-tl-2xl rounded-tr-sm"
              style={{ height: 64, background: 'linear-gradient(135deg,#5d4037,#795548)', boxShadow: 'inset -3px 0 8px rgba(0,0,0,0.3)' }} />
            {[8, 20, 34].map((x, i) => (
              <motion.div key={i} className="absolute rounded-b-full"
                style={{ left: x, top: 60, width: 5 + i * 2, background: 'linear-gradient(180deg,rgba(147,210,255,0.92),rgba(100,175,255,0.7),rgba(60,135,218,0.5))' }}
                animate={{ height: [72, 90, 72], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 0.8 + i * 0.28, repeat: Infinity, ease: 'easeInOut' }} />
            ))}
            <motion.div className="absolute rounded-full blur-sm"
              style={{ bottom: -9, left: '8%', width: '84%', height: 20, background: 'radial-gradient(ellipse,rgba(147,210,255,0.82),rgba(100,175,255,0.42))' }}
              animate={{ scaleX: [1, 1.22, 1], opacity: [0.58, 1, 0.58] }}
              transition={{ duration: 1, repeat: Infinity }} />
          </div>
        )}

        {/* Cottage */}
        <div className="absolute pointer-events-none" style={{ right: '3.5%', bottom: '27%' }}>
          <Cottage glowing={isNight || isEvening} />
        </div>

        {/* Windmill */}
        <div className="absolute pointer-events-none" style={{ left: '4.5%', bottom: '30%' }}>
          <Windmill />
        </div>

        {/* River */}
        <div className="absolute pointer-events-none" style={{ bottom: '21%', left: 0, right: 0, height: 64 }}>
          <svg viewBox="0 0 1000 64" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="rv" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={isNight ? '#1565c0' : '#42a5f5'} />
                <stop offset="50%" stopColor={isNight ? '#0d47a1' : '#29b6f6'} />
                <stop offset="100%" stopColor={isNight ? '#1565c0' : '#42a5f5'} />
              </linearGradient>
              <linearGradient id="rvShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="42%" stopColor="rgba(255,255,255,0.32)" />
                <stop offset="58%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>
            <path d="M 0 32 Q 150 10,300 32 Q 450 52,600 26 Q 750 5,1000 33 L 1000 64 L 0 64 Z" fill="url(#rv)" />
            <motion.path d="M 0 32 Q 150 10,300 32 Q 450 52,600 26 Q 750 5,1000 33 L 1000 64 L 0 64 Z"
              fill="url(#rvShimmer)"
              animate={{ x: [0, 110, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }} />
            {WATER_RIPPLES.map(r => (
              <motion.ellipse key={r.id} cx={`${r.cx}%`} cy="36" rx="10" ry="4"
                fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="1.2"
                animate={{ rx: [0, 22], ry: [0, 7], opacity: [0.7, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, delay: r.delay }} />
            ))}
          </svg>
        </div>

        {/* Wooden Bridge */}
        <div className="absolute pointer-events-none" style={{ bottom: '21%', left: '25%', width: 130, height: 52 }}>
          <svg viewBox="0 0 130 52" className="w-full h-full">
            <path d="M 5 48 Q 65 14,125 48" stroke="#8B5E3C" strokeWidth="5.5" fill="none" />
            <path d="M 18 48 Q 65 22,112 48" stroke="#7a4f2e" strokeWidth="3.5" fill="none" opacity="0.55" />
            {[8, 21, 34, 47, 60, 73, 86, 99, 112].map((x, i) => (
              <rect key={i} x={x - 3} y={i < 4 ? 32 - i * 2 : i === 4 ? 24 : 26 + (i - 5) * 2}
                width="7" height="15" rx="1.5" fill={i % 2 === 0 ? '#a0622a' : '#8B5014'} />
            ))}
            <line x1="8" y1="28" x2="122" y2="28" stroke="#7a4f2e" strokeWidth="2.5" strokeLinecap="round" />
            {[22, 65, 108].map((x, i) => (
              <line key={i} x1={x} y1="28" x2={x} y2="41" stroke="#7a4f2e" strokeWidth="2.5" />
            ))}
          </svg>
        </div>

        {/* Rocks */}
        <div className="absolute pointer-events-none" style={{ bottom: '15%', left: 0, right: 0 }}>
          {[
            { l: '10%', w: 30, h: 17 }, { l: '17%', w: 19, h: 12 },
            { l: '71%', w: 26, h: 15 }, { l: '79%', w: 33, h: 19 }, { l: '85%', w: 15, h: 10 },
          ].map((r, i) => (
            <div key={i} className="absolute rounded-full"
              style={{ left: r.l, bottom: 0, width: r.w, height: r.h, background: 'linear-gradient(135deg,#9e9e9e,#616161)', boxShadow: '0 2px 7px rgba(0,0,0,0.32)' }} />
          ))}
        </div>

        {/* Fences */}
        <div className="absolute pointer-events-none" style={{ bottom: '14%', left: '1%', display: 'flex', gap: 9, alignItems: 'flex-end' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-4 h-14 rounded-t-sm" style={{ background: 'linear-gradient(180deg,#c4a35a,#9e7630)' }} />
            </div>
          ))}
        </div>
        <div className="absolute pointer-events-none" style={{ bottom: '14%', right: '1%', display: 'flex', gap: 9, alignItems: 'flex-end' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-4 h-14 rounded-t-sm" style={{ background: 'linear-gradient(180deg,#c4a35a,#9e7630)' }} />
            </div>
          ))}
        </div>

        {/* Bushes */}
        {[
          { l: '2%', w: 55, h: 32 }, { l: '8%', w: 40, h: 26 },
          { l: '77%', w: 48, h: 30 }, { l: '83%', w: 38, h: 24 },
        ].map((b, i) => (
          <div key={i} className="absolute rounded-full pointer-events-none"
            style={{
              left: b.l, bottom: '19%', width: b.w, height: b.h,
              background: season === 'winter' ? 'linear-gradient(135deg,#78909c,#90a4ae)' : season === 'autumn' ? 'linear-gradient(135deg,#6d4c41,#8d6e63)' : 'linear-gradient(135deg,#2e7d32,#388e3c)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.22)'
            }} />
        ))}

        {/* Flowers */}
        <AnimatePresence>
          {stats.level >= 5 && FLOWERS_POS.map((f, i) => (
            <motion.div key={i} className="absolute pointer-events-none text-xl"
              style={{ left: f.x, bottom: f.bot, scale: f.s }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: f.s, rotate: [-3, 3, -3] }}
              transition={{ delay: i * 0.08, rotate: { duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut' } }}>
              {season === 'winter' ? '🌿' : f.e}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Seasonal Particles */}
        {season === 'spring' && stats.level >= 3 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {SAKURA.map(s => (
              <motion.div key={s.id} className="absolute text-lg"
                style={{ left: `${s.x}%`, top: '-6%' }}
                animate={{ y: ['0%', '112%'], x: [0, s.drift], rotate: [0, 360], opacity: [0, 1, 1, 0] }}
                transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: 'linear' }}>
                🌸
              </motion.div>
            ))}
          </div>
        )}
        {season === 'autumn' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {AUTUMN.map(l => (
              <motion.div key={l.id} className="absolute w-4 h-4 rounded-full"
                style={{ left: `${l.x}%`, top: '-6%', backgroundColor: l.color }}
                animate={{ y: ['0%', '112%'], x: [0, l.drift], rotate: [0, 720], opacity: [0, 1, 1, 0] }}
                transition={{ duration: l.dur, repeat: Infinity, delay: l.delay, ease: 'linear' }} />
            ))}
          </div>
        )}
        {(season === 'winter' || weather === 'snowy') && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {SNOW.map(s => (
              <motion.div key={s.id} className="absolute rounded-full bg-white"
                style={{ left: `${s.x}%`, top: '-4%', width: s.s, height: s.s, opacity: 0.88 }}
                animate={{ y: ['0%', '108%'], x: [0, s.drift], opacity: [0, 0.88, 0.88, 0] }}
                transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: 'linear' }} />
            ))}
          </div>
        )}
        {weather === 'rainy' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {RAIN.map(r => (
              <motion.div key={r.id} className="absolute rounded-full"
                style={{ left: `${r.x}%`, top: '-3%', width: 1.5, height: 20, background: 'linear-gradient(180deg,rgba(147,197,253,0),rgba(147,197,253,0.82))' }}
                animate={{ y: ['0%', '105%'], opacity: [0, 0.82, 0] }}
                transition={{ duration: r.dur, repeat: Infinity, delay: r.delay, ease: 'linear' }} />
            ))}
          </div>
        )}

        {/* Tree of Life */}
        <div className="absolute pointer-events-none z-10" style={{ bottom: '17%', left: '50%', transform: 'translateX(-50%)' }}>
          <TreeOfLife level={stats.level} isNight={isNight} stage={currentStage} controls={treeControls} />
        </div>

        {/* Watering particles */}
        <AnimatePresence>
          {isWatering && (
            <div key={`w-${waterKey}`} className="absolute inset-0 pointer-events-none z-20">
              {[-34, -18, -4, 10, 26, 40, -26, 4, -12, 20].map((xOff, i) => (
                <motion.div key={i} className="absolute rounded-b-full rounded-t-sm"
                  style={{ left: `calc(50% + ${xOff}px)`, bottom: '44%', width: 6, height: 13, background: 'linear-gradient(180deg,#93c5fd,#3b82f6)' }}
                  initial={{ y: 0, opacity: 1 }}
                  animate={{ y: -170, opacity: 0, x: xOff * 0.38 }}
                  transition={{ duration: 0.92, delay: i * 0.055, ease: [0.25, 0.46, 0.45, 0.94] }} />
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Floating XP text */}
        {floatingXPs.map(xp => (
          <FloatingXP key={xp.id} id={xp.id} amount={xp.amount} emoji={xp.emoji} onDone={() => removeXP(xp.id)} />
        ))}

        {/* Creatures */}
        {unlocked.some(c => c.type === 'butterfly') && <>
          <motion.div className="absolute z-10 pointer-events-none" style={{ left: '28%', top: '44%' }}
            animate={{ x: [0, 85, 160, 105, 205, 82, 0], y: [0, -28, 8, -45, -18, 28, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}>
            <motion.span className="text-2xl inline-block"
              animate={{ scaleX: [1, 0.28, 1, 0.28, 1] }} transition={{ duration: 0.33, repeat: Infinity }}>🦋</motion.span>
          </motion.div>
          <motion.div className="absolute z-10 pointer-events-none" style={{ right: '27%', top: '52%' }}
            animate={{ x: [0, -62, -125, -82, -162, -60, 0], y: [0, -22, 6, -38, -12, 22, 0] }}
            transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 5 }}>
            <motion.span className="text-xl inline-block"
              animate={{ scaleX: [1, 0.28, 1, 0.28, 1] }} transition={{ duration: 0.33, repeat: Infinity }}>🦋</motion.span>
          </motion.div>
        </>}
        {unlocked.some(c => c.type === 'bird') && (
          <motion.div className="absolute z-10 pointer-events-none" style={{ top: '18%', left: '-6%' }}
            animate={{ x: ['0%', '112vw'] }}
            transition={{ duration: 38, repeat: Infinity, ease: 'linear', delay: 10 }}>
            <span className="text-xl">🐦</span>
          </motion.div>
        )}
        {unlocked.some(c => c.type === 'rabbit') && (
          <motion.div className="absolute z-10 pointer-events-none" style={{ left: '14%', bottom: '21%' }}
            animate={{ x: [0, 22, 0, -12, 0], y: [0, -9, 0, -5, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}>
            <span className="text-2xl">🐇</span>
          </motion.div>
        )}
        {unlocked.some(c => c.type === 'deer') && (
          <div className="absolute z-10 pointer-events-none" style={{ right: '19%', bottom: '22%' }}>
            <motion.span className="text-3xl inline-block"
              animate={{ x: [0, -6, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}>🦌</motion.span>
          </div>
        )}
        {unlocked.some(c => c.type === 'fox') && (
          <motion.div className="absolute z-10 pointer-events-none" style={{ left: '38%', bottom: '19%' }}
            animate={{ x: [0, 18, 0], y: [0, -2, 0] }} transition={{ duration: 11, repeat: Infinity }}>
            <span className="text-2xl">🦊</span>
          </motion.div>
        )}
        {unlocked.some(c => c.type === 'owl') && isNight && (
          <motion.div className="absolute z-10 pointer-events-none" style={{ right: '37%', bottom: '58%' }}
            animate={{ rotate: [-6, 6, -6], scale: [1, 1.06, 1] }} transition={{ duration: 3, repeat: Infinity }}>
            <span className="text-2xl">🦉</span>
          </motion.div>
        )}

        {/* Fireflies (night) */}
        <AnimatePresence>
          {isNight && stats.level >= 5 && (
            <motion.div key="ff" className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 2.5 }}>
              {FIREFLIES.map(f => (
                <motion.div key={f.id} className="absolute rounded-full"
                  style={{ left: `${f.x}%`, top: `${f.y}%`, width: 7, height: 7, background: 'radial-gradient(circle,#fde047,#ca8a04)', boxShadow: '0 0 9px 4px rgba(253,224,71,0.62)' }}
                  animate={{ x: [0, f.dx, -f.dx * 0.5, f.dx * 0.7, 0], y: [0, -f.dy, f.dy * 0.6, -f.dy * 0.3, 0], opacity: [0, 1, 0.48, 1, 0], scale: [0.7, 1.3, 0.9, 1.2, 0.7] }}
                  transition={{ duration: f.dur, repeat: Infinity, delay: f.delay, ease: 'easeInOut' }} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Golden butterfly rare event */}
        <AnimatePresence>
          {rareEvent === 'goldenButterfly' && (
            <motion.div className="absolute z-30 pointer-events-none" style={{ top: '28%', left: '-6%' }}
              initial={{ x: 0, opacity: 0 }}
              animate={{ x: '112vw', opacity: [0, 1, 1, 0], y: [0, -45, 12, -32, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 7, ease: 'easeInOut' }}>
              <motion.span className="text-3xl inline-block"
                animate={{ scaleX: [1, 0.2, 1, 0.2, 1] }} transition={{ duration: 0.28, repeat: Infinity }}
                style={{ filter: 'drop-shadow(0 0 10px gold)' }}>🦋</motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Companion */}
        <div className="absolute z-12 pointer-events-auto" style={{ bottom: '19%', left: '30%' }}>
          <Companion 
            message={companionMsg} 
            isWatering={isWatering} 
            onClick={handleCompanionClick}
            isLoading={isCompanionLoading}
          />
        </div>

        {/* Level-up overlay */}
        <AnimatePresence>
          {showLevelUp && (
            <motion.div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Radial burst particles */}
              {[...Array(18)].map((_, i) => (
                <motion.div key={i} className="absolute w-4 h-4 rounded-full"
                  style={{ background: i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#4ade80' : '#a78bfa' }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: Math.cos(i * 20 * Math.PI / 180) * 220, y: Math.sin(i * 20 * Math.PI / 180) * 220, opacity: 0, scale: 0 }}
                  transition={{ duration: 1.4, delay: 0.18 }} />
              ))}
              <motion.div
                className="text-center px-12 py-8 rounded-3xl shadow-2xl"
                style={{ background: 'linear-gradient(135deg,rgba(234,179,8,0.96),rgba(251,146,60,0.96))', backdropFilter: 'blur(24px)', boxShadow: '0 0 70px rgba(234,179,8,0.65),0 0 140px rgba(234,179,8,0.32)' }}
                initial={{ scale: 0.15, rotate: -18, opacity: 0 }}
                animate={{ scale: [0.15, 1.18, 1], rotate: [-18, 6, 0], opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 270, damping: 17 }}>
                <motion.div className="text-5xl mb-2" animate={{ rotate: [0, 22, -22, 0] }} transition={{ duration: 0.5, repeat: 3 }}>✨</motion.div>
                <div className="text-white font-black text-4xl tracking-tight drop-shadow">LEVEL UP!</div>
                <div className="text-white/92 font-bold text-xl mt-1.5">Level {levelUpNum} Reached!</div>
                <div className="text-white/72 text-sm mt-2 font-semibold">{currentStage.name}</div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
      {/* ═══════════════════════ END SCENE ═══════════════════════ */}

      {/* ═══════════════════════ HUD ═══════════════════════ */}
      <div className="absolute inset-0 pointer-events-none z-30">

        {/* Top info pill */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-3 px-5 py-2 rounded-full border border-white/30 text-[11px] font-semibold tracking-wide"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(14px)', color: '#ffffff' }}>
            <span style={{ color: '#ffffff' }}>{seasonLabel}</span>
            <span className="w-px h-3.5 bg-white/30" />
            <span style={{ color: '#ffffff' }}>{weatherLabel}</span>
            <span className="w-px h-3.5 bg-white/30" />
            <span style={{ color: '#ffffff' }}>{timeLabel}</span>
          </div>
        </div>

        {/* ── LEFT PANEL ── */}
        <div className="absolute top-14 left-3 w-64 space-y-2.5 pointer-events-auto">

          {/* Level + XP */}
          <motion.div initial={{ opacity: 0, x: -22 }} animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl p-4 border border-white/25 shadow-2xl"
            style={{ background: 'rgba(6,16,8,0.82)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <motion.div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm shadow-lg"
                  style={{ background: 'linear-gradient(135deg,#15803d,#4ade80)', color: '#ffffff' }}
                  animate={{ boxShadow: ['0 0 8px rgba(74,222,128,0.5)', '0 0 22px rgba(74,222,128,0.85)', '0 0 8px rgba(74,222,128,0.5)'] }}
                  transition={{ duration: 2.2, repeat: Infinity }}>
                  {stats.level}
                </motion.div>
                <div>
                  <div className="font-bold text-sm leading-none" style={{ color: '#ffffff' }}>Level {stats.level}</div>
                  <div className="text-[10px] mt-0.5 font-medium" style={{ color: '#a7f3d0' }}>{currentStage.name}</div>
                </div>
              </div>
              <TreePine className="w-5 h-5 text-emerald-500/50" />
            </div>
            {/* XP Bar */}
            <div>
              <div className="flex justify-between text-[10px] mb-1.5">
                <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>XP Progress</span>
                <span className="font-bold" style={{ color: '#a7f3d0' }}>{stats.xp} / {nextLevelXp}</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <motion.div className="h-full rounded-full relative overflow-hidden"
                  style={{ background: 'linear-gradient(90deg,#15803d,#4ade80,#86efac)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercent}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}>
                  <motion.div className="absolute inset-0"
                    style={{ background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.42) 50%,transparent 100%)' }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 1.2 }} />
                </motion.div>
              </div>
              <div className="text-[10px] mt-1 text-right" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>{Math.round(nextLevelXp - stats.xp)} XP to next level</div>
            </div>
          </motion.div>

          {/* XP Rewards */}
          <motion.div initial={{ opacity: 0, x: -22 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}
            className="rounded-2xl p-4 border border-white/25 shadow-2xl"
            style={{ background: 'rgba(6,16,8,0.82)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center gap-2 mb-2.5">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span className="font-bold text-[10px] uppercase tracking-widest" style={{ color: '#ffffff' }}>XP Rewards</span>
            </div>
            <div className="space-y-1.5 text-[10px]">
              {[
                { e: '✅', l: 'Complete Task', v: '+20 XP', c: '#4ade80' },
                { e: '⏱️', l: 'Focus Session', v: '+50 XP', c: '#60a5fa' },
                { e: '🎯', l: 'Complete Goal', v: '+200 XP', c: '#c084fc' },
                { e: '💧', l: 'Water Tree', v: '+500 XP', c: '#22d3ee' },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span style={{ color: 'rgba(255, 255, 255, 0.95)' }}>{row.e} {row.l}</span>
                  <span className="font-bold" style={{ color: row.c }}>{row.v}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Next Unlock */}
          {nextUnlock && (
            <motion.div initial={{ opacity: 0, x: -22 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.16 }}
              className="rounded-2xl p-3.5 border border-amber-400/50 shadow-xl"
              style={{ background: 'rgba(35,18,2,0.85)', backdropFilter: 'blur(20px)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-[10px] uppercase tracking-wider" style={{ color: '#fcd34d' }}>Next Unlock</span>
              </div>
              <div className="text-[11px] leading-snug" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                Reach <span className="font-black" style={{ color: '#fcd34d' }}>Level {nextUnlock.minLevel}</span> to unlock{' '}
                <span className="font-semibold" style={{ color: '#ffffff' }}>{nextUnlock.emoji} {nextUnlock.label}</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="absolute top-14 right-3 w-64 space-y-2.5 pointer-events-auto">

          {/* Companion card */}
          <motion.div initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02, borderColor: 'rgba(52,211,153,0.45)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCompanionChat(true)}
            className="rounded-2xl p-4 border border-white/25 shadow-2xl cursor-pointer"
            style={{ background: 'rgba(6,16,8,0.82)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-[10px] uppercase tracking-widest" style={{ color: '#ffffff' }}>AI Companion</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 font-semibold uppercase tracking-wider" style={{ color: '#34d399' }}>Chat</span>
            </div>
            <motion.p className="text-[11px] leading-relaxed italic" style={{ color: 'rgba(255, 255, 255, 0.95)' }}
              key={companionMsg}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
              "{companionMsg}"
            </motion.p>
          </motion.div>

          {/* Stats grid */}
          <motion.div initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}
            className="rounded-2xl p-4 border border-white/25 shadow-2xl"
            style={{ background: 'rgba(6,16,8,0.82)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-3.5 h-3.5 text-yellow-400" />
              <span className="font-bold text-[10px] uppercase tracking-widest" style={{ color: '#ffffff' }}>Your Stats</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <Flame className="w-3.5 h-3.5 text-orange-400" />, label: 'Streak', value: `${stats.current_streak}d` },
                { icon: <span className="text-xs">✅</span>, label: 'Tasks', value: stats.total_tasks_completed },
                { icon: <span className="text-xs">⏱️</span>, label: 'Focus', value: stats.total_focus_sessions },
                { icon: <Target className="w-3.5 h-3.5 text-purple-400" />, label: 'Goals', value: stats.total_goals_completed },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.10)' }}>
                  {s.icon}
                  <div>
                    <div className="font-black text-sm leading-none" style={{ color: '#ffffff' }}>{s.value}</div>
                    <div className="text-[8px] uppercase tracking-wider mt-0.5" style={{ color: 'rgba(255, 255, 255, 0.72)' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Unlocked residents */}
          {unlocked.length > 0 && (
            <motion.div initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.14 }}
              className="rounded-2xl p-3.5 border border-white/25 shadow-xl"
              style={{ background: 'rgba(6,16,8,0.82)', backdropFilter: 'blur(20px)' }}>
              <div className="text-[9px] uppercase tracking-widest mb-2" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Garden Residents</div>
              <div className="flex flex-wrap gap-2.5">
                {unlocked.map(c => (
                  <div key={c.type} className="flex flex-col items-center gap-0.5">
                    <span className="text-xl">{c.emoji}</span>
                    <span className="text-[8px]" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>{c.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Water Tree button */}
          <motion.button
            className="w-full rounded-2xl p-4 border border-cyan-400/35 shadow-2xl flex items-center gap-3 font-bold text-sm relative overflow-hidden pointer-events-auto"
            style={{ background: 'rgba(5,42,68,0.68)', backdropFilter: 'blur(18px)' }}
            onClick={handleWater}
            whileHover={{ scale: 1.025, borderColor: 'rgba(34,211,238,0.6)' }}
            whileTap={{ scale: 0.96 }}
            disabled={isWatering}>
            <motion.div className="absolute inset-0 rounded-2xl"
              style={{ background: 'linear-gradient(135deg,rgba(6,182,212,0.18),rgba(59,130,246,0.18))' }}
              animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.2, repeat: Infinity }} />
            <motion.div animate={isWatering ? { rotate: [-18, 18, -18] } : {}} transition={{ duration: 0.45 }}>
              <Droplets className="w-5 h-5 text-cyan-400 relative z-10" />
            </motion.div>
            <span className="relative z-10 font-semibold" style={{ color: '#ffffff' }}>
              {isWatering ? 'Watering…' : 'Water the Tree'}
            </span>
            <span className="ml-auto font-black relative z-10 text-xs" style={{ color: '#22d3ee' }}>+500 XP</span>
          </motion.button>
        </div>

        {/* Bottom health bar */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-3 px-5 py-2 rounded-full border border-white/12 text-[10px] font-medium"
            style={{ background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(12px)' }}>
            <span className="font-bold" style={{ color: '#4ade80' }}>🌿 Garden Health</span>
            <div className="h-1.5 w-28 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <motion.div className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg,#4ade80,#86efac)', width: `${Math.min(100, (stats.level / 15) * 100)}%` }}
                animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2.5, repeat: Infinity }} />
            </div>
            <span className="italic" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{gardenHealth}</span>
          </div>
        </div>

        {/* AI Companion Chat Modal */}
        <AnimatePresence>
          {showCompanionChat && (
            <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-auto bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-md rounded-3xl p-6 border border-emerald-500/35 shadow-2xl relative"
                style={{ background: 'rgba(6,20,10,0.95)', backdropFilter: 'blur(24px)', boxShadow: '0 0 40px rgba(16,185,129,0.25)' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">🌿</div>
                    <div>
                      <h3 className="font-bold text-sm leading-none" style={{ color: '#ffffff' }}>Sage</h3>
                      <span className="text-[9px] font-semibold" style={{ color: '#34d399' }}>Garden Guide AI</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCompanionChat(false)}
                    className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Chat Messages */}
                <div className="h-64 overflow-y-auto mb-4 space-y-3 pr-1.5 scrollbar-thin">
                  {/* Sage Greeting */}
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs self-end">🍃</div>
                    <div className="rounded-2xl px-3 py-2 text-[11px] leading-relaxed max-w-[80%]"
                      style={{ background: 'rgba(255,255,255,0.08)', color: '#ffffff' }}>
                      Hello, cultivator. I am Sage, your companion in this garden of growth. How can I support your focus today?
                    </div>
                  </div>

                  {/* User Placeholder */}
                  <div className="flex gap-2 justify-end">
                    <div className="rounded-2xl px-3 py-2 text-[11px] leading-relaxed max-w-[80%]"
                      style={{ background: 'linear-gradient(135deg, #15803d, #166534)', color: '#ffffff' }}>
                      Just wanted to check on our progress. How is the Tree of Life doing?
                    </div>
                  </div>

                  {/* Sage Response */}
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs self-end">🍃</div>
                    <div className="rounded-2xl px-3 py-2 text-[11px] leading-relaxed max-w-[80%]"
                      style={{ background: 'rgba(255,255,255,0.08)', color: '#ffffff' }}>
                      The tree is vibrant! At level {stats.level}, it has grown into a {currentStage.name}. Every task you complete makes its roots run deeper and the surrounding flowers bloom.
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ask Sage anything..."
                      disabled
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-[11px] text-white focus:outline-none placeholder-white/40"
                    />
                    <button
                      disabled
                      className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4 py-2 text-[11px] font-bold opacity-50 cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                  <div className="text-[9px] text-center font-medium" style={{ color: '#fcd34d' }}>
                    ⚠️ Companion integration is mock-up mode. Configure API key in Settings modal to enable real conversation.
                  </div>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
      {/* ═══════════════════════ END HUD ═══════════════════════ */}

    </div>
  )
}
