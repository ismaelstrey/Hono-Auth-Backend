import { env } from '../config/env'
import { logger } from '../utils/logger'

/**
 * Interface para o serviço de cache
 */
interface CacheService {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: any, ttlSeconds?: number): Promise<void>
  del(key: string): Promise<void>
  clear(): Promise<void>
  exists(key: string): Promise<boolean>
  increment(key: string, ttlSeconds?: number): Promise<number>
  getMany<T>(keys: string[]): Promise<(T | null)[]>
  setMany(items: Array<{ key: string; value: any; ttl?: number }>): Promise<void>
}

/**
 * Implementação de cache em memória
 */
class MemoryCache implements CacheService {
  private cache = new Map<string, { value: any; expires: number | null }>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Limpeza automática a cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key)
    if (!item) return null

    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }

    return item.value as T
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const expires = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null
    this.cache.set(key, { value, expires })
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async clear(): Promise<void> {
    this.cache.clear()
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key)
    if (!item) return false

    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    const current = await this.get<number>(key) || 0
    const newValue = current + 1
    await this.set(key, newValue, ttlSeconds)
    return newValue
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map(key => this.get<T>(key)))
  }

  async setMany(items: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    for (const item of items) {
      await this.set(item.key, item.value, item.ttl)
    }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (item.expires && now > item.expires) {
        this.cache.delete(key)
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.cache.clear()
  }
}

/**
 * Implementação de cache com Redis
 */
class RedisCache implements CacheService {
  private redis: any
  private isConnected = false

  constructor() {
    this.initRedis()
  }

  private async initRedis(): Promise<void> {
    try {
      // Importação dinâmica do Redis
      const Redis = await import('ioredis')
      this.redis = new Redis.default(env.REDIS_URL!)
      
      this.redis.on('connect', () => {
        this.isConnected = true
        logger.info('Cache Redis conectado com sucesso')
      })

      this.redis.on('error', (error: Error) => {
        this.isConnected = false
        logger.error('Erro no Redis:', error)
      })

      this.redis.on('close', () => {
        this.isConnected = false
        logger.warn('Conexão Redis fechada')
      })

    } catch (error) {
      logger.error('Erro ao inicializar Redis:', error)
      throw error
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null
    
    try {
      const value = await this.redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      logger.error(`Erro ao buscar cache ${key}:`, error)
      return null
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected) return
    
    try {
      const serialized = JSON.stringify(value)
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized)
      } else {
        await this.redis.set(key, serialized)
      }
    } catch (error) {
      logger.error(`Erro ao definir cache ${key}:`, error)
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) return
    
    try {
      await this.redis.del(key)
    } catch (error) {
      logger.error(`Erro ao deletar cache ${key}:`, error)
    }
  }

  async clear(): Promise<void> {
    if (!this.isConnected) return
    
    try {
      await this.redis.flushdb()
    } catch (error) {
      logger.error('Erro ao limpar cache:', error)
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) return false
    
    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      logger.error(`Erro ao verificar existência do cache ${key}:`, error)
      return false
    }
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    if (!this.isConnected) return 0
    
    try {
      const result = await this.redis.incr(key)
      if (ttlSeconds && result === 1) {
        await this.redis.expire(key, ttlSeconds)
      }
      return result
    } catch (error) {
      logger.error(`Erro ao incrementar cache ${key}:`, error)
      return 0
    }
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isConnected || keys.length === 0) return []
    
    try {
      const values = await this.redis.mget(...keys)
      return values.map((value: string | null) => 
        value ? JSON.parse(value) : null
      )
    } catch (error) {
      logger.error('Erro ao buscar múltiplos caches:', error)
      return keys.map(() => null)
    }
  }

  async setMany(items: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    if (!this.isConnected || items.length === 0) return
    
    try {
      const pipeline = this.redis.pipeline()
      
      for (const item of items) {
        const serialized = JSON.stringify(item.value)
        if (item.ttl) {
          pipeline.setex(item.key, item.ttl, serialized)
        } else {
          pipeline.set(item.key, serialized)
        }
      }
      
      await pipeline.exec()
    } catch (error) {
      logger.error('Erro ao definir múltiplos caches:', error)
    }
  }
}

/**
 * Cache híbrido que usa Redis quando disponível, senão usa memória
 */
class HybridCache implements CacheService {
  private redisCache: RedisCache | null = null
  private memoryCache: MemoryCache

