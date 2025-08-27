import type { Context } from 'hono'
import { PermissionService } from '@/services/permissionService'
import { successResponse, errorResponse } from '@/utils/helpers'
import { logService } from '@/services/logService'
import type { JWTPayload } from '@/types'

/**
 * Controller para gerenciamento de roles e permissões
 */
export class RoleController {
  /**
   * Lista todos os roles disponíveis
   */
  static async listRoles(c: Context) {
    try {
      const user = c.get('user') as JWTPayload
      const roles = await PermissionService.getAllRoles()

      await logService.log({
        userId: user.userId,
        action: 'roles_list',
        resource: 'roles',
        details: `Usuário ${user.email} listou roles`,
        ipAddress: c.req.header('x-forwarded-for') || 'unknown'
      })

      return c.json(successResponse('Roles listados com sucesso', { roles }))
    } catch (error) {
      console.error('Erro ao listar roles:', error)
      return c.json(errorResponse('Erro interno do servidor'), 500)
    }
  }

  /**
   * Lista todas as permissões disponíveis
   */
  static async listPermissions(c: Context) {
    try {
      const user = c.get('user') as JWTPayload
      const permissions = await PermissionService.getAllPermissions()

      // Agrupa permissões por recurso para melhor organização
      const groupedPermissions = permissions.reduce((acc, permission) => {
        if (!acc[permission.resource]) {
          acc[permission.resource] = []
        }
        acc[permission.resource].push(permission)
        return acc
      }, {} as Record<string, typeof permissions>)

      await logService.log({
        userId: user.userId,
        action: 'permissions_list',
        resource: 'permissions',
        details: `Usuário ${user.email} listou permissões`,
        ipAddress: c.req.header('x-forwarded-for') || 'unknown'
      })

      return c.json(successResponse('Permissões listadas com sucesso', {
        permissions,
        groupedPermissions
      }))
    } catch (error) {
      console.error('Erro ao listar permissões:', error)
      return c.json(errorResponse('Erro interno do servidor'), 500)
    }
  }

  /**
   * Obtém detalhes de um role específico
   */
  static async getRoleDetails(c: Context) {
    try {
      const user = c.get('user') as JWTPayload
      const roleId = c.req.param('roleId')

      if (!roleId) {
        return c.json(errorResponse('ID do role é obrigatório'), 400)
      }

      const roles = await PermissionService.getAllRoles()
      const role = roles.find(r => r.id === roleId)

      if (!role) {
        return c.json(errorResponse('Role não encontrado'), 404)
      }

      await logService.log({
        userId: user.userId,
        action: 'role_details',
        resource: 'roles',
        details: `Usuário ${user.email} visualizou detalhes do role ${role.name}`,
        ipAddress: c.req.header('x-forwarded-for') || 'unknown'
      })

      return c.json(successResponse('Detalhes do role obtidos com sucesso', { role }))
    } catch (error) {
      console.error('Erro ao obter detalhes do role:', error)
      return c.json(errorResponse('Erro interno do servidor'), 500)
    }
  }

  /**
   * Obtém permissões do usuário atual
   */
  static async getMyPermissions(c: Context) {
    try {
      const user = c.get('user') as JWTPayload
      const permissions = await PermissionService.getUserPermissions(user.userId)
      const role = await PermissionService.getUserRole(user.userId)

      return c.json(successResponse('Permissões obtidas com sucesso', {
        role,
        permissions,
        permissionNames: permissions.map(p => p.name)
      }))
    } catch (error) {
      console.error('Erro ao obter permissões do usuário:', error)
      return c.json(errorResponse('Erro interno do servidor'), 500)
    }
  }

