
import { profileRepository, CreateProfileData, UpdateProfileData, ProfileWithUser } from '@/repositories/profileRepository'
import { ValidationError, NotFoundError, ConflictError, InternalServerError } from '@/utils/errors'
import { logger } from '@/utils/logger'
import { deleteOldAvatar } from '@/middlewares/upload'
import type { PaginationParams, PaginatedResult, SortParams, FilterParams } from '@/utils/pagination'

export interface ProfileData {
  firstName?: string
  lastName?: string
  bio?: string
  phone?: string
  dateOfBirth?: string // ISO string
  
  // Informações profissionais
  company?: string
  jobTitle?: string
  website?: string
  location?: string
  
  // Informações adicionais
  languages?: string[] // Array de idiomas
  skills?: string[] // Array de habilidades
  interests?: string[] // Array de interesses
  education?: {
    degree?: string
    institution?: string
    year?: number
    description?: string
  }[]
  experience?: {
    company?: string
    position?: string
    startDate?: string
    endDate?: string
    description?: string
    current?: boolean
  }[]
  
  // Configurações e preferências
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  preferences?: {
    language?: string
    timezone?: string
    notifications?: {
      email?: boolean
      push?: boolean
      sms?: boolean
    }
    privacy?: {
      profileVisibility?: 'public' | 'private' | 'friends'
      showEmail?: boolean
      showPhone?: boolean
    }
  }
  socialLinks?: {
    website?: string
    linkedin?: string
    twitter?: string
    github?: string
    instagram?: string
    facebook?: string
    youtube?: string
  }
  
  // Configurações de privacidade
  isPublic?: boolean
  showEmail?: boolean
  showPhone?: boolean
}

export interface ProfileResponse {
  id: string
  userId: string
  firstName: string | null
  lastName: string | null
  fullName: string | null
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
  languages: string[] | null
  skills: string[] | null
  interests: string[] | null
  education: Record<string, unknown> | null
  experience: Record<string, unknown> | null
  
  // Configurações e preferências
  address: Record<string, unknown> | null
  preferences: Record<string, unknown> | null
  socialLinks: Record<string, unknown> | null
  
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
    role: string
  }
}

class ProfileService {
  /**
   * Criar perfil de usuário
   */
  async createProfile(userId: string, data: ProfileData): Promise<ProfileResponse> {
    try {
      // Verificar se já existe perfil para este usuário
      const existingProfile = await profileRepository.findByUserId(userId)
      if (existingProfile) {
        throw new ConflictError('Perfil já existe para este usuário')
      }

      // Validar dados
      this.validateProfileData(data)

      // Preparar dados para criação
      const createData: CreateProfileData = {
        userId,
        firstName: data.firstName,
        lastName: data.lastName,
        bio: data.bio,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        
        // Informações profissionais
        company: data.company,
        jobTitle: data.jobTitle,
        website: data.website,
        location: data.location,
        
        // Informações adicionais
        languages: data.languages ? JSON.stringify(data.languages) : undefined,
        skills: data.skills ? JSON.stringify(data.skills) : undefined,
        interests: data.interests ? JSON.stringify(data.interests) : undefined,
        education: data.education ? JSON.stringify(data.education) : undefined,
        experience: data.experience ? JSON.stringify(data.experience) : undefined,
        
        // Configurações e preferências
        address: data.address ? JSON.stringify(data.address) : undefined,
        preferences: data.preferences ? JSON.stringify(data.preferences) : undefined,
        socialLinks: data.socialLinks ? JSON.stringify(data.socialLinks) : undefined,
        
        // Configurações de privacidade
        isPublic: data.isPublic ?? true,
        showEmail: data.showEmail ?? false,
        showPhone: data.showPhone ?? false
      }

      const profile = await profileRepository.create(createData)
      
      logger.info(`Perfil criado para usuário ${userId}`, {
        profileId: profile.id,
        userId
      })

      // Buscar perfil completo para retorno
      const fullProfile = await profileRepository.findByUserId(userId)
      if (!fullProfile) {
        throw new InternalServerError('Erro ao buscar perfil criado')
      }

      return this.formatProfileResponse(fullProfile)
    } catch (error) {
      logger.error('Erro ao criar perfil', { userId, error })
      throw error
    }
  }

