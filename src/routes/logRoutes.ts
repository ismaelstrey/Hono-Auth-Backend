import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { LogController } from '@/controllers/logController'
import { authMiddleware } from '@/middlewares/auth'
import { requireAdmin } from '@/middlewares/auth'
import { loggingMiddleware } from '@/middlewares/logging'
import { rateLimitPublic } from '@/middlewares/rateLimiter'
import {
  paginatedCache,
  statsCache,
  cacheHeaders
} from '@/middlewares/cache'
import {
  logFiltersSchema,
  createLogSchema,
  cleanupLogsSchema,
  logStatsFiltersSchema,
  errorLogFiltersSchema,
  recentActivityFiltersSchema,
  userLogFiltersSchema,
  userIdParamSchema
} from '@/validators/logValidators'

const logRoutes = new Hono()

// Aplicar middlewares globais
logRoutes.use('*', loggingMiddleware)
logRoutes.use('*', rateLimitPublic)
logRoutes.use('*', authMiddleware)
logRoutes.use('*', requireAdmin) // Apenas administradores podem acessar logs

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Lista logs com filtros
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID do usuário
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Ação realizada
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *         description: Recurso acessado
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [error, warn, info, debug]
 *         description: Nível do log
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data inicial
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data final
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Limite de resultados
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Offset para paginação
 *     responses:
 *       200:
 *         description: Lista de logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LogEntry'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
logRoutes.get('/', zValidator('query', logFiltersSchema), paginatedCache(), cacheHeaders(), LogController.getLogs)

/**
 * @swagger
 * /api/logs/stats:
 *   get:
 *     summary: Obtém estatísticas de logs
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data inicial
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data final
 *     responses:
 *       200:
 *         description: Estatísticas de logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/LogStats'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
logRoutes.get('/stats', zValidator('query', logStatsFiltersSchema), statsCache(), cacheHeaders(3600), LogController.getStats)

/**
 * @swagger
 * /api/logs/errors:
 *   get:
 *     summary: Obtém logs de erro
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data inicial
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data final
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 100
 *         description: Limite de resultados
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Offset para paginação
 *     responses:
 *       200:
 *         description: Lista de logs de erro
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LogEntry'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
logRoutes.get('/errors', zValidator('query', errorLogFiltersSchema), paginatedCache(600), cacheHeaders(600), LogController.getErrorLogs)

/**
 * @swagger
 * /api/logs/recent:
 *   get:
 *     summary: Obtém atividades recentes
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 168
 *           default: 24
 *         description: Número de horas para buscar atividades
 *     responses:
 *       200:
 *         description: Atividades recentes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LogEntry'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
logRoutes.get('/recent', zValidator('query', recentActivityFiltersSchema), paginatedCache(300), cacheHeaders(300), LogController.getRecentActivity)

/**
 * @swagger
 * /api/logs/user/{userId}:
 *   get:
 *     summary: Obtém logs de um usuário específico
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Ação realizada
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *         description: Recurso acessado
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [error, warn, info, debug]
 *         description: Nível do log
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data inicial
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data final
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Limite de resultados
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Offset para paginação
 *     responses:
 *       200:
 *         description: Logs do usuário
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LogEntry'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
logRoutes.get('/user/:userId', zValidator('param', userIdParamSchema), zValidator('query', userLogFiltersSchema), paginatedCache(600), cacheHeaders(600), LogController.getUserLogs)

/**
 * @swagger
 * /api/logs:
 *   post:
 *     summary: Registra log manual
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - resource
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID do usuário
 *               action:
 *                 type: string
 *                 description: Ação realizada
 *               resource:
 *                 type: string
 *                 description: Recurso acessado
 *               method:
 *                 type: string
 *                 description: Método HTTP
 *               path:
 *                 type: string
 *                 description: Caminho da requisição
 *               statusCode:
 *                 type: integer
 *                 description: Código de status
 *               duration:
 *                 type: integer
 *                 description: Duração em ms
 *               error:
 *                 type: string
 *                 description: Mensagem de erro
 *               level:
 *                 type: string
 *                 enum: [error, warn, info, debug]
 *                 description: Nível do log
 *               metadata:
 *                 type: object
 *                 description: Dados adicionais
 *     responses:
 *       200:
 *         description: Log registrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
logRoutes.post('/', zValidator('json', createLogSchema), LogController.createLog)

/**
 * @swagger
 * /api/logs/cleanup:
 *   post:
 *     summary: Limpa logs antigos
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - daysToKeep
 *             properties:
 *               daysToKeep:
 *                 type: integer
 *                 minimum: 1
 *                 description: Número de dias para manter os logs
 *     responses:
 *       200:
 *         description: Logs limpos com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedCount:
 *                       type: integer
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
logRoutes.post('/cleanup', zValidator('json', cleanupLogsSchema), LogController.cleanupLogs)

export { logRoutes }