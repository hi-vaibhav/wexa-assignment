import React, { useEffect, useState } from 'react'
import { Button, Card, CardContent, Loading } from '../components/ui'
import { apiClient } from '../lib/api'
import type { User } from '../types'

export const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreatingUser, setIsCreatingUser] = useState(false)
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        role: 'user' as 'admin' | 'agent' | 'user',
        password: ''
    })

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            setIsLoading(true)
            const response = await apiClient.get<{ users: User[] }>('/admin/users')
            setUsers(response.users)
        } catch (error) {
            console.error('Failed to fetch users:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const response = await apiClient.post<{ user: User }>('/admin/users', newUser)
            setUsers([...users, response.user])
            setNewUser({ name: '', email: '', role: 'user', password: '' })
            setIsCreatingUser(false)
        } catch (error) {
            console.error('Failed to create user:', error)
        }
    }

    const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
        try {
            await apiClient.patch(`/admin/users/${userId}`, { isActive: !isActive })
            setUsers(users.map(user =>
                user._id === userId ? { ...user, isActive: !isActive } : user
            ))
        } catch (error) {
            console.error('Failed to update user status:', error)
        }
    }

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin':
                return 'bg-purple-100 text-purple-800'
            case 'agent':
                return 'bg-blue-100 text-blue-800'
            case 'user':
                return 'bg-green-100 text-green-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <Loading size="lg" text="Loading users..." />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Manage system users and their roles
                        </p>
                    </div>
                    <Button onClick={() => setIsCreatingUser(true)} className="bg-purple-600 hover:bg-purple-700">
                        Add New User
                    </Button>
                </div>

                {/* Create User Modal */}
                {isCreatingUser && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                            <div className="mt-3">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New User</h3>
                                <form onSubmit={handleCreateUser} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Name</label>
                                        <input
                                            type="text"
                                            value={newUser.name}
                                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email</label>
                                        <input
                                            type="email"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Role</label>
                                        <select
                                            value={newUser.role}
                                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'agent' | 'user' })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        >
                                            <option value="user">User</option>
                                            <option value="agent">Agent</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Password</label>
                                        <input
                                            type="password"
                                            value={newUser.password}
                                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                            required
                                        />
                                    </div>
                                    <div className="flex space-x-3 pt-4">
                                        <Button type="submit" className="flex-1">
                                            Create User
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsCreatingUser(false)}
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users List */}
                <div className="space-y-4">
                    <div className="grid gap-6">
                        {users.map((user) => (
                            <Card key={user._id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex-shrink-0">
                                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <span className="text-sm font-medium text-gray-600">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
                                                <p className="text-sm text-gray-500">{user.email}</p>
                                                <div className="mt-1 flex items-center space-x-2">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                                                        {user.role}
                                                    </span>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {user.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleToggleUserStatus(user._id, user.isActive)}
                                                className={user.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                                            >
                                                {user.isActive ? 'Deactivate' : 'Activate'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => console.log('Edit user:', user._id)}
                                            >
                                                Edit
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="mt-4 text-sm text-gray-500">
                                        <p>Created: {new Date(user.createdAt).toLocaleDateString()}</p>
                                        <p>Last Updated: {new Date(user.updatedAt).toLocaleDateString()}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {users.length === 0 && (
                    <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by creating a new user.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
