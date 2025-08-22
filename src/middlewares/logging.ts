import { createMiddleware } from 'hono/factory'
import type { Context } from 'hono'
import type { LogEntry, JWTPayload } from '@/types'
import { generateId, getTimeElapsed } from '@/utils/helpers'

// Armazenamento em memória para logs (em produção, use banco de dados)
const logs: LogEntry[] = []

/**
 * Middleware de logging personalizado
 */
export const loggingMiddleware = createMiddleware(async (c: Context, next) => {
  const startTime = new Date()
  const requestId = generateId()
  
  // Adiciona ID da requisição ao contexto
  c.set('requestId', requestId)
  
  try {
    await next()
  } finally {
    const endTime = new Date()
    const duration = getTimeElapsed(startTime, endTime)
    
    const user = c.get('user') as JWTPayload | undefined
    const logEntry = createLogEntry(c, user, startTime, duration)
    
    // Salva o log
    saveLog(logEntry)
    
    // Log no console em desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      console.log(formatLogForConsole(logEntry))
    }
  }
})

/**
 * Cria uma entrada de log
 */
function createLogEntry(
  c: Context,
  user: JWTPayload | undefined,
  timestamp: Date,
  duration: number
): LogEntry {
  return {
    id: generateId(),
    userId: user?.userId,
    action: determineAction(c.req.method, c.req.path),
    resource: extractResource(c.req.path),
    method: c.req.method,
    path: c.req.path,
    statusCode: c.res.status || 200,
    userAgent: c.req.header('User-Agent'),
    ip: getClientIP(c),
    timestamp,
    duration,
    error: c.res.status >= 400 ? getErrorFromResponse(c) : undefined
  }
}

/**
 * Determina a ação baseada no método e caminho
 */
function determineAction(method: string, path: string): string {
  const pathLower = path.toLowerCase()
  
  if (pathLower.includes('/auth/login')) return 'LOGIN'
  if (pathLower.includes('/auth/logout')) return 'LOGOUT'
  if (pathLower.includes('/auth/register')) return 'REGISTER'
  if (pathLower.includes('/auth/forgot-password')) return 'FORGOT_PASSWORD'
  if (pathLower.includes('/auth/reset-password')) return 'RESET_PASSWORD'
  if (pathLower.includes('/auth/refresh')) return 'REFRESH_TOKEN'
  
  switch (method) {
  case 'GET':
    return pathLower.includes('/users/') && pathLower.match(/\/users\/[^/]+$/) 
      ? 'VIEW_USER' 
      : 'VIEW'
  case 'POST':
    return 'CREATE'
  case 'PUT':
  case 'PATCH':
    return 'UPDATE'
  case 'DELETE':
    return 'DELETE'
  default:
    return method
  }
}

/**
 * Extrai o recurso do caminho
 */
function extractResource(path: string): string {
  const segments = path.split('/').filter(Boolean)
  
  if (segments.length === 0) return 'root'
  if (segments[0] === 'api') {
    return segments[1] || 'api'
  }
  
  return segments[0]
}

/**
 * Obtém o IP do cliente
 */
function getClientIP(c: Context): string {
  return c.req.header('X-Forwarded-For')?.split(',')[0].trim() ||
         c.req.header('X-Real-IP') ||
         c.req.header('CF-Connecting-IP') ||
         'unknown'
}

/**
 * Extrai erro da resposta
 */
function getErrorFromResponse(c: Context): string | undefined {
  // Em um cenário real, você pode querer capturar mais detalhes do erro
  return `HTTP ${c.res.status}`
}

/**
 * Salva o log (em produção, salvar no banco de dados)
 */
function saveLog(logEntry: LogEntry): void {
  logs.push(logEntry)
  
  // Limita o número de logs em memória
  if (logs.length > 1000) {
    logs.splice(0, logs.length - 1000)
  }
  
  // Em produção, você salvaria no banco de dados:
  // await logRepository.create(logEntry)
}

/**
 * Formata log para exibição no console
 */
function formatLogForConsole(logEntry: LogEntry): string {
  const { method, path, statusCode, duration, userId, ip } = logEntry
  const userInfo = userId ? ` [User: ${userId}]` : ''
  const statusColor = getStatusColor(statusCode)
  
  return `${statusColor}${method} ${path} ${statusCode}\x1b[0m ${duration}ms [${ip}]${userInfo}`
}

/**
 * Obtém cor para o status code
 */
function getStatusColor(statusCode: number): string {
  if (statusCode >= 500) return '\x1b[31m' // Vermelho
  if (statusCode >= 400) return '\x1b[33m' // Amarelo
  if (statusCode >= 300) return '\x1b[36m' // Ciano
  if (statusCode >= 200) return '\x1b[32m' // Verde
  return '\x1b[0m' // Reset
}

/**
 * Middleware para log de ações específicas
 */
export const logAction = (action: string, resource: string) => {
  return createMiddleware(async (c: Context, next) => {
    const user = c.get('user') as JWTPayload | undefined
    
    const logEntry: LogEntry = {
      id: generateId(),
      userId: user?.userId,
      action,
      resource,
      method: c.req.method,
      path: c.req.path,
      statusCode: 200,
      userAgent: c.req.header('User-Agent'),
      ip: getClientIP(c),
      timestamp: new Date(),
      duration: 0
    }
    
    saveLog(logEntry)
    await next()
  })
}

/**
 * Obtém logs filtrados
 */
export const getLogs = (filters: {
  userId?: string
  action?: string
  resource?: string
  startDate?: Date
  endDate?: Date
  limit?: number
} = {}): LogEntry[] => {
  let filteredLogs = [...logs]
  
  if (filters.userId) {
    filteredLogs = filteredLogs.filter(log => log.userId === filters.userId)
  }
  
  if (filters.action) {
    filteredLogs = filteredLogs.filter(log => log.action === filters.action)
  }
  
  if (filters.resource) {
    filteredLogs = filteredLogs.filter(log => log.resource === filters.resource)
  }
  
  if (filters.startDate) {
    filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!)
  }
  
  if (filters.endDate) {
    filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!)
  }
  
  // Ordena por timestamp decrescente
  filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  
  if (filters.limit) {
    filteredLogs = filteredLogs.slice(0, filters.limit)
  }
  
  return filteredLogs
}

/**
 * Limpa logs antigos
 */
export const clearOldLogs = (daysToKeep: number = 30): number => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
  
  const initialLength = logs.length
  const filteredLogs = logs.filter(log => log.timestamp >= cutoffDate)
  
  logs.length = 0
  logs.push(...filteredLogs)
  
  return initialLength - logs.length
}