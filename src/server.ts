import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { prettyJSON } from 'hono/pretty-json'
import { serve } from '@hono/node-server'
import { swaggerUI } from '@hono/swagger-ui'
import 'dotenv/config'

// Importar middlewares
import { rateLimitPublic, clearRateLimitRecords, clearRateLimitForIP, clearRateLimitByPattern } from '@/middlewares/rateLimiter'
import { errorHandler } from '@/middlewares/errorHandler'

// Importar rotas
import { authRoutes } from '@/routes/authRoutes'
import { userRoutes } from '@/routes/userRoutes'
import { logRoutes } from '@/routes/logRoutes'
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
        '/api/auth/verify-email': {
          post: {
            summary: 'Verificar email com token',
            tags: ['Autenticação'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string', description: 'Token de verificação de email' }
                    },
                    required: ['token']
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Email verificado com sucesso',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              },
              '400': {
                description: 'Token inválido ou expirado'
              },
              '404': {
                description: 'Token não encontrado'
              }
            }
          }
        },
        '/api/auth/resend-verification': {
          post: {
            summary: 'Reenviar email de verificação',
            tags: ['Autenticação'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      email: { type: 'string', format: 'email', description: 'Email para reenvio da verificação' }
                    },
                    required: ['email']
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Email de verificação reenviado com sucesso',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              },
              '400': {
                description: 'Email inválido'
              },
              '404': {
                description: 'Usuário não encontrado'
              },
              '429': {
                description: 'Muitas tentativas. Tente novamente mais tarde.'
              }
            }
          }
        },
        '/api/auth/forgot-password': {
          post: {
            summary: 'Solicitar reset de senha',
            tags: ['Autenticação'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      email: { type: 'string', format: 'email', description: 'Email do usuário para reset de senha' }
                    },
                    required: ['email']
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Email de reset de senha enviado (se o email existir)',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              },
              '400': {
                description: 'Email inválido'
              },
              '429': {
                description: 'Muitas tentativas de reset. Tente novamente em 1 hora.'
              }
            }
          }
        },
        '/api/auth/reset-password': {
          post: {
            summary: 'Confirmar reset de senha com token',
            tags: ['Autenticação'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string', description: 'Token de reset de senha' },
                      password: { 
                        type: 'string', 
                        minLength: 8,
                        maxLength: 128,
                        description: 'Nova senha (8-128 caracteres, deve conter ao menos: 1 maiúscula, 1 minúscula, 1 número, 1 caractere especial)'
                      },
                      confirmPassword: { type: 'string', description: 'Confirmação da nova senha' }
                    },
                    required: ['token', 'password', 'confirmPassword']
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Senha alterada com sucesso',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              },
              '400': {
                description: 'Token inválido, expirado ou dados inválidos'
              },
              '404': {
                description: 'Token não encontrado'
              },
              '429': {
                description: 'Muitas tentativas de reset. Tente novamente em 1 hora.'
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
        },
        '/api/logs': {
          get: {
            summary: 'Lista logs com filtros',
            tags: ['Logs'],
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                in: 'query',
                name: 'userId',
                schema: { type: 'string' },
                description: 'ID do usuário'
              },
              {
                in: 'query',
                name: 'action',
                schema: { type: 'string' },
                description: 'Ação realizada'
              },
              {
                in: 'query',
                name: 'resource',
                schema: { type: 'string' },
                description: 'Recurso acessado'
              },
              {
                in: 'query',
                name: 'level',
                schema: {
                  type: 'string',
                  enum: ['error', 'warn', 'info', 'debug']
                },
                description: 'Nível do log'
              },
              {
                in: 'query',
                name: 'startDate',
                schema: {
                  type: 'string',
                  format: 'date-time'
                },
                description: 'Data inicial'
              },
              {
                in: 'query',
                name: 'endDate',
                schema: {
                  type: 'string',
                  format: 'date-time'
                },
                description: 'Data final'
              },
              {
                in: 'query',
                name: 'limit',
                schema: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 100,
                  default: 50
                },
                description: 'Limite de resultados'
              },
              {
                in: 'query',
                name: 'offset',
                schema: {
                  type: 'integer',
                  minimum: 0,
                  default: 0
                },
                description: 'Offset para paginação'
              }
            ],
            responses: {
              '200': {
                description: 'Lista de logs',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/LogListResponse'
                    }
                  }
                }
              },
              '401': {
                $ref: '#/components/responses/Unauthorized'
              },
              '403': {
                $ref: '#/components/responses/Forbidden'
              }
            }
          },
          post: {
            summary: 'Registra log manual',
            tags: ['Logs'],
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/CreateLogRequest'
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Log registrado com sucesso',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/SuccessResponse'
                    }
                  }
                }
              },
              '400': {
                $ref: '#/components/responses/BadRequest'
              },
              '401': {
                $ref: '#/components/responses/Unauthorized'
              },
              '403': {
                $ref: '#/components/responses/Forbidden'
              }
            }
          }
        },
        '/api/logs/stats': {
          get: {
            summary: 'Obtém estatísticas de logs',
            tags: ['Logs'],
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                in: 'query',
                name: 'startDate',
                schema: {
                  type: 'string',
                  format: 'date-time'
                },
                description: 'Data inicial'
              },
              {
                in: 'query',
                name: 'endDate',
                schema: {
                  type: 'string',
                  format: 'date-time'
                },
                description: 'Data final'
              }
            ],
            responses: {
              '200': {
                description: 'Estatísticas de logs',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        data: {
                          $ref: '#/components/schemas/LogStats'
                        }
                      }
                    }
                  }
                }
              },
              '401': {
                $ref: '#/components/responses/Unauthorized'
              },
              '403': {
                $ref: '#/components/responses/Forbidden'
              }
            }
          }
        },
        '/api/logs/errors': {
          get: {
            summary: 'Obtém logs de erro',
            tags: ['Logs'],
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                in: 'query',
                name: 'startDate',
                schema: {
                  type: 'string',
                  format: 'date-time'
                },
                description: 'Data inicial'
              },
              {
                in: 'query',
                name: 'endDate',
                schema: {
                  type: 'string',
                  format: 'date-time'
                },
                description: 'Data final'
              },
              {
                in: 'query',
                name: 'limit',
                schema: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 100,
                  default: 100
                },
                description: 'Limite de resultados'
              },
              {
                in: 'query',
                name: 'offset',
                schema: {
                  type: 'integer',
                  minimum: 0,
                  default: 0
                },
                description: 'Offset para paginação'
              }
            ],
            responses: {
              '200': {
                description: 'Lista de logs de erro',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/LogListResponse'
                    }
                  }
                }
              },
              '401': {
                $ref: '#/components/responses/Unauthorized'
              },
              '403': {
                $ref: '#/components/responses/Forbidden'
              }
            }
          }
        },
        '/api/logs/recent': {
          get: {
            summary: 'Obtém atividades recentes',
            tags: ['Logs'],
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                in: 'query',
                name: 'hours',
                schema: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 168,
                  default: 24
                },
                description: 'Número de horas para buscar atividades'
              }
            ],
            responses: {
              '200': {
                description: 'Atividades recentes',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/LogListResponse'
                    }
                  }
                }
              },
              '401': {
                $ref: '#/components/responses/Unauthorized'
              },
              '403': {
                $ref: '#/components/responses/Forbidden'
              }
            }
          }
        },
        '/api/logs/user/{userId}': {
          get: {
            summary: 'Obtém logs de um usuário específico',
            tags: ['Logs'],
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                in: 'path',
                name: 'userId',
                required: true,
                schema: { type: 'string' },
                description: 'ID do usuário'
              },
              {
                in: 'query',
                name: 'action',
                schema: { type: 'string' },
                description: 'Ação realizada'
              },
              {
                in: 'query',
                name: 'resource',
                schema: { type: 'string' },
                description: 'Recurso acessado'
              },
              {
                in: 'query',
                name: 'level',
                schema: {
                  type: 'string',
                  enum: ['error', 'warn', 'info', 'debug']
                },
                description: 'Nível do log'
              },
              {
                in: 'query',
                name: 'startDate',
                schema: {
                  type: 'string',
                  format: 'date-time'
                },
                description: 'Data inicial'
              },
              {
                in: 'query',
                name: 'endDate',
                schema: {
                  type: 'string',
                  format: 'date-time'
                },
                description: 'Data final'
              },
              {
                in: 'query',
                name: 'limit',
                schema: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 100,
                  default: 50
                },
                description: 'Limite de resultados'
              },
              {
                in: 'query',
                name: 'offset',
                schema: {
                  type: 'integer',
                  minimum: 0,
                  default: 0
                },
                description: 'Offset para paginação'
              }
            ],
            responses: {
              '200': {
                description: 'Logs do usuário',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/LogListResponse'
                    }
                  }
                }
              },
              '401': {
                $ref: '#/components/responses/Unauthorized'
              },
              '403': {
                $ref: '#/components/responses/Forbidden'
              }
            }
          }
        },
        '/api/logs/cleanup': {
          post: {
            summary: 'Limpa logs antigos',
            tags: ['Logs'],
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['daysToKeep'],
                    properties: {
                      daysToKeep: {
                        type: 'integer',
                        minimum: 1,
                        description: 'Número de dias para manter os logs'
                      }
                    }
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Logs limpos com sucesso',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        data: {
                          type: 'object',
                          properties: {
                            deletedCount: { type: 'integer' }
                          }
                        },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              },
              '400': {
                $ref: '#/components/responses/BadRequest'
              },
              '401': {
                $ref: '#/components/responses/Unauthorized'
              },
              '403': {
                $ref: '#/components/responses/Forbidden'
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
        },
        schemas: {
          LogEntry: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID único do log'
              },
              userId: {
                type: 'string',
                nullable: true,
                description: 'ID do usuário que executou a ação'
              },
              action: {
                type: 'string',
                description: 'Ação realizada'
              },
              resource: {
                type: 'string',
                description: 'Recurso acessado'
              },
              method: {
                type: 'string',
                description: 'Método HTTP'
              },
              path: {
                type: 'string',
                description: 'Caminho da requisição'
              },
              statusCode: {
                type: 'integer',
                description: 'Código de status HTTP'
              },
              userAgent: {
                type: 'string',
                nullable: true,
                description: 'User agent do cliente'
              },
              ip: {
                type: 'string',
                description: 'Endereço IP do cliente'
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Data e hora do log'
              },
              duration: {
                type: 'integer',
                nullable: true,
                description: 'Duração da requisição em milissegundos'
              },
              error: {
                type: 'string',
                nullable: true,
                description: 'Mensagem de erro, se houver'
              },
              level: {
                type: 'string',
                enum: ['error', 'warn', 'info', 'debug'],
                description: 'Nível do log'
              },
              metadata: {
                type: 'object',
                nullable: true,
                description: 'Dados adicionais em formato JSON'
              },
              user: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' }
                },
                description: 'Informações do usuário'
              }
            }
          },
          LogStats: {
            type: 'object',
            properties: {
              total: {
                type: 'integer',
                description: 'Total de logs'
              },
              byLevel: {
                type: 'object',
                additionalProperties: {
                  type: 'integer'
                },
                description: 'Contagem por nível de log'
              },
              byAction: {
                type: 'object',
                additionalProperties: {
                  type: 'integer'
                },
                description: 'Contagem por ação'
              },
              byResource: {
                type: 'object',
                additionalProperties: {
                  type: 'integer'
                },
                description: 'Contagem por recurso'
              },
              errorRate: {
                type: 'number',
                format: 'float',
                description: 'Taxa de erro (0-1)'
              }
            }
          },
          LogListResponse: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                description: 'Indica se a operação foi bem-sucedida'
              },
              data: {
                type: 'object',
                properties: {
                  logs: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/LogEntry'
                    },
                    description: 'Lista de logs'
                  },
                  total: {
                    type: 'integer',
                    description: 'Total de logs encontrados'
                  },
                  page: {
                    type: 'integer',
                    description: 'Página atual'
                  },
                  totalPages: {
                    type: 'integer',
                    description: 'Total de páginas'
                  }
                }
              },
              message: {
                type: 'string',
                description: 'Mensagem de sucesso'
              }
            }
          },
          CreateLogRequest: {
            type: 'object',
            required: ['action', 'resource'],
            properties: {
              userId: {
                type: 'string',
                description: 'ID do usuário'
              },
              action: {
                type: 'string',
                description: 'Ação realizada'
              },
              resource: {
                type: 'string',
                description: 'Recurso acessado'
              },
              method: {
                type: 'string',
                description: 'Método HTTP'
              },
              path: {
                type: 'string',
                description: 'Caminho da requisição'
              },
              statusCode: {
                type: 'integer',
                description: 'Código de status'
              },
              duration: {
                type: 'integer',
                description: 'Duração em ms'
              },
              error: {
                type: 'string',
                description: 'Mensagem de erro'
              },
              level: {
                type: 'string',
                enum: ['error', 'warn', 'info', 'debug'],
                description: 'Nível do log'
              },
              metadata: {
                type: 'object',
                description: 'Dados adicionais'
              }
            }
          },
          SuccessResponse: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                description: 'Indica se a operação foi bem-sucedida'
              },
              message: {
                type: 'string',
                description: 'Mensagem de sucesso'
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Data e hora da resposta'
              }
            }
          }
        },
        responses: {
          BadRequest: {
            description: 'Requisição inválida',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: false
                    },
                    message: {
                      type: 'string',
                      example: 'Dados inválidos'
                    },
                    errors: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          field: { type: 'string' },
                          message: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          Unauthorized: {
            description: 'Token de acesso inválido ou ausente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: false
                    },
                    message: {
                      type: 'string',
                      example: 'Token de acesso inválido'
                    }
                  }
                }
              }
            }
          },
          Forbidden: {
            description: 'Acesso negado - privilégios insuficientes',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: false
                    },
                    message: {
                      type: 'string',
                      example: 'Acesso negado - apenas administradores'
                    }
                  }
                }
              }
            }
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