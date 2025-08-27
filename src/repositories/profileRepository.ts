import { PrismaClient, UserProfile } from '@prisma/client'
import { prisma } from '@/config/database'
import { DatabaseError } from '@/utils/errors'
import type { PaginationParams, PaginatedResult, SortParams, FilterParams } from '@/utils/pagination'
import { createPaginatedResult, parseDateFilters } from '@/utils/pagination'

export interface CreateProfileData {
  userId: string
  firstName?: string
  lastName?: string
  bio?: string
  phone?: string
  dateOfBirth?: Date

  // Informações profissionais
  company?: string
  jobTitle?: string
  website?: string
  location?: string

  // Informações adicionais
  languages?: string // JSON array
  skills?: string // JSON array
  interests?: string // JSON array
  education?: string // JSON string
  experience?: string // JSON string

  // Configurações e preferências
  address?: string // JSON string
  preferences?: string // JSON string
  socialLinks?: string // JSON string

  // Configurações de privacidade
  isPublic?: boolean
  showEmail?: boolean
  showPhone?: boolean
}

export interface UpdateProfileData {
  firstName?: string
  lastName?: string
  bio?: string
  phone?: string
  dateOfBirth?: Date

  // Informações profissionais
  company?: string
  jobTitle?: string
  website?: string
  location?: string

  // Informações adicionais
  languages?: string // JSON array
  skills?: string // JSON array
  interests?: string // JSON array
  education?: string // JSON string
  experience?: string // JSON string

  // Configurações e preferências
  address?: string // JSON string
  preferences?: string // JSON string
  socialLinks?: string // JSON string

  // Configurações de privacidade
  isPublic?: boolean
  showEmail?: boolean
  showPhone?: boolean
}

export interface ProfileWithUser {
  id: string
  userId: string
  firstName: string | null
  lastName: string | null
  avatar: string | null
  bio: string | null
  phone: string | null
  dateOfBirth: Date | null

  // Informações profissionais
  company: string | null
  jobTitle: string | null
  website: string | null
  location: string | null

  // Informações adicionais
  languages: string | null
  skills: string | null
  interests: string | null
  education: string | null
  experience: string | null

  // Configurações e preferências
  address: string | null
  preferences: string | null
  socialLinks: string | null

  // Configurações de privacidade
  isPublic: boolean
  showEmail: boolean
  showPhone: boolean

  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string
    email: string
    role: {
      name: string
    }
  }
}

class ProfileRepository {
  private db: PrismaClient

  constructor() {
    this.db = prisma
  }

  /**
   * Criar um novo perfil de usuário
   */
  async create(data: CreateProfileData): Promise<UserProfile> {
    return await this.db.userProfile.create({
      data
    })
  }

