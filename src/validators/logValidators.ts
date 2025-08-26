import { z } from 'zod'
import { LogLevel } from '@/types'

/**
 * Schema para validação de filtros de logs
 */
export const logFiltersSchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  level: z.nativeEnum(LogLevel).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
})

/**
 * Schema para validação de criação manual de logs
 */
export const createLogSchema = z.object({
  userId: z.string().optional(),
  action: z.string().min(1, 'Ação é obrigatória'),
  resource: z.string().min(1, 'Recurso é obrigatório'),
  method: z.string().optional(),
  path: z.string().optional(),
  statusCode: z.number().int().min(100).max(599).optional(),
  duration: z.number().int().min(0).optional(),
  error: z.string().optional(),
  level: z.nativeEnum(LogLevel).default(LogLevel.INFO),
  metadata: z.record(z.any()).optional()
})

/**
 * Schema para validação de limpeza de logs
 */
export const cleanupLogsSchema = z.object({
  daysToKeep: z.number().int().min(1, 'Deve manter pelo menos 1 dia de logs')
})

/**
 * Schema para validação de filtros de estatísticas
 */
export const logStatsFiltersSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

/**
 * Schema para validação de filtros de logs de erro
 */
export const errorLogFiltersSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0)
})

/**
 * Schema para validação de filtros de atividade recente
 */
export const recentActivityFiltersSchema = z.object({
  hours: z.coerce.number().int().min(1).max(168).default(24)
})

/**
 * Schema para validação de logs de usuário específico
 */
export const userLogFiltersSchema = z.object({
  action: z.string().optional(),
  resource: z.string().optional(),
  level: z.nativeEnum(LogLevel).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
})

/**
 * Schema para validação de parâmetro userId
 */
export const userIdParamSchema = z.object({
  userId: z.string().min(1, 'ID do usuário é obrigatório')
})

// Tipos TypeScript derivados dos schemas
export type LogFiltersInput = z.infer<typeof logFiltersSchema>
export type CreateLogInput = z.infer<typeof createLogSchema>
export type CleanupLogsInput = z.infer<typeof cleanupLogsSchema>
export type LogStatsFiltersInput = z.infer<typeof logStatsFiltersSchema>
export type ErrorLogFiltersInput = z.infer<typeof errorLogFiltersSchema>
export type RecentActivityFiltersInput = z.infer<typeof recentActivityFiltersSchema>
export type UserLogFiltersInput = z.infer<typeof userLogFiltersSchema>
export type UserIdParamInput = z.infer<typeof userIdParamSchema>