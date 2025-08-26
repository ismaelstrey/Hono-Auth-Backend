import { z } from 'zod'
import { isValidEmail } from '@/utils/helpers'
import { UserRole } from '@/types'

/**
 * Schema para validação de registro de usuário
 */
export const registerSchema = z.object({
  name: z.string({
    required_error: 'Nome é obrigatório'
  })
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  
  email: z.string({
    required_error: 'Email é obrigatório'
  })
    .email('Email inválido')
    .toLowerCase()
    .refine((email) => isValidEmail(email), {
      message: 'Formato de email inválido'
    }),
  
  password: z.string({
    required_error: 'Senha é obrigatória'
  })
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(128, 'Senha deve ter no máximo 128 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/\d/, 'Senha deve conter pelo menos um número')
    .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'Senha deve conter pelo menos um caractere especial'),
  
  confirmPassword: z.string({
    required_error: 'Confirmação de senha é obrigatória'
  }),
  
  role: z.nativeEnum(UserRole).optional().default(UserRole.USER)
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword']
})

/**
 * Schema para validação de login
 */
export const loginSchema = z.object({
  email: z.string({
    required_error: 'Email é obrigatório'
  })
    .email('Email inválido')
    .toLowerCase(),
  
  password: z.string({
    required_error: 'Senha é obrigatória'
  })
    .min(1, 'Senha é obrigatória')
})

/**
 * Schema para validação de esqueci minha senha
 */
export const forgotPasswordSchema = z.object({
  email: z.string({
    required_error: 'Email é obrigatório'
  })
    .email('Email inválido')
    .toLowerCase()
})

/**
 * Schema para validação de reset de senha
 */
export const resetPasswordSchema = z.object({
  token: z.string({
    required_error: 'Token é obrigatório'
  })
    .min(1, 'Token é obrigatório'),
  
  password: z.string({
    required_error: 'Nova senha é obrigatória'
  })
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(128, 'Senha deve ter no máximo 128 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/\d/, 'Senha deve conter pelo menos um número')
    .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'Senha deve conter pelo menos um caractere especial'),
  
  confirmPassword: z.string({
    required_error: 'Confirmação de senha é obrigatória'
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword']
})

/**
 * Schema para validação de mudança de senha
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string({
    required_error: 'Senha atual é obrigatória'
  })
    .min(1, 'Senha atual é obrigatória'),
  
  newPassword: z.string({
    required_error: 'Nova senha é obrigatória'
  })
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(128, 'Senha deve ter no máximo 128 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/\d/, 'Senha deve conter pelo menos um número')
    .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'Senha deve conter pelo menos um caractere especial'),
  
  confirmPassword: z.string({
    required_error: 'Confirmação de senha é obrigatória'
  })
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword']
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'A nova senha deve ser diferente da senha atual',
  path: ['newPassword']
})

/**
 * Schema para validação de refresh token
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string({
    required_error: 'Refresh token é obrigatório'
  })
    .min(1, 'Refresh token é obrigatório')
})

/**
 * Schema para validação de verificação de email
 */
export const verifyEmailSchema = z.object({
  token: z.string({
    required_error: 'Token de verificação é obrigatório'
  })
    .min(1, 'Token de verificação é obrigatório')
})

/**
 * Schema para reenvio de email de verificação
 */
export const resendVerificationSchema = z.object({
  email: z.string({
    required_error: 'Email é obrigatório'
  })
    .email('Email inválido')
    .toLowerCase()
})

// Tipos TypeScript derivados dos schemas
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>