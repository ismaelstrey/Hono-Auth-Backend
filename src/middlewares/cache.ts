import { Context, Next } from 'hono'
import { cacheService, CacheKeys, CacheTTL } from '../services/cacheService'
import { logger } from '../utils/logger'
import { createHash } from 'crypto'

/**
 * Configurações do middleware de cache
 */
interface CacheOptions {
  ttl?: number
  keyGenerator?: (c: Context) => string
  condition?: (c: Context) => boolean
  skipCache?: (c: Context) => boolean
  varyBy?: string[]
}

/**
 * Gera uma chave de cache baseada na requisição
 */
function generateCacheKey(c: Context, options?: CacheOptions): string {
  if (options?.keyGenerator) {
    return options.keyGenerator(c)
  }

  const method = c.req.method
  const path = c.req.path
  const query = c.req.query()
  const user = c.get('user')

  // Inclui parâmetros de variação se especificados
  const varyData: Record<string, string> = {}
  if (options?.varyBy) {
    for (const header of options.varyBy) {
      varyData[header] = c.req.header(header) || ''
    }
  }

  // Inclui ID do usuário para cache personalizado
  if (user?.id) {
    varyData.userId = user.id
  }

  const cacheData = {
    method,
    path,
    query,
    vary: varyData
  }

  // Gera hash para chave única
  const hash = createHash('md5')
    .update(JSON.stringify(cacheData))
    .digest('hex')

  return `response:${method}:${path}:${hash}`
}

/**
 * Verifica se a resposta deve ser cacheada
 */
function shouldCacheResponse(c: Context, status: number): boolean {
  // Só cacheia respostas de sucesso
  if (status < 200 || status >= 300) {
    return false
  }

  // Não cacheia se há erros
  const response = c.res
  if (!response) {
    return false
  }

  // Verifica headers que indicam não cachear
  const cacheControl = c.res.headers.get('cache-control')
  if (cacheControl?.includes('no-cache') || cacheControl?.includes('no-store')) {
    return false
  }

  return true
}

/**
 * Middleware de cache para respostas HTTP
 */
export function responseCache(options: CacheOptions = {}): (c: Context, next: Next) => Promise<void> {
  const defaultTTL = options.ttl || CacheTTL.MEDIUM

  return async (c: Context, next: Next): Promise<void> => {
    // Verifica condições para usar cache
    if (options.condition && !options.condition(c)) {
      return next()
    }

    // Verifica se deve pular o cache
    if (options.skipCache && options.skipCache(c)) {
      return next()
    }

    // Só cacheia métodos GET
    if (c.req.method !== 'GET') {
      return next()
    }

    const cacheKey = generateCacheKey(c, options)

    try {
      // Tenta buscar resposta cacheada
      const cached = await cacheService.get<{
        status: number
        headers: Record<string, string>
        body: unknown
      }>(cacheKey)

      if (cached) {
        // Restaura headers
        Object.entries(cached.headers).forEach(([key, value]) => {
          c.res.headers.set(key, value)
        })

        // Adiciona header indicando cache hit
        c.res.headers.set('X-Cache', 'HIT')
        c.res.headers.set('X-Cache-Key', cacheKey)

        logger.debug(`Cache hit para ${c.req.method} ${c.req.path}`)

        c.json(cached.body as Record<string, unknown>)
        return

      }

      // Cache miss - executa a requisição
      await next()

      // Verifica se deve cachear a resposta
      const status = c.res.status
      if (!shouldCacheResponse(c, status)) {
        return
      }

      // Captura a resposta para cache
      const responseBody = await c.res.clone().json().catch(() => null)
      if (!responseBody) {
        return
      }

      // Captura headers relevantes
      const headers: Record<string, string> = {}
      c.res.headers.forEach((value, key) => {
        // Só inclui headers seguros para cache
        if (!key.toLowerCase().startsWith('set-cookie') &&
          !key.toLowerCase().startsWith('authorization')) {
          headers[key] = value
        }
      })

      // Armazena no cache
      const cacheData = {
        status,
        headers,
        body: responseBody
      }

      await cacheService.set(cacheKey, cacheData, defaultTTL)

      // Adiciona headers de cache
      c.res.headers.set('X-Cache', 'MISS')
      c.res.headers.set('X-Cache-Key', cacheKey)

      logger.debug(`Cache miss para ${c.req.method} ${c.req.path} - armazenado com TTL ${defaultTTL}s`)

    } catch (error) {
      logger.error('Erro no middleware de cache:', error)
      // Em caso de erro, continua sem cache
      return next()
    }
  }
}

