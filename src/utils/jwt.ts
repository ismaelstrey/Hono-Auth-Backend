import jwt from 'jsonwebtoken'
import type { JWTPayload } from '@/types'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-super-secret-refresh-key'
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'

/**
 * Gera um token JWT com os dados do usuário
 */
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions)
}

/**
 * Gera um refresh token
 */
export const generateRefreshToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  } as jwt.SignOptions)
}

/**
 * Verifica e decodifica um token JWT
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    throw new Error('Token inválido ou expirado')
  }
}

/**
 * Verifica e decodifica um refresh token
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as JWTPayload
  } catch (error) {
    throw new Error('Refresh token inválido ou expirado')
  }
}

/**
 * Extrai o token do header Authorization
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null
  
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }
  
  return parts[1]
}

/**
 * Gera um token de reset de senha
 */
export const generateResetToken = (): string => {
  return jwt.sign(
    { type: 'password-reset', timestamp: Date.now() },
    JWT_SECRET,
    { expiresIn: '1h' } as jwt.SignOptions
  )
}

/**
 * Interface para token de reset
 */
interface ResetTokenPayload {
  type: string
  timestamp: number
  iat?: number
  exp?: number
}

/**
 * Verifica um token de reset de senha
 */
export const verifyResetToken = (token: string): boolean => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ResetTokenPayload
    return decoded.type === 'password-reset'
  } catch (error) {
    return false
  }
}