  /**
   * Obtém permissões de um usuário específico
   */
  static async getUserPermissions(c: Context) {
    try {
      const user = c.get('user') as JWTPayload
      const targetUserId = c.req.param('userId')

      if (!targetUserId) {
        return c.json(errorResponse('ID do usuário é obrigatório'), 400)
      }

      const permissions = await PermissionService.getUserPermissions(targetUserId)
      const role = await PermissionService.getUserRole(targetUserId)

      if (!role) {
        return c.json(errorResponse('Usuário não encontrado ou sem role'), 404)
      }

      await logService.log({
        userId: user.userId,
        action: 'user_permissions_view',
        resource: 'users',
        details: `Usuário ${user.email} visualizou permissões do usuário ${targetUserId}`,
        ipAddress: c.req.header('x-forwarded-for') || 'unknown'
      })

      return c.json(successResponse('Permissões do usuário obtidas com sucesso', {
        userId: targetUserId,
        role,
        permissions,
        permissionNames: permissions.map(p => p.name)
      }))
    } catch (error) {
      console.error('Erro ao obter permissões do usuário:', error)
      return c.json(errorResponse('Erro interno do servidor'), 500)
    }
  }

  /**
   * Atualiza o role de um usuário
   */
  static async updateUserRole(c: Context) {
    try {
      const user = c.get('user') as JWTPayload
      const targetUserId = c.req.param('userId')
      const body = await c.req.json()
      const { roleId } = body

      if (!targetUserId) {
        return c.json(errorResponse('ID do usuário é obrigatório'), 400)
      }

      if (!roleId) {
        return c.json(errorResponse('ID do role é obrigatório'), 400)
      }

      // Verifica se o role existe
      const roles = await PermissionService.getAllRoles()
      const targetRole = roles.find(r => r.id === roleId)

      if (!targetRole) {
        return c.json(errorResponse('Role não encontrado'), 404)
      }

      // Atualiza o role do usuário
      const updatedUser = await PermissionService.updateUserRole(targetUserId, roleId)

      await logService.log({
        userId: user.userId,
        action: 'user_role_update',
        resource: 'users',
        details: `Usuário ${user.email} alterou role do usuário ${targetUserId} para ${targetRole.name}`,
        ipAddress: c.req.header('x-forwarded-for') || 'unknown'
      })

      return c.json(successResponse('Role do usuário atualizado com sucesso', {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role
        }
      }))
    } catch (error) {
      console.error('Erro ao atualizar role do usuário:', error)
      
      if (error instanceof Error) {
        return c.json(errorResponse(error.message), 400)
      }
      
      return c.json(errorResponse('Erro interno do servidor'), 500)
    }
  }

  /**
   * Verifica se um usuário tem uma permissão específica
   */
  static async checkPermission(c: Context) {
    try {
      const user = c.get('user') as JWTPayload
      const { userId, resource, action } = await c.req.json()

      if (!userId || !resource || !action) {
        return c.json(errorResponse('userId, resource e action são obrigatórios'), 400)
      }

      const hasPermission = await PermissionService.hasPermission(userId, resource, action)

      await logService.log({
        userId: user.userId,
        action: 'permission_check',
        resource: 'permissions',
        details: `Usuário ${user.email} verificou permissão ${resource}:${action} para usuário ${userId}`,
        ipAddress: c.req.header('x-forwarded-for') || 'unknown'
      })

      return c.json(successResponse('Verificação de permissão realizada', {
        userId,
        resource,
        action,
        hasPermission
      }))
    } catch (error) {
      console.error('Erro ao verificar permissão:', error)
      return c.json(errorResponse('Erro interno do servidor'), 500)
    }
  }

  /**
   * Obtém estatísticas dos roles
   */
  static async getRoleStats(c: Context) {
    try {
      const user = c.get('user') as JWTPayload
      const roles = await PermissionService.getAllRoles()
      const permissions = await PermissionService.getAllPermissions()

      const stats = {
        totalRoles: roles.length,
        totalPermissions: permissions.length,
        roleDistribution: roles.map(role => ({
          id: role.id,
          name: role.name,
          userCount: role.userCount,
          permissionCount: role.permissions.length
        })),
        permissionsByResource: permissions.reduce((acc, perm) => {
          acc[perm.resource] = (acc[perm.resource] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }

      await logService.log({
        userId: user.userId,
        action: 'role_stats',
        resource: 'roles',
        details: `Usuário ${user.email} visualizou estatísticas de roles`,
        ipAddress: c.req.header('x-forwarded-for') || 'unknown'
      })

      return c.json(successResponse('Estatísticas obtidas com sucesso', stats))
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error)
      return c.json(errorResponse('Erro interno do servidor'), 500)
    }
  }
}

export default RoleController