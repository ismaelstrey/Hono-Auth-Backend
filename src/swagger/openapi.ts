import { config } from '@/config/env'
import { authPaths } from './authPaths'
import { userPaths } from './userPaths'
import { profilePaths } from './profilePaths'
import { notificationPaths } from './notificationPaths'
import { logPaths } from './logPaths'
import { rolePaths } from './rolePaths'
import { roleSchemas } from './roleSchemas'

/**
 * Configuração completa da documentação OpenAPI/Swagger
 */
export const createOpenAPISpec = () => {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Hono Auth Backend API',
      version: '2.0.0',
      description: `
        API completa de autenticação e gerenciamento de usuários com recursos avançados.
        
        ## Funcionalidades
        - 🔐 Autenticação JWT com refresh tokens
        - 👥 Sistema de roles e permissões (Admin, Moderator, User)
        - 📧 Verificação de email e reset de senha
        - 👤 Perfis de usuário expandidos com avatars
        - 🔔 Sistema de notificações avançado
        - 📊 Logs e auditoria completa
        - 🔍 Busca e filtros avançados
        - 📄 Paginação em todas as listagens
        
        ## Autenticação
        A API utiliza JWT Bearer tokens. Inclua o token no header:
        \`Authorization: Bearer <seu-token>\`
        
        ## Roles e Permissões
        - **Admin**: Acesso total ao sistema
        - **Moderator**: Gerenciamento de usuários e conteúdo
        - **User**: Acesso básico às próprias informações
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: config.server.url,
        description: 'Servidor de desenvolvimento'
      },
      {
        url: 'https://api.production.com',
        description: 'Servidor de produção'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido através do login'
        }
      },
      schemas: {
        // Schemas básicos
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único do usuário'
            },
            name: {
              type: 'string',
              description: 'Nome completo do usuário',
              example: 'João Silva'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do usuário',
              example: 'joao@example.com'
            },
            role: {
              type: 'string',
              enum: ['admin', 'moderator', 'user'],
              description: 'Role do usuário no sistema'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'locked'],
              description: 'Status atual do usuário'
            },
            emailVerified: {
              type: 'boolean',
              description: 'Se o email foi verificado'
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: 'Data do último login',
              nullable: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data da última atualização'
            }
          },
          required: ['id', 'name', 'email', 'role', 'status', 'emailVerified', 'createdAt', 'updatedAt']
        },
        
        Profile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único do perfil'
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'ID do usuário proprietário'
            },
            firstName: {
              type: 'string',
              description: 'Primeiro nome',
              nullable: true
            },
            lastName: {
              type: 'string',
              description: 'Sobrenome',
              nullable: true
            },
            fullName: {
              type: 'string',
              description: 'Nome completo',
              nullable: true
            },
            bio: {
              type: 'string',
              description: 'Biografia do usuário',
              maxLength: 500,
              nullable: true
            },
            avatar: {
              type: 'string',
              description: 'URL do avatar',
              nullable: true
            },
            phone: {
              type: 'string',
              description: 'Telefone do usuário',
              nullable: true
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              description: 'Data de nascimento',
              nullable: true
            },
            
            // Informações profissionais
            company: {
              type: 'string',
              description: 'Empresa atual',
              nullable: true
            },
            jobTitle: {
              type: 'string',
              description: 'Cargo/posição atual',
              nullable: true
            },
            website: {
              type: 'string',
              format: 'uri',
              description: 'Website pessoal',
              nullable: true
            },
            location: {
              type: 'string',
              description: 'Localização atual',
              nullable: true
            },
            
            // Informações adicionais
            languages: {
              type: 'array',
              items: { type: 'string' },
              description: 'Idiomas falados',
              nullable: true
            },
            skills: {
              type: 'array',
              items: { type: 'string' },
              description: 'Habilidades técnicas',
              nullable: true
            },
            interests: {
              type: 'array',
              items: { type: 'string' },
              description: 'Interesses pessoais',
              nullable: true
            },
            education: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  degree: { type: 'string', nullable: true },
                  institution: { type: 'string', nullable: true },
                  year: { type: 'integer', nullable: true },
                  description: { type: 'string', nullable: true }
                }
              },
              description: 'Formação acadêmica',
              nullable: true
            },
            experience: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  company: { type: 'string', nullable: true },
                  position: { type: 'string', nullable: true },
                  startDate: { type: 'string', format: 'date', nullable: true },
                  endDate: { type: 'string', format: 'date', nullable: true },
                  description: { type: 'string', nullable: true },
                  current: { type: 'boolean', default: false }
                }
              },
              description: 'Experiência profissional',
              nullable: true
            },
            
            // Configurações e preferências
            address: {
              type: 'object',
              description: 'Endereço completo',
              properties: {
                street: { type: 'string', nullable: true },
                city: { type: 'string', nullable: true },
                state: { type: 'string', nullable: true },
                zipCode: { type: 'string', nullable: true },
                country: { type: 'string', nullable: true }
              },
              nullable: true
            },
            socialLinks: {
              type: 'object',
              description: 'Links para redes sociais',
              properties: {
                website: { type: 'string', nullable: true },
                linkedin: { type: 'string', nullable: true },
                twitter: { type: 'string', nullable: true },
                github: { type: 'string', nullable: true },
                instagram: { type: 'string', nullable: true },
                facebook: { type: 'string', nullable: true },
                youtube: { type: 'string', nullable: true }
              },
              nullable: true
            },
            preferences: {
              type: 'object',
              description: 'Preferências do usuário',
              properties: {
                language: { type: 'string', default: 'pt-BR' },
                timezone: { type: 'string', default: 'America/Sao_Paulo' },
                notifications: {
                  type: 'object',
                  properties: {
                    email: { type: 'boolean', default: true },
                    push: { type: 'boolean', default: true },
                    sms: { type: 'boolean', default: false }
                  }
                },
                privacy: {
                  type: 'object',
                  properties: {
                    profileVisibility: {
                      type: 'string',
                      enum: ['public', 'private', 'friends'],
                      default: 'public'
                    },
                    showEmail: { type: 'boolean', default: false },
                    showPhone: { type: 'boolean', default: false }
                  }
                }
              },
              nullable: true
            },
            
            // Configurações de privacidade
            isPublic: {
              type: 'boolean',
              description: 'Se o perfil é público',
              default: true
            },
            showEmail: {
              type: 'boolean',
              description: 'Se mostra email no perfil público',
              default: false
            },
            showPhone: {
              type: 'boolean',
              description: 'Se mostra telefone no perfil público',
              default: false
            },
            
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['id', 'userId', 'isPublic', 'showEmail', 'showPhone', 'createdAt', 'updatedAt']
        },
        
        Notification: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'ID do usuário destinatário'
            },
            typeId: {
              type: 'string',
              format: 'uuid',
              description: 'ID do tipo de notificação'
            },
            title: {
              type: 'string',
              description: 'Título da notificação'
            },
            message: {
              type: 'string',
              description: 'Conteúdo da notificação'
            },
            status: {
              type: 'string',
              enum: ['pending', 'sent', 'failed', 'read'],
              description: 'Status da notificação'
            },
            priority: {
              type: 'string',
              enum: ['normal', 'high', 'urgent'],
              description: 'Prioridade da notificação'
            },
            channel: {
              type: 'string',
              enum: ['email', 'push', 'sms', 'in_app'],
              description: 'Canal de envio'
            },
            data: {
              type: 'object',
              description: 'Dados adicionais da notificação',
              nullable: true
            },
            readAt: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            sentAt: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['id', 'userId', 'typeId', 'title', 'message', 'status', 'priority', 'channel', 'createdAt']
        },
        
        LogEntry: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            userId: {
              type: 'string',
              format: 'uuid',
              nullable: true
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
              enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
              description: 'Método HTTP'
            },
            endpoint: {
              type: 'string',
              description: 'Endpoint acessado'
            },
            statusCode: {
              type: 'integer',
              description: 'Código de status HTTP'
            },
            level: {
              type: 'string',
              enum: ['info', 'warn', 'error'],
              description: 'Nível do log'
            },
            message: {
              type: 'string',
              description: 'Mensagem do log'
            },
            metadata: {
              type: 'object',
              description: 'Metadados adicionais',
              nullable: true
            },
            ipAddress: {
              type: 'string',
              description: 'Endereço IP do cliente'
            },
            userAgent: {
              type: 'string',
              description: 'User agent do cliente'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['id', 'action', 'resource', 'method', 'endpoint', 'statusCode', 'level', 'message', 'ipAddress', 'userAgent', 'createdAt']
        },
        
        // Schemas de resposta
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'array',
              items: {}
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  description: 'Página atual'
                },
                limit: {
                  type: 'integer',
                  description: 'Itens por página'
                },
                total: {
                  type: 'integer',
                  description: 'Total de itens'
                },
                totalPages: {
                  type: 'integer',
                  description: 'Total de páginas'
                }
              },
              required: ['page', 'limit', 'total', 'totalPages']
            }
          },
          required: ['success', 'data', 'pagination']
        },
        
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Mensagem de sucesso'
            },
            data: {
              description: 'Dados da resposta',
              nullable: true
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['success', 'message', 'timestamp']
        },
        
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Mensagem de erro'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Campo com erro'
                  },
                  message: {
                    type: 'string',
                    description: 'Mensagem do erro'
                  }
                }
              },
              description: 'Lista de erros de validação'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['success', 'message', 'timestamp']
        },
        
        // Schemas de Roles e Permissões
        ...roleSchemas
      },
      
      responses: {
        BadRequest: {
          description: 'Requisição inválida',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        Unauthorized: {
          description: 'Token de acesso inválido ou ausente',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        Forbidden: {
          description: 'Acesso negado - privilégios insuficientes',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        NotFound: {
          description: 'Recurso não encontrado',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        TooManyRequests: {
          description: 'Muitas requisições - rate limit excedido',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      },
      
      parameters: {
        PageParam: {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          },
          description: 'Número da página'
        },
        LimitParam: {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10
          },
          description: 'Número de itens por página'
        },
        SearchParam: {
          in: 'query',
          name: 'search',
          schema: {
            type: 'string'
          },
          description: 'Termo de busca'
        },
        StartDateParam: {
          in: 'query',
          name: 'startDate',
          schema: {
            type: 'string',
            format: 'date-time'
          },
          description: 'Data inicial para filtro'
        },
        EndDateParam: {
          in: 'query',
          name: 'endDate',
          schema: {
            type: 'string',
            format: 'date-time'
          },
          description: 'Data final para filtro'
        }
      }
    },
    
    tags: [
      {
        name: 'Autenticação',
        description: 'Endpoints para autenticação e gerenciamento de sessão'
      },
      {
        name: 'Usuários',
        description: 'Gerenciamento de usuários e roles'
      },
      {
        name: 'Perfis',
        description: 'Perfis de usuário e informações pessoais'
      },
      {
        name: 'Notificações',
        description: 'Sistema de notificações e preferências'
      },
      {
        name: 'Logs',
        description: 'Logs de auditoria e monitoramento'
      },
      {
        name: 'Roles & Permissões',
        description: 'Gerenciamento de roles e permissões do sistema'
      },
      {
        name: 'Sistema',
        description: 'Endpoints de sistema e health checks'
      }
    ],
    
    paths: {
      ...authPaths,
      ...userPaths,
      ...profilePaths,
      ...notificationPaths,
      ...logPaths,
      ...rolePaths
    }
  }
}

/**
 * Configuração OpenAPI exportada para uso no servidor
 */
export const openApiConfig = createOpenAPISpec()