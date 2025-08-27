import type { Context } from 'hono'
import { logService } from '@/services/logService'
import { successResponse, errorResponse } from '@/utils/helpers'
import { extractPaginationParams, extractSortParams, extractFilterParams } from '@/utils/pagination'

/**
 * Controller para gerenciamento de logs
 */
export class LogController {
  /**
   * Lista logs com filtros e paginação
   */
  static async getLogs(c: Context) {
    try {
      const pagination = extractPaginationParams(c)
      const sort = extractSortParams(c)
      const filters = extractFilterParams(c, ['userId', 'action', 'resource', 'level'])

      const result = await logService.getLogsAdvanced(pagination, sort, filters)

      return c.json(successResponse(result, 'Logs obtidos com sucesso'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }

  /**
   * Obtém estatísticas de logs
   */
  static async getStats(c: Context) {
    try {
      const query = c.req.query()

      const filters = {
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined
      }

      const stats = await logService.getStats(filters)

      return c.json(successResponse(stats, 'Estatísticas obtidas com sucesso'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }

  /**
   * Limpa logs antigos
   */
  static async cleanupLogs(c: Context) {
    try {
      const { daysToKeep } = await c.req.json()

      if (!daysToKeep || daysToKeep < 1) {
        return c.json(errorResponse('Número de dias deve ser maior que 0'), 400)
      }

      const deletedCount = await logService.cleanupOldLogs(daysToKeep)

      return c.json(successResponse(
        { deletedCount },
        `${deletedCount} logs antigos foram removidos`
      ))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }

  /**
   * Registra log manual (para testes ou eventos especiais)
   */
  static async createLog(c: Context) {
    try {
      const logData = await c.req.json()

      // Validações básicas
      if (!logData.action || !logData.resource) {
        return c.json(errorResponse('Action e resource são obrigatórios'), 400)
      }

      await logService.log({
        userId: logData.userId,
        action: logData.action,
        resource: logData.resource,
        method: logData.method || 'MANUAL',
        path: logData.path || '/manual',
        statusCode: logData.statusCode || 200,
        userAgent: c.req.header('User-Agent'),
        ip: getClientIP(c),
        duration: logData.duration,
        error: logData.error,
        level: logData.level || 'info',
        metadata: logData.metadata
      })

      return c.json(successResponse(null, 'Log registrado com sucesso'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }

  /**
   * Obtém logs de um usuário específico
   */
  static async getUserLogs(c: Context) {
    try {
      const userId = c.req.param('userId')
      
      const pagination = extractPaginationParams(c)
      const sort = extractSortParams(c)
      const filters = extractFilterParams(c, ['action', 'resource', 'level'])
      filters.userId = userId // Adiciona o userId específico

      const result = await logService.getLogsAdvanced(pagination, sort, filters)

      return c.json(successResponse(result, 'Logs do usuário obtidos com sucesso'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }

  /**
   * Obtém logs de erro (para monitoramento)
   */
  static async getErrorLogs(c: Context) {
    try {
      const pagination = extractPaginationParams(c)
      const sort = extractSortParams(c)
      const filters = extractFilterParams(c, ['userId', 'action', 'resource'])
      filters.level = 'error' // Força o filtro para logs de erro

      const result = await logService.getLogsAdvanced(pagination, sort, filters)

      return c.json(successResponse(result, 'Logs de erro obtidos com sucesso'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }

  /**
   * Obtém resumo de atividades recentes
   */
  static async getRecentActivity(c: Context) {
    try {
      const hours = parseInt(c.req.query('hours') || '24')

      const startDate = new Date()
      startDate.setHours(startDate.getHours() - hours)

      const pagination = extractPaginationParams(c)
      const sort = extractSortParams(c)
      const filters = extractFilterParams(c, ['userId', 'action', 'resource', 'level'])
      filters.startDate = startDate

      const result = await logService.getLogsAdvanced(pagination, sort, filters)

      return c.json(successResponse(
        result,
        `Atividades das últimas ${hours} horas obtidas com sucesso`
      ))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }
}

/**
 * Obtém o IP do cliente
 */
function getClientIP(c: Context): string {
  return c.req.header('X-Forwarded-For')?.split(',')[0].trim() ||
    c.req.header('X-Real-IP') ||
    c.req.header('CF-Connecting-IP') ||
    'unknown'
}