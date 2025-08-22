import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { prettyJSON } from 'hono/pretty-json'
import { serve } from '@hono/node-server'
import { swaggerUI } from '@hono/swagger-ui'
import 'dotenv/config'

// Importar middlewares
import { rateLimitPublic } from '@/middlewares/rateLimiter'
import { errorHandler } from '@/middlewares/errorHandler'

// Importar rotas
import { authRoutes } from '@/routes/authRoutes'
import { userRoutes } from '@/routes/userRoutes'
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

// Rotas da aplicação
app.route('/api/auth', authRoutes)
app.route('/api/users', userRoutes)

// Documentação Swagger
if (config.features.swagger) {
  app.get(config.features.swaggerPath, swaggerUI({ url: '/api/openapi.json' }))
  app.get('/api/openapi.json', (c) => {
    return c.json({
      openapi: '3.0.0',
      info: {
        title: 'Hono Auth Backend API',
        version: '1.0.0',
        description: 'API de autenticação e gerenciamento de usuários'
      },
      servers: [
        {
          url: config.server.url,
          description: 'Servidor de desenvolvimento'
        }
      ],
      paths: {
        '/api/auth/register': {
          post: {
            summary: 'Registrar novo usuário',
            tags: ['Autenticação'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      email: { type: 'string', format: 'email' },
                      password: { type: 'string', minLength: 6 }
                    },
                    required: ['name', 'email', 'password']
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Usuário criado com sucesso'
              },
              '400': {
                description: 'Dados inválidos'
              }
            }
          }
        },
        '/api/auth/login': {
          post: {
            summary: 'Fazer login',
            tags: ['Autenticação'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      email: { type: 'string', format: 'email' },
                      password: { type: 'string' }
                    },
                    required: ['email', 'password']
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Login realizado com sucesso'
              },
              '401': {
                description: 'Credenciais inválidas'
              }
            }
          }
        },
        '/api/users': {
          get: {
            summary: 'Listar usuários',
            tags: ['Usuários'],
            security: [{ bearerAuth: [] }],
            responses: {
              '200': {
                description: 'Lista de usuários'
              },
              '401': {
                description: 'Token inválido'
              }
            }
          }
        }
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    })
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