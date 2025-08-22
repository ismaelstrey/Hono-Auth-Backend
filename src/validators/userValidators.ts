import { z } from 'zod'
import { isValidEmail } from '@/utils/helpers'
import { UserRole } from '@/types'

/**
 * Schema para validação de atualização de usuário
 */
export const updateUserSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim()
    .optional(),
  
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .refine((email) => isValidEmail(email), {
      message: 'Formato de email inválido'
    })
    .optional(),
  
  role: z.nativeEnum(UserRole).optional(),
  
  isActive: z.boolean().optional()
})

/**
 * Schema para validação de criação de usuário (admin)
 */
export const createUserSchema = z.object({
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
  
  role: z.nativeEnum(UserRole).default(UserRole.USER),
  
  isActive: z.boolean().default(true)
})

/**
 * Schema para validação de filtros de busca de usuários
 */
export const userFiltersSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  
  isActive: z.string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional(),
  
  emailVerified: z.string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional(),
  
  search: z.string()
    .min(1, 'Termo de busca deve ter pelo menos 1 caractere')
    .max(100, 'Termo de busca deve ter no máximo 100 caracteres')
    .trim()
    .optional(),
  
  page: z.string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1, 'Página deve ser maior que 0'))
    .default('1')
    .transform((val) => typeof val === 'string' ? parseInt(val, 10) : val),
  
  limit: z.string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1, 'Limite deve ser maior que 0').max(100, 'Limite deve ser no máximo 100'))
    .default('10')
    .transform((val) => typeof val === 'string' ? parseInt(val, 10) : val),
  
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastLogin', 'role'])
    .default('createdAt')
    .optional(),
  
  sortOrder: z.enum(['asc', 'desc'])
    .default('desc')
    .optional()
})

/**
 * Schema para validação de parâmetros de ID
 */
export const userIdSchema = z.object({
  id: z.string({
    required_error: 'ID do usuário é obrigatório'
  })
    .min(1, 'ID do usuário é obrigatório')
})

/**
 * Schema para validação de atualização de perfil do próprio usuário
 */
export const updateProfileSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim()
    .optional(),
  
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .refine((email) => isValidEmail(email), {
      message: 'Formato de email inválido'
    })
    .optional()
})

/**
 * Schema para validação de upload de avatar
 */
export const avatarUploadSchema = z.object({
  file: z.any()
    .refine((file) => file?.size <= 5 * 1024 * 1024, {
      message: 'Arquivo deve ter no máximo 5MB'
    })
    .refine((file) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      return allowedTypes.includes(file?.type)
    }, {
      message: 'Apenas arquivos JPEG, PNG e WebP são permitidos'
    })
})

/**
 * Schema para validação de configurações de usuário
 */
export const userSettingsSchema = z.object({
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    sms: z.boolean().default(false)
  }).optional(),
  
  privacy: z.object({
    profileVisible: z.boolean().default(true),
    showEmail: z.boolean().default(false),
    showLastLogin: z.boolean().default(false)
  }).optional(),
  
  preferences: z.object({
    language: z.enum(['pt-BR', 'en-US', 'es-ES']).default('pt-BR'),
    timezone: z.string().default('America/Sao_Paulo'),
    theme: z.enum(['light', 'dark', 'auto']).default('auto')
  }).optional()
})

/**
 * Schema para validação de mudança de role
 */
export const changeUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole)
})

/**
 * Schema para validação de bulk operations
 */
export const bulkUserOperationSchema = z.object({
  userIds: z.array(z.string().min(1, 'ID inválido'))
    .min(1, 'Pelo menos um usuário deve ser selecionado')
    .max(100, 'Máximo de 100 usuários por operação'),
  
  operation: z.enum(['activate', 'deactivate', 'delete', 'changeRole']),
  
  data: z.object({
    role: z.nativeEnum(UserRole).optional()
  }).optional()
})

// Tipos TypeScript derivados dos schemas
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UserFiltersInput = z.infer<typeof userFiltersSchema>
export type UserIdInput = z.infer<typeof userIdSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type AvatarUploadInput = z.infer<typeof avatarUploadSchema>
export type UserSettingsInput = z.infer<typeof userSettingsSchema>
export type BulkUserOperationInput = z.infer<typeof bulkUserOperationSchema>