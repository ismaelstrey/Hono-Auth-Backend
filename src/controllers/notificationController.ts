import { Context } from 'hono'
import { z } from 'zod'
import { notificationService } from '@/services/notificationService'
import { LogService } from '@/services/logService'
import { extractPaginationParams, extractSortParams, extractFilterParams } from '@/utils/pagination'
import { successResponse, errorResponse } from '@/utils/helpers'
import type {
  CreateNotificationData,
  CreateNotificationTypeData,
  UpdateNotificationPreferenceData,
  NotificationFilters
} from '@/types/notification'

const logService = new LogService()

// Schemas de validação
const createNotificationSchema = z.object({
  userId: z.string().min(1, 'ID do usuário é obrigatório'),
  typeId: z.string().min(1, 'Tipo de notificação é obrigatório'),
  title: z.string().min(1, 'Título é obrigatório'),
  message: z.string().min(1, 'Mensagem é obrigatória'),
  channel: z.enum(['email', 'push', 'sms', 'in_app']),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  data: z.record(z.any()).optional(),
  scheduledFor: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined)
})

const createNotificationTypeSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  isActive: z.boolean().default(true)
})

const updatePreferencesSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  sms: z.boolean().optional(),
  inApp: z.boolean().optional(),
  frequency: z.enum(['immediate', 'hourly', 'daily', 'weekly']).optional()
})

