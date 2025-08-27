import { prisma } from '@/config/database'
import type { User, CreateUserData, UpdateUserData, UserFilters } from '@/types'
import { UserRole } from '@/types'
import type { PaginationParams, PaginatedResult, SortParams, FilterParams } from '@/utils/pagination'
import { createPaginatedResult, createSearchQuery, parseDateFilters } from '@/utils/pagination'

// Mapeamento de UserRole para roleId
const ROLE_ID_MAPPING: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'admin_role',
  [UserRole.USER]: 'user_role',
  [UserRole.MODERATOR]: 'moderator_role'
}

// Mapeamento reverso de roleId para UserRole
const ROLE_NAME_MAPPING: Record<string, UserRole> = {
  'admin_role': UserRole.ADMIN,
  'user_role': UserRole.USER,
  'moderator_role': UserRole.MODERATOR
}

/**
 * Repositório para operações com usuários usando Prisma
 */
export class UserRepository {
  /**
   * Busca usuário por ID
   */
  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true
      }
    })

    if (!user) return null

    return this.mapPrismaUserToUser(user)
  }

  /**
   * Busca usuário por email
   */
  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        role: true
      }
    })

    if (!user) return null

    return this.mapPrismaUserToUser(user)
  }

  /**
   * Cria um novo usuário
   */
  async create(userData: CreateUserData): Promise<User> {
    const roleId = ROLE_ID_MAPPING[userData.role || UserRole.USER]

    const newUser = await prisma.user.create({
      data: {
        email: userData.email.toLowerCase(),
        password: userData.password,
        name: userData.name,
        roleId: roleId,
        isActive: true
      },
      include: {
        role: true
      }
    })

    return this.mapPrismaUserToUser(newUser)
  }

  /**
   * Atualiza um usuário
   */
  async update(id: string, updateData: UpdateUserData): Promise<User | null> {
    try {
      // Se está atualizando role, converter para roleId
      const dataToUpdate: any = { ...updateData, updatedAt: new Date() }
      if (updateData.role) {
        dataToUpdate.roleId = ROLE_ID_MAPPING[updateData.role]
        delete dataToUpdate.role
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: dataToUpdate,
        include: {
          role: true
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
   * Lista usuários com paginação, filtros e busca avançados
   */
  async findMany(
    pagination: PaginationParams,
    sort: SortParams = {},
    filters: FilterParams = {}
  ): Promise<PaginatedResult<User>> {
    const whereClause = this.buildUserWhereClause(filters)
    const orderBy = this.buildUserOrderBy(sort)

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip: pagination.offset,
        take: pagination.limit,
        orderBy,
        include: {
          role: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        }
      }),
      prisma.user.count({ where: whereClause })
    ])

    const mappedUsers = users.map(user => this.mapPrismaUserToUser(user))
    return createPaginatedResult(mappedUsers, total, pagination)
  }

  /**
   * Constrói cláusula WHERE para consultas de usuários
   */
  private buildUserWhereClause(filters: FilterParams): any {
    const where: any = {}

    // Filtros básicos
    if (filters.status) {
      switch (filters.status) {
      case 'active':
        where.isActive = true
        where.lockedUntil = null
        break
      case 'inactive':
        where.isActive = false
        break
      case 'locked':
        where.lockedUntil = { gt: new Date() }
        break
      }
    }

    if (filters.role) {
      // Converter UserRole para roleId
      where.roleId = ROLE_ID_MAPPING[filters.role as UserRole]
    }

    if (filters.emailVerified !== undefined) {
      where.emailVerified = typeof filters.emailVerified === 'string' ? filters.emailVerified === 'true' : !!filters.emailVerified
    }

    // Filtros de data de criação
    const dateFilters = parseDateFilters(filters)
    if (dateFilters.dateFrom || dateFilters.dateTo) {
      where.createdAt = {}
      if (dateFilters.dateFrom) {
        where.createdAt.gte = dateFilters.dateFrom
      }
      if (dateFilters.dateTo) {
        where.createdAt.lte = dateFilters.dateTo
      }
    }

    // Filtros avançados de data de último login
    if (filters.lastLoginFrom || filters.lastLoginTo) {
      where.lastLogin = {}
      if (filters.lastLoginFrom) {
        const date = new Date(filters.lastLoginFrom)
        if (!isNaN(date.getTime())) {
          where.lastLogin.gte = date
        }
      }
      if (filters.lastLoginTo) {
        const date = new Date(filters.lastLoginTo)
        if (!isNaN(date.getTime())) {
          date.setHours(23, 59, 59, 999)
          where.lastLogin.lte = date
        }
      }
    }

    // Filtro por domínio de email
    if (filters.emailDomain) {
      where.email = {
        endsWith: `@${filters.emailDomain}`
      }
    }

    // Filtro para usuários nunca logaram
    if (filters.neverLoggedIn === 'true' || Boolean(filters.neverLoggedIn) === true) {
      where.lastLogin = null
    }

    // Filtro para usuários inativos por período
    if (filters.inactiveDays) {
      const days = parseInt(filters.inactiveDays as string)
      if (!isNaN(days) && days > 0) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)
        where.OR = [
          { lastLogin: { lt: cutoffDate } },
          { lastLogin: null, createdAt: { lt: cutoffDate } }
        ]
      }
    }

    // Filtro por múltiplos roles
    if (filters.roles && Array.isArray(filters.roles)) {
      const roleIds = filters.roles.map(role => ROLE_ID_MAPPING[role as UserRole]).filter(Boolean)
      if (roleIds.length > 0) {
        where.roleId = { in: roleIds }
      }
    }

    // Busca textual avançada
    if (filters.search) {
      const searchFields = ['name', 'email']
      const searchQuery = createSearchQuery(filters.search, searchFields)
      Object.assign(where, searchQuery)
    }

    // Filtro por presença de perfil
    if (filters.hasProfile !== undefined) {
      const hasProfile = typeof filters.hasProfile === 'string' ? filters.hasProfile === 'true' : Boolean(filters.hasProfile)
      if (hasProfile) {
        where.profile = { isNot: null }
      } else {
        where.profile = null
      }
    }

    return where
  }

  /**
   * Constrói cláusula ORDER BY para consultas de usuários
   */
  private buildUserOrderBy(sort: SortParams): any {
    const allowedSortFields = [
      'name', 'email', 'role', 'createdAt', 'updatedAt', 'lastLogin'
    ]

    if (sort.sortBy && allowedSortFields.includes(sort.sortBy)) {
      return { [sort.sortBy]: sort.sortOrder || 'asc' }
    }

    return { createdAt: 'desc' } // Ordenação padrão
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
        },
        include: {
          role: true
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
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
          updatedAt: new Date()
        },
        include: {
          role: true
        }
      })

      return this.mapPrismaUserToUser(updatedUser)
    } catch (error) {
      return null
    }
  }

  /**
   * Define token de verificação de email
   */
  async setEmailVerificationToken(id: string, token: string, expiresAt: Date): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id },
        data: {
          emailVerificationToken: token,
          emailVerificationExpires: expiresAt,
          updatedAt: new Date()
        }
      })
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Busca usuário por token de verificação de email
   */
  async findByEmailVerificationToken(token: string): Promise<User | null> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpires: {
            gt: new Date()
          }
        }
      })

      return user ? this.mapPrismaUserToUser(user) : null
    } catch (error) {
      return null
    }
  }

  /**
   * Define token de reset de senha
   */
  async setPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: {
          passwordResetToken: token,
          passwordResetExpires: expiresAt,
          updatedAt: new Date()
        }
      })
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Busca usuário por token de reset de senha
   */
  async findByPasswordResetToken(token: string): Promise<User | null> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpires: {
            gt: new Date()
          }
        }
      })

      return user ? this.mapPrismaUserToUser(user) : null
    } catch (error) {
      return null
    }
  }

  /**
   * Limpa token de reset de senha
   */
  async clearPasswordResetToken(id: string): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id },
        data: {
          passwordResetToken: null,
          passwordResetExpires: null,
          updatedAt: new Date()
        }
      })
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Incrementa tentativas de login falhadas
   */
  async incrementFailedLoginAttempts(id: string, attempts: number): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id },
        data: {
          failedLoginAttempts: attempts,
          updatedAt: new Date()
        }
      })
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Bloqueia conta do usuário
   */
  async lockAccount(id: string, lockedUntil: Date): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: lockedUntil,
          updatedAt: new Date()
        }
      })
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Limpa tentativas de login falhadas e desbloqueio
   */
  async clearFailedLoginAttempts(id: string): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date()
        }
      })
      return true
    } catch (error) {
      return false
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
      prisma.user.count({ where: { roleId: ROLE_ID_MAPPING[UserRole.ADMIN] } }),
      prisma.user.count({ where: { roleId: ROLE_ID_MAPPING[UserRole.MODERATOR] } }),
      prisma.user.count({ where: { roleId: ROLE_ID_MAPPING[UserRole.USER] } })
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
    // Mapear role do relacionamento para UserRole enum
    const userRole = ROLE_NAME_MAPPING[prismaUser.roleId] || UserRole.USER

    return {
      id: prismaUser.id,
      email: prismaUser.email,
      password: prismaUser.password,
      name: prismaUser.name,
      role: userRole,
      isActive: prismaUser.isActive,
      emailVerified: prismaUser.emailVerified || false,
      failedLoginAttempts: prismaUser.failedLoginAttempts || 0,
      lockedUntil: prismaUser.lockedUntil,
      settings: prismaUser.settings ? JSON.parse(prismaUser.settings) : undefined,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
      lastLogin: prismaUser.updatedAt // Usando updatedAt como lastLogin temporariamente
    }
  }
}

// Instância singleton do repositório
export const userRepository = new UserRepository()