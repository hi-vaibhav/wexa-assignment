import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import toast from 'react-hot-toast'

class ApiClient {
    private client: AxiosInstance

    constructor() {
        this.client = axios.create({
            baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        })

        this.setupInterceptors()
    }

    private setupInterceptors() {
        // Request interceptor to add auth token
        this.client.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                const token = localStorage.getItem('token')
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`
                }
                return config
            },
            (error: any) => {
                return Promise.reject(error)
            }
        )

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            (response: AxiosResponse) => {
                return response
            },
            (error: any) => {
                // Handle different error types
                if (error.response?.status === 401) {
                    // Unauthorized - clear token and redirect to login
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    window.location.href = '/login'
                    return Promise.reject(error)
                }

                if (error.response?.status === 403) {
                    toast.error('You do not have permission to perform this action')
                } else if (error.response?.status === 404) {
                    toast.error('Resource not found')
                } else if (error.response?.status >= 500) {
                    toast.error('Server error. Please try again later.')
                } else if (!error.response) {
                    toast.error('Network error. Please check your connection.')
                }

                return Promise.reject(error)
            }
        )
    }

    // Generic request methods
    public async get<T>(url: string, params?: any): Promise<T> {
        const response = await this.client.get(url, { params })
        return response.data
    }

    public async post<T>(url: string, data?: any): Promise<T> {
        const response = await this.client.post(url, data)
        return response.data
    }

    public async put<T>(url: string, data?: any): Promise<T> {
        const response = await this.client.put(url, data)
        return response.data
    }

    public async patch<T>(url: string, data?: any): Promise<T> {
        const response = await this.client.patch(url, data)
        return response.data
    }

    public async delete<T>(url: string): Promise<T> {
        const response = await this.client.delete(url)
        return response.data
    }

    // Set auth token
    public setAuthToken(token: string) {
        this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }

    // Clear auth token
    public clearAuthToken() {
        delete this.client.defaults.headers.common['Authorization']
    }
}

export const apiClient = new ApiClient()

// Error types for better error handling
export class ApiError extends Error {
    public status: number
    public data: any

    constructor(message: string, status: number, data?: any) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.data = data
    }
}

// Utility function to handle API errors
export const handleApiError = (error: any): ApiError => {
    if (error.response) {
        return new ApiError(
            error.response.data?.error || error.response.statusText,
            error.response.status,
            error.response.data
        )
    } else if (error.request) {
        return new ApiError('Network error', 0)
    } else {
        return new ApiError(error.message, 0)
    }
}
