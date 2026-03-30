export type OperatorRole = 'Operator' | 'Administrator'

export interface Operator {
  id: number
  login: string
  firstName: string
  lastName: string
  isAvailable: boolean
  role: OperatorRole
}

export type RequestStatus = 'New' | 'InProgress' | 'Completed'

export interface Request {
  id: number
  problemType: string
  problemTypeLabel: string
  initialMessage: string
  status: RequestStatus
  createdAt: string
  assignedAt?: string
  completedAt?: string
  assignedOperatorId?: number
  assignedOperatorName?: string
  userFirstName: string
  userLastName: string
  userUsername?: string
}

export interface RequestDetail extends Request {
  messages: Message[]
}

export interface Message {
  id: number
  requestId: number
  text: string
  sentAt: string
  isFromOperator: boolean
  senderName?: string
}

export interface Notification {
  id: string
  type: 'info' | 'success' | 'error'
  message: string
}

export interface LoginRequest {
  login: string
  password: string
}

export interface LoginResponse {
  token: string
  operator: Operator
}

export interface UnassignedCountDto {
  count: number
}

export interface TelegramUser {
  id: number
  chatId: number
  firstName: string
  lastName: string
  username?: string
  language: string
  isRegistered: boolean
  registeredAt: string
  requestsCount: number
}
