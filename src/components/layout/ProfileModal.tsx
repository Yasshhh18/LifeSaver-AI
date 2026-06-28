import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Award, Save, CheckCircle2, Target, Mail, Edit2, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const { user, signOut } = useAuth()
  const [gardenStats, setGardenStats] = useState({
    level: 1,
    focusTimeStr: '0h 0m',
    streak: 0,
    plantsGrown: 0
  })

  // Profile State loaded from localStorage or defaults
  const [profile, setProfile] = useState({
    name: 'User',
    email: user?.email || '',
    bio: 'Productivity enthusiast. Aiming to finish my dissertation by fall! 🎓',
    goal: 'Maintain a 5+ day focus streak'
  })

  // Load from localStorage
  useEffect(() => {
    const savedProfile = localStorage.getItem('ls_profile')
    const savedGarden = localStorage.getItem('ls_garden')
    
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile)
        setProfile(prev => ({ 
          ...prev, 
          ...parsed, 
          name: parsed.name || prev.name || 'User',
          email: (user?.email || parsed.email || prev.email || '') as string
        }))
      } catch (e) {
        console.error('Failed to parse ls_profile', e)
      }
    } else if (user?.email) {
      setProfile(prev => ({ ...prev, email: user.email || '' }))
    }

    if (savedGarden) {
      try {
        const parsed = JSON.parse(savedGarden)
        
        let plants = parsed.total_plants || 0
        const focusMins = plants * 25 // 25m per plant/session
        const hours = Math.floor(focusMins / 60)
        const mins = focusMins % 60
        const focusTimeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

        setGardenStats({
          level: parsed.level || 1,
          focusTimeStr,
          streak: parsed.current_streak || 0,
          plantsGrown: plants
        })
      } catch (e) {}
    }
  }, [isOpen, user])

  const triggerToast = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const handleSave = () => {
    localStorage.setItem('ls_profile', JSON.stringify(profile))
    triggerToast('Profile updated successfully! ✨')
    
    // Dispatch custom event to notify Sidebar/TopBar to update name in real-time
    window.dispatchEvent(new Event('profile_updated'))
  }

  const handleSignOut = async () => {
    await signOut()
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-white/95 border border-surface-container-high rounded-3xl w-full max-w-md shadow-large z-10 overflow-hidden flex flex-col relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-surface-container-high bg-surface-container-low/50">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary-700" />
                <h2 className="font-extrabold text-lg text-foreground">My Profile</h2>
              </div>
              <button 
                onClick={onClose} 
                className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[85vh] md:max-h-[500px]">
              {/* Avatar card */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-low border border-surface-container-high">
                <div className="w-14 h-14 rounded-full bg-forest-gradient flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  {(profile.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                    {profile.name}
                  </h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Mail className="w-3.5 h-3.5" /> {profile.email}
                  </p>
                  <span className="inline-block text-[10px] bg-primary-100 text-primary-800 font-semibold px-2 py-0.5 rounded-full mt-2">
                    Lv.{gardenStats.level} Master Gardener 🌳
                  </span>
                </div>
              </div>

              {/* Input details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Full Name</label>
                  <input 
                    type="text" 
                    value={profile.name} 
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="input-base text-sm py-2 px-3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Email Address</label>
                  <input 
                    type="email" 
                    value={profile.email} 
                    disabled
                    className="input-base text-sm py-2 px-3 opacity-60 cursor-not-allowed bg-surface-container-low"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Email is managed by your account settings.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Current Focus Goal</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={profile.goal} 
                      onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
                      className="input-base text-sm py-2 pl-9 pr-3"
                    />
                    <Target className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Bio</label>
                  <textarea 
                    value={profile.bio} 
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    rows={3}
                    className="input-base text-sm py-2 px-3 resize-none"
                  />
                </div>
              </div>

              {/* Badges / Stats Section */}
              <div className="p-4 rounded-2xl bg-surface-container/50 border border-surface-container-high space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-xs text-primary-800 uppercase tracking-wider">
                  <Award className="w-4 h-4" />
                  <span>Progress Achievements</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2 rounded-xl border border-surface-container">
                    <p className="text-[10px] text-muted-foreground">Focus Time</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{gardenStats.focusTimeStr}</p>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-surface-container">
                    <p className="text-[10px] text-muted-foreground">Streak</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{gardenStats.streak} Days 🔥</p>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-surface-container">
                    <p className="text-[10px] text-muted-foreground">Tree Level</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">Lv. {gardenStats.level} 🌳</p>
                  </div>
                </div>
              </div>

              {/* Save & Sign Out buttons */}
              <div className="space-y-3">
                <button 
                  onClick={handleSave}
                  className="btn-primary w-full text-sm py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save Profile Details
                </button>
                <button 
                  onClick={handleSignOut}
                  className="w-full text-sm py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-red-50 text-red-650 hover:bg-red-100 border border-red-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>

            {/* Toast feedback */}
            <AnimatePresence>
              {showToast && (
                <motion.div 
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="absolute bottom-4 right-4 bg-primary-800 text-white font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-large border border-primary-700 text-xs z-50 animate-pulse-soft"
                >
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                  <span>{toastMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
