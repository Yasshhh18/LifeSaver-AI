import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import LandingPage from '@/pages/LandingPage'
import DashboardPage from '@/pages/DashboardPage'
import FocusPage from '@/pages/FocusPage'
import GoalsPage from '@/pages/GoalsPage'
import GardenPage from '@/pages/GardenPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import EmergencyPage from '@/pages/EmergencyPage'
import AuthPage from '@/pages/AuthPage'
import AICompanionPage from '@/pages/AICompanionPage'
import AppLayout from '@/components/layout/AppLayout'

// Protected route wrapper — redirects to /auth if not logged in
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary-300 border-t-primary-700 rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Loading LifeSaver AI...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/app" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="focus" element={<FocusPage />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="garden" element={<GardenPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="emergency" element={<EmergencyPage />} />
              <Route path="ai" element={<AICompanionPage />} />
            </Route>
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  )
}
