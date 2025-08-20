import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { PageLoading } from '../components/ui'
import { useAuthStore } from '../stores/authStore'

interface ProtectedRouteProps {
    children: React.ReactNode
    requiredRoles?: string[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredRoles = []
}) => {
    const { isAuthenticated, user, isLoading } = useAuthStore()
    const location = useLocation()

    // Show loading while checking authentication
    if (isLoading) {
        return <PageLoading text="Checking authentication..." />
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    // Check role-based access
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                    <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        You don't have permission to access this page.
                    </p>
                    <div className="mt-4">
                        <button
                            onClick={() => window.history.back()}
                            className="text-blue-600 hover:text-blue-500"
                        >
                            Go back
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
