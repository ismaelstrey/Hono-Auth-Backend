import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { AuthController } from '@/controllers/authController'
import { authMiddleware, optionalAuth } from '@/middlewares/auth'
import { rateLimitAuth, rateLimitPasswordReset, rateLimitRegistration } from '@/middlewares/rateLimiter'
import { loggingMiddleware } from '@/middlewares/logging'
import {
  userCache,
  cacheInvalidation,
  cacheHeaders
} from '@/middlewares/cache'
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  changePasswordSchema
} from '@/validators/authValidators'

/**
 * Rotas de autenticação
 */
const authRoutes = new Hono()

// Aplicar middleware de logging em todas as rotas
authRoutes.use('*', loggingMiddleware)

// Rotas públicas (sem autenticação)
authRoutes.post(
  '/register',
  rateLimitRegistration,
  zValidator('json', registerSchema),
  AuthController.handleRegister
)

authRoutes.post(
  '/login',
  rateLimitAuth,
  zValidator('json', loginSchema),
  AuthController.handleLogin
)

authRoutes.post(
  '/refresh-token',
  rateLimitAuth,
  zValidator('json', refreshTokenSchema),
  AuthController.handleRefreshToken
)

authRoutes.post(
  '/forgot-password',
  rateLimitPasswordReset,
  zValidator('json', forgotPasswordSchema),
  AuthController.handleForgotPassword
)

authRoutes.post(
  '/reset-password',
  rateLimitPasswordReset,
  zValidator('json', resetPasswordSchema),
  AuthController.handleResetPassword
)

authRoutes.post(
  '/verify-email',
  rateLimitAuth,
  zValidator('json', verifyEmailSchema),
  AuthController.handleVerifyEmail
)

authRoutes.post(
  '/resend-verification',
  rateLimitAuth,
  zValidator('json', resendVerificationSchema),
  AuthController.handleResendVerification
)

// Rota para validar token (opcional - pode ser usado sem autenticação)
authRoutes.post(
  '/validate-token',
  optionalAuth,
  AuthController.validateToken
)

// Rotas protegidas (requerem autenticação)
authRoutes.use('/profile/*', authMiddleware)
authRoutes.use('/logout', authMiddleware)
authRoutes.use('/change-password', authMiddleware)
authRoutes.use('/token-info', authMiddleware)

// Logout
authRoutes.post('/logout', cacheInvalidation('users'), AuthController.logout)

// Perfil do usuário autenticado
authRoutes.get('/profile', userCache(), cacheHeaders(), AuthController.getProfile)

// Alterar senha
authRoutes.post(
  '/change-password',
  zValidator('json', changePasswordSchema),
  cacheInvalidation('users'),
  AuthController.handleChangePassword
)

// Informações do token
authRoutes.get('/token-info', userCache(300), cacheHeaders(300), AuthController.getTokenInfo)

// Rota de health check específica para auth
authRoutes.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'auth',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

export { authRoutes }