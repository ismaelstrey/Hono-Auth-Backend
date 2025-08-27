import { userRepository } from '@/repositories/userRepository'
import { hashPassword } from '@/utils/password'
import { sanitizeUser } from '@/utils/helpers'
import type { 
  User, 
  CreateUserData, 
  UpdateUserData, 
  UserFilters,
  UserRole
} from '@/types'
import type { PaginationParams, PaginatedResult, SortParams, FilterParams } from '@/utils/pagination'

/**
 * Serviço de usuários
 */
export class UserService {
  /**
   * Busca usuário por ID
   */
  async getUserById(id: string): Promise<User> {
    const user = await userRepository.findById(id)
    if (!user) {
      throw new Error('Usuário não encontrado')
    }
    return sanitizeUser(user)
  }

  /**
   * Busca usuário por email
   */
  async getUserByEmail(email: string): Promise<User> {
    const user = await userRepository.findByEmail(email)
    if (!user) {
      throw new Error('Usuário não encontrado')
    }
    return sanitizeUser(user)
  }

  /**
   * Lista usuários com paginação, filtros e busca avançados
   */
  async listUsers(
    pagination: PaginationParams,
    sort: SortParams = {},
    filters: FilterParams = {}
  ): Promise<PaginatedResult<User>> {
    const result = await userRepository.findMany(pagination, sort, filters)
    
    return {
      ...result,
      data: result.data.map(user => sanitizeUser(user))
    }
  }

  /**
   * Lista usuários com filtros e paginação (método legado)
   */
  async getUsers(filters: UserFilters = {}) {
    // Converter filtros antigos para novos parâmetros
    const pagination = {
      page: filters.page || 1,
      limit: filters.limit || 10,
      offset: ((filters.page || 1) - 1) * (filters.limit || 10)
    }
    
    const filterParams = {
      search: filters.search,
      role: filters.role,
      status: filters.isActive !== undefined ? (filters.isActive ? 'active' : 'inactive') : undefined,
      emailVerified: filters.emailVerified
    }
    
    const result = await this.listUsers(pagination, {}, filterParams)
    
    // Converter resultado para formato antigo
    return {
      users: result.data,
      total: result.pagination.total,
      page: result.pagination.page,
      limit: result.pagination.limit,
      totalPages: result.pagination.totalPages
    }
  }

  /**
   * Cria um novo usuário (apenas admins)
   */
  async createUser(userData: CreateUserData): Promise<User> {
    // Verifica se o email já existe
    const existingUser = await userRepository.findByEmail(userData.email)
    if (existingUser) {
      throw new Error('Email já está em uso')
    }

    // Hash da senha
    const hashedPassword = await hashPassword(userData.password)

    // Cria o usuário
    const user = await userRepository.create({
      ...userData,
      password: hashedPassword
    })

    return sanitizeUser(user)
  }

  /**
   * Atualiza um usuário
   */
  async updateUser(id: string, updateData: UpdateUserData): Promise<User> {
    // Verifica se o usuário existe
    const existingUser = await userRepository.findById(id)
    if (!existingUser) {
      throw new Error('Usuário não encontrado')
    }

    // Se está atualizando o email, verifica se não está em uso
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await userRepository.emailExists(updateData.email, id)
      if (emailExists) {
        throw new Error('Email já está em uso')
      }
    }

    // Atualiza o usuário
    const updatedUser = await userRepository.update(id, updateData)
    if (!updatedUser) {
      throw new Error('Erro ao atualizar usuário')
    }

