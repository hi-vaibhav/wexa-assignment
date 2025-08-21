import React, { useEffect, useState } from 'react'
import { Button, Card, CardContent, CardHeader, Loading } from '../components/ui'
import { apiClient } from '../lib/api'

interface SystemConfig {
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
}

export const SettingsPage: React.FC = () => {
    const [config, setConfig] = useState<SystemConfig | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        fetchConfig()
    }, [])

    const fetchConfig = async () => {
        try {
            setIsLoading(true)
            const response = await apiClient.get<SystemConfig>('/admin/config')
            setConfig(response)
        } catch (error) {
            console.error('Failed to fetch config:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveConfig = async () => {
        if (!config) return

        try {
            setIsSaving(true)
            await apiClient.put('/admin/config', config)
            // Show success message
        } catch (error) {
            console.error('Failed to save config:', error)
        } finally {
            setIsSaving(false)
        }
    }

    const updateConfig = (path: string, value: any) => {
        if (!config) return

        const keys = path.split('.')
        const updatedConfig = { ...config }
        let current: any = updatedConfig

        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]]
        }
        current[keys[keys.length - 1]] = value

        setConfig(updatedConfig)
    }

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <Loading size="lg" text="Loading settings..." />
            </div>
        )
    }

    if (!config) {
        return (
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900">Unable to load settings</h3>
                    <p className="text-sm text-gray-500">Please try again later.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Configure your helpdesk system behavior
                        </p>
                    </div>
                    <Button
                        onClick={handleSaveConfig}
                        disabled={isSaving}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </div>

                <div className="space-y-6">
                    {/* AI Agent Settings */}
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-medium text-gray-900">AI Agent Configuration</h3>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Auto-close Tickets</label>
                                        <p className="text-sm text-gray-500">Allow AI to automatically close tickets when confident</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={config.autoCloseEnabled}
                                            onChange={(e) => updateConfig('autoCloseEnabled', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Confidence Threshold</label>
                                    <p className="text-sm text-gray-500 mb-2">Minimum confidence required for auto-closing (0-1)</p>
                                    <input
                                        type="number"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={config.confidenceThreshold}
                                        onChange={(e) => updateConfig('confidenceThreshold', parseFloat(e.target.value))}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* SLA Settings */}
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-medium text-gray-900">SLA Configuration</h3>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">SLA Hours</label>
                                    <p className="text-sm text-gray-500 mb-2">Hours before a ticket breaches SLA</p>
                                    <input
                                        type="number"
                                        min="1"
                                        value={config.slaHours}
                                        onChange={(e) => updateConfig('slaHours', parseInt(e.target.value))}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Max Tickets Per User</label>
                                    <p className="text-sm text-gray-500 mb-2">Maximum open tickets allowed per user</p>
                                    <input
                                        type="number"
                                        min="1"
                                        value={config.maxTicketsPerUser}
                                        onChange={(e) => updateConfig('maxTicketsPerUser', parseInt(e.target.value))}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Category Thresholds */}
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-medium text-gray-900">Category Classification Thresholds</h3>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Billing</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={config.categoryThresholds.billing}
                                        onChange={(e) => updateConfig('categoryThresholds.billing', parseFloat(e.target.value))}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Technical</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={config.categoryThresholds.tech}
                                        onChange={(e) => updateConfig('categoryThresholds.tech', parseFloat(e.target.value))}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Shipping</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={config.categoryThresholds.shipping}
                                        onChange={(e) => updateConfig('categoryThresholds.shipping', parseFloat(e.target.value))}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Other</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={config.categoryThresholds.other}
                                        onChange={(e) => updateConfig('categoryThresholds.other', parseFloat(e.target.value))}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Agent Settings */}
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-medium text-gray-900">Agent System Settings</h3>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Max Retries</label>
                                    <p className="text-sm text-gray-500 mb-2">Maximum retry attempts for failed AI operations</p>
                                    <input
                                        type="number"
                                        min="0"
                                        value={config.agentSettings.maxRetries}
                                        onChange={(e) => updateConfig('agentSettings.maxRetries', parseInt(e.target.value))}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Timeout (ms)</label>
                                    <p className="text-sm text-gray-500 mb-2">Timeout for AI operations in milliseconds</p>
                                    <input
                                        type="number"
                                        min="1000"
                                        value={config.agentSettings.timeoutMs}
                                        onChange={(e) => updateConfig('agentSettings.timeoutMs', parseInt(e.target.value))}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Enable Fallback</label>
                                        <p className="text-sm text-gray-500">Use fallback responses when AI fails</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={config.agentSettings.enableFallback}
                                            onChange={(e) => updateConfig('agentSettings.enableFallback', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
