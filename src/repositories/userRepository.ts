import type { User, CreateUserData, UpdateUserData, UserFilters } from '@/types'
import { generateId } from '@/utils/helpers'
import { UserRole } from '@/types'

// Simulação de banco de dados em memória
// Em produção, substitua por implementação com Prisma
const users: User[] = [
  {
    id: '1',
    email: 'admin@example.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', // senha: admin123
    name: 'Administrador',
    role: UserRole.ADMIN,
    isActive: true,
    emailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLogin: new Date()
  }
]

/**
 * Repositório para operações com usuários
 */
export class UserRepository {
  /**
   * Busca usuário por ID
   */
  async findById(id: string): Promise<User | null> {
    const user = users.find(u => u.id === id)
    return user || null
  }

  /**
   * Busca usuário por email
   */
  async findByEmail(email: string): Promise<User | null> {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    return user || null
  }

  /**
   * Cria um novo usuário
   */
  async create(userData: CreateUserData): Promise<User> {
    const newUser: User = {
      id: generateId(),
      email: userData.email.toLowerCase(),
      password: userData.password,
      name: userData.name,
      role: userData.role || UserRole.USER,
      isActive: true,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    users.push(newUser)
    return newUser
  }

  /**
   * Atualiza um usuário
   */
  async update(id: string, updateData: UpdateUserData): Promise<User | null> {
    const userIndex = users.findIndex(u => u.id === id)
    
    if (userIndex === -1) {
      return null
    }

    const updatedUser = {
      ...users[userIndex],
      ...updateData,
      updatedAt: new Date()
    }

    users[userIndex] = updatedUser
    return updatedUser
  }

  /**
   * Deleta um usuário
   */
  async delete(id: string): Promise<boolean> {
    const userIndex = users.findIndex(u => u.id === id)
    
    if (userIndex === -1) {
      return false
    }

    users.splice(userIndex, 1)
    return true
  }

  /**
   * Lista usuários com filtros e paginação
   */
  async findMany(filters: UserFilters = {}): Promise<{
    users: User[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    let filteredUsers = [...users]

    // Aplicar filtros
    if (filters.role) {
      filteredUsers = filteredUsers.filter(u => u.role === filters.role)
    }

    if (filters.isActive !== undefined) {
      filteredUsers = filteredUsers.filter(u => u.isActive === filters.isActive)
    }

    if (filters.emailVerified !== undefined) {
      filteredUsers = filteredUsers.filter(u => u.emailVerified === filters.emailVerified)
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filteredUsers = filteredUsers.filter(u => 
        u.name.toLowerCase().includes(searchTerm) ||
        u.email.toLowerCase().includes(searchTerm)
      )
    }

    const total = filteredUsers.length
    const page = filters.page || 1
    const limit = filters.limit || 10
    const totalPages = Math.ceil(total / limit)

    // Aplicar paginação
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

    return {
      users: paginatedUsers,
      total,
      page,
      limit,
      totalPages
    }
  }

  /**
   * Conta usuários com filtros
   */
  async count(filters: Partial<UserFilters> = {}): Promise<number> {
    let filteredUsers = [...users]

    if (filters.role) {
      filteredUsers = filteredUsers.filter(u => u.role === filters.role)
    }

    if (filters.isActive !== undefined) {
      filteredUsers = filteredUsers.filter(u => u.isActive === filters.isActive)
    }

    if (filters.emailVerified !== undefined) {
      filteredUsers = filteredUsers.filter(u => u.emailVerified === filters.emailVerified)
    }

    return filteredUsers.length
  }

  /**
   * Verifica se email já existe
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const user = users.find(u => 
      u.email.toLowerCase() === email.toLowerCase() && 
      u.id !== excludeId
    )
    return !!user
  }

  /**
   * Atualiza último login
   */
  async updateLastLogin(id: string): Promise<void> {
    const userIndex = users.findIndex(u => u.id === id)
    
    if (userIndex !== -1) {
      users[userIndex].lastLogin = new Date()
      users[userIndex].updatedAt = new Date()
    }
  }

  /**
   * Ativa/desativa usuário
   */
  async toggleActive(id: string): Promise<User | null> {
    const userIndex = users.findIndex(u => u.id === id)
    
    if (userIndex === -1) {
      return null
    }

    users[userIndex].isActive = !users[userIndex].isActive
    users[userIndex].updatedAt = new Date()
    
    return users[userIndex]
  }

  /**
   * Verifica email
   */
  async verifyEmail(id: string): Promise<User | null> {
    const userIndex = users.findIndex(u => u.id === id)
    
    if (userIndex === -1) {
      return null
    }

    users[userIndex].emailVerified = true
    users[userIndex].updatedAt = new Date()
    
    return users[userIndex]
  }

  /**
   * Operações em lote
   */
  async bulkUpdate(userIds: string[], updateData: Partial<UpdateUserData>): Promise<number> {
    let updatedCount = 0

    for (const userId of userIds) {
      const userIndex = users.findIndex(u => u.id === userId)
      
      if (userIndex !== -1) {
        users[userIndex] = {
          ...users[userIndex],
          ...updateData,
          updatedAt: new Date()
        }
        updatedCount++
      }
    }

    return updatedCount
  }

  /**
   * Deleta múltiplos usuários
   */
  async bulkDelete(userIds: string[]): Promise<number> {
    let deletedCount = 0

    for (const userId of userIds) {
      const userIndex = users.findIndex(u => u.id === userId)
      
      if (userIndex !== -1) {
        users.splice(userIndex, 1)
        deletedCount++
      }
    }

    return deletedCount
  }

  /**
   * Obtém estatísticas dos usuários
   */
  async getStats(): Promise<{
    total: number
    active: number
    inactive: number
    verified: number
    unverified: number
    byRole: Record<UserRole, number>
  }> {
    const total = users.length
    const active = users.filter(u => u.isActive).length
    const inactive = total - active
    const verified = users.filter(u => u.emailVerified).length
    const unverified = total - verified

    const byRole = {
      [UserRole.ADMIN]: users.filter(u => u.role === UserRole.ADMIN).length,
      [UserRole.MODERATOR]: users.filter(u => u.role === UserRole.MODERATOR).length,
      [UserRole.USER]: users.filter(u => u.role === UserRole.USER).length
    }

    return {
      total,
      active,
      inactive,
      verified,
      unverified,
      byRole
    }
  }
}

// Instância singleton do repositório
export const userRepository = new UserRepository()