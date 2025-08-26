import type { Context } from 'hono'
import { logService } from '@/services/logService'
import { successResponse, errorResponse } from '@/utils/helpers'
import type { LogFilters, LogLevel } from '@/types'

/**
 * Controller para gerenciamento de logs
 */
export class LogController {
  /**
   * Lista logs com filtros e paginação
   */
  static async getLogs(c: Context) {
    try {
      const query = c.req.query()
      
      const filters: LogFilters = {
        userId: query.userId,
        action: query.action,
        resource: query.resource,
        level: query.level as LogLevel,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit: query.limit ? parseInt(query.limit) : 50,
        offset: query.offset ? parseInt(query.offset) : 0
      }

      const result = await logService.getLogs(filters)
      
      return c.json(successResponse(result, 'Logs obtidos com sucesso'))
    } catch (error: any) {
      return c.json(errorResponse(error.message), 500)
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
    } catch (error: any) {
      return c.json(errorResponse(error.message), 500)
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
    } catch (error: any) {
      return c.json(errorResponse(error.message), 500)
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
    } catch (error: any) {
      return c.json(errorResponse(error.message), 500)
    }
  }

  /**
   * Obtém logs de um usuário específico
   */
  static async getUserLogs(c: Context) {
    try {
      const userId = c.req.param('userId')
      const query = c.req.query()
      
      const filters: LogFilters = {
        userId,
        action: query.action,
        resource: query.resource,
        level: query.level as LogLevel,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit: query.limit ? parseInt(query.limit) : 50,
        offset: query.offset ? parseInt(query.offset) : 0
      }

      const result = await logService.getLogs(filters)
      
      return c.json(successResponse(result, 'Logs do usuário obtidos com sucesso'))
    } catch (error: any) {
      return c.json(errorResponse(error.message), 500)
    }
  }

  /**
   * Obtém logs de erro (para monitoramento)
   */
  static async getErrorLogs(c: Context) {
    try {
      const query = c.req.query()
      
      const filters: LogFilters = {
        level: 'error' as LogLevel,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit: query.limit ? parseInt(query.limit) : 100,
        offset: query.offset ? parseInt(query.offset) : 0
      }

      const result = await logService.getLogs(filters)
      
      return c.json(successResponse(result, 'Logs de erro obtidos com sucesso'))
    } catch (error: any) {
      return c.json(errorResponse(error.message), 500)
    }
  }

  /**
   * Obtém resumo de atividades recentes
   */
  static async getRecentActivity(c: Context) {
    try {
      const query = c.req.query()
      const hours = parseInt(query.hours || '24')
      
      const startDate = new Date()
      startDate.setHours(startDate.getHours() - hours)
      
      const filters: LogFilters = {
        startDate,
        limit: 100
      }

      const result = await logService.getLogs(filters)
      
      return c.json(successResponse(
        result, 
        `Atividades das últimas ${hours} horas obtidas com sucesso`
      ))
    } catch (error: any) {
      return c.json(errorResponse(error.message), 500)
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