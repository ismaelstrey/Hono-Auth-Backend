import { Hono } from 'hono'
import { notificationController } from '@/controllers/notificationController'
import { authMiddleware, requireRole } from '@/middlewares/auth'
import { rateLimitPublic } from '@/middlewares/rateLimiter'
import { loggingMiddleware } from '@/middlewares/logging'
import { UserRole } from '@/types'

const notificationRoutes = new Hono()

// Aplicar middlewares globais
notificationRoutes.use('*', loggingMiddleware)
notificationRoutes.use('*', rateLimitPublic)
notificationRoutes.use('*', authMiddleware)

// === NOTIFICAÇÕES ===

// Criar notificação (apenas admin)
notificationRoutes.post('/', requireRole(UserRole.ADMIN), (c) => notificationController.create(c))

// Listar todas as notificações (apenas admin)
notificationRoutes.get('/', requireRole(UserRole.ADMIN), (c) => notificationController.list(c))

// Buscar notificações do usuário autenticado
notificationRoutes.get('/me', (c) => notificationController.getMyNotifications(c))

// Marcar notificação como lida
notificationRoutes.patch('/:id/read', (c) => notificationController.markAsRead(c))

// Enviar notificação (apenas admin)
notificationRoutes.post('/:id/send', requireRole(UserRole.ADMIN), (c) => notificationController.send(c))

// Processar notificações pendentes (apenas admin)
notificationRoutes.post('/process', requireRole(UserRole.ADMIN), (c) => notificationController.processPending(c))

// Estatísticas de notificações (apenas admin)
notificationRoutes.get('/stats', requireRole(UserRole.ADMIN), (c) => notificationController.getStats(c))

// === PREFERÊNCIAS ===

// Buscar preferências do usuário
notificationRoutes.get('/preferences', (c) => notificationController.getMyPreferences(c))

// Atualizar preferências do usuário
notificationRoutes.put('/preferences/:typeId', (c) => notificationController.updatePreferences(c))

// === TIPOS DE NOTIFICAÇÃO ===

// Criar tipo de notificação (apenas admin)
notificationRoutes.post('/types', requireRole(UserRole.ADMIN), (c) => notificationController.createType(c))

// Listar tipos de notificação
notificationRoutes.get('/types', (c) => notificationController.listTypes(c))

export { notificationRoutes }