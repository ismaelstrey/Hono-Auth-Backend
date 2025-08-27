import { PrismaClient } from '@prisma/client'
import type { LogEntry } from '@/types'
import { DatabaseError } from '@/utils/errors'
import type { PaginationParams, PaginatedResult, SortParams, FilterParams } from '@/utils/pagination'
import { createPaginatedResult, createSearchQuery, parseDateFilters } from '@/utils/pagination'

/**
 * Repositório para operações de logs usando Prisma
 */
export class LogRepository {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Cria um novo log
   */
  async create(logData: Omit<LogEntry, 'id'>): Promise<LogEntry> {
    try {
      const log = await this.prisma.log.create({
        data: {
          userId: logData.userId,
          action: logData.action,
          resource: logData.resource,
          method: logData.method,
          path: logData.path,
          statusCode: logData.statusCode,
          userAgent: logData.userAgent,
          ip: logData.ip,
          timestamp: logData.timestamp,
          duration: logData.duration,
          error: logData.error,
          level: this.determineLogLevel(logData.statusCode, logData.error),
          metadata: logData.metadata ? JSON.stringify(logData.metadata) : null
        }
      })

      return this.mapPrismaLogToLogEntry(log)
    } catch (error) {
      throw new DatabaseError('Erro ao criar log', error)
    }
  }

  /**
   * Busca logs com paginação, filtros e busca avançados
   */
  async findManyAdvanced(
    pagination: PaginationParams,
    sort: SortParams = {},
    filters: FilterParams = {}
  ): Promise<PaginatedResult<LogEntry>> {
    try {
      const whereClause = this.buildLogWhereClause(filters)
      const orderBy = this.buildLogOrderBy(sort)

      const [logs, total] = await Promise.all([
        this.prisma.log.findMany({
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
            }
          }
        }),
        this.prisma.log.count({ where: whereClause })
      ])

