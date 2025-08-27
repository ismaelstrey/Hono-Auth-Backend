import { Hono } from 'hono'
import { notificationController } from '@/controllers/notificationController'
import { authMiddleware, requireRole } from '@/middlewares/auth'
import { rateLimitPublic } from '@/middlewares/rateLimiter'
import { loggingMiddleware } from '@/middlewares/logging'
import { 
  paginatedCache, 
  userCache, 
  statsCache,
  cacheInvalidation,
  cacheHeaders 
} from '@/middlewares/cache'
import { UserRole } from '@/types'

const notificationRoutes = new Hono()

// Aplicar middlewares globais
notificationRoutes.use('*', loggingMiddleware)
notificationRoutes.use('*', rateLimitPublic)
notificationRoutes.use('*', authMiddleware)

// === NOTIFICAÇÕES ===

// Criar notificação (apenas admin)
notificationRoutes.post('/', requireRole(UserRole.ADMIN), cacheInvalidation('notifications'), (c) => notificationController.create(c))

// Listar todas as notificações (apenas admin)
notificationRoutes.get('/', requireRole(UserRole.ADMIN), paginatedCache(), cacheHeaders(), (c) => notificationController.list(c))

// Buscar notificações do usuário autenticado
notificationRoutes.get('/me', userCache(300), cacheHeaders(300), (c) => notificationController.getMyNotifications(c))

// Marcar notificação como lida
notificationRoutes.patch('/:id/read', cacheInvalidation('notifications'), (c) => notificationController.markAsRead(c))

// Enviar notificação (apenas admin)
notificationRoutes.post('/:id/send', requireRole(UserRole.ADMIN), cacheInvalidation('notifications'), (c) => notificationController.send(c))

// Processar notificações pendentes (apenas admin)
notificationRoutes.post('/process', requireRole(UserRole.ADMIN), cacheInvalidation('notifications'), (c) => notificationController.processPending(c))

// Estatísticas de notificações (apenas admin)
notificationRoutes.get('/stats', requireRole(UserRole.ADMIN), statsCache(), cacheHeaders(3600), (c) => notificationController.getStats(c))

// === PREFERÊNCIAS ===

// Buscar preferências do usuário
notificationRoutes.get('/preferences', userCache(), cacheHeaders(), (c) => notificationController.getMyPreferences(c))

// Atualizar preferências do usuário
notificationRoutes.put('/preferences/:typeId', cacheInvalidation('notifications'), (c) => notificationController.updatePreferences(c))

// === TIPOS DE NOTIFICAÇÃO ===

// Criar tipo de notificação (apenas admin)
notificationRoutes.post('/types', requireRole(UserRole.ADMIN), cacheInvalidation('notifications'), (c) => notificationController.createType(c))

// Listar tipos de notificação
notificationRoutes.get('/types', paginatedCache(900), cacheHeaders(900), (c) => notificationController.listTypes(c))

export { notificationRoutes }