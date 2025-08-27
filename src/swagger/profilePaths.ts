/**
 * Documentação das rotas de perfis
 */
export const profilePaths = {
  '/api/profiles': {
    get: {
      tags: ['Perfis'],
      summary: 'Listar perfis',
      description: 'Lista todos os perfis públicos com paginação (Admin/Moderator)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        {
          in: 'query',
          name: 'isPublic',
          schema: {
            type: 'boolean'
          },
          description: 'Filtrar por perfis públicos/privados'
        },
        {
          in: 'query',
          name: 'hasAvatar',
          schema: {
            type: 'boolean'
          },
          description: 'Filtrar por perfis com/sem avatar'
        },
        { $ref: '#/components/parameters/StartDateParam' },
        { $ref: '#/components/parameters/EndDateParam' }
      ],
      responses: {
        '200': {
          description: 'Lista de perfis',
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
                            { $ref: '#/components/schemas/Profile' },
                            {
                              type: 'object',
                              properties: {
                                user: {
                                  type: 'object',
                                  properties: {
                                    id: { type: 'string', format: 'uuid' },
                                    name: { type: 'string' },
                                    email: { type: 'string', format: 'email' }
                                  }
                                }
                              }
                            }
                          ]
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
    },
    post: {
      tags: ['Perfis'],
      summary: 'Criar perfil',
      description: 'Cria um novo perfil para o usuário autenticado',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                bio: {
                  type: 'string',
                  maxLength: 500,
                  description: 'Biografia do usuário',
                  example: 'Desenvolvedor apaixonado por tecnologia'
                },
                phone: {
                  type: 'string',
                  description: 'Telefone do usuário',
                  example: '+55 11 99999-9999'
                },
                location: {
                  type: 'string',
                  description: 'Localização do usuário',
                  example: 'São Paulo, SP'
                },
                website: {
                  type: 'string',
                  format: 'uri',
                  description: 'Website pessoal',
                  example: 'https://meusite.com'
                },
                socialLinks: {
                  type: 'object',
                  properties: {
                    twitter: {
                      type: 'string',
                      example: 'https://twitter.com/usuario'
                    },
                    linkedin: {
                      type: 'string',
                      example: 'https://linkedin.com/in/usuario'
                    },
                    github: {
                      type: 'string',
                      example: 'https://github.com/usuario'
                    }
                  },
                  description: 'Links para redes sociais'
                },
                preferences: {
                  type: 'object',
                  properties: {
                    theme: {
                      type: 'string',
                      enum: ['light', 'dark', 'auto'],
                      default: 'auto'
                    },
                    language: {
                      type: 'string',
                      default: 'pt-BR'
                    },
                    timezone: {
                      type: 'string',
                      default: 'America/Sao_Paulo'
                    }
                  },
                  description: 'Preferências do usuário'
                },
                isPublic: {
                  type: 'boolean',
                  description: 'Se o perfil é público',
                  default: true
                }
              }
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Perfil criado com sucesso',
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
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '409': {
          description: 'Usuário já possui um perfil',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },

  '/api/profiles/me': {
    get: {
      tags: ['Perfis'],
      summary: 'Obter meu perfil',
      description: 'Retorna o perfil do usuário autenticado',
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
                          profile: { $ref: '#/components/schemas/Profile' },
                          user: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', format: 'uuid' },
                              name: { type: 'string' },
                              email: { type: 'string', format: 'email' },
                              role: { type: 'string' },
                              status: { type: 'string' }
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
        '404': {
          description: 'Perfil não encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    },
    put: {
      tags: ['Perfis'],
      summary: 'Atualizar meu perfil',
      description: 'Atualiza o perfil do usuário autenticado',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                bio: {
                  type: 'string',
                  maxLength: 500,
                  description: 'Biografia do usuário'
                },
                phone: {
                  type: 'string',
                  description: 'Telefone do usuário'
                },
                location: {
                  type: 'string',
                  description: 'Localização do usuário'
                },
                website: {
                  type: 'string',
                  format: 'uri',
                  description: 'Website pessoal'
                },
                socialLinks: {
                  type: 'object',
                  properties: {
                    twitter: { type: 'string' },
                    linkedin: { type: 'string' },
                    github: { type: 'string' }
                  },
                  description: 'Links para redes sociais'
                },
                preferences: {
                  type: 'object',
                  properties: {
                    theme: {
                      type: 'string',
                      enum: ['light', 'dark', 'auto']
                    },
                    language: { type: 'string' },
                    timezone: { type: 'string' }
                  },
                  description: 'Preferências do usuário'
                },
                isPublic: {
                  type: 'boolean',
                  description: 'Se o perfil é público'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Perfil atualizado com sucesso',
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
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    },
    delete: {
      tags: ['Perfis'],
      summary: 'Excluir meu perfil',
      description: 'Remove o perfil do usuário autenticado',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Perfil excluído com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  },

  '/api/profiles/upsert': {
    post: {
      tags: ['Perfis'],
      summary: 'Criar ou atualizar perfil',
      description: 'Cria um novo perfil ou atualiza o existente para o usuário autenticado',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                bio: {
                  type: 'string',
                  maxLength: 500,
                  description: 'Biografia do usuário'
                },
                phone: {
                  type: 'string',
                  description: 'Telefone do usuário'
                },
                location: {
                  type: 'string',
                  description: 'Localização do usuário'
                },
                website: {
                  type: 'string',
                  format: 'uri',
                  description: 'Website pessoal'
                },
                socialLinks: {
                  type: 'object',
                  properties: {
                    twitter: { type: 'string' },
                    linkedin: { type: 'string' },
                    github: { type: 'string' }
                  },
                  description: 'Links para redes sociais'
                },
                preferences: {
                  type: 'object',
                  properties: {
                    theme: {
                      type: 'string',
                      enum: ['light', 'dark', 'auto']
                    },
                    language: { type: 'string' },
                    timezone: { type: 'string' }
                  },
                  description: 'Preferências do usuário'
                },
                isPublic: {
                  type: 'boolean',
                  description: 'Se o perfil é público'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Perfil criado ou atualizado com sucesso',
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
                          profile: { $ref: '#/components/schemas/Profile' },
                          created: {
                            type: 'boolean',
                            description: 'Se o perfil foi criado (true) ou atualizado (false)'
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

  '/api/profiles/upload-avatar': {
    post: {
      tags: ['Perfis'],
      summary: 'Upload de avatar',
      description: 'Faz upload do avatar do usuário autenticado',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                avatar: {
                  type: 'string',
                  format: 'binary',
                  description: 'Arquivo de imagem do avatar (JPG, PNG, WebP - máx 5MB)'
                }
              },
              required: ['avatar']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Avatar enviado com sucesso',
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
                          avatarUrl: {
                            type: 'string',
                            format: 'uri',
                            description: 'URL do avatar enviado'
                          },
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
        '400': {
          description: 'Arquivo inválido ou muito grande',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '413': {
          description: 'Arquivo muito grande',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },

  '/api/profiles/stats': {
    get: {
      tags: ['Perfis'],
      summary: 'Estatísticas de perfis',
      description: 'Retorna estatísticas gerais dos perfis (Admin/Moderator)',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Estatísticas dos perfis',
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
                            description: 'Total de perfis'
                          },
                          public: {
                            type: 'integer',
                            description: 'Perfis públicos'
                          },
                          private: {
                            type: 'integer',
                            description: 'Perfis privados'
                          },
                          withAvatar: {
                            type: 'integer',
                            description: 'Perfis com avatar'
                          },
                          withBio: {
                            type: 'integer',
                            description: 'Perfis com biografia'
                          },
                          withSocialLinks: {
                            type: 'integer',
                            description: 'Perfis com links sociais'
                          },
                          completionRate: {
                            type: 'number',
                            format: 'float',
                            description: 'Taxa média de completude dos perfis (0-1)'
                          },
                          createdThisMonth: {
                            type: 'integer',
                            description: 'Perfis criados neste mês'
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

  '/api/profiles/{id}': {
    get: {
      tags: ['Perfis'],
      summary: 'Obter perfil por ID',
      description: 'Retorna informações de um perfil específico (público ou próprio)',
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
          description: 'ID do perfil'
        }
      ],
      responses: {
        '200': {
          description: 'Informações do perfil',
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
                          profile: { $ref: '#/components/schemas/Profile' },
                          user: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', format: 'uuid' },
                              name: { type: 'string' },
                              email: { type: 'string', format: 'email' },
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
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': {
          description: 'Perfil privado - acesso negado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    },
    put: {
      tags: ['Perfis'],
      summary: 'Atualizar perfil por ID',
      description: 'Atualiza um perfil específico (Admin/Moderator ou próprio)',
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
          description: 'ID do perfil'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                bio: {
                  type: 'string',
                  maxLength: 500,
                  description: 'Biografia do usuário'
                },
                phone: {
                  type: 'string',
                  description: 'Telefone do usuário'
                },
                location: {
                  type: 'string',
                  description: 'Localização do usuário'
                },
                website: {
                  type: 'string',
                  format: 'uri',
                  description: 'Website pessoal'
                },
                socialLinks: {
                  type: 'object',
                  properties: {
                    twitter: { type: 'string' },
                    linkedin: { type: 'string' },
                    github: { type: 'string' }
                  },
                  description: 'Links para redes sociais'
                },
                preferences: {
                  type: 'object',
                  properties: {
                    theme: {
                      type: 'string',
                      enum: ['light', 'dark', 'auto']
                    },
                    language: { type: 'string' },
                    timezone: { type: 'string' }
                  },
                  description: 'Preferências do usuário'
                },
                isPublic: {
                  type: 'boolean',
                  description: 'Se o perfil é público'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Perfil atualizado com sucesso',
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
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    },
    delete: {
      tags: ['Perfis'],
      summary: 'Excluir perfil por ID',
      description: 'Remove um perfil específico (Admin apenas)',
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
          description: 'ID do perfil'
        }
      ],
      responses: {
        '200': {
          description: 'Perfil excluído com sucesso',
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
  }
}