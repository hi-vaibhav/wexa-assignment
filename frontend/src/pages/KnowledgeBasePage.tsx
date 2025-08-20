import React, { useEffect, useState } from 'react'
import { Button, Card, CardContent, CardHeader, Loading } from '../components/ui'
import { apiClient } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import type { Article } from '../types'

export const KnowledgeBasePage: React.FC = () => {
    const { user } = useAuthStore()
    const [articles, setArticles] = useState<Article[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreatingArticle, setIsCreatingArticle] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [newArticle, setNewArticle] = useState({
        title: '',
        body: '',
        tags: '',
        category: 'general'
    })

    useEffect(() => {
        fetchArticles()
    }, [])

    const fetchArticles = async () => {
        try {
            setIsLoading(true)
            const response = await apiClient.get<{ articles: Article[] }>('/kb/articles')
            setArticles(response.articles)
        } catch (error) {
            console.error('Failed to fetch articles:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateArticle = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const tagsArray = newArticle.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
            const articleData = {
                ...newArticle,
                tags: tagsArray
            }
            const response = await apiClient.post<{ article: Article }>('/kb/articles', articleData)
            setArticles([response.article, ...articles])
            setNewArticle({ title: '', body: '', tags: '', category: 'general' })
            setIsCreatingArticle(false)
        } catch (error) {
            console.error('Failed to create article:', error)
        }
    }

    const filteredArticles = articles.filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <Loading size="lg" text="Loading knowledge base..." />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Browse and manage helpful articles and resources
                        </p>
                    </div>
                    {(user?.role === 'admin' || user?.role === 'agent') && (
                        <Button onClick={() => setIsCreatingArticle(true)}>
                            Create New Article
                        </Button>
                    )}
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search articles..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Create Article Form */}
                {isCreatingArticle && (
                    <Card className="mb-6">
                        <CardHeader>
                            <h3 className="text-lg font-medium">Create New Article</h3>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateArticle} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newArticle.title}
                                        onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Article title"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Content
                                    </label>
                                    <textarea
                                        required
                                        rows={8}
                                        value={newArticle.body}
                                        onChange={(e) => setNewArticle({ ...newArticle, body: e.target.value })}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Article content"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Category
                                        </label>
                                        <select
                                            value={newArticle.category}
                                            onChange={(e) => setNewArticle({ ...newArticle, category: e.target.value })}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="general">General</option>
                                            <option value="technical">Technical</option>
                                            <option value="billing">Billing</option>
                                            <option value="shipping">Shipping</option>
                                            <option value="troubleshooting">Troubleshooting</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Tags (comma-separated)
                                        </label>
                                        <input
                                            type="text"
                                            value={newArticle.tags}
                                            onChange={(e) => setNewArticle({ ...newArticle, tags: e.target.value })}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="tag1, tag2, tag3"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsCreatingArticle(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit">
                                        Create Article
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Articles List */}
                {filteredArticles.length > 0 ? (
                    <div className="grid gap-6 lg:grid-cols-2">
                        {filteredArticles.map((article) => (
                            <Card key={article._id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <h3 className="text-lg font-medium text-gray-900 line-clamp-2">
                                            {article.title}
                                        </h3>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${article.status === 'published'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {article.status}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                                        {article.body}
                                    </p>

                                    {/* Tags */}
                                    {article.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {article.tags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="flex items-center justify-between text-sm text-gray-500">
                                        <div className="flex items-center space-x-4">
                                            <span>👁 {article.views} views</span>
                                            <span>👍 {article.helpful} helpful</span>
                                        </div>
                                        <span>Updated {new Date(article.updatedAt).toLocaleDateString()}</span>
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
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                {searchTerm ? 'No articles found' : 'No articles yet'}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {searchTerm
                                    ? 'Try adjusting your search terms'
                                    : 'Get started by creating your first knowledge base article.'
                                }
                            </p>
                            {!searchTerm && (user?.role === 'admin' || user?.role === 'agent') && (
                                <div className="mt-6">
                                    <Button onClick={() => setIsCreatingArticle(true)}>
                                        Create your first article
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
