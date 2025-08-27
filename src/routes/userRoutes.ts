import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { UserController } from '@/controllers/userController'
import {
  authMiddleware,
  requireAdmin,
  requireAdminOrModerator,
  requireOwnershipOrAdmin
} from '@/middlewares/auth'
import { rateLimitPublic } from '@/middlewares/rateLimiter'
import { loggingMiddleware } from '@/middlewares/logging'
import { 
  paginatedCache, 
  userCache, 
  cacheInvalidation,
  cacheHeaders 
} from '@/middlewares/cache'
import {
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  userIdSchema,
  userFiltersSchema,
  userSettingsSchema,
  bulkUserOperationSchema,
  changeUserRoleSchema
} from '@/validators/userValidators'
import { userQuerySchema } from '@/validators/queryValidators'

/**
 * Rotas de usuários
 */
const userRoutes = new Hono()

// Aplicar middleware de logging em todas as rotas
userRoutes.use('*', loggingMiddleware)

// Aplicar autenticação em todas as rotas de usuário
userRoutes.use('*', authMiddleware)

// Rotas que requerem autenticação básica
// Buscar usuários (qualquer usuário autenticado pode buscar)
userRoutes.get(
  '/search',
  rateLimitPublic,
  paginatedCache(), // Cache para listagens paginadas
  zValidator('query', userQuerySchema),
  UserController.handleListUsers
)

// Obter configurações do próprio usuário
userRoutes.get(
  '/settings', 
  userCache(), // Cache para dados do usuário
  cacheHeaders(), // Headers de cache
  UserController.handleGetSettings
)

// Atualizar configurações do próprio usuário
userRoutes.put(
  '/settings',
  zValidator('json', userSettingsSchema),
  cacheInvalidation('users'), // Invalida cache após atualização
  UserController.handleUpdateSettings
)

// Atualizar próprio perfil
userRoutes.put(
  '/profile',
  zValidator('json', updateProfileSchema),
  cacheInvalidation('users'), // Invalida cache após atualização
  UserController.handleUpdateProfile
)

// Rotas que requerem permissão de admin ou moderador
userRoutes.use('/stats', requireAdminOrModerator)
userRoutes.use('/recent', requireAdminOrModerator)
userRoutes.use('/role/*', requireAdminOrModerator)
userRoutes.use('/bulk', requireAdminOrModerator)

// Estatísticas de usuários (admin/moderador)
userRoutes.get(
  '/stats', 
  userCache(3600), // Cache por 1 hora para estatísticas
  cacheHeaders(3600),
  UserController.getUserStats
)

// Usuários recentemente ativos (admin/moderador)
userRoutes.get(
  '/recent', 
  userCache(300), // Cache por 5 minutos para dados recentes
  cacheHeaders(300),
  UserController.getRecentlyActiveUsers
)

// Usuários por role (admin/moderador)
userRoutes.get(
  '/role/:role', 
  userCache(900), // Cache por 15 minutos
  cacheHeaders(900),
  UserController.getUsersByRole
)

// Operações em lote (admin/moderador)
userRoutes.post(
  '/bulk',
  zValidator('json', bulkUserOperationSchema),
  cacheInvalidation('users'), // Invalida cache após operações em lote
  UserController.handleBulkOperation
)

// Rotas que requerem permissão de admin
userRoutes.use('/create', requireAdmin)

// Criar usuário (apenas admin)
userRoutes.post(
  '/create',
  zValidator('json', createUserSchema),
  cacheInvalidation('users'), // Invalida cache após criação
  UserController.handleCreateUser
)

// Listar usuários com filtros (admin/moderador)
userRoutes.get(
  '/',
  requireAdminOrModerator,
  paginatedCache(), // Cache para listagens paginadas
  zValidator('query', userQuerySchema),
  UserController.handleListUsers
)

// Rotas específicas por ID - aplicar middleware de ownership ou admin
userRoutes.use('/:id', requireOwnershipOrAdmin)

// Obter usuário por ID (próprio usuário ou admin)
userRoutes.get(
  '/:id',
  zValidator('param', userIdSchema),
  userCache(), // Cache para dados do usuário
  cacheHeaders(),
  UserController.handleGetUserById
)

// Atualizar usuário (próprio usuário ou admin)
userRoutes.put(
  '/:id',
  zValidator('param', userIdSchema),
  zValidator('json', updateUserSchema),
  cacheInvalidation('users'), // Invalida cache após atualização
  UserController.handleUpdateUser
)

// Rotas que requerem apenas admin (não ownership)
userRoutes.use('/:id/delete', requireAdmin)
userRoutes.use('/:id/toggle-status', requireAdmin)
userRoutes.use('/:id/change-role', requireAdmin)

// Deletar usuário (apenas admin)
userRoutes.delete(
  '/:id/delete',
  zValidator('param', userIdSchema),
  cacheInvalidation('users'), // Invalida cache após exclusão
  UserController.handleDeleteUser
)

// Ativar/desativar usuário (apenas admin)
userRoutes.patch(
  '/:id/toggle-status',
  zValidator('param', userIdSchema),
  cacheInvalidation('users'), // Invalida cache após mudança de status
  UserController.handleToggleUserStatus
)

// Alterar role do usuário (apenas admin)
userRoutes.patch(
  '/:id/change-role',
  zValidator('param', userIdSchema),
  zValidator('json', changeUserRoleSchema),
  UserController.handleChangeUserRole
)

// Rota de health check específica para users
userRoutes.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'users',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

export { userRoutes }