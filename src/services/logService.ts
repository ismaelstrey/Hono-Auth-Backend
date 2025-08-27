import { LogRepository } from '@/repositories/logRepository'
import { prisma } from '@/config/database'
import type { LogEntry, LogFilters, LogStats, LogLevel } from '@/types'
import type { PaginationParams, PaginatedResult, SortParams, FilterParams } from '@/utils/pagination'
import { InternalServerError } from '@/utils/errors'
import { env } from '@/config/env'

/**
 * Serviço de logging estruturado
 */
export class LogService {
  private logRepository: LogRepository
  private maxLogEntries: number
  private logLevel: LogLevel

  constructor() {
    this.logRepository = new LogRepository(prisma)
    this.maxLogEntries = env.LOG_MAX_ENTRIES
    this.logLevel = env.LOG_LEVEL as LogLevel
  }

  /**
   * Registra um log
   */
  async log(logData: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      // Verifica se o nível do log deve ser registrado
      if (!this.shouldLog(logData.level || 'info')) {
        return
      }

      const logEntry: Omit<LogEntry, 'id'> = {
        ...logData,
        timestamp: new Date(),
        level: logData.level || this.determineLogLevel(logData.statusCode, logData.error)
      }

      // Salva no banco de dados
      await this.logRepository.create(logEntry as Omit<LogEntry, 'id'>)

      // Log no console em desenvolvimento
      if (process.env.NODE_ENV !== 'production') {
        this.logToConsole(logEntry as LogEntry)
      }

      // Limpa logs antigos periodicamente
      await this.cleanupOldLogsIfNeeded()
    } catch (error) {
      // Em caso de erro no logging, apenas registra no console para não quebrar a aplicação
      console.error('Erro ao registrar log:', error)
    }
  }

  /**
   * Registra log de erro
   */
  async error(message: string, metadata?: Record<string, unknown>, context?: {
    userId?: string
    action?: string
    resource?: string
    method?: string
    path?: string
    ip?: string
  }): Promise<void> {
    await this.log({
      userId: context?.userId,
      action: context?.action || 'ERROR',
      resource: context?.resource || 'system',
      method: context?.method || 'UNKNOWN',
      path: context?.path || '/unknown',
      statusCode: 500,
      ip: context?.ip || 'unknown',
      error: message,
      level: 'error',
      metadata
    })
  }

  /**
   * Registra log de aviso
   */
  async warn(message: string, metadata?: Record<string, unknown>, context?: {
    userId?: string
    action?: string
    resource?: string
    method?: string
    path?: string
    ip?: string
  }): Promise<void> {
    await this.log({
      userId: context?.userId,
      action: context?.action || 'WARN',
      resource: context?.resource || 'system',
      method: context?.method || 'UNKNOWN',
      path: context?.path || '/unknown',
      statusCode: 400,
      ip: context?.ip || 'unknown',
      error: message,
      level: 'warn',
      metadata
    })
  }

  /**
   * Registra log de informação
   */
  async info(message: string, metadata?: Record<string, unknown>, context?: {
    userId?: string
    action?: string
    resource?: string
    method?: string
    path?: string
    ip?: string
  }): Promise<void> {
    await this.log({
      userId: context?.userId,
      action: context?.action || 'INFO',
      resource: context?.resource || 'system',
      method: context?.method || 'UNKNOWN',
      path: context?.path || '/unknown',
      statusCode: 200,
      ip: context?.ip || 'unknown',
      level: 'info',
      metadata
    })
  }

  /**
   * Registra log de debug
   */
  async debug(message: string, metadata?: Record<string, unknown>, context?: {
    userId?: string
    action?: string
    resource?: string
    method?: string
    path?: string
    ip?: string
  }): Promise<void> {
    await this.log({
      userId: context?.userId,
      action: context?.action || 'DEBUG',
      resource: context?.resource || 'system',
      method: context?.method || 'UNKNOWN',
      path: context?.path || '/unknown',
      statusCode: 200,
      ip: context?.ip || 'unknown',
      level: 'debug',
      metadata
    })
  }

  /**
   * Busca logs com filtros
   */
  async getLogs(filters: LogFilters): Promise<{
    logs: LogEntry[]
    total: number
    page: number
    totalPages: number
  }> {
    try {
      const limit = Math.min(filters.limit || 50, 100)
      const offset = (filters.offset || 0)
      const page = Math.floor(offset / limit) + 1

      const [logs, total] = await Promise.all([
        this.logRepository.findMany({ ...filters, limit, offset }),
        this.logRepository.count(filters)
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        logs,
        total,
        page,
        totalPages
      }
    } catch (error) {
      throw new InternalServerError('Erro ao buscar logs', error)
    }
  }

  /**
   * Busca logs com paginação, ordenação e filtros avançados
   */
  async getLogsAdvanced(
    pagination: PaginationParams,
    sort: SortParams,
    filters: FilterParams
  ): Promise<PaginatedResult<LogEntry>> {
    try {
      return await this.logRepository.findManyAdvanced(pagination, sort, filters)
    } catch (error) {
      throw new InternalServerError('Erro ao buscar logs avançados', error)
    }
  }

  /**
   * Obtém estatísticas de logs
   */
  async getStats(filters: {
    startDate?: Date
    endDate?: Date
  } = {}): Promise<LogStats> {
    try {
      return await this.logRepository.getStats(filters)
    } catch (error) {
      throw new InternalServerError('Erro ao obter estatísticas de logs', error)
    }
  }

  /**
   * Remove logs antigos
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    try {
      return await this.logRepository.deleteOldLogs(daysToKeep)
    } catch (error) {
      throw new InternalServerError('Erro ao limpar logs antigos', error)
    }
  }

  /**
   * Verifica se deve registrar o log baseado no nível configurado
   */
  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const logLevelIndex = levels.indexOf(level)

    return logLevelIndex >= currentLevelIndex
  }

  /**
   * Determina o nível do log baseado no status code e erro
   */
  private determineLogLevel(statusCode: number, error?: string): string {
    if (error || statusCode >= 500) return 'error'
    if (statusCode >= 400) return 'warn'
    return 'info'
  }

  /**
   * Registra log no console com formatação
   */
  private logToConsole(logEntry: LogEntry): void {
    const { method, path, statusCode, duration, userId, ip, level, error } = logEntry
    const userInfo = userId ? ` [User: ${userId}]` : ''
    const durationInfo = duration ? ` ${duration}ms` : ''
    const errorInfo = error ? ` - ${error}` : ''
    const statusColor = this.getStatusColor(statusCode)
    const levelColor = this.getLevelColor(level || 'info')

    console.log(
      `${levelColor}[${level?.toUpperCase()}]\x1b[0m ${statusColor}${method} ${path} ${statusCode}\x1b[0m${durationInfo} [${ip}]${userInfo}${errorInfo}`
    )
  }

  /**
   * Obtém cor para o status code
   */
  private getStatusColor(statusCode: number): string {
    if (statusCode >= 500) return '\x1b[31m' // Vermelho
    if (statusCode >= 400) return '\x1b[33m' // Amarelo
    if (statusCode >= 300) return '\x1b[36m' // Ciano
    if (statusCode >= 200) return '\x1b[32m' // Verde
    return '\x1b[0m' // Reset
  }

  /**
   * Obtém cor para o nível do log
   */
  private getLevelColor(level: string): string {
    switch (level) {
    case 'error': return '\x1b[31m' // Vermelho
    case 'warn': return '\x1b[33m' // Amarelo
    case 'info': return '\x1b[36m' // Ciano
    case 'debug': return '\x1b[35m' // Magenta
    default: return '\x1b[0m' // Reset
    }
  }

  /**
   * Limpa logs antigos se necessário (executado periodicamente)
   */
  private async cleanupOldLogsIfNeeded(): Promise<void> {
    // Executa limpeza apenas ocasionalmente para não impactar performance
    if (Math.random() < 0.01) { // 1% de chance
      try {
        await this.cleanupOldLogs(30) // Mantém logs dos últimos 30 dias
      } catch (error) {
        console.error('Erro na limpeza automática de logs:', error)
      }
    }
  }
}

// Instância singleton do serviço de logs
export const logService = new LogService()