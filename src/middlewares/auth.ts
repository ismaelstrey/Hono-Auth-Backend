import { createMiddleware } from 'hono/factory'
import type { Context } from 'hono'
import { verifyToken, extractTokenFromHeader } from '@/utils/jwt'
import { errorResponse } from '@/utils/helpers'
import type { JWTPayload } from '@/types'
import { UserRole } from '@/types'

/**
 * Middleware de autenticação JWT
 */
export const authMiddleware = createMiddleware(async (c: Context, next) => {
  try {
    const authHeader = c.req.header('Authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return c.json(errorResponse('Token de acesso requerido'), 401)
    }
    
    const payload = verifyToken(token)
    
    // Adiciona os dados do usuário ao contexto
    c.set('user', payload)
    
    await next()
  } catch (error) {
    return c.json(errorResponse('Token inválido ou expirado'), 401)
  }
})

/**
 * Middleware para verificar roles específicas
 */
export const requireRole = (...roles: UserRole[]) => {
  return createMiddleware(async (c: Context, next) => {
    const user = c.get('user') as JWTPayload
    
    if (!user) {
      return c.json(errorResponse('Usuário não autenticado'), 401)
    }
    
    if (!roles.includes(user.role)) {
      return c.json(errorResponse('Acesso negado: permissões insuficientes'), 403)
    }
    
    await next()
  })
}

/**
 * Middleware para verificar se é admin
 */
export const requireAdmin = requireRole('admin' as UserRole)

/**
 * Middleware para verificar se é admin ou moderador
 */
export const requireAdminOrModerator = requireRole('admin' as UserRole, 'moderator' as UserRole)

/**
 * Middleware opcional de autenticação (não falha se não houver token)
 */
export const optionalAuth = createMiddleware(async (c: Context, next) => {
  try {
    const authHeader = c.req.header('Authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (token) {
      const payload = verifyToken(token)
      c.set('user', payload)
    }
  } catch (error) {
    // Ignora erros de token em auth opcional
  }
  
  await next()
})

/**
 * Middleware para verificar se o usuário pode acessar seus próprios dados ou é admin
 */
export const requireOwnershipOrAdmin = createMiddleware(async (c: Context, next) => {
  const user = c.get('user') as JWTPayload
  const targetUserId = c.req.param('userId') || c.req.param('id')
  
  if (!user) {
    return c.json(errorResponse('Usuário não autenticado'), 401)
  }
  
  // Admin pode acessar qualquer recurso
  if (user.role === UserRole.ADMIN) {
    await next()
    return
  }
  
  // Usuário só pode acessar seus próprios dados
  if (user.userId !== targetUserId) {
    return c.json(errorResponse('Acesso negado: você só pode acessar seus próprios dados'), 403)
  }
  
  await next()
})

/**
 * Middleware para verificar se a conta está ativa
 */
export const requireActiveAccount = createMiddleware(async (c: Context, next) => {
  const user = c.get('user') as JWTPayload
  
  if (!user) {
    return c.json(errorResponse('Usuário não autenticado'), 401)
  }
  
  // Aqui você pode adicionar lógica para verificar se a conta está ativa
  // Por exemplo, consultando o banco de dados
  // const userRecord = await getUserById(user.userId)
  // if (!userRecord.isActive) {
  //   return c.json(errorResponse('Conta desativada'), 403)
  // }
  
  await next()
})

/**
 * Middleware para verificar se o email foi verificado
 */
export const requireVerifiedEmail = createMiddleware(async (c: Context, next) => {
  const user = c.get('user') as JWTPayload
  
  if (!user) {
    return c.json(errorResponse('Usuário não autenticado'), 401)
  }
  
  // Aqui você pode adicionar lógica para verificar se o email foi verificado
  // Por exemplo, consultando o banco de dados
  // const userRecord = await getUserById(user.userId)
  // if (!userRecord.emailVerified) {
  //   return c.json(errorResponse('Email não verificado'), 403)
  // }
  
  await next()
})