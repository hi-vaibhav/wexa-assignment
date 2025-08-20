import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, CardContent, Input } from '../components/ui'
import { useAuthStore } from '../stores/authStore'
import type { RegisterRequest } from '../types'

export const RegisterPage: React.FC = () => {
    const navigate = useNavigate()
    const { register, isLoading } = useAuthStore()

    const [formData, setFormData] = useState<RegisterRequest>({
        name: '',
        email: '',
        password: '',
        role: 'user',
    })

    const [confirmPassword, setConfirmPassword] = useState('')
    const [errors, setErrors] = useState<Partial<RegisterRequest & { confirmPassword: string }>>({})

    const validateForm = (): boolean => {
        const newErrors: Partial<RegisterRequest & { confirmPassword: string }> = {}

        if (!formData.name) {
            newErrors.name = 'Name is required'
        } else if (formData.name.length < 2) {
            newErrors.name = 'Name must be at least 2 characters'
        }

        if (!formData.email) {
            newErrors.email = 'Email is required'
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email'
        }

        if (!formData.password) {
            newErrors.password = 'Password is required'
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters'
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password'
        } else if (formData.password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match'
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
            await register(formData)
            toast.success('Account created successfully!')
            navigate('/dashboard')
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Registration failed')
        }
    }

    const handleChange = (field: keyof RegisterRequest | 'confirmPassword') => (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        if (field === 'confirmPassword') {
            setConfirmPassword(e.target.value)
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: e.target.value
            }))
        }

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
                        Create your account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Or{' '}
                        <Link
                            to="/login"
                            className="font-medium text-blue-600 hover:text-blue-500"
                        >
                            sign in to your existing account
                        </Link>
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <Card>
                    <CardContent>
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <Input
                                label="Full name"
                                type="text"
                                autoComplete="name"
                                value={formData.name}
                                onChange={handleChange('name')}
                                error={errors.name}
                                placeholder="Enter your full name"
                            />

                            <Input
                                label="Email address"
                                type="email"
                                autoComplete="email"
                                value={formData.email}
                                onChange={handleChange('email')}
                                error={errors.email}
                                placeholder="Enter your email"
                            />

                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">
                                    Role
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={handleChange('role')}
                                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="user">User</option>
                                    <option value="agent">Agent</option>
                                    <option value="admin">Admin</option>
                                </select>
                                {errors.role && (
                                    <p className="text-sm text-red-600">{errors.role}</p>
                                )}
                            </div>

                            <Input
                                label="Password"
                                type="password"
                                autoComplete="new-password"
                                value={formData.password}
                                onChange={handleChange('password')}
                                error={errors.password}
                                placeholder="Create a password"
                                helperText="Must be at least 8 characters with uppercase, lowercase, and number"
                            />

                            <Input
                                label="Confirm password"
                                type="password"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={handleChange('confirmPassword')}
                                error={errors.confirmPassword}
                                placeholder="Confirm your password"
                            />

                            <Button
                                type="submit"
                                className="w-full"
                                isLoading={isLoading}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Creating account...' : 'Create account'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
