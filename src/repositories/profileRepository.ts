import { PrismaClient, UserProfile } from '@prisma/client'
import { prisma } from '@/config/database'

export interface CreateProfileData {
  userId: string
  firstName?: string
  lastName?: string
  bio?: string
  phone?: string
  dateOfBirth?: Date
  address?: string // JSON string
  preferences?: string // JSON string
  socialLinks?: string // JSON string
}

export interface UpdateProfileData {
  firstName?: string
  lastName?: string
  bio?: string
  phone?: string
  dateOfBirth?: Date
  address?: string // JSON string
  preferences?: string // JSON string
  socialLinks?: string // JSON string
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
  address: string | null
  preferences: string | null
  socialLinks: string | null
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
        { user: { 
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } }
          ]
        }}
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