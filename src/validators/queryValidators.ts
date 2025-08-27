import { z } from 'zod'
import { PAGINATION_CONSTANTS } from '@/utils/pagination'

/**
 * Schema para validação de paginação
 */
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : PAGINATION_CONSTANTS.DEFAULT_PAGE)
    .refine(val => val >= 1, { message: 'Página deve ser maior que 0' }),
  limit: z
    .string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : PAGINATION_CONSTANTS.DEFAULT_LIMIT)
    .refine(val => val >= PAGINATION_CONSTANTS.MIN_LIMIT && val <= PAGINATION_CONSTANTS.MAX_LIMIT, {
      message: `Limite deve estar entre ${PAGINATION_CONSTANTS.MIN_LIMIT} e ${PAGINATION_CONSTANTS.MAX_LIMIT}`
    })
})

/**
 * Schema para validação de ordenação
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
})

/**
 * Schema para validação de filtros de data
 */
export const dateFilterSchema = z.object({
  dateFrom: z
    .string()
    .optional()
    .refine(val => !val || !isNaN(Date.parse(val)), {
      message: 'Data inicial deve estar em formato válido (ISO 8601)'
    }),
  dateTo: z
    .string()
    .optional()
    .refine(val => !val || !isNaN(Date.parse(val)), {
      message: 'Data final deve estar em formato válido (ISO 8601)'
    })
})

/**
 * Função para validar range de datas
 */
export function validateDateRange(data: { dateFrom?: string; dateTo?: string }) {
  if (data.dateFrom && data.dateTo) {
    return new Date(data.dateFrom) <= new Date(data.dateTo)
  }
  return true
}

/**
 * Schema para validação de busca
 */
export const searchSchema = z.object({
  search: z
    .string()
    .optional()
    .transform(val => val?.trim())
    .refine(val => !val || val.length >= 2, {
      message: 'Termo de busca deve ter pelo menos 2 caracteres'
    })
})

/**
 * Schema base para consultas com paginação
 */
export const baseQuerySchema = paginationSchema.merge(sortSchema).merge(searchSchema)

/**
 * Schema para consultas de usuários
 */
export const userQuerySchema = baseQuerySchema.merge(dateFilterSchema).extend({
  role: z.enum(['admin', 'moderator', 'user']).optional(),
  status: z.enum(['active', 'inactive', 'locked']).optional(),
  emailVerified: z
    .string()
    .optional()
    .transform(val => val === 'true' ? true : val === 'false' ? false : undefined)
}).refine(validateDateRange, {
  message: 'Data inicial deve ser anterior à data final'
})

/**
 * Schema para consultas de logs
 */
export const logQuerySchema = baseQuerySchema.merge(dateFilterSchema).extend({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  level: z.enum(['info', 'warn', 'error']).optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  statusCode: z
    .string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : undefined)
    .refine(val => !val || (val >= 100 && val <= 599), {
      message: 'Código de status deve estar entre 100 e 599'
    })
}).refine(validateDateRange, {
  message: 'Data inicial deve ser anterior à data final'
})

/**
 * Schema para consultas de notificações
 */
export const notificationQuerySchema = baseQuerySchema.merge(dateFilterSchema).extend({
  userId: z.string().uuid().optional(),
  typeId: z.string().uuid().optional(),
  status: z.enum(['pending', 'sent', 'failed', 'read']).optional(),
  priority: z.enum(['normal', 'high', 'urgent']).optional(),
  channel: z.enum(['email', 'push', 'sms', 'in_app']).optional()
}).refine(validateDateRange, {
  message: 'Data inicial deve ser anterior à data final'
})

/**
 * Schema para consultas de perfis
 */
export const profileQuerySchema = baseQuerySchema.merge(dateFilterSchema).extend({
  userId: z.string().uuid().optional(),
  hasAvatar: z
    .string()
    .optional()
    .transform(val => val === 'true' ? true : val === 'false' ? false : undefined)
}).refine(validateDateRange, {
  message: 'Data inicial deve ser anterior à data final'
})

/**
 * Função para criar schema de consulta personalizado
 */
export function createQuerySchema<T extends z.ZodRawShape>(customFields: T) {
  return baseQuerySchema.extend(customFields)
}

/**
 * Função para validar campos de ordenação permitidos
 */
export function createSortValidator(allowedFields: string[]) {
  return z.object({
    sortBy: z
      .string()
      .optional()
      .refine(val => !val || allowedFields.includes(val), {
        message: `Campo de ordenação deve ser um dos seguintes: ${allowedFields.join(', ')}`
      }),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
  })
}

/**
 * Schema para validação de IDs UUID
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid({ message: 'ID deve ser um UUID válido' })
})

/**
 * Schema para validação de múltiplos IDs
 */
export const multipleIdsSchema = z.object({
  ids: z
    .string()
    .transform(val => val.split(','))
    .pipe(z.array(z.string().uuid()))
    .refine(arr => arr.length > 0 && arr.length <= 100, {
      message: 'Deve fornecer entre 1 e 100 IDs válidos'
    })
})

/**
 * Schema para validação de range de datas
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime()
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'Data inicial deve ser anterior à data final'
})

/**
 * Schema para validação de filtros numéricos
 */
export const numericFilterSchema = z.object({
  min: z
    .string()
    .optional()
    .transform(val => val ? parseFloat(val) : undefined)
    .refine(val => val === undefined || !isNaN(val), {
      message: 'Valor mínimo deve ser um número válido'
    }),
  max: z
    .string()
    .optional()
    .transform(val => val ? parseFloat(val) : undefined)
    .refine(val => val === undefined || !isNaN(val), {
      message: 'Valor máximo deve ser um número válido'
    })
}).refine(data => {
  if (data.min !== undefined && data.max !== undefined) {
    return data.min <= data.max
  }
  return true
}, {
  message: 'Valor mínimo deve ser menor ou igual ao valor máximo'
})

/**
 * Tipos TypeScript derivados dos schemas
 */
export type PaginationQuery = z.infer<typeof paginationSchema>
export type SortQuery = z.infer<typeof sortSchema>
export type SearchQuery = z.infer<typeof searchSchema>
export type BaseQuery = z.infer<typeof baseQuerySchema>
export type UserQuery = z.infer<typeof userQuerySchema>
export type LogQuery = z.infer<typeof logQuerySchema>
export type NotificationQuery = z.infer<typeof notificationQuerySchema>
export type ProfileQuery = z.infer<typeof profileQuerySchema>
export type UuidParam = z.infer<typeof uuidParamSchema>
export type MultipleIds = z.infer<typeof multipleIdsSchema>
export type DateRange = z.infer<typeof dateRangeSchema>
export type NumericFilter = z.infer<typeof numericFilterSchema>