      const mappedLogs = logs.map(log => this.mapPrismaLogToLogEntry(log))
      return createPaginatedResult(mappedLogs, total, pagination)
    } catch (error) {
      throw new DatabaseError('Erro ao buscar logs', error)
    }
  }

  /**
   * Busca logs com filtros (método legado)
   */
  async findMany(filters: {
    userId?: string
    action?: string
    resource?: string
    level?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  } = {}): Promise<LogEntry[]> {
    try {
      const where: any = {}

      if (filters.userId) where.userId = filters.userId
      if (filters.action) where.action = filters.action
      if (filters.resource) where.resource = filters.resource
      if (filters.level) where.level = filters.level
      
      if (filters.startDate || filters.endDate) {
        where.timestamp = {}
        if (filters.startDate) where.timestamp.gte = filters.startDate
        if (filters.endDate) where.timestamp.lte = filters.endDate
      }

      const logs = await this.prisma.log.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      return logs.map(log => this.mapPrismaLogToLogEntry(log))
    } catch (error) {
      throw new DatabaseError('Erro ao buscar logs', error)
    }
  }

  /**
   * Conta logs com filtros
   */
  async count(filters: {
    userId?: string
    action?: string
    resource?: string
    level?: string
    startDate?: Date
    endDate?: Date
  } = {}): Promise<number> {
    try {
      const where: any = {}

      if (filters.userId) where.userId = filters.userId
      if (filters.action) where.action = filters.action
      if (filters.resource) where.resource = filters.resource
      if (filters.level) where.level = filters.level
      
      if (filters.startDate || filters.endDate) {
        where.timestamp = {}
        if (filters.startDate) where.timestamp.gte = filters.startDate
        if (filters.endDate) where.timestamp.lte = filters.endDate
      }

      return await this.prisma.log.count({ where })
    } catch (error) {
      throw new DatabaseError('Erro ao contar logs', error)
    }
  }

  /**
   * Remove logs antigos
   */
  async deleteOldLogs(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const result = await this.prisma.log.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      })

      return result.count
    } catch (error) {
      throw new DatabaseError('Erro ao limpar logs antigos', error)
    }
  }

  /**
   * Obtém estatísticas de logs
   */
  async getStats(filters: {
    startDate?: Date
    endDate?: Date
  } = {}): Promise<{
    total: number
    byLevel: Record<string, number>
    byAction: Record<string, number>
    byResource: Record<string, number>
    errorRate: number
  }> {
    try {
      const where: any = {}
      
      if (filters.startDate || filters.endDate) {
        where.timestamp = {}
        if (filters.startDate) where.timestamp.gte = filters.startDate
        if (filters.endDate) where.timestamp.lte = filters.endDate
      }

      const [total, byLevel, byAction, byResource, errors] = await Promise.all([
        this.prisma.log.count({ where }),
        this.prisma.log.groupBy({
          by: ['level'],
          where,
          _count: { level: true }
        }),
        this.prisma.log.groupBy({
          by: ['action'],
          where,
          _count: { action: true }
        }),
        this.prisma.log.groupBy({
          by: ['resource'],
          where,
          _count: { resource: true }
        }),
        this.prisma.log.count({
          where: {
            ...where,
            level: 'error'
          }
        })
      ])

      return {
        total,
        byLevel: byLevel.reduce((acc, item) => {
          acc[item.level] = item._count.level
          return acc
        }, {} as Record<string, number>),
        byAction: byAction.reduce((acc, item) => {
          acc[item.action] = item._count.action
          return acc
        }, {} as Record<string, number>),
        byResource: byResource.reduce((acc, item) => {
          acc[item.resource] = item._count.resource
          return acc
        }, {} as Record<string, number>),
        errorRate: total > 0 ? (errors / total) * 100 : 0
      }
    } catch (error) {
      throw new DatabaseError('Erro ao obter estatísticas de logs', error)
    }
  }

  /**
   * Determina o nível do log baseado no status code e erro
   */
  private determineLogLevel(statusCode: number, error?: string): string {
    if (error || statusCode >= 500) return 'error'
    if (statusCode >= 400) return 'warn'
    if (statusCode >= 300) return 'info'
    return 'info'
  }

  /**
   * Constrói cláusula WHERE para logs
   */
  private buildLogWhereClause(filters: FilterParams): any {
    const where: any = {}

    // Filtros de texto
     if (filters.search) {
       const searchFields = ['action', 'resource', 'path', 'error']
       const searchQuery = createSearchQuery(filters.search, searchFields)
       Object.assign(where, searchQuery)
     }

    // Filtros específicos
    if (filters.userId) where.userId = filters.userId
    if (filters.action) where.action = filters.action
    if (filters.resource) where.resource = filters.resource
    if (filters.level) where.level = filters.level
    if (filters.method) where.method = filters.method
    if (filters.statusCode) where.statusCode = filters.statusCode

    // Filtros de data
    const dateFilters = parseDateFilters(filters)
    if (dateFilters.dateFrom || dateFilters.dateTo) {
      where.timestamp = {}
      if (dateFilters.dateFrom) where.timestamp.gte = dateFilters.dateFrom
      if (dateFilters.dateTo) where.timestamp.lte = dateFilters.dateTo
    }

    return where
  }

  /**
   * Constrói cláusula ORDER BY para logs
   */
  private buildLogOrderBy(sort: SortParams): any {
    const validSortFields = ['timestamp', 'action', 'resource', 'level', 'statusCode', 'duration']
    const sortField = validSortFields.includes(sort.sortBy || '') ? sort.sortBy : 'timestamp'
    const sortOrder = sort.sortOrder === 'asc' ? 'asc' : 'desc'

    return { [sortField as string]: sortOrder }
  }

  /**
   * Mapeia log do Prisma para LogEntry
   */
  private mapPrismaLogToLogEntry(prismaLog: any): LogEntry {
    return {
      id: prismaLog.id,
      userId: prismaLog.userId,
      action: prismaLog.action,
      resource: prismaLog.resource,
      method: prismaLog.method,
      path: prismaLog.path,
      statusCode: prismaLog.statusCode,
      userAgent: prismaLog.userAgent,
      ip: prismaLog.ip,
      timestamp: prismaLog.timestamp,
      duration: prismaLog.duration,
      error: prismaLog.error,
      level: prismaLog.level,
      metadata: prismaLog.metadata ? JSON.parse(prismaLog.metadata) : undefined,
      user: prismaLog.user ? {
        id: prismaLog.user.id,
        name: prismaLog.user.name,
        email: prismaLog.user.email
      } : undefined
    }
  }
}