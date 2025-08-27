import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { RoleController } from '@/controllers/roleController'
import { authMiddleware } from '@/middlewares/auth'
import { 
  requireAdmin, 
  requireModerator, 
  canManageRoles,
  canViewUserData,
  attachPermissions
} from '@/middlewares/permissions'
import { rateLimitPublic } from '@/middlewares/rateLimiter'
import { loggingMiddleware } from '@/middlewares/logging'
import {
  paginatedCache,
  userCache,
  statsCache,
  cacheInvalidation,
  cacheHeaders
} from '@/middlewares/cache'
import { z } from 'zod'

/**
 * Schemas de validação
 */
const updateUserRoleSchema = z.object({
  roleId: z.string().min(1, 'ID do role é obrigatório')
})

const checkPermissionSchema = z.object({
  userId: z.string().min(1, 'ID do usuário é obrigatório'),
  resource: z.string().min(1, 'Recurso é obrigatório'),
  action: z.string().min(1, 'Ação é obrigatória')
})

/**
 * Rotas de roles e permissões
 */
const roleRoutes = new Hono()

// Aplicar middlewares globais
roleRoutes.use('*', loggingMiddleware)
roleRoutes.use('*', rateLimitPublic)
roleRoutes.use('*', authMiddleware)
roleRoutes.use('*', attachPermissions)

// === ROTAS DE CONSULTA (MODERADOR+) ===

// Listar todos os roles (moderador ou admin)
roleRoutes.get('/roles', requireModerator, paginatedCache(1800), cacheHeaders(1800), RoleController.listRoles)

// Listar todas as permissões (moderador ou admin)
roleRoutes.get('/permissions', requireModerator, paginatedCache(1800), cacheHeaders(1800), RoleController.listPermissions)

// Obter detalhes de um role específico (moderador ou admin)
roleRoutes.get('/roles/:roleId', requireModerator, userCache(1800), cacheHeaders(1800), RoleController.getRoleDetails)

// Obter estatísticas dos roles (moderador ou admin)
roleRoutes.get('/stats', requireModerator, statsCache(), cacheHeaders(3600), RoleController.getRoleStats)

// === ROTAS DE USUÁRIO ===

// Obter minhas próprias permissões (qualquer usuário autenticado)
roleRoutes.get('/my-permissions', userCache(900), cacheHeaders(900), RoleController.getMyPermissions)

// Obter permissões de um usuário específico (moderador ou admin)
roleRoutes.get('/users/:userId/permissions', canViewUserData, userCache(900), cacheHeaders(900), RoleController.getUserPermissions)

// === ROTAS DE GERENCIAMENTO (ADMIN) ===

// Atualizar role de um usuário (apenas admin com permissão de gerenciar roles)
roleRoutes.put(
  '/users/:userId/role',
  canManageRoles,
  zValidator('json', updateUserRoleSchema),
  cacheInvalidation('users'),
  RoleController.updateUserRole
)

// Verificar se um usuário tem uma permissão específica (admin)
roleRoutes.post(
  '/check-permission',
  requireAdmin,
  zValidator('json', checkPermissionSchema),
  RoleController.checkPermission
)

// === ROTAS DE HEALTH CHECK ===

// Health check do serviço de roles
roleRoutes.get('/health', async (c) => {
  try {
    // Testa se consegue acessar o serviço de permissões
    const roles = await RoleController.listRoles(c)
    
    return c.json({
      success: true,
      message: 'Serviço de roles funcionando corretamente',
      timestamp: new Date().toISOString(),
      service: 'role-service'
    })
  } catch (error) {
    return c.json({
      success: false,
      message: 'Erro no serviço de roles',
      timestamp: new Date().toISOString(),
      service: 'role-service',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500)
  }
})

export { roleRoutes }
export default roleRoutes