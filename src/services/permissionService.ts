import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Serviço para gerenciamento de permissões e roles
 */
export class PermissionService {
  /**
   * Verifica se um usuário tem uma permissão específica
   */
  static async hasPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      })

      if (!user || !user.role) {
        return false
      }

      // Verifica se o usuário tem a permissão específica
      const hasPermission = user.role.permissions.some(
        (rp) => 
          rp.permission.resource === resource && 
          rp.permission.action === action
      )

      return hasPermission
    } catch (error) {
      console.error('Erro ao verificar permissão:', error)
      return false
    }
  }

  /**
   * Verifica se um usuário tem qualquer uma das permissões especificadas
   */
  static async hasAnyPermission(
    userId: string,
    permissions: Array<{ resource: string; action: string }>
  ): Promise<boolean> {
    try {
      for (const perm of permissions) {
        const hasPermission = await this.hasPermission(
          userId,
          perm.resource,
          perm.action
        )
        if (hasPermission) {
          return true
        }
      }
      return false
    } catch (error) {
      console.error('Erro ao verificar permissões:', error)
      return false
    }
  }

  /**
   * Verifica se um usuário tem todas as permissões especificadas
   */
  static async hasAllPermissions(
    userId: string,
    permissions: Array<{ resource: string; action: string }>
  ): Promise<boolean> {
    try {
      for (const perm of permissions) {
        const hasPermission = await this.hasPermission(
          userId,
          perm.resource,
          perm.action
        )
        if (!hasPermission) {
          return false
        }
      }
      return true
    } catch (error) {
      console.error('Erro ao verificar permissões:', error)
      return false
    }
  }

  /**
   * Obtém todas as permissões de um usuário
   */
  static async getUserPermissions(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      })

      if (!user || !user.role) {
        return []
      }

      return user.role.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        resource: rp.permission.resource,
        action: rp.permission.action,
        description: rp.permission.description
      }))
    } catch (error) {
      console.error('Erro ao obter permissões do usuário:', error)
      return []
    }
  }

  /**
   * Obtém informações completas do role de um usuário
   */
  static async getUserRole(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      })

      if (!user || !user.role) {
        return null
      }

      return {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
        permissions: user.role.permissions.map((rp) => ({
          id: rp.permission.id,
          name: rp.permission.name,
          resource: rp.permission.resource,
          action: rp.permission.action,
          description: rp.permission.description
        }))
      }
    } catch (error) {
      console.error('Erro ao obter role do usuário:', error)
      return null
    }
  }

  /**
   * Lista todos os roles disponíveis
   */
  static async getAllRoles() {
    try {
      const roles = await prisma.role.findMany({
        include: {
          permissions: {
            include: {
              permission: true
            }
          },
          _count: {
            select: {
              users: true
            }
          }
        }
      })

      return roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        userCount: role._count.users,
        permissions: role.permissions.map((rp) => ({
          id: rp.permission.id,
          name: rp.permission.name,
          resource: rp.permission.resource,
          action: rp.permission.action,
          description: rp.permission.description
        }))
      }))
    } catch (error) {
      console.error('Erro ao listar roles:', error)
      return []
    }
  }

  /**
   * Lista todas as permissões disponíveis
   */
  static async getAllPermissions() {
    try {
      const permissions = await prisma.permission.findMany({
        orderBy: [
          { resource: 'asc' },
          { action: 'asc' }
        ]
      })

      return permissions
    } catch (error) {
      console.error('Erro ao listar permissões:', error)
      return []
    }
  }

  /**
   * Atualiza o role de um usuário
   */
  static async updateUserRole(userId: string, roleId: string) {
    try {
      // Verifica se o role existe
      const role = await prisma.role.findUnique({
        where: { id: roleId }
      })

      if (!role) {
        throw new Error('Role não encontrado')
      }

      // Atualiza o usuário
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { roleId },
        include: {
          role: true
        }
      })

      return updatedUser
    } catch (error) {
      console.error('Erro ao atualizar role do usuário:', error)
      throw error
    }
  }

  /**
   * Verifica se um usuário pode acessar um recurso específico
   * (útil para verificações de ownership)
   */
  static async canAccessResource(
    userId: string,
    resource: string,
    action: string,
    resourceOwnerId?: string
  ): Promise<boolean> {
    try {
      // Se é o próprio recurso do usuário, permite
      if (resourceOwnerId && userId === resourceOwnerId) {
        return true
      }

      // Caso contrário, verifica permissões
      return await this.hasPermission(userId, resource, action)
    } catch (error) {
      console.error('Erro ao verificar acesso ao recurso:', error)
      return false
    }
  }

  /**
   * Verifica se um usuário é admin
   */
  static async isAdmin(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: true
        }
      })

      return user?.role?.name === 'admin'
    } catch (error) {
      console.error('Erro ao verificar se usuário é admin:', error)
      return false
    }
  }

  /**
   * Verifica se um usuário é moderador ou admin
   */
  static async isModerator(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: true
        }
      })

      return user?.role?.name === 'moderator' || user?.role?.name === 'admin'
    } catch (error) {
      console.error('Erro ao verificar se usuário é moderador:', error)
      return false
    }
  }
}

export default PermissionService