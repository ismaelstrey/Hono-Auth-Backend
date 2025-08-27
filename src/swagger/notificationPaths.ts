/**
 * Documentação das rotas de notificações
 */
export const notificationPaths = {
  '/api/notifications': {
    get: {
      tags: ['Notificações'],
      summary: 'Listar todas as notificações',
      description: 'Lista todas as notificações do sistema com filtros (Admin apenas)',
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
          name: 'status',
          schema: {
            type: 'string',
            enum: ['pending', 'sent', 'failed', 'read']
          },
          description: 'Filtrar por status da notificação'
        },
        {
          in: 'query',
          name: 'priority',
          schema: {
            type: 'string',
            enum: ['normal', 'high', 'urgent']
          },
          description: 'Filtrar por prioridade'
        },
        {
          in: 'query',
          name: 'channel',
          schema: {
            type: 'string',
            enum: ['email', 'push', 'sms', 'in_app']
          },
          description: 'Filtrar por canal de envio'
        },
        { $ref: '#/components/parameters/StartDateParam' },
        { $ref: '#/components/parameters/EndDateParam' }
      ],
      responses: {
        '200': {
          description: 'Lista de notificações',
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
                        items: { $ref: '#/components/schemas/Notification' }
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
    },
    post: {
      tags: ['Notificações'],
      summary: 'Criar notificação',
      description: 'Cria uma nova notificação',
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
                  description: 'ID do usuário destinatário'
                },
                typeId: {
                  type: 'string',
                  format: 'uuid',
                  description: 'ID do tipo de notificação'
                },
                title: {
                  type: 'string',
                  description: 'Título da notificação',
                  example: 'Nova mensagem'
                },
                message: {
                  type: 'string',
                  description: 'Conteúdo da notificação',
                  example: 'Você recebeu uma nova mensagem de João'
                },
                priority: {
                  type: 'string',
                  enum: ['normal', 'high', 'urgent'],
                  description: 'Prioridade da notificação',
                  default: 'normal'
                },
                channel: {
                  type: 'string',
                  enum: ['email', 'push', 'sms', 'in_app'],
                  description: 'Canal de envio',
                  default: 'in_app'
                },
                data: {
                  type: 'object',
                  description: 'Dados adicionais da notificação',
                  nullable: true
                },
                scheduledFor: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Data/hora para envio agendado',
                  nullable: true
                }
              },
              required: ['userId', 'typeId', 'title', 'message']
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Notificação criada com sucesso',
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
                          notification: { $ref: '#/components/schemas/Notification' }
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
        '404': {
          description: 'Usuário ou tipo de notificação não encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },

  '/api/notifications/me': {
    get: {
      tags: ['Notificações'],
      summary: 'Minhas notificações',
      description: 'Lista as notificações do usuário autenticado',
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        {
          in: 'query',
          name: 'status',
          schema: {
            type: 'string',
            enum: ['pending', 'sent', 'failed', 'read']
          },
          description: 'Filtrar por status'
        },
        {
          in: 'query',
          name: 'unreadOnly',
          schema: {
            type: 'boolean'
          },
          description: 'Mostrar apenas não lidas'
        },
        {
          in: 'query',
          name: 'priority',
          schema: {
            type: 'string',
            enum: ['normal', 'high', 'urgent']
          },
          description: 'Filtrar por prioridade'
        },
        { $ref: '#/components/parameters/StartDateParam' },
        { $ref: '#/components/parameters/EndDateParam' }
      ],
      responses: {
        '200': {
          description: 'Lista de notificações do usuário',
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
                        items: { $ref: '#/components/schemas/Notification' }
                      },
                      summary: {
                        type: 'object',
                        properties: {
                          total: {
                            type: 'integer',
                            description: 'Total de notificações'
                          },
                          unread: {
                            type: 'integer',
                            description: 'Notificações não lidas'
                          },
                          urgent: {
                            type: 'integer',
                            description: 'Notificações urgentes'
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
        '401': { $ref: '#/components/responses/Unauthorized' }
      }
    }
  },

  '/api/notifications/{id}/read': {
    patch: {
      tags: ['Notificações'],
      summary: 'Marcar como lida',
      description: 'Marca uma notificação como lida',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'ID da notificação'
        }
      ],
      responses: {
        '200': {
          description: 'Notificação marcada como lida',
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
                          notification: { $ref: '#/components/schemas/Notification' }
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
        '403': {
          description: 'Não é possível marcar notificação de outro usuário',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  },

  '/api/notifications/send': {
    post: {
      tags: ['Notificações'],
      summary: 'Enviar notificação',
      description: 'Envia uma notificação imediatamente (Admin apenas)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                userIds: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid'
                  },
                  description: 'IDs dos usuários destinatários'
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
                priority: {
                  type: 'string',
                  enum: ['normal', 'high', 'urgent'],
                  default: 'normal'
                },
                channels: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['email', 'push', 'sms', 'in_app']
                  },
                  description: 'Canais de envio'
                },
                data: {
                  type: 'object',
                  description: 'Dados adicionais',
                  nullable: true
                }
              },
              required: ['userIds', 'typeId', 'title', 'message']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Notificações enviadas com sucesso',
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
                          sent: {
                            type: 'integer',
                            description: 'Número de notificações enviadas'
                          },
                          failed: {
                            type: 'integer',
                            description: 'Número de falhas'
                          },
                          notifications: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Notification' }
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

  '/api/notifications/process-pending': {
    post: {
      tags: ['Notificações'],
      summary: 'Processar notificações pendentes',
      description: 'Processa e envia notificações pendentes (Admin apenas)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 1000,
            default: 100
          },
          description: 'Número máximo de notificações a processar'
        }
      ],
      responses: {
        '200': {
          description: 'Notificações processadas',
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
                          processed: {
                            type: 'integer',
                            description: 'Notificações processadas'
                          },
                          sent: {
                            type: 'integer',
                            description: 'Notificações enviadas com sucesso'
                          },
                          failed: {
                            type: 'integer',
                            description: 'Notificações que falharam'
                          },
                          errors: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                notificationId: { type: 'string' },
                                error: { type: 'string' }
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

  '/api/notifications/stats': {
    get: {
      tags: ['Notificações'],
      summary: 'Estatísticas de notificações',
      description: 'Retorna estatísticas das notificações (Admin apenas)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/StartDateParam' },
        { $ref: '#/components/parameters/EndDateParam' }
      ],
      responses: {
        '200': {
          description: 'Estatísticas das notificações',
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
                            description: 'Total de notificações'
                          },
                          byStatus: {
                            type: 'object',
                            properties: {
                              pending: { type: 'integer' },
                              sent: { type: 'integer' },
                              failed: { type: 'integer' },
                              read: { type: 'integer' }
                            }
                          },
                          byPriority: {
                            type: 'object',
                            properties: {
                              normal: { type: 'integer' },
                              high: { type: 'integer' },
                              urgent: { type: 'integer' }
                            }
                          },
                          byChannel: {
                            type: 'object',
                            properties: {
                              email: { type: 'integer' },
                              push: { type: 'integer' },
                              sms: { type: 'integer' },
                              in_app: { type: 'integer' }
                            }
                          },
                          deliveryRate: {
                            type: 'number',
                            format: 'float',
                            description: 'Taxa de entrega (0-1)'
                          },
                          readRate: {
                            type: 'number',
                            format: 'float',
                            description: 'Taxa de leitura (0-1)'
                          },
                          avgDeliveryTime: {
                            type: 'number',
                            description: 'Tempo médio de entrega em minutos'
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

  '/api/notifications/preferences': {
    get: {
      tags: ['Notificações'],
      summary: 'Obter preferências de notificação',
      description: 'Retorna as preferências de notificação do usuário autenticado',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Preferências de notificação',
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
                          preferences: {
                            type: 'object',
                            properties: {
                              email: {
                                type: 'object',
                                properties: {
                                  enabled: { type: 'boolean' },
                                  types: {
                                    type: 'array',
                                    items: { type: 'string' }
                                  }
                                }
                              },
                              push: {
                                type: 'object',
                                properties: {
                                  enabled: { type: 'boolean' },
                                  types: {
                                    type: 'array',
                                    items: { type: 'string' }
                                  }
                                }
                              },
                              sms: {
                                type: 'object',
                                properties: {
                                  enabled: { type: 'boolean' },
                                  types: {
                                    type: 'array',
                                    items: { type: 'string' }
                                  }
                                }
                              },
                              in_app: {
                                type: 'object',
                                properties: {
                                  enabled: { type: 'boolean' },
                                  types: {
                                    type: 'array',
                                    items: { type: 'string' }
                                  }
                                }
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
        '401': { $ref: '#/components/responses/Unauthorized' }
      }
    },
    put: {
      tags: ['Notificações'],
      summary: 'Atualizar preferências de notificação',
      description: 'Atualiza as preferências de notificação do usuário autenticado',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    types: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                },
                push: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    types: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                },
                sms: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    types: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                },
                in_app: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    types: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Preferências atualizadas com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' }
      }
    }
  },

  '/api/notifications/types': {
    get: {
      tags: ['Notificações'],
      summary: 'Listar tipos de notificação',
      description: 'Lista todos os tipos de notificação disponíveis',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Lista de tipos de notificação',
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
                          types: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: {
                                  type: 'string',
                                  format: 'uuid'
                                },
                                name: {
                                  type: 'string',
                                  description: 'Nome do tipo'
                                },
                                description: {
                                  type: 'string',
                                  description: 'Descrição do tipo'
                                },
                                category: {
                                  type: 'string',
                                  description: 'Categoria do tipo'
                                },
                                defaultPriority: {
                                  type: 'string',
                                  enum: ['normal', 'high', 'urgent']
                                },
                                defaultChannels: {
                                  type: 'array',
                                  items: {
                                    type: 'string',
                                    enum: ['email', 'push', 'sms', 'in_app']
                                  }
                                },
                                isActive: {
                                  type: 'boolean'
                                }
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
        '401': { $ref: '#/components/responses/Unauthorized' }
      }
    },
    post: {
      tags: ['Notificações'],
      summary: 'Criar tipo de notificação',
      description: 'Cria um novo tipo de notificação (Admin apenas)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Nome do tipo'
                },
                description: {
                  type: 'string',
                  description: 'Descrição do tipo'
                },
                category: {
                  type: 'string',
                  description: 'Categoria do tipo'
                },
                defaultPriority: {
                  type: 'string',
                  enum: ['normal', 'high', 'urgent'],
                  default: 'normal'
                },
                defaultChannels: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['email', 'push', 'sms', 'in_app']
                  },
                  default: ['in_app']
                },
                template: {
                  type: 'object',
                  description: 'Template da notificação',
                  properties: {
                    title: { type: 'string' },
                    message: { type: 'string' },
                    variables: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                }
              },
              required: ['name', 'description', 'category']
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Tipo de notificação criado com sucesso',
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
                          type: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', format: 'uuid' },
                              name: { type: 'string' },
                              description: { type: 'string' },
                              category: { type: 'string' },
                              defaultPriority: { type: 'string' },
                              defaultChannels: {
                                type: 'array',
                                items: { type: 'string' }
                              },
                              isActive: { type: 'boolean' },
                              createdAt: { type: 'string', format: 'date-time' }
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
        '403': { $ref: '#/components/responses/Forbidden' },
        '409': {
          description: 'Tipo de notificação já existe',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  }
}