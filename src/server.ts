import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { prettyJSON } from 'hono/pretty-json'
import { serveStatic } from '@hono/node-server/serve-static'
import { serve } from '@hono/node-server'
import { swaggerUI } from '@hono/swagger-ui'
import 'dotenv/config'
import { openApiConfig } from '@/swagger/openapi'

// Importar middlewares
import { rateLimitPublic, clearRateLimitRecords, clearRateLimitForIP, clearRateLimitByPattern } from '@/middlewares/rateLimiter'
import { errorHandler } from '@/middlewares/errorHandler'

// Importar rotas
import { authRoutes } from '@/routes/authRoutes'
import { userRoutes } from '@/routes/userRoutes'
import { logRoutes } from '@/routes/logRoutes'
import { profileRoutes } from '@/routes/profileRoutes'
import { notificationRoutes } from '@/routes/notificationRoutes'
import { roleRoutes } from '@/routes/roleRoutes'
import { env, config } from '@/config/env'
import { connectDatabase } from '@/config/database'

const app = new Hono()

// Middlewares globais
app.use('*', logger())
app.use('*', cors({
  origin: config.cors.origin === '*' ? '*' : config.cors.origin.split(','),
  credentials: config.cors.credentials
}))
if (config.security.secureHeaders) {
  app.use('*', secureHeaders())
}
app.use('*', prettyJSON())
app.use('*', rateLimitPublic)

// Rota de health check
app.get('/', (c) => {
  return c.json({
    message: 'Hono Auth Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  })
})

// Servir arquivos estáticos (uploads)
app.use('/uploads/*', serveStatic({ root: './' }))

// Rota para limpar rate limiting (apenas em desenvolvimento)
if (env.NODE_ENV === 'development') {
  app.post('/api/dev/clear-rate-limit', (c) => {
    clearRateLimitRecords()
    return c.json({
      success: true,
      message: 'Rate limit records cleared',
      timestamp: new Date().toISOString()
    })
  })

  app.post('/api/dev/clear-rate-limit/:ip', (c) => {
    const ip = c.req.param('ip')
    clearRateLimitForIP(ip)
    return c.json({
      success: true,
      message: `Rate limit records cleared for IP: ${ip}`,
      timestamp: new Date().toISOString()
    })
  })

  app.post('/api/dev/clear-rate-limit-pattern/:pattern', (c) => {
    const pattern = c.req.param('pattern')
    clearRateLimitByPattern(pattern)
    return c.json({
      success: true,
      message: `Rate limit records cleared for pattern: ${pattern}`,
      timestamp: new Date().toISOString()
    })
  })
}

// Rotas da aplicação
app.route('/api/auth', authRoutes)
app.route('/api/users', userRoutes)
app.route('/api/logs', logRoutes)
app.route('/api/profiles', profileRoutes)
app.route('/api/notifications', notificationRoutes)
app.route('/api/roles', roleRoutes)

// Documentação Swagger
if (config.features.swagger) {
  app.get(config.features.swaggerPath, swaggerUI({ url: '/api/openapi.json' }))
  app.get('/api/openapi.json', (c) => {
    return c.json(openApiConfig)
  })
}

// Middleware de tratamento de erros (deve ser o último)
app.onError(errorHandler)

// Rota 404
app.notFound((c) => {
  return c.json({ error: 'Rota não encontrada' }, 404)
})

const port = config.server.port

// Inicializar conexão com banco de dados
await connectDatabase()

// Limpar registros de rate limiting em desenvolvimento
if (env.NODE_ENV === 'development') {
  clearRateLimitRecords()
}

console.log(`🚀 Servidor rodando em ${config.server.url}`)
console.log(`📝 Ambiente: ${env.NODE_ENV}`)
if (config.features.swagger) {
  console.log(`📚 Documentação: ${config.server.url}${config.features.swaggerPath}`)
}

serve({
  fetch: app.fetch,
  port,
})

console.log(`✅ Servidor iniciado com sucesso na porta ${port}`)

// export default app