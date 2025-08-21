import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { Button, Card, CardContent, CardHeader } from '../components/ui'
import { apiClient } from '../lib/api'
import { useAuthStore } from '../stores/authStore'

export const AITestPage: React.FC = () => {
    const { user } = useAuthStore()
    const [isCreating, setIsCreating] = useState(false)
    const [aiResult, setAiResult] = useState<any>(null)

    const createTestTicket = async () => {
        if (!user) return

        try {
            setIsCreating(true)
            setAiResult(null)

            // Create a test ticket that should trigger AI processing
            const testTicket = {
                title: "Password reset email not received",
                description: "I requested a password reset 30 minutes ago but haven't received the email yet. I checked my spam folder too. My email is working fine for other messages. Can you help me reset my password?",
                category: "Account Issues",
                priority: "medium"
            }

            console.log('Creating test ticket...')
            const ticket: any = await apiClient.post('/tickets', testTicket)

            toast.success('Test ticket created! AI processing should start automatically...')

            // Wait for AI processing and check for results
            setTimeout(async () => {
                try {
                    console.log('Checking for AI suggestion...')
                    const ticketDetails: any = await apiClient.get(`/tickets/${ticket._id}`)

                    if (ticketDetails.agentSuggestionId) {
                        const suggestion: any = await apiClient.get(`/agent/suggestion/${ticket._id}`)
                        setAiResult({
                            ticket: ticketDetails,
                            suggestion: suggestion.suggestion
                        })
                        toast.success('AI processing completed! Check the results below.')
                    } else {
                        toast('AI is still processing... This may take a moment.')
                        // Try again in a few seconds
                        setTimeout(async () => {
                            const updatedTicket: any = await apiClient.get(`/tickets/${ticket._id}`)
                            if (updatedTicket.agentSuggestionId) {
                                const suggestion: any = await apiClient.get(`/agent/suggestion/${ticket._id}`)
                                setAiResult({
                                    ticket: updatedTicket,
                                    suggestion: suggestion.suggestion
                                })
                                toast.success('AI processing completed!')
                            }
                        }, 3000)
                    }
                } catch (error) {
                    console.error('Error checking AI result:', error)
                    toast.error('Could not fetch AI results')
                }
            }, 2000)

        } catch (error) {
            console.error('Failed to create test ticket:', error)
            toast.error('Failed to create test ticket')
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">🤖 AI Agent Demo</h1>
                    <p className="mt-2 text-gray-600">
                        Test the automatic AI reply functionality by creating a sample ticket.
                    </p>
                </div>

                <Card className="mb-6">
                    <CardHeader>
                        <h2 className="text-xl font-semibold">How the AI Agent Works</h2>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">1</span>
                                <div>
                                    <h3 className="font-medium">Ticket Creation</h3>
                                    <p className="text-sm text-gray-600">When a new ticket is created, it's automatically queued for AI processing</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">2</span>
                                <div>
                                    <h3 className="font-medium">AI Classification</h3>
                                    <p className="text-sm text-gray-600">The AI analyzes the ticket content and predicts the best category</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">3</span>
                                <div>
                                    <h3 className="font-medium">Knowledge Retrieval</h3>
                                    <p className="text-sm text-gray-600">Relevant knowledge base articles are found to help answer the question</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">4</span>
                                <div>
                                    <h3 className="font-medium">Draft Reply</h3>
                                    <p className="text-sm text-gray-600">The AI generates a helpful response based on the knowledge base</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">5</span>
                                <div>
                                    <h3 className="font-medium">Decision Making</h3>
                                    <p className="text-sm text-gray-600">If confidence is high enough, the AI auto-replies and resolves the ticket</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="mb-6">
                    <CardHeader>
                        <h2 className="text-xl font-semibold">Test AI Processing</h2>
                        <p className="text-sm text-gray-600">Click the button below to create a test ticket and see the AI in action</p>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={createTestTicket}
                            disabled={isCreating}
                            className="w-full"
                        >
                            {isCreating ? 'Creating Test Ticket & Processing...' : '🤖 Create Test Ticket'}
                        </Button>
                    </CardContent>
                </Card>

                {aiResult && (
                    <Card>
                        <CardHeader>
                            <h2 className="text-xl font-semibold text-green-600">✅ AI Processing Results</h2>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* Ticket Information */}
                                <div>
                                    <h3 className="font-medium mb-2">Created Ticket</h3>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="font-medium">{aiResult.ticket.title}</p>
                                        <p className="text-sm text-gray-600 mt-1">{aiResult.ticket.description}</p>
                                        <div className="flex items-center space-x-4 mt-3 text-xs">
                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                {aiResult.ticket.status}
                                            </span>
                                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                                {aiResult.ticket.category}
                                            </span>
                                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                                {aiResult.ticket.priority}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Suggestion */}
                                <div>
                                    <h3 className="font-medium mb-2">AI Generated Response</h3>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <span className="text-sm">🤖</span>
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium text-blue-900 mb-2">AI Assistant</h4>
                                                <p className="text-blue-800 whitespace-pre-wrap">{aiResult.suggestion.draftReply}</p>
                                                <div className="flex items-center space-x-4 mt-3 text-xs text-blue-600">
                                                    <span>Confidence: {(aiResult.suggestion.confidence * 100).toFixed(0)}%</span>
                                                    <span>Predicted Category: {aiResult.suggestion.predictedCategory}</span>
                                                    {aiResult.suggestion.autoClosed && (
                                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                                            Auto-Resolved
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* View Ticket Link */}
                                <div className="pt-4 border-t">
                                    <a
                                        href={`/tickets/${aiResult.ticket._id}`}
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                                    >
                                        View Full Ticket Details →
                                    </a>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
