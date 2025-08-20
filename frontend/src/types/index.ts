export interface User {
    _id: string
    name: string
    email: string
    role: 'admin' | 'agent' | 'user'
    isActive: boolean
    createdAt: string
    updatedAt: string
}

// Authentication types
export interface LoginRequest {
    email: string
    password: string
}

export interface RegisterRequest {
    email: string
    password: string
    name: string
    role?: 'admin' | 'agent' | 'user'
}

export interface AuthResponse {
    user: User
    token: string
}

export interface Article {
    _id: string
    title: string
    body: string
    tags: string[]
    status: 'draft' | 'published'
    author: User
    views: number
    helpful: number
    notHelpful: number
    createdAt: string
    updatedAt: string
}

export interface Reply {
    _id: string
    author: User
    content: string
    isInternal: boolean
    attachments: Attachment[]
    createdAt: string
}

export interface Attachment {
    url: string
    filename?: string
    contentType?: string
}

export interface Ticket {
    _id: string
    title: string
    description: string
    category: 'billing' | 'tech' | 'shipping' | 'other'
    status: 'open' | 'triaged' | 'waiting_human' | 'resolved' | 'closed'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    createdBy: User
    assignee?: User
    agentSuggestionId?: string
    replies: Reply[]
    attachments: Attachment[]
    tags: string[]
    slaBreached: boolean
    slaDeadline?: string
    resolvedAt?: string
    closedAt?: string
    createdAt: string
    updatedAt: string
}

export interface AgentSuggestion {
    _id: string
    ticketId: string
    traceId: string
    predictedCategory: 'billing' | 'tech' | 'shipping' | 'other'
    articleIds: Article[]
    draftReply: string
    confidence: number
    autoClosed: boolean
    modelInfo: {
        provider: string
        model: string
        promptVersion: string
        latencyMs: number
    }
    accepted?: boolean
    acceptedBy?: User
    acceptedAt?: string
    createdAt: string
}

export interface AuditLog {
    _id: string
    ticketId: string
    traceId: string
    actor: 'system' | 'agent' | 'user'
    actorId?: string
    action: string
    meta: Record<string, any>
    timestamp: string
}

export interface Config {
    _id: string
    autoCloseEnabled: boolean
    confidenceThreshold: number
    slaHours: number
    maxTicketsPerUser: number
    categoryThresholds: {
        billing: number
        tech: number
        shipping: number
        other: number
    }
    agentSettings: {
        maxRetries: number
        timeoutMs: number
        enableFallback: boolean
    }
    createdAt: string
    updatedAt: string
}

export interface Pagination {
    page: number
    limit: number
    total: number
    pages: number
}

export interface ApiResponse<T> {
    data?: T
    error?: string
    message?: string
    pagination?: Pagination
}

export interface TicketFilters {
    status?: Ticket['status']
    category?: Ticket['category']
    assignee?: string
    createdBy?: string
    my?: boolean
    search?: string
    page?: number
    limit?: number
    sort?: string
}

export interface ArticleFilters {
    status?: Article['status']
    tags?: string
    search?: string
    page?: number
    limit?: number
    sort?: string
}

export interface AuthState {
    user: User | null
    token: string | null
    isAuthenticated: boolean
    isLoading: boolean
}

export interface CreateTicketData {
    title: string
    description: string
    category?: Ticket['category']
    attachments?: Attachment[]
}

export interface CreateArticleData {
    title: string
    body: string
    tags?: string[]
    status?: Article['status']
}

export interface UpdateConfigData {
    autoCloseEnabled?: boolean
    confidenceThreshold?: number
    slaHours?: number
    categoryThresholds?: Partial<Config['categoryThresholds']>
}

export interface AgentStats {
    timeframe: string
    period: {
        start: string
        end: string
    }
    suggestions: {
        total: number
        accepted: number
        acceptanceRate: number
        autoClosed: number
        autoCloseRate: number
    }
    confidence: {
        average: number
    }
    tickets: {
        triaged: number
    }
    performance: {
        avgResponseTimeHours: number
    }
}