  /**
   * Buscar perfil por ID do usuário
   */
  async getProfileByUserId(userId: string): Promise<ProfileResponse | null> {
    try {
      const profile = await profileRepository.findByUserId(userId)
      if (!profile) {
        return null
      }

      return this.formatProfileResponse(profile)
    } catch (error) {
      logger.error('Erro ao buscar perfil por userId', { userId, error })
      throw new InternalServerError('Erro ao buscar perfil')
    }
  }

  /**
   * Buscar perfil por ID
   */
  async getProfileById(id: string): Promise<ProfileResponse | null> {
    try {
      const profile = await profileRepository.findById(id)
      if (!profile) {
        return null
      }

      return this.formatProfileResponse(profile)
    } catch (error) {
      logger.error('Erro ao buscar perfil por ID', { id, error })
      throw new InternalServerError('Erro ao buscar perfil')
    }
  }

  /**
   * Atualizar perfil
   */
  async updateProfile(userId: string, data: ProfileData): Promise<ProfileResponse> {
    try {
      // Verificar se perfil existe
      const existingProfile = await profileRepository.findByUserId(userId)
      if (!existingProfile) {
        throw new NotFoundError('Perfil não encontrado')
      }

      // Validar dados
      this.validateProfileData(data)

      // Preparar dados para atualização
      const updateData: UpdateProfileData = {
        firstName: data.firstName,
        lastName: data.lastName,
        bio: data.bio,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        
        // Informações profissionais
        company: data.company,
        jobTitle: data.jobTitle,
        website: data.website,
        location: data.location,
        
        // Informações adicionais
        languages: data.languages ? JSON.stringify(data.languages) : undefined,
        skills: data.skills ? JSON.stringify(data.skills) : undefined,
        interests: data.interests ? JSON.stringify(data.interests) : undefined,
        education: data.education ? JSON.stringify(data.education) : undefined,
        experience: data.experience ? JSON.stringify(data.experience) : undefined,
        
        // Configurações e preferências
        address: data.address ? JSON.stringify(data.address) : undefined,
        preferences: data.preferences ? JSON.stringify(data.preferences) : undefined,
        socialLinks: data.socialLinks ? JSON.stringify(data.socialLinks) : undefined,
        
        // Configurações de privacidade
        isPublic: data.isPublic,
        showEmail: data.showEmail,
        showPhone: data.showPhone
      }

      await profileRepository.update(userId, updateData)
      
      logger.info(`Perfil atualizado para usuário ${userId}`, {
        profileId: existingProfile.id,
        userId
      })

      // Buscar perfil atualizado
      const updatedProfile = await profileRepository.findByUserId(userId)
      if (!updatedProfile) {
        throw new InternalServerError('Erro ao buscar perfil atualizado')
      }

      return this.formatProfileResponse(updatedProfile)
    } catch (error) {
      logger.error('Erro ao atualizar perfil', { userId, error })
      throw error
    }
  }

