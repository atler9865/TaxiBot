import axios from 'axios'
import type {
  LoginRequest,
  LoginResponse,
  Operator,
  Request,
  RequestDetail,
  Message,
  UnassignedCountDto,
  TelegramUser,
} from '@/types'

const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const login = (data: LoginRequest) =>
  api.post<LoginResponse>('/auth/login', data).then((r) => r.data)

// Requests
export const getRequests = (status?: string) =>
  api.get<Request[]>('/requests', { params: { status } }).then((r) => r.data)

export const getRequest = (id: number) =>
  api.get<RequestDetail>(`/requests/${id}`).then((r) => r.data)

export const assignRequest = (id: number) =>
  api.post<Request>(`/requests/${id}/assign`).then((r) => r.data)

export const completeRequest = (id: number) =>
  api.post<Request>(`/requests/${id}/complete`).then((r) => r.data)

export const sendMessage = (id: number, text: string) =>
  api.post<Message>(`/requests/${id}/messages`, { text }).then((r) => r.data)

export const getUnassignedCount = () =>
  api.get<UnassignedCountDto>('/requests/unassigned-count').then((r) => r.data)

// Operators
export const getOperators = () =>
  api.get<Operator[]>('/operators').then((r) => r.data)

export const createOperator = (data: {
  login: string
  password: string
  firstName: string
  lastName: string
  role: string
}) => api.post<Operator>('/operators', data).then((r) => r.data)

// Drivers
export const getDrivers = () =>
  api.get<TelegramUser[]>('/drivers').then((r) => r.data)

export default api
