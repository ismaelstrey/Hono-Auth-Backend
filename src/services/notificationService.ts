import { notificationRepository } from '@/repositories/notificationRepository'
import { emailService } from '@/services/emailService'
import { LogService } from '@/services/logService'
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
  SendNotificationResult,
  NotificationChannel,
  NotificationTemplateVariables,
  ProcessedTemplate
} from '@/types/notification'

export class NotificationService {
  private logService: LogService

  constructor() {
    this.logService = new LogService()
  }

  /**
   * Cria uma nova notificação
   */
  async createNotification(data: CreateNotificationData): Promise<Notification> {
    try {
      // Verifica se o tipo de notificação existe
      const type = await notificationRepository.findTypeByName(data.typeId)
      if (!type) {
        throw new Error(`Tipo de notificação '${data.typeId}' não encontrado`)
      }

      // Verifica as preferências do usuário
      const preferences = await this.getUserPreferences(data.userId, data.typeId)
      
      // Se o usuário desabilitou este canal, não cria a notificação
      if (!this.isChannelEnabled(preferences, data.channel)) {
        throw new Error(`Canal '${data.channel}' desabilitado para este usuário`)
      }

      const notification = await notificationRepository.create(data)

      await this.logService.info('Notificação criada', {
        notificationId: notification.id,
        userId: data.userId,
        type: data.typeId,
        channel: data.channel,
        priority: data.priority
      }, {
        action: 'CREATE_NOTIFICATION',
        resource: 'notifications',
        method: 'POST',
        path: '/api/notifications',
        ip: 'system'
      })

      return notification
    } catch (error) {
      await this.logService.error('Erro ao criar notificação', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        userId: data.userId,
        type: data.typeId
      }, {
        action: 'CREATE_NOTIFICATION_ERROR',
        resource: 'notifications',
        method: 'POST',
        path: '/api/notifications',
        ip: 'system'
      })
      throw error
    }
  }

  /**
   * Envia uma notificação
   */
  async sendNotification(notificationId: string): Promise<SendNotificationResult> {
    try {
      const notification = await notificationRepository.findById(notificationId)
      if (!notification) {
        return {
          success: false,
          message: 'Notificação não encontrada'
        }
      }

      if (notification.status !== 'pending') {
        return {
          success: false,
          message: `Notificação já foi processada (status: ${notification.status})`
        }
      }

      // Processa o template da notificação
      const processedTemplate = await this.processTemplate(
        notification.typeId,
        notification.channel,
        notification.data ? JSON.parse(notification.data) : {}
      )

      let result: SendNotificationResult

      switch (notification.channel) {
        case 'email':
          result = await this.sendEmailNotification(notification, processedTemplate)
          break
        case 'push':
          result = await this.sendPushNotification(notification, processedTemplate)
          break
        case 'sms':
          result = await this.sendSmsNotification(notification, processedTemplate)
          break
        case 'in_app':
          result = await this.sendInAppNotification(notification, processedTemplate)
          break
        default:
          result = {
            success: false,
            message: `Canal '${notification.channel}' não suportado`
          }
      }

      // Atualiza o status da notificação
      const newStatus = result.success ? 'sent' : 'failed'
      const additionalData = result.success ? {} : { failureReason: result.error || result.message }
      
      await notificationRepository.updateStatus(notificationId, newStatus, additionalData)

      await this.logService.info(`Notificação ${result.success ? 'enviada' : 'falhou'}`, {
        notificationId,
        channel: notification.channel,
        success: result.success,
        message: result.message
      }, {
        action: result.success ? 'SEND_NOTIFICATION_SUCCESS' : 'SEND_NOTIFICATION_FAILED',
        resource: 'notifications',
        method: 'POST',
        path: '/api/notifications/send',
        ip: 'system'
      })

      return {
        ...result,
        notificationId
      }
    } catch (error) {
      await this.logService.error('Erro ao enviar notificação', {
        notificationId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }, {
        action: 'SEND_NOTIFICATION_ERROR',
        resource: 'notifications',
        method: 'POST',
        path: '/api/notifications/send',
        ip: 'system'
      })

      return {
        success: false,
        message: 'Erro interno ao enviar notificação',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }

  /**
   * Processa notificações pendentes
   */
  async processPendingNotifications(limit: number = 100): Promise<void> {
    try {
      const pendingNotifications = await notificationRepository.findPendingNotifications(limit)
      
      await this.logService.info(`Processando ${pendingNotifications.length} notificações pendentes`, {
        count: pendingNotifications.length
      }, {
        action: 'PROCESS_PENDING_NOTIFICATIONS',
        resource: 'notifications',
        method: 'POST',
        path: '/api/notifications/process',
        ip: 'system'
      })

      const results = await Promise.allSettled(
        pendingNotifications.map(notification => 
          this.sendNotification(notification.id)
        )
      )

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
      const failed = results.length - successful

      await this.logService.info('Processamento de notificações concluído', {
        total: results.length,
        successful,
        failed
      }, {
        action: 'PROCESS_NOTIFICATIONS_COMPLETED',
        resource: 'notifications',
        method: 'POST',
        path: '/api/notifications/process',
        ip: 'system'
      })
    } catch (error) {
      await this.logService.error('Erro ao processar notificações pendentes', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }, {
        action: 'PROCESS_NOTIFICATIONS_ERROR',
        resource: 'notifications',
        method: 'POST',
        path: '/api/notifications/process',
        ip: 'system'
      })
      throw error
    }
  }

  /**
   * Busca notificações com filtros
   */
  async getNotifications(filters: NotificationFilters): Promise<Notification[]> {
    return await notificationRepository.findMany(filters)
  }

  /**
   * Marca notificação como lida
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification | null> {
    const notification = await notificationRepository.findById(notificationId)
    
    if (!notification || notification.userId !== userId) {
      throw new Error('Notificação não encontrada ou acesso negado')
    }

    if (notification.status === 'read') {
      return notification
    }

    return await notificationRepository.updateStatus(notificationId, 'read')
  }

  /**
   * Obtém estatísticas de notificações
   */
  async getStats(userId?: string, startDate?: Date, endDate?: Date): Promise<NotificationStats> {
    return await notificationRepository.getStats(userId, startDate, endDate)
  }

  // === TIPOS DE NOTIFICAÇÃO ===

  /**
   * Cria um novo tipo de notificação
   */
  async createNotificationType(data: CreateNotificationTypeData): Promise<NotificationType> {
    const existingType = await notificationRepository.findTypeByName(data.name)
    if (existingType) {
      throw new Error(`Tipo de notificação '${data.name}' já existe`)
    }

    return await notificationRepository.createType(data)
  }

  /**
   * Busca tipos de notificação ativos
   */
  async getActiveNotificationTypes(): Promise<NotificationType[]> {
    return await notificationRepository.findActiveTypes()
  }

  // === PREFERÊNCIAS ===

  /**
   * Busca preferências do usuário
   */
  async getUserPreferences(userId: string, typeId?: string): Promise<NotificationPreference | NotificationPreference[]> {
    if (typeId) {
      const preference = await notificationRepository.findUserPreference(userId, typeId)
      return preference || this.getDefaultPreference(userId, typeId)
    }
    
    return await notificationRepository.findUserPreferences(userId)
  }

  /**
   * Atualiza preferências do usuário
   */
  async updateUserPreferences(
    userId: string,
    typeId: string,
    data: UpdateNotificationPreferenceData
  ): Promise<NotificationPreference> {
    return await notificationRepository.upsertUserPreference(userId, typeId, data)
  }

  // === MÉTODOS PRIVADOS ===

  /**
   * Verifica se um canal está habilitado para o usuário
   */
  private isChannelEnabled(preferences: NotificationPreference | NotificationPreference[], channel: NotificationChannel): boolean {
    if (Array.isArray(preferences)) {
      return true // Se não há preferência específica, assume habilitado
    }

    if (!preferences) {
      return true // Preferência padrão é habilitado
    }

    switch (channel) {
      case 'email': return preferences.email
      case 'push': return preferences.push
      case 'sms': return preferences.sms
      case 'in_app': return preferences.inApp
      default: return false
    }
  }

  /**
   * Retorna preferência padrão para um usuário/tipo
   */
  private getDefaultPreference(userId: string, typeId: string): NotificationPreference {
    return {
      id: '',
      userId,
      typeId,
      email: true,
      push: true,
      sms: false,
      inApp: true,
      frequency: 'immediate',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  /**
   * Processa template de notificação
   */
  private async processTemplate(
    typeId: string,
    channel: NotificationChannel,
    variables: NotificationTemplateVariables
  ): Promise<ProcessedTemplate> {
    const template = await notificationRepository.findTemplate(typeId, channel)
    
    if (!template) {
      return {
        title: 'Notificação',
        body: 'Você tem uma nova notificação.'
      }
    }

    return {
      subject: template.subject ? this.replaceVariables(template.subject, variables) : undefined,
      title: template.title ? this.replaceVariables(template.title, variables) : undefined,
      body: this.replaceVariables(template.body, variables),
      htmlBody: template.htmlBody ? this.replaceVariables(template.htmlBody, variables) : undefined
    }
  }

  /**
   * Substitui variáveis no template
   */
  private replaceVariables(template: string, variables: NotificationTemplateVariables): string {
    let result = template
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      result = result.replace(regex, String(value))
    })

    return result
  }

  /**
   * Envia notificação por email
   */
  private async sendEmailNotification(
    notification: Notification,
    template: ProcessedTemplate
  ): Promise<SendNotificationResult> {
    try {
      // Integra com o emailService existente
      const result = await emailService.sendVerificationEmail({
        email: (notification as any).user.email,
        name: (notification as any).user.name,
        token: '' // Para notificações gerais, não precisamos de token
      })

      return {
        success: result.success,
        message: result.message
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao enviar email',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }

  /**
   * Envia notificação push (simulado)
   */
  private async sendPushNotification(
    notification: Notification,
    template: ProcessedTemplate
  ): Promise<SendNotificationResult> {
    // Simulação - em produção, integrar com serviço de push (Firebase, etc.)
    console.log('📱 PUSH NOTIFICATION (SIMULADO):')
    console.log('Para:', (notification as any).user.name)
    console.log('Título:', template.title || notification.title)
    console.log('Mensagem:', template.body || notification.message)
    
    return {
      success: true,
      message: 'Notificação push enviada (simulado)'
    }
  }

  /**
   * Envia notificação SMS (simulado)
   */
  private async sendSmsNotification(
    notification: Notification,
    template: ProcessedTemplate
  ): Promise<SendNotificationResult> {
    // Simulação - em produção, integrar com serviço de SMS (Twilio, etc.)
    console.log('📱 SMS NOTIFICATION (SIMULADO):')
    console.log('Para:', (notification as any).user.name)
    console.log('Mensagem:', template.body || notification.message)
    
    return {
      success: true,
      message: 'SMS enviado (simulado)'
    }
  }

  /**
   * Envia notificação in-app
   */
  private async sendInAppNotification(
    notification: Notification,
    template: ProcessedTemplate
  ): Promise<SendNotificationResult> {
    // Para notificações in-app, apenas marcamos como enviada
    // O frontend buscará as notificações via API
    return {
      success: true,
      message: 'Notificação in-app criada'
    }
  }

  /**
   * Limpa notificações antigas
   */
  async cleanup(daysToKeep: number): Promise<number> {
    const deletedCount = await notificationRepository.cleanup(daysToKeep)
    
    await this.logService.info('Limpeza de notificações concluída', {
      deletedCount,
      daysToKeep
    }, {
      action: 'CLEANUP_NOTIFICATIONS',
      resource: 'notifications',
      method: 'POST',
      path: '/api/notifications/cleanup',
      ip: 'system'
    })

    return deletedCount
  }
}

export const notificationService = new NotificationService()