  /**
   * Atualizar avatar
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<ProfileResponse> {
    try {
      // Verificar se perfil existe, se não existir, criar um básico
      let existingProfile = await profileRepository.findByUserId(userId)
      if (!existingProfile) {
        logger.info(`Criando perfil básico para usuário ${userId} durante upload de avatar`)
        await profileRepository.create({ userId })
        existingProfile = await profileRepository.findByUserId(userId)
        if (!existingProfile) {
          throw new InternalServerError('Erro ao criar perfil básico')
        }
      }

      // Deletar avatar antigo se existir
      if (existingProfile.avatar) {
        deleteOldAvatar(existingProfile.avatar)
      }

      await profileRepository.updateAvatar(userId, avatarUrl)
      
      logger.info(`Avatar atualizado para usuário ${userId}`, {
        profileId: existingProfile.id,
        userId,
        avatarUrl,
        oldAvatar: existingProfile.avatar
      })

      // Buscar perfil atualizado
      const updatedProfile = await profileRepository.findByUserId(userId)
      if (!updatedProfile) {
        throw new InternalServerError('Erro ao buscar perfil atualizado')
      }

      return this.formatProfileResponse(updatedProfile)
    } catch (error) {
      logger.error('Erro ao atualizar avatar', { userId, error })
      throw error
    }
  }

  /**
   * Criar ou atualizar perfil (upsert)
   */
  async upsertProfile(userId: string, data: ProfileData): Promise<ProfileResponse> {
    try {
      // Validar dados
      this.validateProfileData(data)

      // Preparar dados
      const profileData = {
        firstName: data.firstName,
        lastName: data.lastName,
        bio: data.bio,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        address: data.address ? JSON.stringify(data.address) : undefined,
        preferences: data.preferences ? JSON.stringify(data.preferences) : undefined,
        socialLinks: data.socialLinks ? JSON.stringify(data.socialLinks) : undefined
      }

      await profileRepository.upsert(userId, { userId, ...profileData })
      
      logger.info(`Perfil criado/atualizado para usuário ${userId}`, { userId })

      // Buscar perfil completo
      const profile = await profileRepository.findByUserId(userId)
      if (!profile) {
        throw new InternalServerError('Erro ao buscar perfil')
      }

      return this.formatProfileResponse(profile)
    } catch (error) {
      logger.error('Erro ao criar/atualizar perfil', { userId, error })
      throw error
    }
  }

