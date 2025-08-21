import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, CardContent, CardHeader, Loading } from '../components/ui'
import { apiClient } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import type { Article, Ticket } from '../types'

interface DashboardStats {
    totalTickets: number
    openTickets: number
    resolvedTickets: number
    averageResolutionTime: string
    topCategories: Array<{ category: string; count: number }>
}

export const DashboardPage: React.FC = () => {
    const { user } = useAuthStore()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [recentTickets, setRecentTickets] = useState<Ticket[]>([])
    const [recentArticles, setRecentArticles] = useState<Article[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setIsLoading(true)

                // Fetch dashboard stats
                const statsResponse = await apiClient.get<DashboardStats>('/analytics/dashboard')
                setStats(statsResponse)

                // Fetch recent tickets
                const ticketsResponse = await apiClient.get<{ tickets: Ticket[] }>('/tickets?page=1&limit=5&sort=-createdAt')
                setRecentTickets(ticketsResponse.tickets)

                // Fetch recent articles
                const articlesResponse = await apiClient.get<{ articles: Article[] }>('/kb?page=1&limit=5&sort=-createdAt')
                setRecentArticles(articlesResponse.articles)

            } catch (error) {
                console.error('Failed to fetch dashboard data:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchDashboardData()
    }, [])

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <Loading size="lg" text="Loading dashboard..." />
            </div>
        )
    }

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good morning'
        if (hour < 18) return 'Good afternoon'
        return 'Good evening'
    }

    return (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {getGreeting()}, {user?.name}!
                    </h1>
                    <p className="mt-1 text-sm text-gray-600">
                        {user?.role === 'admin' && "Admin Dashboard - Manage your helpdesk system."}
                        {user?.role === 'agent' && "Agent Dashboard - Handle support tickets and help customers."}
                        {user?.role === 'user' && "Welcome to the helpdesk - Get help and track your tickets."}
                    </p>
                </div>

                {/* Role-based Quick Actions */}
                <div className="mb-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
                    <div className="flex flex-wrap gap-4">
                        {user?.role === 'user' && (
                            <>
                                <Link to="/tickets">
                                    <Button className="bg-blue-600 hover:bg-blue-700">
                                        📝 Create New Ticket
                                    </Button>
                                </Link>
                                <Link to="/kb">
                                    <Button variant="outline">
                                        📚 Browse Knowledge Base
                                    </Button>
                                </Link>
                            </>
                        )}

                        {user?.role === 'agent' && (
                            <>
                                <Link to="/tickets?status=waiting_human">
                                    <Button className="bg-orange-600 hover:bg-orange-700">
                                        🔔 My Assigned Tickets
                                    </Button>
                                </Link>
                                <Link to="/tickets?status=open">
                                    <Button className="bg-blue-600 hover:bg-blue-700">
                                        📋 Open Tickets
                                    </Button>
                                </Link>
                                <Link to="/kb">
                                    <Button variant="outline">
                                        📚 Knowledge Base
                                    </Button>
                                </Link>
                                <Link to="/analytics">
                                    <Button variant="outline">
                                        📊 Performance Analytics
                                    </Button>
                                </Link>
                            </>
                        )}

                        {user?.role === 'admin' && (
                            <>
                                <Link to="/analytics">
                                    <Button className="bg-purple-600 hover:bg-purple-700">
                                        📊 System Analytics
                                    </Button>
                                </Link>
                                <Link to="/users">
                                    <Button className="bg-green-600 hover:bg-green-700">
                                        👥 Manage Users
                                    </Button>
                                </Link>
                                <Link to="/tickets">
                                    <Button variant="outline">
                                        � All Tickets
                                    </Button>
                                </Link>
                                <Link to="/kb">
                                    <Button variant="outline">
                                        📚 Manage Knowledge Base
                                    </Button>
                                </Link>
                                <Link to="/settings">
                                    <Button variant="outline">
                                        ⚙️ System Settings
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                        <Card className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Total Tickets</dt>
                                            <dd className="text-lg font-medium text-gray-900">{stats.totalTickets}</dd>
                                        </dl>
                                        <Link
                                            to="/tickets"
                                            className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                                        >
                                            View all →
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Open Tickets</dt>
                                            <dd className="text-lg font-medium text-gray-900">{stats.openTickets}</dd>
                                        </dl>
                                        <Link
                                            to="/tickets"
                                            className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                                        >
                                            Manage →
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Resolved</dt>
                                            <dd className="text-lg font-medium text-gray-900">{stats.resolvedTickets}</dd>
                                        </dl>
                                        <Link
                                            to="/tickets"
                                            className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                                        >
                                            View history →
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Avg Resolution</dt>
                                            <dd className="text-lg font-medium text-gray-900">{stats.averageResolutionTime}</dd>
                                        </dl>
                                        {(user?.role === 'admin' || user?.role === 'agent') && (
                                            <Link
                                                to="/analytics"
                                                className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                                            >
                                                View analytics →
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Recent Activity */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {/* Recent Tickets */}
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-medium text-gray-900">Recent Tickets</h3>
                        </CardHeader>
                        <CardContent>
                            {recentTickets.length > 0 ? (
                                <div className="space-y-3">
                                    {recentTickets.map((ticket) => (
                                        <div key={ticket._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {ticket.title}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {ticket.category} • {ticket.priority}
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ticket.status === 'open'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : ticket.status === 'triaged'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : ticket.status === 'waiting_human'
                                                            ? 'bg-orange-100 text-orange-800'
                                                            : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {ticket.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No recent tickets</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Articles */}
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-medium text-gray-900">Recent KB Articles</h3>
                        </CardHeader>
                        <CardContent>
                            {recentArticles.length > 0 ? (
                                <div className="space-y-3">
                                    {recentArticles.map((article) => (
                                        <div key={article._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {article.title}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {article.views} views • {article.helpful} helpful
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${article.status === 'published'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {article.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No recent articles</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
