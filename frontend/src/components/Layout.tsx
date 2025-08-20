import React from 'react'
import toast from 'react-hot-toast'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Button } from './ui'

export const Layout: React.FC = () => {
    const { user, logout } = useAuthStore()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        toast.success('Logged out successfully')
        navigate('/login')
    }

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', roles: ['admin', 'agent', 'user'] },
        { name: 'Tickets', href: '/tickets', roles: ['admin', 'agent', 'user'] },
        { name: 'Knowledge Base', href: '/kb', roles: ['admin', 'agent', 'user'] },
        { name: 'Analytics', href: '/analytics', roles: ['admin', 'agent'] },
        { name: 'Users', href: '/users', roles: ['admin'] },
        { name: 'Settings', href: '/settings', roles: ['admin'] },
    ]

    const allowedNavigation = navigation.filter(item =>
        item.roles.includes(user?.role || '')
    )

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation */}
            <nav className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <Link to="/dashboard" className="text-xl font-bold text-gray-900">
                                    Smart Helpdesk
                                </Link>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                {allowedNavigation.map((item) => (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300 text-sm font-medium transition-colors"
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <div className="text-sm">
                                    <div className="font-medium text-gray-700">{user?.name}</div>
                                    <div className="text-gray-500 capitalize">{user?.role}</div>
                                </div>
                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user?.role === 'admin'
                                        ? 'bg-purple-100 text-purple-800'
                                        : user?.role === 'agent'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-green-100 text-green-800'
                                    }`}>
                                    {user?.role}
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleLogout}>
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                <div className="sm:hidden">
                    <div className="pt-2 pb-3 space-y-1">
                        {allowedNavigation.map((item) => (
                            <Link
                                key={item.name}
                                to={item.href}
                                className="text-gray-500 hover:text-gray-700 block px-3 py-2 text-base font-medium"
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Page content */}
            <main>
                <Outlet />
            </main>
        </div>
    )
}