  /**
   * Listar perfis com paginação e busca (método legado)
   */
  async listProfiles({
    page = 1,
    limit = 10,
    search
  }: {
    page?: number
    limit?: number
    search?: string
  } = {}): Promise<{
    profiles: ProfileResponse[]
    pagination: {
      total: number
      page: number
      totalPages: number
      limit: number
    }
  }> {
    try {
      const result = await profileRepository.findMany({ page, limit, search })
      
      return {
        profiles: result.profiles.map(profile => this.formatProfileResponse(profile)),
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit
        }
      }
    } catch (error) {
      logger.error('Erro ao listar perfis', { page, limit, search, error })
      throw new InternalServerError('Erro ao listar perfis')
    }
  }

  /**
   * Listar perfis com sistema de paginação padronizado
   */
  async listProfilesAdvanced(
    pagination: PaginationParams,
    sort: SortParams = {},
    filters: FilterParams = {}
  ): Promise<PaginatedResult<ProfileResponse>> {
    try {
      const result = await profileRepository.findManyAdvanced(pagination, sort, filters)
      
      return {
        ...result,
        data: result.data.map(profile => this.formatProfileResponse(profile))
      }
    } catch (error) {
      logger.error('Erro ao listar perfis avançado', { pagination, sort, filters, error })
      throw new InternalServerError('Erro ao listar perfis')
    }
  }

  /**
   * Buscar perfis por role
   */
  async getProfilesByRole(roleName: string): Promise<ProfileResponse[]> {
    try {
      const profiles = await profileRepository.findByRole(roleName)
      return profiles.map(profile => this.formatProfileResponse(profile))
    } catch (error) {
      logger.error('Erro ao buscar perfis por role', { roleName, error })
      throw new InternalServerError('Erro ao buscar perfis por role')
    }
  }

  /**
   * Obter estatísticas de perfis
   */
  async getProfileStats(): Promise<{
    total: number
    withAvatar: number
    withBio: number
    withPhone: number
    completionRate: number
    byRole: { role: string; count: number }[]
  }> {
    try {
      const stats = await profileRepository.getStats()
      
      // Calcular taxa de completude (considerando avatar, bio e phone como indicadores)
      const completionRate = stats.total > 0 
        ? Math.round(((stats.withAvatar + stats.withBio + stats.withPhone) / (stats.total * 3)) * 100)
        : 0

      return {
        ...stats,
        completionRate
      }
    } catch (error) {
      logger.error('Erro ao obter estatísticas de perfis', { error })
      throw new InternalServerError('Erro ao obter estatísticas')
    }
  }

  /**
   * Deletar perfil
   */
  async deleteProfile(userId: string): Promise<void> {
    try {
      const existingProfile = await profileRepository.findByUserId(userId)
      if (!existingProfile) {
        throw new NotFoundError('Perfil não encontrado')
      }

      await profileRepository.delete(userId)
      
      logger.info(`Perfil deletado para usuário ${userId}`, {
        profileId: existingProfile.id,
        userId
      })
    } catch (error) {
      logger.error('Erro ao deletar perfil', { userId, error })
      throw error
    }
  }

  /**
   * Validar dados do perfil
   */
  private validateProfileData(data: ProfileData): void {
    // Validar nome
    if (data.firstName && (data.firstName.length < 2 || data.firstName.length > 50)) {
      throw new ValidationError('Nome deve ter entre 2 e 50 caracteres')
    }

    if (data.lastName && (data.lastName.length < 2 || data.lastName.length > 50)) {
      throw new ValidationError('Sobrenome deve ter entre 2 e 50 caracteres')
    }

    // Validar bio
    if (data.bio && data.bio.length > 500) {
      throw new ValidationError('Bio deve ter no máximo 500 caracteres')
    }

    // Validar telefone (formato básico)
    if (data.phone && !/^[+]?[1-9][\d\s\-()]{8,15}$/.test(data.phone)) {
      throw new ValidationError('Formato de telefone inválido')
    }

    // Validar data de nascimento
    if (data.dateOfBirth) {
      const birthDate = new Date(data.dateOfBirth)
      const now = new Date()
      const age = now.getFullYear() - birthDate.getFullYear()
      
      if (isNaN(birthDate.getTime()) || age < 13 || age > 120) {
        throw new ValidationError('Data de nascimento inválida')
      }
    }

    // Validar links sociais
    if (data.socialLinks) {
      const urlRegex = /^https?:\/\/.+/
      Object.entries(data.socialLinks).forEach(([key, value]) => {
        if (value && !urlRegex.test(value)) {
          throw new ValidationError(`Link ${key} deve ser uma URL válida`)
        }
      })
    }
  }

  /**
   * Formatar resposta do perfil
   */
  private formatProfileResponse(profile: ProfileWithUser): ProfileResponse {
    const fullName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(' ') || null

    return {
      id: profile.id,
      userId: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      fullName,
      avatar: profile.avatar,
      bio: profile.bio,
      phone: profile.phone,
      dateOfBirth: profile.dateOfBirth,
      
      // Informações profissionais
      company: profile.company,
      jobTitle: profile.jobTitle,
      website: profile.website,
      location: profile.location,
      
      // Informações adicionais
      languages: profile.languages ? JSON.parse(profile.languages) : null,
      skills: profile.skills ? JSON.parse(profile.skills) : null,
      interests: profile.interests ? JSON.parse(profile.interests) : null,
      education: profile.education ? JSON.parse(profile.education) : null,
      experience: profile.experience ? JSON.parse(profile.experience) : null,
      
      // Configurações e preferências
      address: profile.address ? JSON.parse(profile.address) : null,
      preferences: profile.preferences ? JSON.parse(profile.preferences) : null,
      socialLinks: profile.socialLinks ? JSON.parse(profile.socialLinks) : null,
      
      // Configurações de privacidade
      isPublic: profile.isPublic,
      showEmail: profile.showEmail,
      showPhone: profile.showPhone,
      
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      user: {
        id: profile.user.id,
        name: profile.user.name,
        email: profile.user.email,
        role: profile.user.role.name
      }
    }
  }
}

export const profileService = new ProfileService()
export default profileService