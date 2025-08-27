/**
 * Documentação das rotas de usuários
 */
export const userPaths = {
  '/api/users': {
    get: {
      tags: ['Usuários'],
      summary: 'Listar usuários',
      description: 'Lista usuários com filtros e paginação (Admin/Moderator)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        {
          in: 'query',
          name: 'role',
          schema: {
            type: 'string',
            enum: ['admin', 'moderator', 'user']
          },
          description: 'Filtrar por role'
        },
        {
          in: 'query',
          name: 'status',
          schema: {
            type: 'string',
            enum: ['active', 'inactive', 'locked']
          },
          description: 'Filtrar por status'
        },
        {
          in: 'query',
          name: 'emailVerified',
          schema: {
            type: 'boolean'
          },
          description: 'Filtrar por verificação de email'
        },
        { $ref: '#/components/parameters/StartDateParam' },
        { $ref: '#/components/parameters/EndDateParam' }
      ],
      responses: {
        '200': {
          description: 'Lista de usuários',
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
                        items: { $ref: '#/components/schemas/User' }
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
      tags: ['Usuários'],
      summary: 'Criar usuário',
      description: 'Cria um novo usuário (Admin apenas)',
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
                  description: 'Nome completo do usuário',
                  example: 'Maria Santos'
                },
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'Email do usuário',
                  example: 'maria@example.com'
                },
                password: {
                  type: 'string',
                  minLength: 8,
                  description: 'Senha do usuário'
                },
                role: {
                  type: 'string',
                  enum: ['admin', 'moderator', 'user'],
                  description: 'Role do usuário',
                  default: 'user'
                },
                status: {
                  type: 'string',
                  enum: ['active', 'inactive', 'locked'],
                  description: 'Status inicial do usuário',
                  default: 'active'
                }
              },
              required: ['name', 'email', 'password']
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Usuário criado com sucesso',
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
                          user: { $ref: '#/components/schemas/User' }
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
          description: 'Email já está em uso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },

  '/api/users/search': {
    get: {
      tags: ['Usuários'],
      summary: 'Buscar usuários',
      description: 'Busca usuários por nome ou email',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'query',
          name: 'q',
          required: true,
          schema: {
            type: 'string',
            minLength: 2
          },
          description: 'Termo de busca (nome ou email)'
        },
        { $ref: '#/components/parameters/LimitParam' }
      ],
      responses: {
        '200': {
          description: 'Resultados da busca',
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
                          users: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/User' }
                          },
                          total: {
                            type: 'integer',
                            description: 'Total de resultados encontrados'
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
        '401': { $ref: '#/components/responses/Unauthorized' }
      }
    }
  },

  '/api/users/settings': {
    get: {
      tags: ['Usuários'],
      summary: 'Obter configurações do usuário',
      description: 'Retorna as configurações do usuário autenticado',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Configurações do usuário',
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
                          theme: {
                            type: 'string',
                            enum: ['light', 'dark', 'auto']
                          },
                          language: {
                            type: 'string'
                          },
                          timezone: {
                            type: 'string'
                          },
                          notifications: {
                            type: 'object',
                            properties: {
                              email: { type: 'boolean' },
                              push: { type: 'boolean' },
                              sms: { type: 'boolean' }
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
      tags: ['Usuários'],
      summary: 'Atualizar configurações do usuário',
      description: 'Atualiza as configurações do usuário autenticado',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                theme: {
                  type: 'string',
                  enum: ['light', 'dark', 'auto']
                },
                language: {
                  type: 'string'
                },
                timezone: {
                  type: 'string'
                },
                notifications: {
                  type: 'object',
                  properties: {
                    email: { type: 'boolean' },
                    push: { type: 'boolean' },
                    sms: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Configurações atualizadas com sucesso',
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

  '/api/users/profile': {
    get: {
      tags: ['Usuários'],
      summary: 'Obter perfil do usuário autenticado',
      description: 'Retorna o perfil completo do usuário logado',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Perfil do usuário',
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
                          user: { $ref: '#/components/schemas/User' },
                          profile: { $ref: '#/components/schemas/Profile' }
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

  '/api/users/stats': {
    get: {
      tags: ['Usuários'],
      summary: 'Estatísticas de usuários',
      description: 'Retorna estatísticas gerais dos usuários (Admin/Moderator)',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Estatísticas dos usuários',
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
                            description: 'Total de usuários'
                          },
                          active: {
                            type: 'integer',
                            description: 'Usuários ativos'
                          },
                          inactive: {
                            type: 'integer',
                            description: 'Usuários inativos'
                          },
                          locked: {
                            type: 'integer',
                            description: 'Usuários bloqueados'
                          },
                          verified: {
                            type: 'integer',
                            description: 'Usuários com email verificado'
                          },
                          byRole: {
                            type: 'object',
                            properties: {
                              admin: { type: 'integer' },
                              moderator: { type: 'integer' },
                              user: { type: 'integer' }
                            }
                          },
                          registrationsThisMonth: {
                            type: 'integer',
                            description: 'Registros neste mês'
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

  '/api/users/recent': {
    get: {
      tags: ['Usuários'],
      summary: 'Usuários recentes',
      description: 'Lista os usuários registrados recentemente (Admin/Moderator)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            default: 10
          },
          description: 'Número de usuários recentes'
        }
      ],
      responses: {
        '200': {
          description: 'Lista de usuários recentes',
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
                          users: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/User' }
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

  '/api/users/role/{role}': {
    get: {
      tags: ['Usuários'],
      summary: 'Listar usuários por role',
      description: 'Lista usuários de uma role específica (Admin/Moderator)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'role',
          required: true,
          schema: {
            type: 'string',
            enum: ['admin', 'moderator', 'user']
          },
          description: 'Role dos usuários a listar'
        },
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' }
      ],
      responses: {
        '200': {
          description: 'Lista de usuários da role especificada',
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
                        items: { $ref: '#/components/schemas/User' }
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

  '/api/users/bulk': {
    post: {
      tags: ['Usuários'],
      summary: 'Operações em lote',
      description: 'Executa operações em múltiplos usuários (Admin apenas)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['activate', 'deactivate', 'lock', 'unlock', 'delete'],
                  description: 'Ação a ser executada'
                },
                userIds: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid'
                  },
                  description: 'IDs dos usuários'
                }
              },
              required: ['action', 'userIds']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Operação em lote executada com sucesso',
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
                            description: 'Número de usuários processados'
                          },
                          failed: {
                            type: 'integer',
                            description: 'Número de falhas'
                          },
                          errors: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                userId: { type: 'string' },
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
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' }
      }
    }
  },

  '/api/users/{id}': {
    get: {
      tags: ['Usuários'],
      summary: 'Obter usuário por ID',
      description: 'Retorna informações de um usuário específico (Admin/Moderator)',
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
          description: 'ID do usuário'
        }
      ],
      responses: {
        '200': {
          description: 'Informações do usuário',
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
                          user: { $ref: '#/components/schemas/User' },
                          profile: { $ref: '#/components/schemas/Profile' }
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
    },
    put: {
      tags: ['Usuários'],
      summary: 'Atualizar usuário',
      description: 'Atualiza informações de um usuário (Admin/Moderator)',
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
          description: 'ID do usuário'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Nome do usuário'
                },
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'Email do usuário'
                },
                role: {
                  type: 'string',
                  enum: ['admin', 'moderator', 'user'],
                  description: 'Role do usuário'
                },
                status: {
                  type: 'string',
                  enum: ['active', 'inactive', 'locked'],
                  description: 'Status do usuário'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Usuário atualizado com sucesso',
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
                          user: { $ref: '#/components/schemas/User' }
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
        '404': { $ref: '#/components/responses/NotFound' },
        '409': {
          description: 'Email já está em uso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    },
    delete: {
      tags: ['Usuários'],
      summary: 'Excluir usuário',
      description: 'Remove um usuário do sistema (Admin apenas)',
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
          description: 'ID do usuário'
        }
      ],
      responses: {
        '200': {
          description: 'Usuário excluído com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  },

  '/api/users/{id}/toggle-status': {
    patch: {
      tags: ['Usuários'],
      summary: 'Alternar status do usuário',
      description: 'Alterna entre ativo/inativo (Admin/Moderator)',
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
          description: 'ID do usuário'
        }
      ],
      responses: {
        '200': {
          description: 'Status alterado com sucesso',
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
                          user: { $ref: '#/components/schemas/User' }
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

  '/api/users/{id}/change-role': {
    patch: {
      tags: ['Usuários'],
      summary: 'Alterar role do usuário',
      description: 'Altera a role de um usuário (Admin apenas)',
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
          description: 'ID do usuário'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                role: {
                  type: 'string',
                  enum: ['admin', 'moderator', 'user'],
                  description: 'Nova role do usuário'
                }
              },
              required: ['role']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Role alterada com sucesso',
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
                          user: { $ref: '#/components/schemas/User' }
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
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  },

  '/api/users/health': {
    get: {
      tags: ['Sistema'],
      summary: 'Health check do serviço de usuários',
      description: 'Verifica se o serviço de usuários está funcionando',
      responses: {
        '200': {
          description: 'Serviço funcionando normalmente',
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
                    example: 'users'
                  },
                  timestamp: {
                    type: 'string',
                    format: 'date-time'
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