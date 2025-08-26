import { userRepository } from '@/repositories/userRepository'
import { hashPassword, comparePassword } from '@/utils/password'
import { generateToken, generateRefreshToken, verifyRefreshToken, generateResetToken, verifyResetToken } from '@/utils/jwt'
import { sanitizeUser } from '@/utils/helpers'
import { LogService } from '@/services/logService'
import { emailService } from '@/services/emailService'
import type { 
  CreateUserData, 
  AuthResponse, 
  LoginData, 
  ForgotPasswordData, 
  ResetPasswordData,
  User
} from '@/types'

/**
 * Serviço de autenticação
 */
export class AuthService {
  private logService: LogService

  constructor() {
    this.logService = new LogService()
  }

  /**
   * Registra um novo usuário
   */
  async register(userData: CreateUserData, ip?: string): Promise<AuthResponse> {
    const startTime = Date.now()
    
    try {
      // Verifica se o email já existe
      const existingUser = await userRepository.findByEmail(userData.email)
      if (existingUser) {
        // Log de tentativa de registro com email existente
        await this.logService.warn('Tentativa de registro com email já existente', {
          email: userData.email,
          duration: Date.now() - startTime
        }, {
          action: 'REGISTER_FAILED_EMAIL_EXISTS',
          resource: 'auth',
          method: 'POST',
          path: '/api/auth/register',
          ip: ip || 'unknown'
        })
        throw new Error('Email já está em uso')
      }

      // Hash da senha
      const hashedPassword = await hashPassword(userData.password)

      // Cria o usuário
      const user = await userRepository.create({
        ...userData,
        password: hashedPassword
      })

      // Gera token de verificação de email
      const verificationToken = emailService.generateVerificationToken()

      // Salva o token de verificação no banco de dados
      await emailService.saveVerificationToken(user.id, verificationToken)

      // Envia email de verificação
      const emailResult = await emailService.sendVerificationEmail({
        email: user.email,
        name: user.name,
        token: verificationToken
      })

      if (!emailResult.success) {
        console.warn('Falha ao enviar email de verificação:', emailResult.message)
      }

      // Log de registro bem-sucedido
      await this.logService.info('Usuário registrado com sucesso', {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        duration: Date.now() - startTime
      }, {
        userId: user.id,
        action: 'REGISTER_SUCCESS',
        resource: 'auth',
        method: 'POST',
        path: '/api/auth/register',
        ip: ip || 'unknown'
      })

      // Gera tokens de autenticação
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
      })

