import React, { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AITestPage } from './pages/AITestPage'
import { DashboardPage } from './pages/DashboardPage'
import { KnowledgeBasePage } from './pages/KnowledgeBasePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { SettingsPage } from './pages/SettingsPage'
import { TicketDetailsPage } from './pages/TicketDetailsPage'
import { TicketsPage } from './pages/TicketsPage'
import { UsersPage } from './pages/UsersPage'
import { useAuthStore } from './stores/authStore'

const App: React.FC = () => {
    const { setUser, isAuthenticated } = useAuthStore()

    useEffect(() => {
        // Restore user session from localStorage on app start
        const storedUser = localStorage.getItem('user')
        const storedToken = localStorage.getItem('token')

        if (storedUser && storedToken) {
            try {
                const user = JSON.parse(storedUser)
                setUser(user)
            } catch (error) {
                console.error('Failed to restore user session:', error)
                localStorage.removeItem('user')
                localStorage.removeItem('token')
            }
        }
    }, [setUser])

    return (
        <Router>
            <div className="App">
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: '#363636',
                            color: '#fff',
                        },
                        success: {
                            duration: 3000,
                            iconTheme: {
                                primary: '#4ade80',
                                secondary: '#fff',
                            },
                        },
                        error: {
                            duration: 5000,
                            iconTheme: {
                                primary: '#ef4444',
                                secondary: '#fff',
                            },
                        },
                    }}
                />

                <Routes>
                    {/* Public routes */}
                    <Route
                        path="/login"
                        element={
                            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
                        }
                    />
                    <Route
                        path="/register"
                        element={
                            isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
                        }
                    />

                    {/* Protected routes */}
                    <Route path="/" element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<DashboardPage />} />
                        <Route path="tickets" element={<TicketsPage />} />
                        <Route path="tickets/:id" element={<TicketDetailsPage />} />
                        <Route path="kb" element={<KnowledgeBasePage />} />
                        <Route path="ai-test" element={<AITestPage />} />

                        <Route path="analytics" element={
                            <ProtectedRoute requiredRoles={['admin', 'agent']}>
                                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                                    <div className="px-4 py-6 sm:px-0">
                                        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                                        <p className="mt-1 text-sm text-gray-600">Coming soon...</p>
                                    </div>
                                </div>
                            </ProtectedRoute>
                        } />

                        <Route path="users" element={
                            <ProtectedRoute requiredRoles={['admin']}>
                                <UsersPage />
                            </ProtectedRoute>
                        } />

                        <Route path="settings" element={
                            <ProtectedRoute requiredRoles={['admin']}>
                                <SettingsPage />
                            </ProtectedRoute>
                        } />
                    </Route>

                    {/* Catch all route */}
                    <Route path="*" element={
                        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                                <h2 className="text-2xl font-bold text-gray-900">Page Not Found</h2>
                                <p className="mt-2 text-sm text-gray-600">
                                    The page you're looking for doesn't exist.
                                </p>
                                <div className="mt-4">
                                    <a href="/dashboard" className="text-blue-600 hover:text-blue-500">
                                        Go to Dashboard
                                    </a>
                                </div>
                            </div>
                        </div>
                    } />
                </Routes>
            </div>
        </Router>
    )
}

export default App
