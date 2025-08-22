import { createMiddleware } from 'hono/factory'
import type { Context } from 'hono'
import { errorResponse } from '@/utils/helpers'
import type { RateLimitConfig } from '@/types'

// Armazenamento em memória para rate limiting (em produção, use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

/**
 * Configurações padrão de rate limiting
 */
const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 10000, // 100 requisições por janela
  message: 'Muitas tentativas. Tente novamente mais tarde.'
}

/**
 * Cria um middleware de rate limiting
 */
export const createRateLimiter = (config: Partial<RateLimitConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config }

  return createMiddleware(async (c: Context, next) => {
    const clientId = getClientId(c)
    const now = Date.now()

    // Limpa registros expirados periodicamente
    cleanExpiredRecords(now)

    const record = requestCounts.get(clientId)

    if (!record || now > record.resetTime) {
      // Primeira requisição ou janela expirada
      requestCounts.set(clientId, {
        count: 1,
        resetTime: now + finalConfig.windowMs
      })
    } else if (record.count >= finalConfig.maxRequests) {
      // Limite excedido
      const resetIn = Math.ceil((record.resetTime - now) / 1000)

      c.header('X-RateLimit-Limit', finalConfig.maxRequests.toString())
      c.header('X-RateLimit-Remaining', '0')
      c.header('X-RateLimit-Reset', record.resetTime.toString())
      c.header('Retry-After', resetIn.toString())

      return c.json(errorResponse(finalConfig.message), 429)
    } else {
      // Incrementa contador
      record.count++
      requestCounts.set(clientId, record)
    }

    // Adiciona headers informativos
    const currentRecord = requestCounts.get(clientId)!
    c.header('X-RateLimit-Limit', finalConfig.maxRequests.toString())
    c.header('X-RateLimit-Remaining', (finalConfig.maxRequests - currentRecord.count).toString())
    c.header('X-RateLimit-Reset', currentRecord.resetTime.toString())

    await next()
  })
}

/**
 * Rate limiter padrão para APIs públicas
 */
export const rateLimitPublic = createRateLimiter()

/**
 * Rate limiter para autenticação
 */
export const rateLimitAuth = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 5, // 5 tentativas de login por 15 minutos
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
})

/**
 * Rate limiter para registro
 */
export const rateLimitRegistration = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hora
  maxRequests: 3, // 3 registros por hora por IP
  message: 'Muitas tentativas de registro. Tente novamente em 1 hora.'
})

/**
 * Rate limiter para reset de senha
 */
export const rateLimitPasswordReset = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hora
  maxRequests: 3, // 3 tentativas por hora
  message: 'Muitas tentativas de reset de senha. Tente novamente em 1 hora.'
})

/**
 * Rate limiter para APIs públicas (alias)
 */
export const publicApiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 1000, // 1000 requisições por 15 minutos
  message: 'Limite de requisições excedido. Tente novamente mais tarde.'
})

/**
 * Obtém identificador único do cliente (IP + User-Agent)
 */
function getClientId(c: Context): string {
  const ip = getClientIP(c)
  const userAgent = c.req.header('User-Agent') || 'unknown'
  return `${ip}:${userAgent.substring(0, 50)}` // Limita tamanho do User-Agent
}

/**
 * Obtém o IP real do cliente considerando proxies
 */
function getClientIP(c: Context): string {
  // Verifica headers de proxy em ordem de prioridade
  const forwardedFor = c.req.header('X-Forwarded-For')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = c.req.header('X-Real-IP')
  if (realIP) {
    return realIP
  }

  const cfConnectingIP = c.req.header('CF-Connecting-IP')
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  // Fallback para IP da conexão (pode não estar disponível em todos os ambientes)
  return c.req.header('X-Forwarded-For') || 'unknown'
}

/**
 * Remove registros expirados da memória
 */
function cleanExpiredRecords(now: number): void {
  // Executa limpeza apenas ocasionalmente para não impactar performance
  if (Math.random() > 0.01) return // 1% de chance

  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key)
    }
  }
}

/**
 * Middleware para bypass de rate limiting para usuários autenticados com roles específicas
 */
export const bypassRateLimitForRoles = (...roles: string[]) => {
  return createMiddleware(async (c: Context, next) => {
    const user = c.get('user')

    if (user && roles.includes(user.role)) {
      // Bypassa rate limiting para roles específicas
      await next()
      return
    }

    // Aplica rate limiting normal
    await rateLimitPublic(c, next)
  })
}