import type { Context } from 'hono'

/**
 * Interface para parâmetros de paginação
 */
export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

/**
 * Interface para resultado paginado
 */
export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Interface para parâmetros de ordenação
 */
export interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Interface para parâmetros de filtro
 */
export interface FilterParams {
  search?: string
  dateFrom?: string
  dateTo?: string
  status?: string
  [key: string]: string | Date | undefined
}

/**
 * Constantes de paginação
 */
export const PAGINATION_CONSTANTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1
} as const

/**
 * Extrai parâmetros de paginação da requisição
 */
export function extractPaginationParams(c: Context): PaginationParams {
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10))
  const limit = Math.min(
    PAGINATION_CONSTANTS.MAX_LIMIT,
    Math.max(
      PAGINATION_CONSTANTS.MIN_LIMIT,
      parseInt(c.req.query('limit') || String(PAGINATION_CONSTANTS.DEFAULT_LIMIT), 10)
    )
  )
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Extrai parâmetros de ordenação da requisição
 */
export function extractSortParams(c: Context, allowedFields: string[] = []): SortParams {
  const sortBy = c.req.query('sortBy')
  const sortOrder = c.req.query('sortOrder') as 'asc' | 'desc' | undefined

  // Validar campo de ordenação
  if (sortBy && allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
    return {}
  }

  return {
    sortBy: sortBy || undefined,
    sortOrder: sortOrder === 'desc' ? 'desc' : 'asc'
  }
}

/**
 * Extrai parâmetros de filtro da requisição
 */
export function extractFilterParams(c: Context, allowedFilters: string[] = []): FilterParams {
  const filters: FilterParams = {}
  
  // Busca geral
  const search = c.req.query('search')
  if (search) {
    filters.search = search.trim()
  }

  // Filtros de data
  const dateFrom = c.req.query('dateFrom')
  const dateTo = c.req.query('dateTo')
  if (dateFrom) filters.dateFrom = dateFrom
  if (dateTo) filters.dateTo = dateTo

  // Status
  const status = c.req.query('status')
  if (status) filters.status = status

  // Filtros personalizados
  for (const filter of allowedFilters) {
    const value = c.req.query(filter)
    if (value !== undefined && value !== '') {
      filters[filter] = value
    }
  }

  return filters
}

/**
 * Cria resultado paginado
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / params.limit)
  const hasNext = params.page < totalPages
  const hasPrev = params.page > 1

  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext,
      hasPrev
    }
  }
}

/**
 * Converte filtros de data para objetos Date
 */
export function parseDateFilters(filters: FilterParams): {
  dateFrom?: Date
  dateTo?: Date
} {
  const result: { dateFrom?: Date; dateTo?: Date } = {}

  if (filters.dateFrom) {
    const date = new Date(filters.dateFrom)
    if (!isNaN(date.getTime())) {
      result.dateFrom = date
    }
  }

  if (filters.dateTo) {
    const date = new Date(filters.dateTo)
    if (!isNaN(date.getTime())) {
      // Adicionar 23:59:59 para incluir todo o dia
      date.setHours(23, 59, 59, 999)
      result.dateTo = date
    }
  }

  return result
}

/**
 * Valida parâmetros de paginação
 */
export function validatePaginationParams(params: PaginationParams): string[] {
  const errors: string[] = []

  if (params.page < 1) {
    errors.push('Página deve ser maior que 0')
  }

  if (params.limit < PAGINATION_CONSTANTS.MIN_LIMIT) {
    errors.push(`Limite deve ser pelo menos ${PAGINATION_CONSTANTS.MIN_LIMIT}`)
  }

  if (params.limit > PAGINATION_CONSTANTS.MAX_LIMIT) {
    errors.push(`Limite não pode exceder ${PAGINATION_CONSTANTS.MAX_LIMIT}`)
  }

  return errors
}

/**
 * Cria query de busca para texto
 */
export function createSearchQuery(search: string, fields: string[]): Record<string, unknown> {
  if (!search || fields.length === 0) {
    return {}
  }

  const searchTerms = search.toLowerCase().split(' ').filter(term => term.length > 0)
  
  if (searchTerms.length === 0) {
    return {}
  }

  // Para Prisma, criar OR query para múltiplos campos
  const orConditions = fields.map(field => ({
    [field]: {
      contains: search,
      mode: 'insensitive' as const
    }
  }))

  return {
    OR: orConditions
  }
}

/**
 * Cria query de ordenação para Prisma
 */
export function createSortQuery(sortParams: SortParams): Record<string, string> {
  if (!sortParams.sortBy) {
    return { createdAt: 'desc' } // Ordenação padrão
  }

  return {
    [sortParams.sortBy]: sortParams.sortOrder || 'asc'
  }
}

/**
 * Middleware para extrair todos os parâmetros de consulta
 */
export function extractQueryParams(c: Context, config: {
  allowedSortFields?: string[]
  allowedFilters?: string[]
}) {
  const pagination = extractPaginationParams(c)
  const sort = extractSortParams(c, config.allowedSortFields)
  const filters = extractFilterParams(c, config.allowedFilters)

  return {
    pagination,
    sort,
    filters
  }
}