import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, CardContent, Input } from '../components/ui'
import { useAuthStore } from '../stores/authStore'
import type { LoginRequest } from '../types'

export const LoginPage: React.FC = () => {
    const navigate = useNavigate()
    const { login, isLoading } = useAuthStore()

    const [formData, setFormData] = useState<LoginRequest>({
        email: '',
        password: '',
    })

    const [errors, setErrors] = useState<Partial<LoginRequest>>({})

    const validateForm = (): boolean => {
        const newErrors: Partial<LoginRequest> = {}

        if (!formData.email) {
            newErrors.email = 'Email is required'
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email'
        }

        if (!formData.password) {
            newErrors.password = 'Password is required'
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        try {
            await login(formData)
            toast.success('Welcome back!')
            navigate('/dashboard')
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Login failed')
        }
    }

    const handleChange = (field: keyof LoginRequest) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setFormData(prev => ({
            ...prev,
            [field]: e.target.value
        }))

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: undefined
            }))
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Smart Helpdesk</h1>
                    <h2 className="mt-6 text-2xl font-semibold text-gray-900">
                        Sign in to your account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Or{' '}
                        <Link
                            to="/register"
                            className="font-medium text-blue-600 hover:text-blue-500"
                        >
                            create a new account
                        </Link>
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <Card>
                    <CardContent>
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <Input
                                label="Email address"
                                type="email"
                                autoComplete="email"
                                value={formData.email}
                                onChange={handleChange('email')}
                                error={errors.email}
                                placeholder="Enter your email"
                            />

                            <Input
                                label="Password"
                                type="password"
                                autoComplete="current-password"
                                value={formData.password}
                                onChange={handleChange('password')}
                                error={errors.password}
                                placeholder="Enter your password"
                            />

                            <Button
                                type="submit"
                                className="w-full"
                                isLoading={isLoading}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Signing in...' : 'Sign in'}
                            </Button>
                        </form>

                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">Demo Accounts</span>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFormData({ email: 'admin@example.com', password: 'Password123' })}
                                >
                                    Admin Demo
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFormData({ email: 'agent@example.com', password: 'Password123' })}
                                >
                                    Agent Demo
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFormData({ email: 'user@example.com', password: 'Password123' })}
                                >
                                    User Demo
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
