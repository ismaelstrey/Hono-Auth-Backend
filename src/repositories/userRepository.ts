import { prisma } from '@/config/database'
import type { User, CreateUserData, UpdateUserData, UserFilters } from '@/types'
import { UserRole } from '@/types'

/**
 * Repositório para operações com usuários usando Prisma
 */
export class UserRepository {
  /**
   * Busca usuário por ID
   */
  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) return null

    return this.mapPrismaUserToUser(user)
  }

  /**
   * Busca usuário por email
   */
  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) return null

    return this.mapPrismaUserToUser(user)
  }

  /**
   * Cria um novo usuário
   */
  async create(userData: CreateUserData): Promise<User> {
    const newUser = await prisma.user.create({
      data: {
        email: userData.email.toLowerCase(),
        password: userData.password,
        name: userData.name,
        role: userData.role || UserRole.USER,
        isActive: true
      }
    })

    return this.mapPrismaUserToUser(newUser)
  }

  /**
   * Atualiza um usuário
   */
  async update(id: string, updateData: UpdateUserData): Promise<User | null> {
    try {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date()
        }
      })

      return this.mapPrismaUserToUser(updatedUser)
    } catch (error) {
      return null
    }
  }

  /**
   * Deleta um usuário
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id }
      })
      return true
    } catch (error) {
      return false
    }
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
    const where: any = {}

    // Aplicar filtros
    if (filters.role) {
      where.role = filters.role
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } }
      ]
    }

    const page = filters.page || 1
    const limit = filters.limit || 10
    const skip = (page - 1) * limit

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      users: users.map(user => this.mapPrismaUserToUser(user)),
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
    const where: any = {}

    if (filters.role) {
      where.role = filters.role
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive
    }

    return await prisma.user.count({ where })
  }

  /**
   * Verifica se email já existe
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const where: any = {
      email: email.toLowerCase()
    }

    if (excludeId) {
      where.id = { not: excludeId }
    }

    const user = await prisma.user.findFirst({ where })
    return !!user
  }

  /**
   * Atualiza último login
   */
  async updateLastLogin(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        updatedAt: new Date()
      }
    })
  }

  /**
   * Ativa/desativa usuário
   */
  async toggleActive(id: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({ where: { id } })
      if (!user) return null

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          isActive: !user.isActive,
          updatedAt: new Date()
        }
      })

      return this.mapPrismaUserToUser(updatedUser)
    } catch (error) {
      return null
    }
  }

  /**
   * Verifica email
   */
  async verifyEmail(id: string): Promise<User | null> {
    try {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          updatedAt: new Date()
        }
      })

      return this.mapPrismaUserToUser(updatedUser)
    } catch (error) {
      return null
    }
  }

  /**
   * Operações em lote
   */
  async bulkUpdate(userIds: string[], updateData: Partial<UpdateUserData>): Promise<number> {
    const result = await prisma.user.updateMany({
      where: {
        id: { in: userIds }
      },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    })

    return result.count
  }

  /**
   * Deleta múltiplos usuários
   */
  async bulkDelete(userIds: string[]): Promise<number> {
    const result = await prisma.user.deleteMany({
      where: {
        id: { in: userIds }
      }
    })

    return result.count
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
    const [total, active, adminCount, moderatorCount, userCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: UserRole.ADMIN } }),
      prisma.user.count({ where: { role: UserRole.MODERATOR } }),
      prisma.user.count({ where: { role: UserRole.USER } })
    ])

    const inactive = total - active
    const verified = 0 // SQLite não tem campo emailVerified no schema atual
    const unverified = total - verified

    const byRole = {
      [UserRole.ADMIN]: adminCount,
      [UserRole.MODERATOR]: moderatorCount,
      [UserRole.USER]: userCount
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

  /**
   * Mapeia usuário do Prisma para o tipo User da aplicação
   */
  private mapPrismaUserToUser(prismaUser: any): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      password: prismaUser.password,
      name: prismaUser.name,
      role: prismaUser.role as UserRole,
      isActive: prismaUser.isActive,
      emailVerified: false, // Campo não existe no schema atual
      settings: prismaUser.settings ? JSON.parse(prismaUser.settings) : undefined,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
      lastLogin: prismaUser.updatedAt // Usando updatedAt como lastLogin temporariamente
    }
  }
}

// Instância singleton do repositório
export const userRepository = new UserRepository()