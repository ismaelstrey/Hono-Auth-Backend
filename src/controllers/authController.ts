import type { Context } from 'hono'
import { authService } from '@/services/authService'
import { successResponse, errorResponse } from '@/utils/helpers'
import type { JWTPayload } from '@/types'

/**
 * Controlador de autenticação
 */
export class AuthController {
  /**
   * Registra um novo usuário
   */
  static async handleRegister(c: Context) {
    try {
      const userData = (c.req as any).valid('json')
      const result = await authService.register(userData)

      return c.json(successResponse(result, 'Usuário registrado com sucesso'), 201)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 400)
    }
  }

  /**
   * Realiza login
   */
  static async handleLogin(c: Context) {
    try {
      const loginData = (c.req as any).valid('json')
      const result = await authService.login(loginData)

      return c.json(successResponse(result, 'Login realizado com sucesso'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 401)
    }
  }

  /**
   * Logout (invalidar token)
   */
  static async logout(c: Context) {
    try {
      // Em uma implementação real, você adicionaria o token a uma blacklist
      // Por enquanto, apenas retorna sucesso
      return c.json(successResponse(null, 'Logout realizado com sucesso'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }

  /**
   * Renova token de acesso
   */
  static async handleRefreshToken(c: Context) {
    try {
      const { refreshToken } = (c.req as any).valid('json')
      const result = await authService.refreshToken(refreshToken)

      return c.json(successResponse(result, 'Token renovado com sucesso'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 401)
    }
  }

  /**
   * Esqueci minha senha
   */
  static async handleForgotPassword(c: Context) {
    try {
      const data = (c.req as any).valid('json')
      const result = await authService.forgotPassword(data)

      return c.json(successResponse(result))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }

  /**
   * Reset de senha
   */
  static async handleResetPassword(c: Context) {
    try {
      const data = (c.req as any).valid('json')
      const result = await authService.resetPassword(data)

      return c.json(successResponse(result))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 400)
    }
  }

  /**
   * Alterar senha (usuário autenticado)
   */
  static async handleChangePassword(c: Context) {
    try {
      const user = c.get('user') as JWTPayload
      const { currentPassword, newPassword } = (c.req as any).valid('json')

      const result = await authService.changePassword(
        user.userId,
        currentPassword,
        newPassword
      )

      return c.json(successResponse(result))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 400)
    }
  }

  /**
   * Verificar email
   */
  static async handleVerifyEmail(c: Context) {
    try {
      const { token } = (c.req as any).valid('json')
      const result = await authService.verifyEmail(token)

      return c.json(successResponse(result))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 400)
    }
  }

  /**
   * Reenviar email de verificação
   */
  static async handleResendVerification(c: Context) {
    try {
      const { email } = (c.req as any).valid('json')
      const result = await authService.resendVerificationEmail(email)

      return c.json(successResponse(result))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }

  /**
   * Obtém perfil do usuário autenticado
   */
  static async getProfile(c: Context) {
    try {
      const user = c.get('user') as JWTPayload
      const profile = await authService.getProfile(user.userId)

      return c.json(successResponse(profile))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 404)
    }
  }

  /**
   * Valida se o token é válido
   */
  static async validateToken(c: Context) {
    try {
      const user = c.get('user') as JWTPayload

      return c.json(successResponse({
        valid: true,
        user: {
          userId: user.userId,
          email: user.email,
          role: user.role
        }
      }))
    } catch (error) {
      return c.json(errorResponse('Token inválido'), 401)
    }
  }

  /**
   * Obtém informações sobre o token atual
   */
  static async getTokenInfo(c: Context) {
    try {
      const user = c.get('user') as JWTPayload

      return c.json(successResponse({
        userId: user.userId,
        email: user.email,
        role: user.role,
        iat: user.iat ? new Date(user.iat * 1000) : null,
        exp: user.exp ? new Date(user.exp * 1000) : null
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }
}