      const refreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role
      })

      return {
        user: sanitizeUser(user),
        token,
        refreshToken
      }
    } catch (error) {
      // Log de erro geral no registro
      if (error instanceof Error && !error.message.includes('Email já está em uso')) {
        await this.logService.error('Erro interno durante registro', {
          email: userData.email,
          error: error.message,
          duration: Date.now() - startTime
        }, {
          action: 'REGISTER_ERROR',
          resource: 'auth',
          method: 'POST',
          path: '/api/auth/register',
          ip: ip || 'unknown'
        })
      }
      throw error
    }
  }

  /**
   * Realiza login do usuário
   */
  async login(loginData: LoginData, ip?: string): Promise<AuthResponse> {
    const startTime = Date.now()
    
    try {
      // Busca o usuário pelo email
      const user = await userRepository.findByEmail(loginData.email)
      if (!user) {
        // Log de tentativa de login com email inexistente
        await this.logService.warn('Tentativa de login com email inexistente', {
          email: loginData.email,
          duration: Date.now() - startTime
        }, {
          action: 'LOGIN_FAILED',
          resource: 'auth',
          method: 'POST',
          path: '/api/auth/login',
          ip: ip || 'unknown'
        })
        throw new Error('Credenciais inválidas')
      }

      // Verifica se a conta está ativa
      if (!user.isActive) {
        // Log de tentativa de login com conta inativa
        await this.logService.warn('Tentativa de login com conta inativa', {
          userId: user.id,
          email: user.email,
          duration: Date.now() - startTime
        }, {
          userId: user.id,
          action: 'LOGIN_FAILED_INACTIVE',
          resource: 'auth',
          method: 'POST',
          path: '/api/auth/login',
          ip: ip || 'unknown'
        })
        throw new Error('Conta desativada. Entre em contato com o suporte.')
      }

      // Verifica se a conta está bloqueada
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (1000 * 60))
        // Log de tentativa de login com conta bloqueada
        await this.logService.warn('Tentativa de login com conta bloqueada', {
          userId: user.id,
          email: user.email,
          lockedUntil: user.lockedUntil,
          remainingMinutes: remainingTime,
          duration: Date.now() - startTime
        }, {
          userId: user.id,
          action: 'LOGIN_FAILED_LOCKED',
          resource: 'auth',
          method: 'POST',
          path: '/api/auth/login',
          ip: ip || 'unknown'
        })
        throw new Error(`Conta bloqueada devido a muitas tentativas de login falhadas. Tente novamente em ${remainingTime} minutos.`)
      }

      // Verifica a senha
      const isPasswordValid = await comparePassword(loginData.password, user.password)
      if (!isPasswordValid) {
        // Log de tentativa de login com senha incorreta
        await this.logService.warn('Tentativa de login com senha incorreta', {
          userId: user.id,
          email: user.email,
          failedAttempts: (user.failedLoginAttempts || 0) + 1,
          duration: Date.now() - startTime
        }, {
          userId: user.id,
          action: 'LOGIN_FAILED_PASSWORD',
          resource: 'auth',
          method: 'POST',
          path: '/api/auth/login',
          ip: ip || 'unknown'
        })
        
        // Incrementa tentativas falhadas
        await this.handleFailedLogin(user.id, user.failedLoginAttempts || 0)
        throw new Error('Credenciais inválidas')
      }

      // Login bem-sucedido - limpa tentativas falhadas
      if ((user.failedLoginAttempts && user.failedLoginAttempts > 0) || user.lockedUntil) {
        await userRepository.clearFailedLoginAttempts(user.id)
      }

      // Atualiza último login
      await userRepository.updateLastLogin(user.id)

      // Log de login bem-sucedido
      await this.logService.info('Login realizado com sucesso', {
        userId: user.id,
        email: user.email,
        role: user.role,
        duration: Date.now() - startTime
      }, {
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        resource: 'auth',
        method: 'POST',
        path: '/api/auth/login',
        ip: ip || 'unknown'
      })

      // Gera tokens
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
      })

      const refreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role
      })

      return {
        user: sanitizeUser(user),
        token,
        refreshToken
      }
    } catch (error) {
      // Log de erro geral no login
      if (error instanceof Error && !error.message.includes('Credenciais inválidas') && 
          !error.message.includes('Conta desativada') && 
          !error.message.includes('Conta bloqueada')) {
        await this.logService.error('Erro interno durante login', {
          email: loginData.email,
          error: error.message,
          duration: Date.now() - startTime
        }, {
          action: 'LOGIN_ERROR',
          resource: 'auth',
          method: 'POST',
          path: '/api/auth/login',
          ip: ip || 'unknown'
        })
      }
      throw error
    }
  }

  /**
   * Renova o token de acesso usando refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      // Verifica o refresh token
      const payload = verifyRefreshToken(refreshToken)

      // Busca o usuário para verificar se ainda existe e está ativo
      const user = await userRepository.findById(payload.userId)
      if (!user || !user.isActive) {
        throw new Error('Usuário não encontrado ou inativo')
      }

      // Gera novos tokens
      const newToken = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
      })

      const newRefreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role
      })

      return {
        token: newToken,
        refreshToken: newRefreshToken
      }
    } catch (error) {
      throw new Error('Refresh token inválido ou expirado')
    }
  }

  /**
   * Inicia processo de recuperação de senha
   */
  async forgotPassword(data: ForgotPasswordData, ip?: string): Promise<{ message: string }> {
    const startTime = Date.now()
    
    try {
      const user = await userRepository.findByEmail(data.email)
      
      // Por segurança, sempre retorna sucesso mesmo se o email não existir
      if (!user) {
        // Log de tentativa de reset com email inexistente
        await this.logService.warn('Tentativa de reset de senha com email inexistente', {
          email: data.email,
          duration: Date.now() - startTime
        }, {
          action: 'PASSWORD_RESET_FAILED_EMAIL_NOT_FOUND',
          resource: 'auth',
          method: 'POST',
          path: '/api/auth/forgot-password',
          ip: ip || 'unknown'
        })
        
        return {
          message: 'Se o email existir em nossa base, você receberá instruções para redefinir sua senha.'
        }
      }

      // Gera token de reset usando emailService
      const resetToken = emailService.generatePasswordResetToken()
      
      // Salva o token no banco de dados
      await emailService.savePasswordResetToken(user.id, resetToken)

      // Envia email de reset de senha
      const emailResult = await emailService.sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        token: resetToken
      })

      if (!emailResult.success) {
        throw new Error('Erro ao enviar email de reset. Tente novamente mais tarde.')
      }

      // Log de solicitação de reset bem-sucedida
      await this.logService.info('Solicitação de reset de senha realizada', {
        userId: user.id,
        email: user.email,
        duration: Date.now() - startTime
      }, {
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        resource: 'auth',
        method: 'POST',
        path: '/api/auth/forgot-password',
        ip: ip || 'unknown'
      })

      return {
        message: 'Se o email existir em nossa base, você receberá instruções para redefinir sua senha.'
      }
    } catch (error) {
      // Log de erro geral no forgot password
      if (error instanceof Error && !error.message.includes('Erro interno')) {
        await this.logService.error('Erro interno durante solicitação de reset', {
          email: data.email,
          error: error.message,
          duration: Date.now() - startTime
        }, {
          action: 'PASSWORD_RESET_ERROR',
          resource: 'auth',
          method: 'POST',
          path: '/api/auth/forgot-password',
          ip: ip || 'unknown'
        })
      }
      throw error
    }
  }

  /**
   * Redefine a senha usando token de reset
   */
  async resetPassword(data: ResetPasswordData, ip?: string): Promise<{ message: string }> {
    const startTime = Date.now()
    
    try {
      // Valida o token de reset usando emailService
      const tokenValidation = await emailService.validatePasswordResetToken(data.token)
      
      if (!tokenValidation.valid || !tokenValidation.userId) {
        // Log de tentativa de reset com token inválido
        await this.logService.warn('Tentativa de reset com token inválido', {
          token: data.token.substring(0, 10) + '...', // Log apenas parte do token por segurança
          duration: Date.now() - startTime
        }, {
          action: 'PASSWORD_RESET_FAILED_INVALID_TOKEN',
          resource: 'auth',
          method: 'POST',
          path: '/api/auth/reset-password',
          ip: ip || 'unknown'
        })
        throw new Error('Token de reset inválido ou expirado')
      }

      // Busca o usuário para obter informações completas
      const user = await userRepository.findById(tokenValidation.userId)
      if (!user) {
        throw new Error('Usuário não encontrado')
      }

      // Hash da nova senha
      const hashedPassword = await hashPassword(data.newPassword)

      // Atualiza a senha do usuário
      const updatedUser = await userRepository.update(user.id, {
        password: hashedPassword
      })

      if (!updatedUser) {
        throw new Error('Erro ao atualizar senha. Tente novamente.')
      }

      // Limpa o token de reset usando emailService
      await emailService.clearPasswordResetToken(user.id)

      // Log de reset de senha bem-sucedido
      await this.logService.info('Senha redefinida com sucesso', {
        userId: user.id,
        email: user.email,
        duration: Date.now() - startTime
      }, {
        userId: user.id,
        action: 'PASSWORD_RESET_SUCCESS',
        resource: 'auth',
        method: 'POST',
        path: '/api/auth/reset-password',
        ip: ip || 'unknown'
      })

      return {
        message: 'Senha redefinida com sucesso. Você já pode fazer login com sua nova senha.'
      }
    } catch (error) {
      // Log de erro geral no reset password
      if (error instanceof Error && !error.message.includes('Token de reset inválido')) {
        await this.logService.error('Erro interno durante reset de senha', {
          error: error.message,
          duration: Date.now() - startTime
        }, {
          action: 'PASSWORD_RESET_ERROR',
          resource: 'auth',
          method: 'POST',
          path: '/api/auth/reset-password',
          ip: ip || 'unknown'
        })
      }
      throw error
    }
  }

  /**
   * Altera a senha do usuário autenticado
   */
  async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<{ message: string }> {
    // Busca o usuário
    const user = await userRepository.findById(userId)
    if (!user) {
      throw new Error('Usuário não encontrado')
    }

    // Verifica a senha atual
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      throw new Error('Senha atual incorreta')
    }

    // Hash da nova senha
    const hashedNewPassword = await hashPassword(newPassword)

    // Atualiza a senha
    await userRepository.update(userId, {
      password: hashedNewPassword
    })

    return {
      message: 'Senha alterada com sucesso'
    }
  }

  /**
   * Verifica email do usuário
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    // Valida o token usando o emailService
    const validation = await emailService.validateVerificationToken(token)
    
    if (!validation.valid || !validation.userId) {
      throw new Error('Token de verificação inválido ou expirado')
    }

    // Verifica se o email já foi verificado
    const isAlreadyVerified = await emailService.isEmailVerified(validation.userId)
    if (isAlreadyVerified) {
      return {
        message: 'Email já foi verificado anteriormente.'
      }
    }
    
    // Marca o email como verificado
    await emailService.markEmailAsVerified(validation.userId)
    
    // Log da verificação bem-sucedida
    await this.logService.info('Email verificado com sucesso', {
      userId: validation.userId
    }, {
      action: 'EMAIL_VERIFIED',
      resource: 'auth',
      method: 'POST',
      path: '/api/auth/verify-email',
      ip: 'system'
    })
    
    return {
      message: 'Email verificado com sucesso! Sua conta está agora ativa.'
    }
  }

  /**
   * Reenvia email de verificação
   */
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await userRepository.findByEmail(email)
    
    if (!user) {
      // Por segurança, não revela se o email existe
      return {
        message: 'Se o email existir e não estiver verificado, um novo email de verificação será enviado.'
      }
    }

    if (user.emailVerified) {
      return {
        message: 'Este email já está verificado.'
      }
    }

    // Gera novo token de verificação
    const verificationToken = emailService.generateVerificationToken()
    
    // Salva o token no banco de dados
    await emailService.saveVerificationToken(user.id, verificationToken)
    
    // Envia o email de verificação
    const emailResult = await emailService.sendVerificationEmail({
      email: user.email,
      name: user.name,
      token: verificationToken
    })
    
    if (!emailResult.success) {
      throw new Error('Erro ao enviar email de verificação. Tente novamente mais tarde.')
    }

    // Log do reenvio de email
    await this.logService.info('Email de verificação reenviado', {
      email: user.email,
      userId: user.id
    }, {
      action: 'RESEND_VERIFICATION_EMAIL',
      resource: 'auth',
      method: 'POST',
      path: '/api/auth/resend-verification',
      ip: 'system'
    })

    return {
      message: 'Se o email existir e não estiver verificado, um novo email de verificação será enviado.'
    }
  }

  /**
   * Obtém informações do usuário autenticado
   */
  async getProfile(userId: string): Promise<User> {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw new Error('Usuário não encontrado')
    }

    return sanitizeUser(user)
  }

  /**
   * Trata tentativas de login falhadas
   */
  private async handleFailedLogin(userId: string, currentAttempts: number): Promise<void> {
    const maxAttempts = 5 // Máximo de 5 tentativas
    const lockoutDuration = 30 * 60 * 1000 // 30 minutos em millisegundos
    
    const newAttempts = currentAttempts + 1
    
    if (newAttempts >= maxAttempts) {
      // Bloqueia a conta por 30 minutos
      const lockedUntil = new Date(Date.now() + lockoutDuration)
      await userRepository.lockAccount(userId, lockedUntil)
    } else {
      // Apenas incrementa as tentativas falhadas
      await userRepository.incrementFailedLoginAttempts(userId, newAttempts)
    }
  }

  /**
   * Valida se um token é válido
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validateToken(_token: string): Promise<boolean> {
    try {
      // A validação já é feita no middleware de auth
      // Esta função pode ser usada para validações adicionais
      return true
    } catch (error) {
      return false
    }
  }
}

// Instância singleton do serviço
export const authService = new AuthService()