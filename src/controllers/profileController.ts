import { Context } from 'hono'
import { profileService, ProfileData } from '@/services/profileService'
import { AppError, AuthenticationError, AuthorizationError } from '@/utils/errors'
import { logger } from '@/utils/logger'
import { z } from 'zod'
import { extractPaginationParams, extractSortParams, extractFilterParams } from '@/utils/pagination'
import { successResponse, errorResponse } from '@/utils/helpers'

// Schemas de validação
const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional()
}).optional()

const preferencesSchema = z.object({
  language: z.string().optional(),
  timezone: z.string().optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    sms: z.boolean().optional()
  }).optional(),
  privacy: z.object({
    profileVisibility: z.enum(['public', 'private', 'friends']).optional(),
    showEmail: z.boolean().optional(),
    showPhone: z.boolean().optional()
  }).optional()
}).optional()

const socialLinksSchema = z.object({
  website: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  twitter: z.string().url().optional(),
  github: z.string().url().optional(),
  instagram: z.string().url().optional()
}).optional()

const profileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().regex(/^[\+]?[1-9][\d\s\-\(\)]{8,15}$/).optional(),
  dateOfBirth: z.string().datetime().optional(),
  address: addressSchema,
  preferences: preferencesSchema,
  socialLinks: socialLinksSchema
})

const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 50)).optional(),
  search: z.string().optional()
})

class ProfileController {
  /**
   * Criar perfil do usuário autenticado
   */
  async createProfile(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        throw new AuthenticationError('Usuário não autenticado')
      }

      const body = await c.req.json()
      const validatedData = profileSchema.parse(body)

      const profile = await profileService.createProfile(user.id, validatedData)

      logger.info('Perfil criado via API', {
        userId: user.id,
        profileId: profile.id
      })