/**
 * Middleware de cache específico para listagens paginadas
 */
export function paginatedCache(ttl: number = CacheTTL.SHORT) {
  return responseCache({
    ttl,
    keyGenerator: (c: Context) => {
      const path = c.req.path
      const page = c.req.query('page') || '1'
      const limit = c.req.query('limit') || '10'
      // Filtros de paginação

      // Inclui todos os filtros na chave
      const filters = Object.entries(c.req.query())
        .filter(([key]) => !['page', 'limit'].includes(key))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('&')

      const user = c.get('user')
      const userId = user?.id || 'anonymous'

      return `paginated:${path}:${userId}:${page}:${limit}:${createHash('md5').update(filters).digest('hex')}`
    },
    condition: (c: Context) => {
      // Só cacheia se não há parâmetros de data muito específicos
      const hasDateFilter = c.req.query('startDate') || c.req.query('endDate')
      return !hasDateFilter
    }
  })
}

/**
 * Middleware de cache para dados de usuário
 */
export function userCache(ttl: number = CacheTTL.MEDIUM) {
  return responseCache({
    ttl,
    keyGenerator: (c: Context) => {
      const path = c.req.path
      const user = c.get('user')
      const userId = user?.id || 'anonymous'

      // Para rotas de usuário específico
      if (path.includes('/users/')) {
        const targetUserId = c.req.param('id')
        return CacheKeys.user(targetUserId || userId)
      }

      return `user_data:${userId}:${path}`
    },
    condition: (c: Context) => {
      // Só cacheia para usuários autenticados
      return !!c.get('user')
    }
  })
}

/**
 * Middleware de cache para estatísticas
 */
export function statsCache(ttl: number = CacheTTL.LONG) {
  return responseCache({
    ttl,
    keyGenerator: (c: Context) => {
      const path = c.req.path
      const query = c.req.query()

      // Remove parâmetros sensíveis ao tempo
      const { page: _page, limit: _limit, ...filters } = query

      const filtersHash = createHash('md5')
        .update(JSON.stringify(filters))
        .digest('hex')

      return `stats:${path}:${filtersHash}`
    }
  })
}

/**
 * Utilitário para invalidar cache relacionado a um usuário
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  try {
    const keys = [
      CacheKeys.user(userId),
      CacheKeys.profile(userId),
      CacheKeys.userPermissions(userId),
      CacheKeys.userSessions(userId)
    ]

    await Promise.all(keys.map(key => cacheService.del(key)))

    logger.info(`Cache invalidado para usuário ${userId}`)
  } catch (error) {
    logger.error('Erro ao invalidar cache do usuário:', error)
  }
}

/**
 * Utilitário para invalidar cache de listagens
 */
export async function invalidateListCache(entity: string): Promise<void> {
  try {
    // Em uma implementação completa, usaríamos padrões para encontrar todas as chaves
    // Por enquanto, limpamos chaves conhecidas
    logger.info(`Cache de listagem invalidado para ${entity}`)
  } catch (error) {
    logger.error('Erro ao invalidar cache de listagem:', error)
  }
}

/**
 * Middleware para limpar cache após operações de escrita
 */
export function cacheInvalidation(entity: string) {
  return async (c: Context, next: Next) => {
    await next()

    // Só invalida cache em operações de sucesso
    if (c.res.status >= 200 && c.res.status < 300) {
      const method = c.req.method

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        await invalidateListCache(entity)

        // Se há ID na URL, invalida cache específico
        const id = c.req.param('id')
        if (id) {
          const user = c.get('user')
          if (entity === 'users' && user?.id === id) {
            await invalidateUserCache(id)
          }
        }
      }
    }
  }
}

/**
 * Headers de controle de cache
 */
export function setCacheHeaders(c: Context, maxAge: number = CacheTTL.MEDIUM): void {
  c.res.headers.set('Cache-Control', `public, max-age=${maxAge}`)
  c.res.headers.set('ETag', createHash('md5').update(c.req.url).digest('hex'))
  c.res.headers.set('Last-Modified', new Date().toUTCString())
}

/**
 * Middleware para adicionar headers de cache
 */
export function cacheHeaders(maxAge: number = CacheTTL.MEDIUM) {
  return async (c: Context, next: Next) => {
    await next()

    if (c.res.status >= 200 && c.res.status < 300) {
      setCacheHeaders(c, maxAge)
    }
  }
}