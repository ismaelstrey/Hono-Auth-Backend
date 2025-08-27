import { prisma } from '@/config/database'
import type {
  Notification,
  NotificationType,
  NotificationPreference,
  NotificationTemplate,
  CreateNotificationData,
  CreateNotificationTypeData,
  UpdateNotificationPreferenceData,
  NotificationFilters,
  NotificationStats,
  NotificationChannel,
  NotificationPriority
} from '@/types/notification'
import type { PaginationParams, PaginatedResult, SortParams, FilterParams } from '@/utils/pagination'
import { createPaginatedResult, parseDateFilters } from '@/utils/pagination'

export class NotificationRepository {
  /**
   * Cria uma nova notificação
   */
  async create(data: CreateNotificationData): Promise<Notification> {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        typeId: data.typeId,
        title: data.title,
        message: data.message,
        data: data.data ? JSON.stringify(data.data) : null,
        channel: data.channel,
        priority: data.priority || 'normal',
        scheduledFor: data.scheduledFor
      },
      include: {
        user: true,
        type: true
      }
    })

    return notification as Notification
  }

  /**
   * Busca notificação por ID
   */
  async findById(id: string): Promise<Notification | null> {
    const notification = await prisma.notification.findUnique({
      where: { id },
      include: {
        user: true,
        type: true
      }
    })

    return notification as Notification | null
  }

  /**
   * Busca notificações com paginação, filtros e busca avançados
   */
  async findManyAdvanced(
    pagination: PaginationParams,
    sort: SortParams = {},
    filters: FilterParams = {}
  ): Promise<PaginatedResult<Notification>> {
    const whereClause = this.buildNotificationWhereClause(filters)
    const orderBy = this.buildNotificationOrderBy(sort)

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        skip: pagination.offset,
        take: pagination.limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          type: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        }
      }),
      prisma.notification.count({ where: whereClause })
    ])

    return createPaginatedResult(notifications as Notification[], total, pagination)
  }

  /**
   * Busca notificações com filtros (método legado)
   */
  async findMany(filters: NotificationFilters): Promise<Notification[]> {
    const where: any = {}

    if (filters.userId) where.userId = filters.userId
    if (filters.typeId) where.typeId = filters.typeId
    if (filters.channel) where.channel = filters.channel
    if (filters.status) where.status = filters.status
    if (filters.priority) where.priority = filters.priority
    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) where.createdAt.gte = filters.startDate
      if (filters.endDate) where.createdAt.lte = filters.endDate
    }

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        user: true,
        type: true
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50,
      skip: filters.offset || 0
    })

    return notifications as Notification[]
  }

  /**
   * Constrói cláusula WHERE para notificações
   */
  private buildNotificationWhereClause(filters: FilterParams): any {
    const where: any = {}

    if (filters.userId) where.userId = filters.userId
    if (filters.typeId) where.typeId = filters.typeId
    if (filters.channel) where.channel = filters.channel
    if (filters.status) where.status = filters.status
    if (filters.priority) where.priority = filters.priority
    if (filters.read !== undefined) where.readAt = filters.read ? { not: null } : null

    // Filtros de data
     const dateFilters = parseDateFilters(filters)
     if (dateFilters.dateFrom || dateFilters.dateTo) {
       where.createdAt = {}
       if (dateFilters.dateFrom) where.createdAt.gte = dateFilters.dateFrom
       if (dateFilters.dateTo) where.createdAt.lte = dateFilters.dateTo
     }

    // Busca por texto
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { message: { contains: filters.search, mode: 'insensitive' } }
      ]
    }

    return where
  }

  /**
    * Constrói cláusula ORDER BY para notificações
    */
   private buildNotificationOrderBy(sort: SortParams): any {
     const validSortFields = ['createdAt', 'updatedAt', 'title', 'priority', 'status', 'readAt']
     
     if (sort.sortBy && validSortFields.includes(sort.sortBy)) {
       return { [sort.sortBy]: sort.sortOrder || 'desc' }
     }

     return { createdAt: 'desc' }
   }

  /**
   * Atualiza status da notificação
   */
  async updateStatus(id: string, status: string, additionalData?: any): Promise<Notification | null> {
    const updateData: any = { status }

    if (status === 'sent') updateData.sentAt = new Date()
    if (status === 'read') updateData.readAt = new Date()
    if (additionalData?.failureReason) updateData.failureReason = additionalData.failureReason
    if (additionalData?.retryCount !== undefined) updateData.retryCount = additionalData.retryCount

    const notification = await prisma.notification.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        type: true
      }
    })

    return notification as Notification
  }

  /**
   * Busca notificações pendentes para envio
   */
  async findPendingNotifications(limit: number = 100): Promise<Notification[]> {
    const notifications = await prisma.notification.findMany({
      where: {
        status: 'pending',
        OR: [
          { scheduledFor: null },
          { scheduledFor: { lte: new Date() } }
        ]
      },
      include: {
        user: true,
        type: true
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      take: limit
    })

    return notifications as Notification[]
  }

  /**
   * Obtém estatísticas de notificações
   */
  async getStats(userId?: string, startDate?: Date, endDate?: Date): Promise<NotificationStats> {
    const where: any = {}
    if (userId) where.userId = userId
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) where.createdAt.lte = endDate
    }

    const [total, statusStats, channelStats, priorityStats] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.groupBy({
        by: ['status'],
        where,
        _count: { status: true }
      }),
      prisma.notification.groupBy({
        by: ['channel'],
        where,
        _count: { channel: true }
      }),
      prisma.notification.groupBy({
        by: ['priority'],
        where,
        _count: { priority: true }
      })
    ])

    const stats: NotificationStats = {
      total,
      pending: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      read: 0,
      byChannel: {} as Record<NotificationChannel, number>,
      byPriority: {} as any
    }

    // Processa estatísticas por status
    statusStats.forEach(stat => {
      switch (stat.status) {
        case 'pending': stats.pending = stat._count.status; break
        case 'sent': stats.sent = stat._count.status; break
        case 'delivered': stats.delivered = stat._count.status; break
        case 'failed': stats.failed = stat._count.status; break
        case 'read': stats.read = stat._count.status; break
      }
    })

    // Processa estatísticas por canal
    channelStats.forEach(stat => {
      stats.byChannel[stat.channel as NotificationChannel] = stat._count.channel
    })

    // Processa estatísticas por prioridade
    priorityStats.forEach(stat => {
      stats.byPriority[stat.priority as NotificationPriority] = stat._count.priority
    })

    return stats
  }

  // === TIPOS DE NOTIFICAÇÃO ===

  /**
   * Cria um novo tipo de notificação
   */
  async createType(data: CreateNotificationTypeData): Promise<NotificationType> {
    const type = await prisma.notificationType.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        isActive: data.isActive ?? true
      }
    })

    return type as NotificationType
  }

  /**
   * Busca tipo de notificação por nome
   */
  async findTypeByName(name: string): Promise<NotificationType | null> {
    const type = await prisma.notificationType.findUnique({
      where: { name }
    })

    return type as NotificationType | null
  }

  /**
   * Busca todos os tipos de notificação ativos
   */
  async findActiveTypes(): Promise<NotificationType[]> {
    const types = await prisma.notificationType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })

    return types as NotificationType[]
  }

  // === PREFERÊNCIAS DE NOTIFICAÇÃO ===

  /**
   * Busca preferências do usuário para um tipo específico
   */
  async findUserPreference(userId: string, typeId: string): Promise<NotificationPreference | null> {
    const preference = await prisma.notificationPreference.findUnique({
      where: {
        userId_typeId: {
          userId,
          typeId
        }
      },
      include: {
        user: true,
        type: true
      }
    })

    return preference as NotificationPreference | null
  }

  /**
   * Busca todas as preferências do usuário
   */
  async findUserPreferences(userId: string): Promise<NotificationPreference[]> {
    const preferences = await prisma.notificationPreference.findMany({
      where: { userId },
      include: {
        user: true,
        type: true
      },
      orderBy: { type: { name: 'asc' } }
    })

    return preferences as NotificationPreference[]
  }

  /**
   * Cria ou atualiza preferência do usuário
   */
  async upsertUserPreference(
    userId: string,
    typeId: string,
    data: UpdateNotificationPreferenceData
  ): Promise<NotificationPreference> {
    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_typeId: {
          userId,
          typeId
        }
      },
      create: {
        userId,
        typeId,
        email: data.email ?? true,
        push: data.push ?? true,
        sms: data.sms ?? false,
        inApp: data.inApp ?? true,
        frequency: data.frequency ?? 'immediate'
      },
      update: {
        email: data.email,
        push: data.push,
        sms: data.sms,
        inApp: data.inApp,
        frequency: data.frequency
      },
      include: {
        user: true,
        type: true
      }
    })

    return preference as NotificationPreference
  }

  // === TEMPLATES ===

  /**
   * Busca template por tipo, canal e idioma
   */
  async findTemplate(
    typeId: string,
    channel: NotificationChannel,
    language: string = 'pt-BR'
  ): Promise<NotificationTemplate | null> {
    const template = await prisma.notificationTemplate.findUnique({
      where: {
        typeId_channel_language: {
          typeId,
          channel,
          language
        }
      },
      include: {
        type: true
      }
    })

    return template as NotificationTemplate | null
  }

  /**
   * Busca templates por tipo
   */
  async findTemplatesByType(typeId: string): Promise<NotificationTemplate[]> {
    const templates = await prisma.notificationTemplate.findMany({
      where: { typeId, isActive: true },
      include: {
        type: true
      },
      orderBy: [{ channel: 'asc' }, { language: 'asc' }]
    })

    return templates as NotificationTemplate[]
  }

  /**
   * Limpa notificações antigas
   */
  async cleanup(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        },
        status: {
          in: ['sent', 'delivered', 'read', 'failed']
        }
      }
    })

    return result.count
  }
}

export const notificationRepository = new NotificationRepository()