  constructor() {
    this.memoryCache = new MemoryCache()
    
    if (env.REDIS_URL) {
      try {
        this.redisCache = new RedisCache()
      } catch (error) {
        logger.warn('Redis não disponível, usando cache em memória:', error)
      }
    }
  }

  private get activeCache(): CacheService {
    return this.redisCache || this.memoryCache
  }

  async get<T>(key: string): Promise<T | null> {
    return this.activeCache.get<T>(key)
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    return this.activeCache.set(key, value, ttlSeconds)
  }

  async del(key: string): Promise<void> {
    return this.activeCache.del(key)
  }

  async clear(): Promise<void> {
    return this.activeCache.clear()
  }

  async exists(key: string): Promise<boolean> {
    return this.activeCache.exists(key)
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    return this.activeCache.increment(key, ttlSeconds)
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    return this.activeCache.getMany<T>(keys)
  }

  async setMany(items: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    return this.activeCache.setMany(items)
  }

  /**
   * Retorna informações sobre o cache ativo
   */
  getInfo(): { type: 'redis' | 'memory'; connected: boolean } {
    return {
      type: this.redisCache ? 'redis' : 'memory',
      connected: true
    }
  }
}

// Instância singleton do cache
export const cacheService = new HybridCache()

/**
 * Utilitários para chaves de cache
 */
export const CacheKeys = {
  // Usuários
  user: (id: string) => `user:${id}`,
  userByEmail: (email: string) => `user:email:${email}`,
  usersList: (page: number, limit: number, filters?: string) => 
    `users:list:${page}:${limit}${filters ? `:${filters}` : ''}`,
  
  // Perfis
  profile: (userId: string) => `profile:${userId}`,
  profilesList: (page: number, limit: number, filters?: string) => 
    `profiles:list:${page}:${limit}${filters ? `:${filters}` : ''}`,
  
  // Notificações
  notification: (id: string) => `notification:${id}`,
  userNotifications: (userId: string, page: number, limit: number) => 
    `notifications:user:${userId}:${page}:${limit}`,
  notificationStats: (userId?: string) => 
    `notifications:stats${userId ? `:${userId}` : ''}`,
  
  // Logs
  logsList: (page: number, limit: number, filters?: string) => 
    `logs:list:${page}:${limit}${filters ? `:${filters}` : ''}`,
  logsStats: (filters?: string) => 
    `logs:stats${filters ? `:${filters}` : ''}`,
  
  // Roles e Permissões
  userPermissions: (userId: string) => `permissions:user:${userId}`,
  rolePermissions: (roleId: string) => `permissions:role:${roleId}`,
  roles: () => 'roles:all',
  
  // Rate Limiting
  rateLimit: (identifier: string, endpoint: string) => 
    `rate_limit:${identifier}:${endpoint}`,
  
  // Sessões
  session: (token: string) => `session:${token}`,
  userSessions: (userId: string) => `sessions:user:${userId}`
} as const

/**
 * Configurações de TTL padrão (em segundos)
 */
export const CacheTTL = {
  SHORT: 5 * 60,        // 5 minutos
  MEDIUM: 15 * 60,      // 15 minutos
  LONG: 60 * 60,        // 1 hora
  VERY_LONG: 24 * 60 * 60, // 24 horas
  SESSION: 30 * 60,     // 30 minutos
  RATE_LIMIT: 60        // 1 minuto
} as const

/**
 * Decorator para cache automático de métodos
 */
export function Cached(ttl: number = CacheTTL.MEDIUM, keyGenerator?: (...args: any[]) => string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyGenerator 
        ? keyGenerator(...args)
        : `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`
      
      // Tenta buscar no cache
      const cached = await cacheService.get(cacheKey)
      if (cached !== null) {
        return cached
      }
      
      // Executa o método original
      const result = await method.apply(this, args)
      
      // Armazena no cache
      await cacheService.set(cacheKey, result, ttl)
      
      return result
    }
    
    return descriptor
  }
}

/**
 * Invalidação de cache por padrão
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    // Para Redis, podemos usar SCAN para encontrar chaves por padrão
    // Para memória, precisamos implementar uma busca manual
    logger.info(`Invalidando cache com padrão: ${pattern}`)
    
    // Por enquanto, implementação simples - em produção seria mais sofisticada
    if (pattern.includes('*')) {
      logger.warn('Invalidação por padrão não implementada completamente')
    } else {
      await cacheService.del(pattern)
    }
  } catch (error) {
    logger.error('Erro ao invalidar cache:', error)
  }
}

export type { CacheService }