      return c.json({
        success: true,
        message: 'Perfil criado com sucesso',
        data: profile
      }, 201)
    } catch (error) {
      logger.error('Erro no controller createProfile', { error })
      
      if (error instanceof z.ZodError) {
        return c.json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors
        }, 400)
      }

      if (error instanceof AppError) {
        return c.json({
          success: false,
          message: error.message
        }, error.statusCode as any)
      }

      return c.json({
        success: false,
        message: 'Erro interno do servidor'
      }, 500)
    }
  }

  /**
   * Obter perfil do usuário autenticado
   */
  async getMyProfile(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        throw new AuthenticationError('Usuário não autenticado')
      }

      const profile = await profileService.getProfileByUserId(user.id)
      if (!profile) {
        return c.json({
          success: false,
          message: 'Perfil não encontrado'
        }, 404)
      }

      return c.json({
        success: true,
        data: profile
      })
    } catch (error) {
      logger.error('Erro no controller getMyProfile', { error })
      
      if (error instanceof AppError) {
        return c.json({
          success: false,
          message: error.message
        }, error.statusCode as any)
      }

      return c.json({
        success: false,
        message: 'Erro interno do servidor'
      }, 500)
    }
  }

  /**
   * Obter perfil por ID (público)
   */
  async getProfileById(c: Context) {
    try {
      const { id } = c.req.param()
      
      const profile = await profileService.getProfileById(id)
      if (!profile) {
        return c.json({
          success: false,
          message: 'Perfil não encontrado'
        }, 404)
      }

      // Verificar privacidade do perfil
      const preferences = profile.preferences
      if (preferences?.privacy?.profileVisibility === 'private') {
        const user = c.get('user')
        if (!user || user.id !== profile.userId) {
          return c.json({
            success: false,
            message: 'Perfil privado'
          }, 403)
        }
      }

      // Filtrar dados sensíveis baseado nas preferências de privacidade
      const publicProfile = this.filterSensitiveData(profile)

      return c.json({
        success: true,
        data: publicProfile
      })
    } catch (error) {
      logger.error('Erro no controller getProfileById', { error })
      
      if (error instanceof AppError) {
        return c.json({
          success: false,
          message: error.message
        }, error.statusCode as any)
      }

      return c.json({
        success: false,
        message: 'Erro interno do servidor'
      }, 500)
    }
  }

  /**
   * Atualizar perfil do usuário autenticado
   */
  async updateProfile(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        throw new AuthenticationError('Usuário não autenticado')
      }

      const body = await c.req.json()
      const validatedData = profileSchema.parse(body)

      const profile = await profileService.updateProfile(user.id, validatedData)

      logger.info('Perfil atualizado via API', {
        userId: user.id,
        profileId: profile.id
      })

      return c.json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: profile
      })
    } catch (error) {
      logger.error('Erro no controller updateProfile', { error })
      
      if (error instanceof z.ZodError) {
        return c.json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors
        }, 400)
      }

      if (error instanceof AppError) {
        return c.json({
          success: false,
          message: error.message
        }, error.statusCode as any)
      }

      return c.json({
        success: false,
        message: 'Erro interno do servidor'
      }, 500)
    }
  }

  /**
   * Criar ou atualizar perfil (upsert)
   */
  async upsertProfile(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        throw new AuthenticationError('Usuário não autenticado')
      }

      const body = await c.req.json()
      const validatedData = profileSchema.parse(body)

      const profile = await profileService.upsertProfile(user.id, validatedData)

      logger.info('Perfil criado/atualizado via API', {
        userId: user.id,
        profileId: profile.id
      })

      return c.json({
        success: true,
        message: 'Perfil salvo com sucesso',
        data: profile
      })
    } catch (error) {
      logger.error('Erro no controller upsertProfile', { error })
      
      if (error instanceof z.ZodError) {
        return c.json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors
        }, 400)
      }

      if (error instanceof AppError) {
        return c.json({
          success: false,
          message: error.message
        }, error.statusCode as any)
      }

      return c.json({
        success: false,
        message: 'Erro interno do servidor'
      }, 500)
    }
  }

  /**
   * Listar perfis (admin/moderator)
   */
  async listProfiles(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        throw new AuthenticationError('Usuário não autenticado')
      }

      // Verificar permissões
      if (!['admin', 'moderator'].includes(user.role)) {
        throw new AuthorizationError('Acesso negado')
      }

      // Usar sistema de paginação padronizado
      const pagination = extractPaginationParams(c)
      const sort = extractSortParams(c, ['createdAt', 'updatedAt', 'firstName', 'lastName'])
      const filters = extractFilterParams(c, ['isPublic', 'hasAvatar'])

      const result = await profileService.listProfilesAdvanced(pagination, sort, filters)

      return c.json(successResponse(result))
    } catch (error) {
      logger.error('Erro no controller listProfiles', { error })
      
      if (error instanceof z.ZodError) {
        return c.json(errorResponse('Parâmetros inválidos', error.errors), 400)
      }

      if (error instanceof AppError) {
        return c.json(errorResponse(error.message), error.statusCode as any)
      }

      return c.json(errorResponse('Erro interno do servidor'), 500)
    }
  }

  /**
   * Obter estatísticas de perfis (admin)
   */
  async getProfileStats(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        throw new AuthenticationError('Usuário não autenticado')
      }

      // Verificar permissões
      if (user.role !== 'admin') {
        throw new AuthorizationError('Acesso negado')
      }

      const stats = await profileService.getProfileStats()

      return c.json({
        success: true,
        data: stats
      })
    } catch (error) {
      logger.error('Erro no controller getProfileStats', { error })
      
      if (error instanceof AppError) {
        return c.json({
          success: false,
          message: error.message
        }, error.statusCode as any)
      }

      return c.json({
        success: false,
        message: 'Erro interno do servidor'
      }, 500)
    }
  }

  /**
   * Deletar perfil do usuário autenticado
   */
  async deleteProfile(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        throw new AuthenticationError('Usuário não autenticado')
      }

      await profileService.deleteProfile(user.id)

      logger.info('Perfil deletado via API', {
        userId: user.id
      })

      return c.json({
        success: true,
        message: 'Perfil deletado com sucesso'
      })
    } catch (error) {
      logger.error('Erro no controller deleteProfile', { error })
      
      if (error instanceof AppError) {
        return c.json({
          success: false,
          message: error.message
        }, error.statusCode as any)
      }

      return c.json({
        success: false,
        message: 'Erro interno do servidor'
      }, 500)
    }
  }

  /**
   * Upload de avatar
   */
  async uploadAvatar(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Usuário não autenticado' }, 401)
      }

      const uploadedFile = c.get('uploadedFile')
      if (!uploadedFile) {
        return c.json({ success: false, message: 'Nenhum arquivo foi enviado' }, 400)
      }

      logger.info('Iniciando upload de avatar', {
        userId: user.userId,
        filename: uploadedFile.filename,
        size: uploadedFile.size
      })

      // Atualizar avatar no perfil
      const updatedProfile = await profileService.updateAvatar(user.userId, uploadedFile.url)

      return c.json({
        success: true,
        message: 'Avatar atualizado com sucesso',
        data: {
          profile: updatedProfile,
          avatar: {
            url: uploadedFile.url,
            filename: uploadedFile.filename,
            size: uploadedFile.size
          }
        }
      })
    } catch (error) {
      logger.error('Erro no upload de avatar', { error })
      
      if (error instanceof AppError) {
        return c.json({ success: false, message: error.message }, error.statusCode as any)
      }
      
      return c.json({ success: false, message: 'Erro interno do servidor' }, 500)
    }
  }

  /**
   * Filtrar dados sensíveis baseado nas preferências de privacidade
   */
  private filterSensitiveData(profile: any) {
    const filtered = { ...profile }
    const preferences = profile.preferences

    if (preferences?.privacy) {
      if (!preferences.privacy.showEmail) {
        filtered.user.email = null
      }
      if (!preferences.privacy.showPhone) {
        filtered.phone = null
      }
    }

    return filtered
  }
}

export const profileController = new ProfileController()
export default profileController