// Tipos para usuário
export interface User {
  id: string
  email: string
  password: string
  name: string
  role: UserRole
  isActive: boolean
  emailVerified: boolean
  failedLoginAttempts?: number
  lockedUntil?: Date
  settings?: any
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
}

// Níveis de usuário
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator'
}

// Payload do JWT
export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  iat?: number
  exp?: number
}

// Dados para criação de usuário
export interface CreateUserData {
  email: string
  password: string
  name: string
  role?: UserRole
}

// Dados para login
export interface LoginData {
  email: string
  password: string
}

// Dados para atualização de usuário
export interface UpdateUserData {
  name?: string
  email?: string
  password?: string
  role?: UserRole
  isActive?: boolean
}

// Resposta de autenticação
export interface AuthResponse {
  user: Omit<User, 'password'>
  token: string
  refreshToken?: string
}

// Contexto customizado do Hono
export interface CustomContext {
  user?: JWTPayload
}

// Tipos para logs
export interface LogEntry {
  id: string
  userId?: string
  action: string
  resource: string
  method: string
  path: string
  statusCode: number
  userAgent?: string
  ip: string
  timestamp: Date
  duration?: number
  error?: string
  level?: string // error, warn, info, debug
  metadata?: any // dados adicionais em formato JSON
  user?: {
    id: string
    name: string
    email: string
  }
}

// Níveis de log
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Filtros para busca de logs
export interface LogFilters {
  userId?: string
  action?: string
  resource?: string
  level?: LogLevel
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

// Estatísticas de logs
export interface LogStats {
  total: number
  byLevel: Record<string, number>
  byAction: Record<string, number>
  byResource: Record<string, number>
  errorRate: number
}

// Tipos para validação
export interface ValidationError {
  field: string
  message: string
}

// Resposta padrão da API
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  errors?: ValidationError[]
  timestamp: string
}

// Configurações de rate limiting
export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  message: string
}

// Filtros para busca de usuários
export interface UserFilters {
  role?: UserRole
  isActive?: boolean
  emailVerified?: boolean
  search?: string
  page?: number
  limit?: number
}

// Dados para recuperação de senha
export interface ForgotPasswordData {
  email: string
}

// Dados para reset de senha
export interface ResetPasswordData {
  token: string
  newPassword: string
}

// Token de reset de senha
export interface PasswordResetToken {
  id: string
  userId: string
  token: string
  expiresAt: Date
  used: boolean
  createdAt: Date
}