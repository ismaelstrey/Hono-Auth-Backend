import type { Context } from 'hono'
import { UserService } from '@/services/userService'
import { successResponse, errorResponse } from '@/utils/helpers'
import type { JWTPayload } from '@/types'
import { extractPaginationParams, extractSortParams, extractFilterParams } from '@/utils/pagination'

/**
 * Controlador de usuários
 */
export class UserController {
  private static userService = new UserService()

  /**
   * Lista usuários com paginação, filtros e busca avançados
   */
  static async handleListUsers(c: Context) {
    try {
      const query = (c.req as any).valid('query')

      const pagination = extractPaginationParams(query)
      const sort = extractSortParams(query)
      const filters = extractFilterParams(query)

      const result = await this.userService.listUsers(pagination, sort, filters)

      return c.json(successResponse(result))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }

  /**
   * Obtém usuário por ID
   */
  static async handleGetUserById(c: Context) {
    try {
      const { id } = (c.req as any).valid('param')
      const user = await this.userService.getUserById(id)

      if (!user) {
        return c.json(errorResponse('Usuário não encontrado'), 404)
      }

      return c.json(successResponse(user))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }

  /**
   * Cria novo usuário (apenas admin)
   */
  static async handleCreateUser(c: Context) {
    try {
      const userData = (c.req as any).valid('json')
      const user = await this.userService.createUser(userData)

      return c.json(successResponse(user, 'Usuário criado com sucesso'), 201)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 400)
    }
  }

  /**
   * Atualiza usuário (admin ou próprio usuário)
   */
  static async handleUpdateUser(c: Context) {
    try {
      const { id } = (c.req as any).valid('param')
      const updateData = (c.req as any).valid('json')

      const user = await this.userService.updateUser(id, updateData)

      return c.json(successResponse(user, 'Usuário atualizado com sucesso'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 400)
    }
  }

  /**
   * Atualiza perfil do usuário autenticado
   */
  static async handleUpdateProfile(c: Context) {
    try {
      const user = c.get('user') as JWTPayload
      const profileData = (c.req as any).valid('json')

      const updatedUser = await this.userService.updateProfile(user.userId, profileData)

      return c.json(successResponse(updatedUser, 'Perfil atualizado com sucesso'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 400)
    }
  }

  /**
   * Deleta usuário
   */
  static async handleDeleteUser(c: Context) {
    try {
      const { id } = (c.req as any).valid('param')
      const result = await this.userService.deleteUser(id)

      if (!result) {
        return c.json(errorResponse('Usuário não encontrado'), 404)
      }

      return c.json(successResponse(null, 'Usuário deletado com sucesso'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 400)
    }
  }

  /**
   * Ativa/desativa usuário
   */
  static async handleToggleUserStatus(c: Context) {
    try {
      const { id } = (c.req as any).valid('param')
      const user = await this.userService.toggleUserStatus(id)

      const status = user.isActive ? 'ativado' : 'desativado'
      return c.json(successResponse(user, `Usuário ${status} com sucesso`))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 400)
    }
  }

  /**
   * Altera role do usuário
   */
  static async handleChangeUserRole(c: Context) {
    try {
      const { id } = (c.req as any).valid('param')
      const { role } = (c.req as any).valid('json')

      const user = await this.userService.changeUserRole(id, role)

      return c.json(successResponse(user, 'Role alterado com sucesso'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 400)
    }
  }

  /**
   * Busca usuários
   */
  static async searchUsers(c: Context) {
    try {
      const query = c.req.query('q')

      if (!query || query.trim().length < 2) {
        return c.json(errorResponse('Query deve ter pelo menos 2 caracteres'), 400)
      }

      const users = await this.userService.searchUsers(query.trim())

      return c.json(successResponse(users))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }

  /**
   * Obtém estatísticas de usuários
   */
  static async getUserStats(c: Context) {
    try {
      const stats = await this.userService.getUserStats()

      return c.json(successResponse(stats))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }

  /**
   * Obtém usuários recentemente ativos
   */
  static async getRecentlyActiveUsers(c: Context) {
    try {
      const limit = parseInt(c.req.query('limit') || '10')
      const users = await this.userService.getRecentlyActiveUsers(limit)

      return c.json(successResponse(users))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }

  /**
   * Obtém usuários por role
   */
  static async getUsersByRole(c: Context) {
    try {
      const role = c.req.param('role')

      if (!role || !['admin', 'moderator', 'user'].includes(role)) {
        return c.json(errorResponse('Role inválido'), 400)
      }

      const users = await this.userService.getUsersByRole(role as any)

      return c.json(successResponse(users))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }

  /**
   * Operações em lote
   */
  static async handleBulkOperation(c: Context) {
    try {
      const { userIds, operation, data } = (c.req as any).valid('json')

      const result = await this.userService.bulkOperation(
        userIds,
        operation,
        data
      )

      return c.json(successResponse(result, 'Operação em lote realizada com sucesso'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 400)
    }
  }

  /**
   * Obtém configurações do usuário
   */
  static async handleGetSettings(c: Context) {
    try {
      const user = c.get('user')
      const settings = await this.userService.getUserSettings(user.id)

      return c.json(successResponse(settings, 'Configurações obtidas com sucesso'))
    } catch (error) {
      console.error('Erro ao obter configurações:', error)
      return c.json(errorResponse('Erro interno do servidor'), 500)
    }
  }

  /**
   * Atualiza configurações do usuário
   */
  static async handleUpdateSettings(c: Context) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const user = c.get('user') as JWTPayload
      const settings = (c.req as any).valid('json')

      // Em uma implementação real, você salvaria as configurações no banco
      // Por enquanto, apenas retorna sucesso
      return c.json(successResponse(settings, 'Configurações atualizadas com sucesso'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }

  /**
   * Obtém configurações do usuário
   */
  static async getSettings(c: Context) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const user = c.get('user') as JWTPayload

      // Em uma implementação real, você buscaria as configurações do banco
      // Por enquanto, retorna configurações padrão
      const defaultSettings = {
        theme: 'light',
        language: 'pt-BR',
        notifications: {
          email: true,
          push: false,
          sms: false
        },
        privacy: {
          profileVisible: true,
          showEmail: false,
          showPhone: false
        }
      }

      return c.json(successResponse(defaultSettings))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor'
      return c.json(errorResponse(message), 500)
    }
  }
}