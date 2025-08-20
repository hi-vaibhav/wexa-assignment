import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, CardContent, CardHeader, Loading } from '../components/ui'
import { apiClient } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import type { Ticket } from '../types'

export const TicketsPage: React.FC = () => {
    const { user } = useAuthStore()
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreatingTicket, setIsCreatingTicket] = useState(false)
    const [newTicket, setNewTicket] = useState({
        title: '',
        description: '',
        category: 'tech',
        priority: 'medium'
    })

    useEffect(() => {
        fetchTickets()
    }, [])

    const fetchTickets = async () => {
        try {
            setIsLoading(true)
            const response = await apiClient.get<{ tickets: Ticket[] }>('/tickets?page=1&limit=50')
            setTickets(response.tickets)
        } catch (error) {
            console.error('Failed to fetch tickets:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const response = await apiClient.post<{ ticket: Ticket }>('/tickets', newTicket)
            setTickets([response.ticket, ...tickets])
            setNewTicket({ title: '', description: '', category: 'tech', priority: 'medium' })
            setIsCreatingTicket(false)
        } catch (error) {
            console.error('Failed to create ticket:', error)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open':
                return 'bg-yellow-100 text-yellow-800'
            case 'triaged':
                return 'bg-blue-100 text-blue-800'
            case 'waiting_human':
                return 'bg-orange-100 text-orange-800'
            case 'resolved':
                return 'bg-green-100 text-green-800'
            case 'closed':
                return 'bg-gray-100 text-gray-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'low':
                return 'bg-green-100 text-green-800'
            case 'medium':
                return 'bg-yellow-100 text-yellow-800'
            case 'high':
                return 'bg-red-100 text-red-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <Loading size="lg" text="Loading tickets..." />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Manage and track your support requests
                        </p>
                    </div>
                    <Button onClick={() => setIsCreatingTicket(true)}>
                        Create New Ticket
                    </Button>
                </div>

                {/* Create Ticket Form */}
                {isCreatingTicket && (
                    <Card className="mb-6">
                        <CardHeader>
                            <h3 className="text-lg font-medium">Create New Ticket</h3>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateTicket} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newTicket.title}
                                        onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Brief description of the issue"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Description
                                    </label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={newTicket.description}
                                        onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Detailed description of the issue"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Category
                                        </label>
                                        <select
                                            value={newTicket.category}
                                            onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="tech">Technical</option>
                                            <option value="billing">Billing</option>
                                            <option value="shipping">Shipping</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Priority
                                        </label>
                                        <select
                                            value={newTicket.priority}
                                            onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsCreatingTicket(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit">
                                        Create Ticket
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Tickets List */}
                {tickets.length > 0 ? (
                    <div className="space-y-4">
                        {tickets.map((ticket) => (
                            <Card key={ticket._id}>
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-3">
                                                <h3 className="text-lg font-medium text-gray-900 truncate">
                                                    {ticket.title}
                                                </h3>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                                    {ticket.status}
                                                </span>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                                    {ticket.priority}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                                                {ticket.description}
                                            </p>
                                            <div className="mt-3 flex items-center text-sm text-gray-500 space-x-4">
                                                <span>#{ticket._id.slice(-6)}</span>
                                                <span>Category: {ticket.category}</span>
                                                <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                                                {ticket.resolvedAt && (
                                                    <span>Resolved: {new Date(ticket.resolvedAt).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 ml-4">
                                            <Link
                                                to={`/tickets/${ticket._id}`}
                                                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                                            >
                                                View Details →
                                            </Link>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <svg
                                className="mx-auto h-12 w-12 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                You haven't created any support tickets yet.
                            </p>
                            <div className="mt-6">
                                <Button onClick={() => setIsCreatingTicket(true)}>
                                    Create your first ticket
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
