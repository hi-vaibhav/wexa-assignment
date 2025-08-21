import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useParams } from 'react-router-dom'
import { Button, Card, CardContent, CardHeader, Loading } from '../components/ui'
import { apiClient } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import type { AgentSuggestion, Ticket } from '../types'

export const TicketDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const { user } = useAuthStore()
    const [ticket, setTicket] = useState<Ticket | null>(null)
    const [agentSuggestion, setAgentSuggestion] = useState<AgentSuggestion | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [newReply, setNewReply] = useState('')
    const [isAddingReply, setIsAddingReply] = useState(false)
    const [isResolvingTicket, setIsResolvingTicket] = useState(false)
    const [isAssigningTicket, setIsAssigningTicket] = useState(false)
    const [isTriggeringAI, setIsTriggeringAI] = useState(false)

    useEffect(() => {
        if (id) {
            fetchTicketDetails()
        }
    }, [id])

    const fetchTicketDetails = async () => {
        try {
            setIsLoading(true)
            setError(null)
            const ticket = await apiClient.get<Ticket>(`/tickets/${id}`)
            setTicket(ticket)

            // Fetch agent suggestion if exists
            if (ticket.agentSuggestionId) {
                try {
                    const suggestionResponse = await apiClient.get<{ suggestion: AgentSuggestion }>(`/agent/suggestion/${id}`)
                    setAgentSuggestion(suggestionResponse.suggestion)
                } catch (err) {
                    console.error('Failed to fetch agent suggestion:', err)
                }
            }
        } catch (error: any) {
            console.error('Failed to fetch ticket details:', error)
            setError(error?.message || 'Failed to load ticket details')
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddReply = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newReply.trim()) return

        try {
            setIsAddingReply(true)
            await apiClient.post(`/tickets/${id}/replies`, {
                content: newReply.trim(),
                isInternal: false
            })
            setNewReply('')
            // Refresh ticket to get updated replies
            await fetchTicketDetails()
        } catch (error) {
            console.error('Failed to add reply:', error)
        } finally {
            setIsAddingReply(false)
        }
    }

    const handleResolveTicket = async () => {
        if (!ticket || !id) return

        try {
            setIsResolvingTicket(true)
            await apiClient.patch(`/tickets/${id}/status`, { status: 'resolved' })

            toast.success('Ticket resolved successfully!')

            // Refresh ticket to get updated status
            await fetchTicketDetails()
        } catch (error) {
            console.error('Failed to resolve ticket:', error)
            toast.error('Failed to resolve ticket')
        } finally {
            setIsResolvingTicket(false)
        }
    }

    const handleAssignToMe = async () => {
        if (!ticket || !id || !user) return

        try {
            setIsAssigningTicket(true)
            await apiClient.post(`/tickets/${id}/assign`, { assigneeId: user._id })

            toast.success('Ticket assigned to you successfully!')

            // Refresh ticket to get updated assignment
            await fetchTicketDetails()
        } catch (error) {
            console.error('Failed to assign ticket:', error)
            toast.error('Failed to assign ticket')
        } finally {
            setIsAssigningTicket(false)
        }
    }

    const handleTriggerAI = async () => {
        if (!ticket || !id || !user) return

        try {
            setIsTriggeringAI(true)
            await apiClient.post('/agent/triage', { ticketId: id })

            toast.success('AI processing triggered! Refreshing ticket...')

            // Wait a moment for processing, then refresh
            setTimeout(async () => {
                await fetchTicketDetails()
            }, 2000)
        } catch (error) {
            console.error('Failed to trigger AI:', error)
            toast.error('Failed to trigger AI processing')
        } finally {
            setIsTriggeringAI(false)
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
            <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
                <Loading size="lg" text="Loading ticket details..." />
            </div>
        )
    }

    if (error || !ticket) {
        return (
            <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                        <svg
                            className="h-6 w-6 text-red-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                        </svg>
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Ticket Not Found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {error || 'The ticket you are looking for could not be found.'}
                    </p>
                    <div className="mt-6">
                        <Link
                            to="/tickets"
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                            ← Back to Tickets
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        to="/tickets"
                        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
                    >
                        ← Back to Tickets
                    </Link>

                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-bold text-gray-900 truncate">
                                {ticket.title}
                            </h1>
                            <div className="mt-2 flex items-center space-x-4">
                                <span className="text-sm text-gray-500">
                                    Ticket #{ticket._id.slice(-6)}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                    {ticket.status}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                    {ticket.priority} priority
                                </span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {ticket.category}
                                </span>
                            </div>
                        </div>

                        {/* Role-based Action Buttons */}
                        {(user?.role === 'admin' || user?.role === 'agent') && (
                            <div className="flex space-x-3">
                                {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                                    <>
                                        {/* Show "Assign to Me" only if not already assigned to current user */}
                                        {(!ticket.assignee || ticket.assignee._id !== user._id) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleAssignToMe}
                                                disabled={isAssigningTicket}
                                            >
                                                {isAssigningTicket ? 'Assigning...' : 'Assign to Me'}
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleResolveTicket}
                                            disabled={isResolvingTicket}
                                            className="text-green-600 hover:text-green-700"
                                        >
                                            {isResolvingTicket ? 'Resolving...' : 'Resolve Ticket'}
                                        </Button>
                                    </>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleTriggerAI}
                                    disabled={isTriggeringAI}
                                    className="text-blue-600 hover:text-blue-700"
                                >
                                    {isTriggeringAI ? 'Processing...' : '🤖 Trigger AI'}
                                </Button>
                                {user?.role === 'admin' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => console.log('Edit ticket')}
                                    >
                                        Edit
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Ticket Details */}
                <div className="space-y-6">
                    {/* Description */}
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-medium text-gray-900">Description</h3>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-700 whitespace-pre-wrap">
                                {ticket.description}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Ticket Information */}
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-medium text-gray-900">Ticket Information</h3>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                                    <dd className="text-sm text-gray-900">
                                        {new Date(ticket.createdAt).toLocaleString()}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                                    <dd className="text-sm text-gray-900">
                                        {new Date(ticket.updatedAt).toLocaleString()}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Created By</dt>
                                    <dd className="text-sm text-gray-900">
                                        {ticket.createdBy?.name || 'Unknown'} ({ticket.createdBy?.email || 'N/A'})
                                    </dd>
                                </div>
                                {ticket.assignee && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Assigned To</dt>
                                        <dd className="text-sm text-gray-900">
                                            {ticket.assignee.name} ({ticket.assignee.email})
                                        </dd>
                                    </div>
                                )}
                                {ticket.resolvedAt && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Resolved</dt>
                                        <dd className="text-sm text-gray-900">
                                            {new Date(ticket.resolvedAt).toLocaleString()}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </CardContent>
                    </Card>

                    {/* AI Suggestions (if any) */}
                    {agentSuggestion && (
                        <Card>
                            <CardHeader>
                                <h3 className="text-lg font-medium text-gray-900">AI Suggestions</h3>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h4 className="text-sm font-medium text-blue-800">
                                                AI Suggested Response
                                            </h4>
                                            <p className="mt-1 text-sm text-blue-700 whitespace-pre-wrap">
                                                {agentSuggestion.draftReply}
                                            </p>
                                            <div className="mt-2 flex items-center space-x-4 text-xs text-blue-600">
                                                <span>Confidence: {(agentSuggestion.confidence * 100).toFixed(0)}%</span>
                                                <span>Category: {agentSuggestion.predictedCategory}</span>
                                                {agentSuggestion.autoClosed && <span>Auto-closed</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Replies/Activity */}
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-medium text-gray-900">Replies & Activity</h3>
                        </CardHeader>
                        <CardContent>
                            {ticket.replies && ticket.replies.length > 0 ? (
                                <div className="space-y-4">
                                    {ticket.replies.map((reply, index) => (
                                        <div key={reply._id || index} className="border-l-4 border-gray-200 pl-4">
                                            <div className="flex items-start space-x-3">
                                                <div className="flex-shrink-0">
                                                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                                        <span className="text-sm font-medium text-gray-600">
                                                            {reply.author?.name?.charAt(0) || 'U'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {reply.author?.name || 'Unknown'}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(reply.createdAt).toLocaleString()}
                                                        </span>
                                                        {reply.isInternal && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                Internal
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                                                        {reply.content}
                                                    </p>
                                                    {reply.attachments && reply.attachments.length > 0 && (
                                                        <div className="mt-2">
                                                            <p className="text-xs text-gray-500 mb-1">Attachments:</p>
                                                            {reply.attachments.map((attachment, attIndex) => (
                                                                <a
                                                                    key={attIndex}
                                                                    href={attachment.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 mr-3"
                                                                >
                                                                    📎 {attachment.filename || 'Attachment'}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No replies yet.</p>
                            )}

                            {/* Add Reply Form */}
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <form onSubmit={handleAddReply}>
                                    <div>
                                        <label htmlFor="reply" className="block text-sm font-medium text-gray-700">
                                            Add a reply
                                        </label>
                                        <div className="mt-1">
                                            <textarea
                                                id="reply"
                                                name="reply"
                                                rows={3}
                                                value={newReply}
                                                onChange={(e) => setNewReply(e.target.value)}
                                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                placeholder="Enter your reply..."
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-3 flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={!newReply.trim() || isAddingReply}
                                        >
                                            {isAddingReply ? 'Adding...' : 'Add Reply'}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