    return sanitizeUser(updatedUser)
  }

  /**
   * Atualiza perfil do próprio usuário
   */
  async updateProfile(userId: string, updateData: Partial<UpdateUserData>): Promise<User> {
    // Remove campos que o usuário não pode alterar
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { role, isActive, ...allowedData } = updateData

    return this.updateUser(userId, allowedData)
  }

  /**
   * Deleta um usuário
   */
  async deleteUser(id: string): Promise<{ message: string }> {
    const user = await userRepository.findById(id)
    if (!user) {
      throw new Error('Usuário não encontrado')
    }

    // Não permite deletar o último admin
    if (user.role === 'admin') {
      const adminCount = await userRepository.count({ role: 'admin' as UserRole })
      if (adminCount <= 1) {
        throw new Error('Não é possível deletar o último administrador')
      }
    }

    const deleted = await userRepository.delete(id)
    if (!deleted) {
      throw new Error('Erro ao deletar usuário')
    }

    return { message: 'Usuário deletado com sucesso' }
  }

  /**
   * Ativa/desativa um usuário
   */
  async toggleUserStatus(id: string): Promise<User> {
    const user = await userRepository.findById(id)
    if (!user) {
      throw new Error('Usuário não encontrado')
    }

    // Não permite desativar o último admin
    if (user.role === 'admin' && user.isActive) {
      const activeAdminCount = await userRepository.count({ 
        role: 'admin' as UserRole, 
        isActive: true 
      })
      if (activeAdminCount <= 1) {
        throw new Error('Não é possível desativar o último administrador ativo')
      }
    }

    const updatedUser = await userRepository.toggleActive(id)
    if (!updatedUser) {
      throw new Error('Erro ao alterar status do usuário')
    }

    return sanitizeUser(updatedUser)
  }

  /**
   * Altera role de um usuário
   */
  async changeUserRole(id: string, newRole: UserRole): Promise<User> {
    const user = await userRepository.findById(id)
    if (!user) {
      throw new Error('Usuário não encontrado')
    }

    // Se está removendo role de admin, verifica se não é o último
    if (user.role === 'admin' && newRole !== 'admin') {
      const adminCount = await userRepository.count({ role: 'admin' as UserRole })
      if (adminCount <= 1) {
        throw new Error('Não é possível alterar o role do último administrador')
      }
    }

    const updatedUser = await userRepository.update(id, { role: newRole })
    if (!updatedUser) {
      throw new Error('Erro ao alterar role do usuário')
    }

    return sanitizeUser(updatedUser)
  }

  /**
   * Operações em lote
   */
  async bulkOperation(
    userIds: string[], 
    operation: 'activate' | 'deactivate' | 'delete' | 'changeRole',
    data?: { role?: UserRole }
  ): Promise<{ success: number; errors: string[] }> {
    const errors: string[] = []
    let success = 0

    for (const userId of userIds) {
      try {
        switch (operation) {
        case 'activate':
          await userRepository.update(userId, { isActive: true })
          success++
          break
        case 'deactivate':
          await this.toggleUserStatus(userId) // Usa o método que verifica admins
          success++
          break
        case 'delete':
          await this.deleteUser(userId) // Usa o método que verifica admins
          success++
          break
        case 'changeRole':
          if (data?.role) {
            await this.changeUserRole(userId, data.role)
            success++
          } else {
            errors.push(`Usuário ${userId}: Role não especificada`)
          }
          break
        }
      } catch (error) {
        errors.push(`Usuário ${userId}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      }
    }

    return { success, errors }
  }

  /**
   * Busca usuários por termo
   */
  async searchUsers(searchTerm: string, limit: number = 10): Promise<User[]> {
    const pagination = {
      page: 1,
      limit,
      offset: 0
    }
    
    const filters = {
      search: searchTerm
    }
    
    const result = await userRepository.findMany(pagination, {}, filters)

    return result.data.map(user => sanitizeUser(user))
  }

  /**
   * Obtém estatísticas dos usuários
   */
  async getUserStats() {
    return await userRepository.getStats()
  }

  /**
   * Obtém configurações do usuário
   */
  async getUserSettings(userId: string) {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw new Error('Usuário não encontrado')
    }

    // Retorna configurações básicas do usuário
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  }

  /**
   * Verifica se um usuário pode realizar uma ação
   */
  async canUserPerformAction(
    userId: string, 
    action: string, 
    targetUserId?: string
  ): Promise<boolean> {
    const user = await userRepository.findById(userId)
    if (!user || !user.isActive) {
      return false
    }

    // Admins podem fazer tudo
    if (user.role === 'admin') {
      return true
    }

    // Moderadores podem fazer algumas ações
    if (user.role === 'moderator') {
      const moderatorActions = ['view_users', 'update_user_basic']
      return moderatorActions.includes(action)
    }

    // Usuários comuns só podem alterar seus próprios dados
    if (action === 'update_profile' && targetUserId === userId) {
      return true
    }

    return false
  }

  /**
   * Obtém usuários recentemente ativos
   */
  async getRecentlyActiveUsers(limit: number = 10): Promise<User[]> {
    const pagination = {
      page: 1,
      limit: 100, // Get more users to filter from
      offset: 0
    }
    
    const result = await userRepository.findMany(pagination, {}, {})

    // Filtra usuários com lastLogin e ordena por data
    const activeUsers = result.data
      .filter(user => user.lastLogin)
      .sort((a, b) => {
        if (!a.lastLogin || !b.lastLogin) return 0
        return b.lastLogin.getTime() - a.lastLogin.getTime()
      })
      .slice(0, limit)

    return activeUsers.map(user => sanitizeUser(user))
  }

  /**
   * Obtém usuários por role
   */
  async getUsersByRole(role: UserRole): Promise<User[]> {
    const pagination = {
      page: 1,
      limit: 100,
      offset: 0
    }
    
    const filters = {
      role
    }
    
    const result = await userRepository.findMany(pagination, {}, filters)
    return result.data.map(user => sanitizeUser(user))
  }
}

// Instância singleton do serviço
export const userService = new UserService()