const notificationFiltersSchema = z.object({
  userId: z.string().optional(),
  typeId: z.string().optional(),
  channel: z.enum(['email', 'push', 'sms', 'in_app']).optional(),
  status: z.enum(['pending', 'sent', 'failed', 'read']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  startDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
})

export class NotificationController {
  /**
   * Cria uma nova notificação
   * POST /api/notifications
   */
  async create(c: Context) {
    try {
      const body = await c.req.json()
      const validatedData = createNotificationSchema.parse(body)
      
      const notification = await notificationService.createNotification(validatedData as CreateNotificationData)
      
      await logService.info('Notificação criada via API', {
        notificationId: notification.id,
        userId: validatedData.userId,
        type: validatedData.typeId
      }, {
        action: 'CREATE_NOTIFICATION_API',
        resource: 'notifications',
        method: 'POST',
        path: '/api/notifications',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
      })
      
      return c.json({
        success: true,
        message: 'Notificação criada com sucesso',
        data: notification
      }, 201)
    } catch (error) {
      await logService.error('Erro ao criar notificação via API', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        body: await c.req.json().catch(() => ({}))
      }, {
        action: 'CREATE_NOTIFICATION_API_ERROR',
        resource: 'notifications',
        method: 'POST',
        path: '/api/notifications',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
      })
      
      if (error instanceof z.ZodError) {
        return c.json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors
        }, 400)
      }
      
      return c.json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      }, 500)
    }
  }

  /**
   * Lista notificações com filtros
   * GET /api/notifications
   */
  async list(c: Context) {
    try {
      const query = c.req.query()
      
      const pagination = extractPaginationParams(query)
      const sort = extractSortParams(query)
      const filters = extractFilterParams(query, ['userId', 'typeId', 'channel', 'status', 'priority'])
      
      const result = await notificationService.getNotificationsAdvanced(pagination, sort, filters)
      
      return c.json(successResponse(result))
    } catch (error) {
      await logService.error('Erro ao listar notificações', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        query: c.req.query()
      }, {
        action: 'LIST_NOTIFICATIONS_ERROR',
        resource: 'notifications',
        method: 'GET',
        path: '/api/notifications',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
      })
      
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }

  /**
   * Busca notificações do usuário autenticado
   * GET /api/notifications/me
   */
  async getMyNotifications(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({
          success: false,
          message: 'Usuário não autenticado'
        }, 401)
      }
      
      const query = c.req.query()
      const filters = notificationFiltersSchema.parse({
        ...query,
        userId: user.id
      })
      
      const notifications = await notificationService.getNotifications(filters as NotificationFilters)
      
      return c.json({
        success: true,
        data: notifications,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: notifications.length
        }
      })
    } catch (error) {
      await logService.error('Erro ao buscar notificações do usuário', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        userId: c.get('user')?.id
      }, {
        action: 'GET_MY_NOTIFICATIONS_ERROR',
        resource: 'notifications',
        method: 'GET',
        path: '/api/notifications/me',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
      })
      
      return c.json({
        success: false,
        message: 'Erro interno do servidor'
      }, 500)
    }
  }

  /**
   * Marca notificação como lida
   * PATCH /api/notifications/:id/read
   */
  async markAsRead(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({
          success: false,
          message: 'Usuário não autenticado'
        }, 401)
      }
      
      const notificationId = c.req.param('id')
      if (!notificationId) {
        return c.json({
          success: false,
          message: 'ID da notificação é obrigatório'
        }, 400)
      }
      
      const notification = await notificationService.markAsRead(notificationId, user.id)
      
      if (!notification) {
        return c.json({
          success: false,
          message: 'Notificação não encontrada'
        }, 404)
      }
      
      await logService.info('Notificação marcada como lida', {
        notificationId,
        userId: user.id
      }, {
        action: 'MARK_NOTIFICATION_READ',
        resource: 'notifications',
        method: 'PATCH',
        path: `/api/notifications/${notificationId}/read`,
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
      })
      
      return c.json({
        success: true,
        message: 'Notificação marcada como lida',
        data: notification
      })
    } catch (error) {
      await logService.error('Erro ao marcar notificação como lida', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        notificationId: c.req.param('id'),
        userId: c.get('user')?.id
      }, {
        action: 'MARK_NOTIFICATION_READ_ERROR',
        resource: 'notifications',
        method: 'PATCH',
        path: `/api/notifications/${c.req.param('id')}/read`,
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
      })
      
      return c.json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      }, 500)
    }
  }

  /**
   * Envia uma notificação
   * POST /api/notifications/:id/send
   */
  async send(c: Context) {
    try {
      const notificationId = c.req.param('id')
      if (!notificationId) {
        return c.json({
          success: false,
          message: 'ID da notificação é obrigatório'
        }, 400)
      }
      
      const result = await notificationService.sendNotification(notificationId)
      
      return c.json({
        success: result.success,
        message: result.message,
        data: result
      }, result.success ? 200 : 400)
    } catch (error) {
      await logService.error('Erro ao enviar notificação', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        notificationId: c.req.param('id')
      }, {
        action: 'SEND_NOTIFICATION_ERROR',
        resource: 'notifications',
        method: 'POST',
        path: `/api/notifications/${c.req.param('id')}/send`,
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
      })
      
      return c.json({
        success: false,
        message: 'Erro interno do servidor'
      }, 500)
    }
  }

  /**
   * Processa notificações pendentes
   * POST /api/notifications/process
   */
  async processPending(c: Context) {
    try {
      const body = await c.req.json().catch(() => ({}))
      const limit = body.limit || 100
      
      await notificationService.processPendingNotifications(limit)
      
      return c.json({
        success: true,
        message: 'Processamento de notificações iniciado'
      })
    } catch (error) {
      await logService.error('Erro ao processar notificações pendentes', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }, {
        action: 'PROCESS_PENDING_NOTIFICATIONS_ERROR',
        resource: 'notifications',
        method: 'POST',
        path: '/api/notifications/process',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
      })
      
      return c.json({
        success: false,
        message: 'Erro interno do servidor'
      }, 500)
    }
  }

  /**
   * Obtém estatísticas de notificações
   * GET /api/notifications/stats
   */
  async getStats(c: Context) {
    try {
      const query = c.req.query()
      const userId = query.userId
      const startDate = query.startDate ? new Date(query.startDate) : undefined
      const endDate = query.endDate ? new Date(query.endDate) : undefined
      
      const stats = await notificationService.getStats(userId, startDate, endDate)
      
      return c.json({
        success: true,
        data: stats
      })
    } catch (error) {
      await logService.error('Erro ao obter estatísticas de notificações', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }, {
        action: 'GET_NOTIFICATION_STATS_ERROR',
        resource: 'notifications',
        method: 'GET',
        path: '/api/notifications/stats',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
      })
      
      return c.json({
        success: false,
        message: 'Erro interno do servidor'
      }, 500)
    }
  }

  // === TIPOS DE NOTIFICAÇÃO ===

  /**
   * Cria um novo tipo de notificação
   * POST /api/notification-types
   */
  async createType(c: Context) {
    try {
      const body = await c.req.json()
      const validatedData = createNotificationTypeSchema.parse(body)
      
      const type = await notificationService.createNotificationType(validatedData as CreateNotificationTypeData)
      
      await logService.info('Tipo de notificação criado', {
        typeId: type.id,
        name: type.name
      }, {
        action: 'CREATE_NOTIFICATION_TYPE',
        resource: 'notification-types',
        method: 'POST',
        path: '/api/notification-types',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
      })
      
      return c.json({
        success: true,
        message: 'Tipo de notificação criado com sucesso',
        data: type
      }, 201)
    } catch (error) {
      await logService.error('Erro ao criar tipo de notificação', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }, {
        action: 'CREATE_NOTIFICATION_TYPE_ERROR',
        resource: 'notification-types',
        method: 'POST',
        path: '/api/notification-types',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
      })
      
      if (error instanceof z.ZodError) {
        return c.json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors
        }, 400)
      }
      
      return c.json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      }, 500)
    }
  }

  /**
   * Lista tipos de notificação ativos
   * GET /api/notification-types
   */
  async listTypes(c: Context) {
    try {
      const types = await notificationService.getActiveNotificationTypes()
      
      return c.json({
        success: true,
        data: types
      })
    } catch (error) {
      await logService.error('Erro ao listar tipos de notificação', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }, {
        action: 'LIST_NOTIFICATION_TYPES_ERROR',
        resource: 'notification-types',
        method: 'GET',
        path: '/api/notification-types',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
      })
      
      return c.json({
        success: false,
        message: 'Erro interno do servidor'
      }, 500)
    }
  }

  // === PREFERÊNCIAS ===

  /**
   * Busca preferências do usuário autenticado
   * GET /api/notifications/preferences
   */
  async getMyPreferences(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({
          success: false,
          message: 'Usuário não autenticado'
        }, 401)
      }
      
      const preferences = await notificationService.getUserPreferences(user.id)
      
      return c.json({
        success: true,
        data: preferences
      })
    } catch (error) {
      await logService.error('Erro ao buscar preferências do usuário', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        userId: c.get('user')?.id
      }, {
        action: 'GET_USER_PREFERENCES_ERROR',
        resource: 'notification-preferences',
        method: 'GET',
        path: '/api/notifications/preferences',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
      })
      
      return c.json({
        success: false,
        message: 'Erro interno do servidor'
      }, 500)
    }
  }

  /**
   * Atualiza preferências do usuário
   * PUT /api/notifications/preferences/:typeId
   */
  async updatePreferences(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({
          success: false,
          message: 'Usuário não autenticado'
        }, 401)
      }
      
      const typeId = c.req.param('typeId')
      if (!typeId) {
        return c.json({
          success: false,
          message: 'ID do tipo de notificação é obrigatório'
        }, 400)
      }
      
      const body = await c.req.json()
      const validatedData = updatePreferencesSchema.parse(body)
      
      const preferences = await notificationService.updateUserPreferences(
        user.id,
        typeId,
        validatedData as UpdateNotificationPreferenceData
      )
      
      await logService.info('Preferências de notificação atualizadas', {
        userId: user.id,
        typeId,
        preferences: validatedData
      }, {
        action: 'UPDATE_NOTIFICATION_PREFERENCES',
        resource: 'notification-preferences',
        method: 'PUT',
        path: `/api/notifications/preferences/${typeId}`,
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
      })
      
      return c.json({
        success: true,
        message: 'Preferências atualizadas com sucesso',
        data: preferences
      })
    } catch (error) {
      await logService.error('Erro ao atualizar preferências', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        userId: c.get('user')?.id,
        typeId: c.req.param('typeId')
      }, {
        action: 'UPDATE_NOTIFICATION_PREFERENCES_ERROR',
        resource: 'notification-preferences',
        method: 'PUT',
        path: `/api/notifications/preferences/${c.req.param('typeId')}`,
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
      })
      
      if (error instanceof z.ZodError) {
        return c.json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors
        }, 400)
      }
      
      return c.json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      }, 500)
    }
  }
}

export const notificationController = new NotificationController()