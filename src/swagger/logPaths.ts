/**
 * Documentação das rotas de logs
 */
export const logPaths = {
  '/api/logs': {
    get: {
      tags: ['Logs'],
      summary: 'Listar logs',
      description: 'Lista logs do sistema com filtros avançados (Admin apenas)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        {
          in: 'query',
          name: 'userId',
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'Filtrar por ID do usuário'
        },
        {
          in: 'query',
          name: 'action',
          schema: {
            type: 'string'
          },
          description: 'Filtrar por ação realizada',
          example: 'login'
        },
        {
          in: 'query',
          name: 'resource',
          schema: {
            type: 'string'
          },
          description: 'Filtrar por recurso afetado',
          example: 'user'
        },
        {
          in: 'query',
          name: 'level',
          schema: {
            type: 'string',
            enum: ['info', 'warn', 'error', 'debug']
          },
          description: 'Filtrar por nível do log'
        },
        {
          in: 'query',
          name: 'ip',
          schema: {
            type: 'string'
          },
          description: 'Filtrar por endereço IP',
          example: '192.168.1.1'
        },
        {
          in: 'query',
          name: 'userAgent',
          schema: {
            type: 'string'
          },
          description: 'Filtrar por User Agent'
        },
        { $ref: '#/components/parameters/StartDateParam' },
        { $ref: '#/components/parameters/EndDateParam' },
        {
          in: 'query',
          name: 'sortBy',
          schema: {
            type: 'string',
            enum: ['createdAt', 'level', 'action', 'userId'],
            default: 'createdAt'
          },
          description: 'Campo para ordenação'
        },
        {
          in: 'query',
          name: 'sortOrder',
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc'
          },
          description: 'Ordem da classificação'
        }
      ],
      responses: {
        '200': {
          description: 'Lista de logs',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/PaginatedResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/LogEntry' }
                      },
                      filters: {
                        type: 'object',
                        description: 'Filtros aplicados na consulta',
                        properties: {
                          userId: { type: 'string' },
                          action: { type: 'string' },
                          resource: { type: 'string' },
                          level: { type: 'string' },
                          dateRange: {
                            type: 'object',
                            properties: {
                              start: { type: 'string', format: 'date-time' },
                              end: { type: 'string', format: 'date-time' }
                            }
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' }
      }
    },
    post: {
      tags: ['Logs'],
      summary: 'Registrar log manualmente',
      description: 'Registra um log manualmente no sistema (Admin apenas)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  format: 'uuid',
                  description: 'ID do usuário relacionado ao log',
                  nullable: true
                },
                action: {
                  type: 'string',
                  description: 'Ação realizada',
                  example: 'manual_entry'
                },
                resource: {
                  type: 'string',
                  description: 'Recurso afetado',
                  example: 'system'
                },
                level: {
                  type: 'string',
                  enum: ['info', 'warn', 'error', 'debug'],
                  description: 'Nível do log',
                  default: 'info'
                },
                message: {
                  type: 'string',
                  description: 'Mensagem do log',
                  example: 'Log registrado manualmente pelo administrador'
                },
                metadata: {
                  type: 'object',
                  description: 'Metadados adicionais do log',
                  nullable: true
                },
                ip: {
                  type: 'string',
                  description: 'Endereço IP',
                  nullable: true
                },
                userAgent: {
                  type: 'string',
                  description: 'User Agent',
                  nullable: true
                }
              },
              required: ['action', 'resource', 'message']
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Log registrado com sucesso',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          log: { $ref: '#/components/schemas/LogEntry' }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' }
      }
    }
  },

  '/api/logs/stats': {
    get: {
      tags: ['Logs'],
      summary: 'Estatísticas de logs',
      description: 'Retorna estatísticas dos logs do sistema (Admin apenas)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/StartDateParam' },
        { $ref: '#/components/parameters/EndDateParam' },
        {
          in: 'query',
          name: 'groupBy',
          schema: {
            type: 'string',
            enum: ['level', 'action', 'resource', 'hour', 'day', 'week', 'month'],
            default: 'level'
          },
          description: 'Agrupar estatísticas por'
        }
      ],
      responses: {
        '200': {
          description: 'Estatísticas dos logs',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          total: {
                            type: 'integer',
                            description: 'Total de logs no período'
                          },
                          byLevel: {
                            type: 'object',
                            properties: {
                              info: { type: 'integer' },
                              warn: { type: 'integer' },
                              error: { type: 'integer' },
                              debug: { type: 'integer' }
                            }
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
                          timeline: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                period: {
                                  type: 'string',
                                  description: 'Período (formato depende do groupBy)'
                                },
                                count: {
                                  type: 'integer',
                                  description: 'Número de logs no período'
                                },
                                breakdown: {
                                  type: 'object',
                                  additionalProperties: {
                                    type: 'integer'
                                  },
                                  description: 'Detalhamento por categoria'
                                }
                              }
                            }
                          },
                          topUsers: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                userId: { type: 'string' },
                                username: { type: 'string' },
                                count: { type: 'integer' }
                              }
                            },
                            description: 'Usuários com mais atividade'
                          },
                          errorRate: {
                            type: 'number',
                            format: 'float',
                            description: 'Taxa de erro (0-1)'
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' }
      }
    }
  },

  '/api/logs/errors': {
    get: {
      tags: ['Logs'],
      summary: 'Logs de erro',
      description: 'Lista apenas logs de erro com detalhes adicionais (Admin apenas)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        {
          in: 'query',
          name: 'userId',
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'Filtrar por ID do usuário'
        },
        {
          in: 'query',
          name: 'action',
          schema: {
            type: 'string'
          },
          description: 'Filtrar por ação'
        },
        {
          in: 'query',
          name: 'resource',
          schema: {
            type: 'string'
          },
          description: 'Filtrar por recurso'
        },
        { $ref: '#/components/parameters/StartDateParam' },
        { $ref: '#/components/parameters/EndDateParam' },
        {
          in: 'query',
          name: 'resolved',
          schema: {
            type: 'boolean'
          },
          description: 'Filtrar por status de resolução'
        }
      ],
      responses: {
        '200': {
          description: 'Lista de logs de erro',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/PaginatedResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          allOf: [
                            { $ref: '#/components/schemas/LogEntry' },
                            {
                              type: 'object',
                              properties: {
                                errorDetails: {
                                  type: 'object',
                                  properties: {
                                    stack: {
                                      type: 'string',
                                      description: 'Stack trace do erro'
                                    },
                                    code: {
                                      type: 'string',
                                      description: 'Código do erro'
                                    },
                                    resolved: {
                                      type: 'boolean',
                                      description: 'Se o erro foi resolvido'
                                    },
                                    resolvedAt: {
                                      type: 'string',
                                      format: 'date-time',
                                      nullable: true
                                    },
                                    resolvedBy: {
                                      type: 'string',
                                      format: 'uuid',
                                      nullable: true
                                    },
                                    occurrences: {
                                      type: 'integer',
                                      description: 'Número de ocorrências similares'
                                    }
                                  }
                                }
                              }
                            }
                          ]
                        }
                      },
                      summary: {
                        type: 'object',
                        properties: {
                          total: { type: 'integer' },
                          resolved: { type: 'integer' },
                          unresolved: { type: 'integer' },
                          critical: { type: 'integer' }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' }
      }
    }
  },

  '/api/logs/recent': {
    get: {
      tags: ['Logs'],
      summary: 'Atividade recente',
      description: 'Retorna logs de atividade recente do sistema (Admin apenas)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
          },
          description: 'Número de logs recentes'
        },
        {
          in: 'query',
          name: 'level',
          schema: {
            type: 'string',
            enum: ['info', 'warn', 'error', 'debug']
          },
          description: 'Filtrar por nível'
        },
        {
          in: 'query',
          name: 'excludeDebug',
          schema: {
            type: 'boolean',
            default: true
          },
          description: 'Excluir logs de debug'
        }
      ],
      responses: {
        '200': {
          description: 'Atividade recente',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          logs: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/LogEntry' }
                          },
                          summary: {
                            type: 'object',
                            properties: {
                              totalToday: { type: 'integer' },
                              errorsToday: { type: 'integer' },
                              activeUsers: { type: 'integer' },
                              lastActivity: {
                                type: 'string',
                                format: 'date-time'
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' }
      }
    }
  },

  '/api/logs/user/{userId}': {
    get: {
      tags: ['Logs'],
      summary: 'Logs de usuário específico',
      description: 'Lista logs de um usuário específico (Admin apenas)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'userId',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'ID do usuário'
        },
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        {
          in: 'query',
          name: 'action',
          schema: {
            type: 'string'
          },
          description: 'Filtrar por ação'
        },
        {
          in: 'query',
          name: 'level',
          schema: {
            type: 'string',
            enum: ['info', 'warn', 'error', 'debug']
          },
          description: 'Filtrar por nível'
        },
        { $ref: '#/components/parameters/StartDateParam' },
        { $ref: '#/components/parameters/EndDateParam' }
      ],
      responses: {
        '200': {
          description: 'Logs do usuário',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/PaginatedResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/LogEntry' }
                      },
                      userInfo: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          username: { type: 'string' },
                          email: { type: 'string' },
                          lastActivity: {
                            type: 'string',
                            format: 'date-time'
                          }
                        }
                      },
                      summary: {
                        type: 'object',
                        properties: {
                          totalLogs: { type: 'integer' },
                          loginCount: { type: 'integer' },
                          errorCount: { type: 'integer' },
                          mostCommonActions: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                action: { type: 'string' },
                                count: { type: 'integer' }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  },

  '/api/logs/cleanup': {
    post: {
      tags: ['Logs'],
      summary: 'Limpeza de logs',
      description: 'Remove logs antigos do sistema baseado em critérios (Admin apenas)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                olderThan: {
                  type: 'integer',
                  description: 'Remover logs mais antigos que X dias',
                  minimum: 1,
                  example: 90
                },
                level: {
                  type: 'string',
                  enum: ['info', 'warn', 'error', 'debug'],
                  description: 'Remover apenas logs de nível específico'
                },
                keepErrors: {
                  type: 'boolean',
                  default: true,
                  description: 'Manter logs de erro mesmo se antigos'
                },
                dryRun: {
                  type: 'boolean',
                  default: false,
                  description: 'Simular limpeza sem remover logs'
                },
                batchSize: {
                  type: 'integer',
                  minimum: 100,
                  maximum: 10000,
                  default: 1000,
                  description: 'Tamanho do lote para processamento'
                }
              },
              required: ['olderThan']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Limpeza executada com sucesso',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          removed: {
                            type: 'integer',
                            description: 'Número de logs removidos'
                          },
                          remaining: {
                            type: 'integer',
                            description: 'Número de logs restantes'
                          },
                          dryRun: {
                            type: 'boolean',
                            description: 'Se foi uma simulação'
                          },
                          criteria: {
                            type: 'object',
                            description: 'Critérios utilizados na limpeza'
                          },
                          executionTime: {
                            type: 'number',
                            description: 'Tempo de execução em segundos'
                          },
                          spaceSaved: {
                            type: 'string',
                            description: 'Espaço liberado (estimativa)'
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' }
      }
    }
  },

  '/api/logs/health': {
    get: {
      tags: ['Logs'],
      summary: 'Health check do serviço de logs',
      description: 'Verifica a saúde do serviço de logs',
      responses: {
        '200': {
          description: 'Serviço de logs funcionando',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    example: 'healthy'
                  },
                  service: {
                    type: 'string',
                    example: 'logs'
                  },
                  timestamp: {
                    type: 'string',
                    format: 'date-time'
                  },
                  details: {
                    type: 'object',
                    properties: {
                      database: {
                        type: 'string',
                        example: 'connected'
                      },
                      totalLogs: {
                        type: 'integer'
                      },
                      oldestLog: {
                        type: 'string',
                        format: 'date-time'
                      },
                      newestLog: {
                        type: 'string',
                        format: 'date-time'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '503': {
          description: 'Serviço de logs indisponível',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    example: 'unhealthy'
                  },
                  service: {
                    type: 'string',
                    example: 'logs'
                  },
                  error: {
                    type: 'string'
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}