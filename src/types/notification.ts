export interface NotificationType {
  id: string
  name: string
  description?: string
  category: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Notification {
  id: string
  userId: string
  typeId: string
  title: string
  message: string
  data?: string
  channel: NotificationChannel
  status: NotificationStatus
  priority: NotificationPriority
  scheduledFor?: Date
  sentAt?: Date
  readAt?: Date
  failureReason?: string
  retryCount: number
  maxRetries: number
  createdAt: Date
  updatedAt: Date
}

export interface NotificationPreference {
  id: string
  userId: string
  typeId: string
  email: boolean
  push: boolean
  sms: boolean
  inApp: boolean
  frequency: NotificationFrequency
  createdAt: Date
  updatedAt: Date
}

export interface NotificationTemplate {
  id: string
  typeId: string
  channel: NotificationChannel
  language: string
  subject?: string
  title?: string
  body: string
  htmlBody?: string
  variables?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type NotificationChannel = 'email' | 'push' | 'sms' | 'in_app'
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read'
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'
export type NotificationFrequency = 'immediate' | 'daily' | 'weekly' | 'never'
export type NotificationCategory = 'auth' | 'profile' | 'system' | 'marketing'

export interface CreateNotificationData {
  userId: string
  typeId: string
  title: string
  message: string
  data?: Record<string, unknown>
  channel: NotificationChannel
  priority?: NotificationPriority
  scheduledFor?: Date
}

export interface CreateNotificationTypeData {
  name: string
  description?: string
  category: NotificationCategory
  isActive?: boolean
}

export interface UpdateNotificationPreferenceData {
  email?: boolean
  push?: boolean
  sms?: boolean
  inApp?: boolean
  frequency?: NotificationFrequency
}

export interface NotificationFilters {
  userId?: string
  typeId?: string
  channel?: NotificationChannel
  status?: NotificationStatus
  priority?: NotificationPriority
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface NotificationStats {
  total: number
  pending: number
  sent: number
  delivered: number
  failed: number
  read: number
  byChannel: Record<NotificationChannel, number>
  byPriority: Record<NotificationPriority, number>
}

export interface SendNotificationResult {
  success: boolean
  notificationId?: string
  message: string
  error?: string
}

export interface NotificationTemplateVariables {
  [key: string]: string | number | boolean | Date
}

export interface ProcessedTemplate {
  subject?: string
  title?: string
  body: string
  htmlBody?: string
}