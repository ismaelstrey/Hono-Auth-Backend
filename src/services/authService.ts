import { userRepository } from '@/repositories/userRepository'
import { hashPassword, comparePassword } from '@/utils/password'
import { generateToken, generateRefreshToken, verifyRefreshToken, generateResetToken, verifyResetToken } from '@/utils/jwt'
import { sanitizeUser } from '@/utils/helpers'
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
  /**
   * Registra um novo usuário
   */
  async register(userData: CreateUserData): Promise<AuthResponse> {
    // Verifica se o email já existe
    const existingUser = await userRepository.findByEmail(userData.email)
    if (existingUser) {
      throw new Error('Email já está em uso')
    }

    // Hash da senha
    const hashedPassword = await hashPassword(userData.password)

    // Cria o usuário
    const user = await userRepository.create({
      ...userData,
      password: hashedPassword
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
  }

  /**
   * Realiza login do usuário
   */
  async login(loginData: LoginData): Promise<AuthResponse> {
    // Busca o usuário pelo email
    const user = await userRepository.findByEmail(loginData.email)
    if (!user) {
      throw new Error('Credenciais inválidas')
    }

    // Verifica se a conta está ativa
    if (!user.isActive) {
      throw new Error('Conta desativada. Entre em contato com o suporte.')
    }

    // Verifica a senha
    const isPasswordValid = await comparePassword(loginData.password, user.password)
    if (!isPasswordValid) {
      throw new Error('Credenciais inválidas')
    }

    // Atualiza último login
    await userRepository.updateLastLogin(user.id)

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
  async forgotPassword(data: ForgotPasswordData): Promise<{ message: string }> {
    const user = await userRepository.findByEmail(data.email)
    
    // Por segurança, sempre retorna sucesso mesmo se o email não existir
    if (!user) {
      return {
        message: 'Se o email existir em nossa base, você receberá instruções para redefinir sua senha.'
      }
    }

    // Gera token de reset
    const resetToken = generateResetToken()

    // Aqui você salvaria o token no banco de dados associado ao usuário
    // e enviaria por email. Por simplicidade, vamos apenas logar
    console.log(`Token de reset para ${user.email}: ${resetToken}`)
    console.log(`Link de reset: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`)

    // Em produção, você enviaria um email aqui
    // await emailService.sendPasswordResetEmail(user.email, resetToken)

    return {
      message: 'Se o email existir em nossa base, você receberá instruções para redefinir sua senha.'
    }
  }

  /**
   * Redefine a senha usando token de reset
   */
  async resetPassword(data: ResetPasswordData): Promise<{ message: string }> {
    // Verifica o token de reset
    const isValidToken = verifyResetToken(data.token)
    if (!isValidToken) {
      throw new Error('Token de reset inválido ou expirado')
    }

    // Em uma implementação real, você buscaria o usuário pelo token
    // Por simplicidade, vamos assumir que o token contém o email
    // const user = await userRepository.findByResetToken(data.token)
    
    // Para este exemplo, vamos usar um usuário fictício
    // Em produção, implemente a lógica de tokens de reset no banco
    throw new Error('Funcionalidade de reset de senha requer implementação completa com banco de dados')
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async verifyEmail(_token: string): Promise<{ message: string }> {
    // Em uma implementação real, você verificaria o token e encontraria o usuário
    // Por simplicidade, vamos assumir que funciona
    
    // const user = await userRepository.findByVerificationToken(_token)
    // if (!user) {
    //   throw new Error('Token de verificação inválido')
    // }
    
    // await userRepository.verifyEmail(user.id)
    
    throw new Error('Funcionalidade de verificação de email requer implementação completa com banco de dados')
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
    const verificationToken = generateResetToken()

    // Aqui você salvaria o token e enviaria o email
    console.log(`Token de verificação para ${user.email}: ${verificationToken}`)
    console.log(`Link de verificação: ${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`)

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