  /**
   * Buscar perfil por ID do usuário
   */
  async findByUserId(userId: string): Promise<ProfileWithUser | null> {
    return await this.db.userProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })
  }

  /**
   * Buscar perfil por ID
   */
  async findById(id: string): Promise<ProfileWithUser | null> {
    return await this.db.userProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })
  }

  /**
   * Atualizar perfil
   */
  async update(userId: string, data: UpdateProfileData): Promise<UserProfile> {
    return await this.db.userProfile.update({
      where: { userId },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })
  }

  /**
   * Atualizar avatar do usuário
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<UserProfile> {
    return await this.db.userProfile.update({
      where: { userId },
      data: {
        avatar: avatarUrl,
        updatedAt: new Date()
      }
    })
  }

  /**
   * Deletar perfil
   */
  async delete(userId: string): Promise<void> {
    await this.db.userProfile.delete({
      where: { userId }
    })
  }

  /**
   * Listar perfis com paginação
   */
  async findMany({
    page = 1,
    limit = 10,
    search
  }: {
    page?: number
    limit?: number
    search?: string
  } = {}): Promise<{
    profiles: ProfileWithUser[]
    total: number
    page: number
    totalPages: number
  }> {
    const skip = (page - 1) * limit

    const where = search ? {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { bio: { contains: search, mode: 'insensitive' as const } },
        {
          user: {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } }
            ]
          }
        }
      ]
    } : {}

    const [profiles, total] = await Promise.all([
      this.db.userProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' }
      }),
      this.db.userProfile.count({ where })
    ])

    return {
      profiles,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Buscar perfis com paginação, filtros e busca avançados
   */
  async findManyAdvanced(
    pagination: PaginationParams,
    sort: SortParams = {},
    filters: FilterParams = {}
  ): Promise<PaginatedResult<ProfileWithUser>> {
    try {
      const whereClause = this.buildProfileWhereClause(filters)
      const orderBy = this.buildProfileOrderBy(sort)

      const [profiles, total] = await Promise.all([
        this.db.userProfile.findMany({
          where: whereClause,
          skip: pagination.offset,
          take: pagination.limit,
          orderBy,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }),
        this.db.userProfile.count({ where: whereClause })
      ])

      return createPaginatedResult(profiles as ProfileWithUser[], total, pagination)
    } catch (error) {
      throw new DatabaseError('Erro ao buscar perfis', error)
    }
  }

  /**
   * Construir cláusula WHERE para filtros de perfil
   */
  private buildProfileWhereClause(filters: FilterParams): any {
    const where: any = {}

    // Busca textual avançada
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { bio: { contains: filters.search, mode: 'insensitive' } },
        { company: { contains: filters.search, mode: 'insensitive' } },
        { jobTitle: { contains: filters.search, mode: 'insensitive' } },
        { location: { contains: filters.search, mode: 'insensitive' } },
        { website: { contains: filters.search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } }
            ]
          }
        }
      ]
    }

    // Filtros por role
    if (filters.role) {
      where.user = {
        ...where.user,
        role: {
          name: filters.role
        }
      }
    }

    // Filtros por múltiplos roles
    if (filters.roles && Array.isArray(filters.roles)) {
      where.user = {
        ...where.user,
        role: {
          name: { in: filters.roles }
        }
      }
    }

    // Filtros de visibilidade
    if (filters.isPublic !== undefined) {
      where.isPublic = typeof filters.isPublic === 'string' ? filters.isPublic === 'true' : Boolean(filters.isPublic)
    }

    if (filters.showEmail !== undefined) {
      where.showEmail = typeof filters.showEmail === 'string' ? filters.showEmail === 'true' : Boolean(filters.showEmail)
    }

    if (filters.showPhone !== undefined) {
      where.showPhone = typeof filters.showPhone === 'string' ? filters.showPhone === 'true' : Boolean(filters.showPhone)
    }

    // Filtros por localização
    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' }
    }

    if (filters.locations && Array.isArray(filters.locations)) {
      where.location = {
        in: filters.locations
      }
    }

    // Filtros por empresa
    if (filters.company) {
      where.company = { contains: filters.company, mode: 'insensitive' }
    }

    if (filters.companies && Array.isArray(filters.companies)) {
      where.company = {
        in: filters.companies
      }
    }

    // Filtro por cargo
    if (filters.jobTitle) {
      where.jobTitle = { contains: filters.jobTitle, mode: 'insensitive' }
    }

    // Filtro por faixa etária
    if (filters.ageFrom || filters.ageTo) {
      const currentYear = new Date().getFullYear()

      if (filters.ageFrom) {
        const ageFrom = parseInt(filters.ageFrom as string)
        if (!isNaN(ageFrom)) {
          const maxBirthYear = currentYear - ageFrom
          where.birthDate = {
            ...where.birthDate,
            lte: new Date(`${maxBirthYear}-12-31`)
          }
        }
      }

      if (filters.ageTo) {
        const ageTo = parseInt(filters.ageTo as string)
        if (!isNaN(ageTo)) {
          const minBirthYear = currentYear - ageTo
          where.birthDate = {
            ...where.birthDate,
            gte: new Date(`${minBirthYear}-01-01`)
          }
        }
      }
    }

    // Filtro por presença de avatar
    if (filters.hasAvatar !== undefined) {
      const hasAvatar = typeof filters.hasAvatar === 'string' ? filters.hasAvatar === 'true' : Boolean(filters.hasAvatar)
      if (hasAvatar) {
        where.avatar = { not: null }
      } else {
        where.avatar = null
      }
    }

    // Filtro por presença de biografia
    if (filters.hasBio !== undefined) {
      const hasBio = typeof filters.hasBio === 'string' ? filters.hasBio === 'true' : Boolean(filters.hasBio)
      if (hasBio) {
        where.bio = { not: null }
      } else {
        where.bio = null
      }
    }

    // Filtro por presença de telefone
    if (filters.hasPhone !== undefined) {
      const hasPhone = typeof filters.hasPhone === 'string' ? filters.hasPhone === 'true' : Boolean(filters.hasPhone)
      if (hasPhone) {
        where.phone = { not: null }
      } else {
        where.phone = null
      }
    }

    // Filtro por presença de website
    if (filters.hasWebsite !== undefined) {
      const hasWebsite = typeof filters.hasWebsite === 'string' ? filters.hasWebsite === 'true' : Boolean(filters.hasWebsite)
      if (hasWebsite) {
        where.website = { not: null }
      } else {
        where.website = null
      }
    }

    // Filtro por perfis completos (com informações básicas preenchidas)
    if (filters.isComplete && (typeof filters.isComplete === 'string' ? filters.isComplete === 'true' : filters.isComplete)) {
      where.AND = [
        { firstName: { not: null } },
        { lastName: { not: null } },
        { bio: { not: null } }
      ]
    }

    // Filtros de data
    const dateFilters = parseDateFilters(filters)
    if (dateFilters.dateFrom || dateFilters.dateTo) {
      where.createdAt = {}
      if (dateFilters.dateFrom) where.createdAt.gte = dateFilters.dateFrom
      if (dateFilters.dateTo) where.createdAt.lte = dateFilters.dateTo
    }

    // Filtros de data de atualização
    if (filters.updatedFrom || filters.updatedTo) {
      where.updatedAt = {}
      if (filters.updatedFrom) {
        const date = new Date(filters.updatedFrom)
        if (!isNaN(date.getTime())) {
          where.updatedAt.gte = date
        }
      }
      if (filters.updatedTo) {
        const date = new Date(filters.updatedTo)
        if (!isNaN(date.getTime())) {
          date.setHours(23, 59, 59, 999)
          where.updatedAt.lte = date
        }
      }
    }

    return where
  }

  /**
   * Construir cláusula ORDER BY para ordenação de perfis
   */
  private buildProfileOrderBy(sort: SortParams): any {
    const validSortFields = [
      'firstName', 'lastName', 'company', 'jobTitle',
      'location', 'createdAt', 'updatedAt'
    ]

    if ('field' in sort && typeof sort.field === 'string' && validSortFields.includes(sort.field)) {
      return { [sort.field]: (sort as any).direction || 'desc' }
    }

    return { updatedAt: 'desc' }
  }

  /**
   * Buscar perfis por role
   */
  async findByRole(roleName: string): Promise<ProfileWithUser[]> {
    return await this.db.userProfile.findMany({
      where: {
        user: {
          role: {
            name: roleName
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })
  }

  /**
   * Verificar se perfil existe
   */
  async exists(userId: string): Promise<boolean> {
    const profile = await this.db.userProfile.findUnique({
      where: { userId },
      select: { id: true }
    })
    return !!profile
  }

  /**
   * Criar ou atualizar perfil (upsert)
   */
  async upsert(userId: string, data: CreateProfileData | UpdateProfileData): Promise<UserProfile> {
    return await this.db.userProfile.upsert({
      where: { userId },
      update: {
        ...data,
        updatedAt: new Date()
      },
      create: {
        userId,
        ...data
      } as CreateProfileData
    })
  }

  /**
   * Obter estatísticas de perfis
   */
  async getStats(): Promise<{
    total: number
    withAvatar: number
    withBio: number
    withPhone: number
    byRole: { role: string; count: number }[]
  }> {
    const [total, withAvatar, withBio, withPhone, byRole] = await Promise.all([
      this.db.userProfile.count(),
      this.db.userProfile.count({ where: { avatar: { not: null } } }),
      this.db.userProfile.count({ where: { bio: { not: null } } }),
      this.db.userProfile.count({ where: { phone: { not: null } } }),
      this.db.userProfile.groupBy({
        by: ['userId'],
        _count: { id: true }
      })
    ])

    // Processar estatísticas por role
    const roleStats: { [key: string]: number } = {}

    // Como groupBy não suporta include, vamos fazer uma query separada
    const profilesWithRoles = await this.db.userProfile.findMany({
      select: {
        user: {
          select: {
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    profilesWithRoles.forEach(profile => {
      const roleName = profile.user.role.name
      roleStats[roleName] = (roleStats[roleName] || 0) + 1
    })

    const roleStatsArray = Object.entries(roleStats).map(([role, count]) => ({
      role,
      count
    }))

    return {
      total,
      withAvatar,
      withBio,
      withPhone,
      byRole: roleStatsArray
    }
  }
}

export const profileRepository = new ProfileRepository()
export default profileRepository