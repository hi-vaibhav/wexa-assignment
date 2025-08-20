import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '../lib/api'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types'

interface AuthState {
    user: User | null
    token: string | null
    isLoading: boolean
    isAuthenticated: boolean

    // Actions
    login: (credentials: LoginRequest) => Promise<void>
    register: (userData: RegisterRequest) => Promise<void>
    logout: () => void
    setUser: (user: User) => void
    clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isLoading: false,
            isAuthenticated: false,

            login: async (credentials: LoginRequest) => {
                set({ isLoading: true })
                try {
                    const response = await apiClient.post<AuthResponse>('/auth/login', credentials)
                    const { user, token } = response

                    set({
                        user,
                        token,
                        isAuthenticated: true,
                        isLoading: false,
                    })

                    // Set token in API client
                    apiClient.setAuthToken(token)

                    // Store in localStorage
                    localStorage.setItem('token', token)
                    localStorage.setItem('user', JSON.stringify(user))
                } catch (error) {
                    set({ isLoading: false })
                    throw error
                }
            },

            register: async (userData: RegisterRequest) => {
                set({ isLoading: true })
                try {
                    const response = await apiClient.post<AuthResponse>('/auth/register', userData)
                    const { user, token } = response

                    set({
                        user,
                        token,
                        isAuthenticated: true,
                        isLoading: false,
                    })

                    // Set token in API client
                    apiClient.setAuthToken(token)

                    // Store in localStorage
                    localStorage.setItem('token', token)
                    localStorage.setItem('user', JSON.stringify(user))
                } catch (error) {
                    set({ isLoading: false })
                    throw error
                }
            },

            logout: () => {
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    isLoading: false,
                })

                // Clear from localStorage
                localStorage.removeItem('token')
                localStorage.removeItem('user')

                // Clear from API client
                apiClient.clearAuthToken()
            },

            setUser: (user: User) => {
                set({ user })
                localStorage.setItem('user', JSON.stringify(user))
            },

            clearAuth: () => {
                get().logout()
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
            }),
            onRehydrateStorage: () => (state) => {
                if (state?.token) {
                    apiClient.setAuthToken(state.token)
                }
            },
        }
    )
)
