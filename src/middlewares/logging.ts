import { createMiddleware } from 'hono/factory'
import type { Context } from 'hono'
import type { LogEntry, JWTPayload } from '@/types'
import { generateId, getTimeElapsed } from '@/utils/helpers'
import { logService } from '@/services/logService'

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
    
    // Salva o log usando o serviço estruturado
    await logService.log({
      userId: logEntry.userId,
      action: logEntry.action,
      resource: logEntry.resource,
      method: logEntry.method,
      path: logEntry.path,
      statusCode: logEntry.statusCode,
      userAgent: logEntry.userAgent,
      ip: logEntry.ip,
      duration: logEntry.duration,
      error: logEntry.error,
      level: logEntry.statusCode >= 500 ? 'error' : logEntry.statusCode >= 400 ? 'warn' : 'info'
    })
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
 * Middleware para log de ações específicas
 */
export const logAction = (action: string, resource: string) => {
  return createMiddleware(async (c: Context, next) => {
    const user = c.get('user') as JWTPayload | undefined
    
    await logService.log({
      userId: user?.userId,
      action,
      resource,
      method: c.req.method,
      path: c.req.path,
      statusCode: 200,
      userAgent: c.req.header('User-Agent'),
      ip: getClientIP(c),
      duration: 0,
      level: 'info'
    })
    
    await next()
  })
}

/**
 * Obtém logs filtrados (wrapper para o serviço de logs)
 */
export const getLogs = async (filters: {
  userId?: string
  action?: string
  resource?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
} = {}) => {
  return await logService.getLogs(filters)
}

/**
 * Limpa logs antigos (wrapper para o serviço de logs)
 */
export const clearOldLogs = async (daysToKeep: number = 30): Promise<number> => {
  return await logService.cleanupOldLogs(daysToKeep)
}

/**
 * Obtém estatísticas de logs (wrapper para o serviço de logs)
 */
export const getLogStats = async (filters: {
  startDate?: Date
  endDate?: Date
} = {}) => {
  return await logService.getStats(filters)
}