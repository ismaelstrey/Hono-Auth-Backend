import { Hono } from 'hono'
import { profileController } from '@/controllers/profileController'
import { authMiddleware } from '@/middlewares/auth'
import { rateLimitPublic } from '@/middlewares/rateLimiter'
import { loggingMiddleware } from '@/middlewares/logging'
import { uploadAvatar } from '@/middlewares/upload'

const profileRoutes = new Hono()

// Aplicar middlewares globais
profileRoutes.use('*', loggingMiddleware)
profileRoutes.use('*', rateLimitPublic)
profileRoutes.use('*', authMiddleware)

/**
 * @route POST /profiles
 * @desc Criar perfil do usuário autenticado
 * @access Private
 */
profileRoutes.post('/', profileController.createProfile.bind(profileController))

/**
 * @route GET /profiles/me
 * @desc Obter perfil do usuário autenticado
 * @access Private
 */
profileRoutes.get('/me', profileController.getMyProfile.bind(profileController))

/**
 * @route PUT /profiles/me
 * @desc Atualizar perfil do usuário autenticado
 * @access Private
 */
profileRoutes.put('/me', profileController.updateProfile.bind(profileController))

/**
 * @route POST /profiles/me
 * @desc Criar ou atualizar perfil do usuário autenticado (upsert)
 * @access Private
 */
profileRoutes.post('/me', profileController.upsertProfile.bind(profileController))

/**
 * @route DELETE /profiles/me
 * @desc Deletar perfil do usuário autenticado
 * @access Private
 */
profileRoutes.delete('/me', profileController.deleteProfile.bind(profileController))

/**
 * @route POST /profiles/me/avatar
 * @desc Upload de avatar do usuário autenticado
 * @access Private
 */
profileRoutes.post('/me/avatar', uploadAvatar, profileController.uploadAvatar.bind(profileController))

/**
 * @route GET /profiles/:id
 * @desc Obter perfil público por ID
 * @access Private (mas pode ser visualizado por outros usuários dependendo das configurações de privacidade)
 */
profileRoutes.get('/:id', profileController.getProfileById.bind(profileController))

/**
 * @route GET /profiles
 * @desc Listar perfis (admin/moderator apenas)
 * @access Private (Admin/Moderator)
 */
profileRoutes.get('/', profileController.listProfiles.bind(profileController))

/**
 * @route GET /profiles/stats/overview
 * @desc Obter estatísticas de perfis (admin apenas)
 * @access Private (Admin)
 */
profileRoutes.get('/stats/overview', profileController.getProfileStats.bind(profileController))

export { profileRoutes }