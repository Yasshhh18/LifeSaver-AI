import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, collection, addDoc, getDocs, query, where, limit } from 'firebase/firestore'
import { auth, db } from '@/services/firebase'

// ─── Auth Context ───────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signInAsGuest: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
      
      if (user) {
        // Auto-populate local storage profile so UI components don't fall back to hardcoded defaults
        const currentProfileStr = localStorage.getItem('ls_profile')
        const currentProfile = currentProfileStr ? JSON.parse(currentProfileStr) : {}
        const authName = user.displayName || user.email?.split('@')[0] || 'User'
        
        if (!currentProfile.name || currentProfile.name !== authName || currentProfile.email !== user.email) {
          localStorage.setItem('ls_profile', JSON.stringify({
            ...currentProfile,
            name: authName,
            email: user.email
          }))
          window.dispatchEvent(new Event('profile_updated'))
        }
      }
    })
    return () => unsubscribe()
  }, [])

  // Create default user data in Firestore on first sign-up
  const initUserData = async (user: User, fullName: string) => {
    const userRef = doc(db, 'users', user.uid)
    const existing = await getDoc(userRef)
    if (!existing.exists()) {
      await setDoc(userRef, {
        full_name: fullName || user.displayName || user.email?.split('@')[0] || 'User',
        email: user.email,
        coach_tone: 'mentor',
        user_type: 'developer',
        voice_enabled: true,
        onboarding_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      // Initialize garden progress
      await setDoc(doc(db, 'garden_progress', user.uid), {
        user_id: user.uid,
        total_plants: 0,
        current_streak: 0,
        longest_streak: 0,
        total_tasks_completed: 0,
        level: 1,
        xp: 0,
        updated_at: new Date().toISOString(),
      })
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      localStorage.clear()
      sessionStorage.clear()
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(result.user, { displayName: fullName })
      await initUserData(result.user, fullName)
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Sign up failed' }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      localStorage.clear()
      sessionStorage.clear()
      await signInWithEmailAndPassword(auth, email, password)
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Sign in failed' }
    }
  }

  const signInWithGoogle = async () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      await initUserData(result.user, result.user.displayName || '')
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Google sign in failed' }
    }
  }

  const signInAsGuest = async () => {
    try {
      // Clear previous demo onboarding state for a fresh demo experience
      sessionStorage.removeItem('onboarding_done_session')
      localStorage.removeItem('onboarding_done')

      const result = await signInAnonymously(auth)
      await updateProfile(result.user, { displayName: 'Guest' })
      await initUserData(result.user, 'Guest')
      return { error: null }
    } catch (err: any) {
      console.log('Anonymous auth failed, trying fallback...', err)
      try {
        sessionStorage.removeItem('onboarding_done_session')
        localStorage.removeItem('onboarding_done')

        // Fallback if Anonymous auth isn't enabled in Firebase Console
        const demoEmail = `demo_${Date.now()}_${Math.floor(Math.random() * 10000)}@lifesaver.ai`
        const result = await createUserWithEmailAndPassword(auth, demoEmail, 'demo123456')
        await updateProfile(result.user, { displayName: 'Guest' })
        await initUserData(result.user, 'Guest')
        return { error: null }
      } catch (fallbackErr: any) {
        return { error: fallbackErr.message || 'Guest sign in failed' }
      }
    }
  }

  const signOut = async () => {
    try {
      localStorage.clear() // Prevent data bleeding between different accounts
      await firebaseSignOut(auth)
    } catch (err: any) {
      console.error(err)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, signInAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
