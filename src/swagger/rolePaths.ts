/**
 * Documentação Swagger para rotas de roles e permissões
 */
export const rolePaths = {
  '/api/roles/roles': {
    get: {
      tags: ['Roles & Permissões'],
      summary: 'Listar roles',
      description: 'Lista todos os roles disponíveis no sistema (Moderador/Admin)',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Lista de roles obtida com sucesso',
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
                          roles: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: {
                                  type: 'string',
                                  description: 'ID único do role'
                                },
                                name: {
                                  type: 'string',
                                  description: 'Nome do role',
                                  example: 'admin'
                                },
                                description: {
                                  type: 'string',
                                  description: 'Descrição do role',
                                  example: 'Administrador com acesso total ao sistema'
                                },
                                userCount: {
                                  type: 'integer',
                                  description: 'Número de usuários com este role'
                                },
                                permissions: {
                                  type: 'array',
                                  items: { $ref: '#/components/schemas/Permission' }
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
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' }
      }
    }
  },

  '/api/roles/permissions': {
    get: {
      tags: ['Roles & Permissões'],
      summary: 'Listar permissões',
      description: 'Lista todas as permissões disponíveis no sistema (Moderador/Admin)',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Lista de permissões obtida com sucesso',
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
                          permissions: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Permission' }
                          },
                          groupedPermissions: {
                            type: 'object',
                            description: 'Permissões agrupadas por recurso',
                            additionalProperties: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/Permission' }
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

  '/api/roles/roles/{roleId}': {
    get: {
      tags: ['Roles & Permissões'],
      summary: 'Obter detalhes do role',
      description: 'Obtém detalhes de um role específico (Moderador/Admin)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'roleId',
          required: true,
          schema: {
            type: 'string'
          },
          description: 'ID do role'
        }
      ],
      responses: {
        '200': {
          description: 'Detalhes do role obtidos com sucesso',
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
                          role: { $ref: '#/components/schemas/RoleWithPermissions' }
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

  '/api/roles/my-permissions': {
    get: {
      tags: ['Roles & Permissões'],
      summary: 'Minhas permissões',
      description: 'Obtém as permissões do usuário autenticado',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Permissões obtidas com sucesso',
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
                          role: { $ref: '#/components/schemas/RoleWithPermissions' },
                          permissions: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Permission' }
                          },
                          permissionNames: {
                            type: 'array',
                            items: {
                              type: 'string'
                            },
                            description: 'Lista de nomes das permissões'
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

  '/api/roles/users/{userId}/permissions': {
    get: {
      tags: ['Roles & Permissões'],
      summary: 'Permissões de usuário',
      description: 'Obtém as permissões de um usuário específico (Moderador/Admin)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'userId',
          required: true,
          schema: {
            type: 'string'
          },
          description: 'ID do usuário'
        }
      ],
      responses: {
        '200': {
          description: 'Permissões do usuário obtidas com sucesso',
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
                          userId: {
                            type: 'string',
                            description: 'ID do usuário'
                          },
                          role: { $ref: '#/components/schemas/RoleWithPermissions' },
                          permissions: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Permission' }
                          },
                          permissionNames: {
                            type: 'array',
                            items: {
                              type: 'string'
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

  '/api/roles/users/{userId}/role': {
    put: {
      tags: ['Roles & Permissões'],
      summary: 'Atualizar role do usuário',
      description: 'Atualiza o role de um usuário específico (Admin com permissão roles:manage)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'userId',
          required: true,
          schema: {
            type: 'string'
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
                roleId: {
                  type: 'string',
                  description: 'ID do novo role',
                  example: 'admin_role'
                }
              },
              required: ['roleId']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Role do usuário atualizado com sucesso',
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
                          user: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              email: { type: 'string' },
                              name: { type: 'string' },
                              role: { $ref: '#/components/schemas/Role' }
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
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  },

  '/api/roles/check-permission': {
    post: {
      tags: ['Roles & Permissões'],
      summary: 'Verificar permissão',
      description: 'Verifica se um usuário tem uma permissão específica (Admin)',
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
                  description: 'ID do usuário a verificar'
                },
                resource: {
                  type: 'string',
                  description: 'Recurso da permissão',
                  example: 'users'
                },
                action: {
                  type: 'string',
                  description: 'Ação da permissão',
                  example: 'read'
                }
              },
              required: ['userId', 'resource', 'action']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Verificação realizada com sucesso',
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
                          userId: { type: 'string' },
                          resource: { type: 'string' },
                          action: { type: 'string' },
                          hasPermission: {
                            type: 'boolean',
                            description: 'Se o usuário tem a permissão'
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

  '/api/roles/stats': {
    get: {
      tags: ['Roles & Permissões'],
      summary: 'Estatísticas de roles',
      description: 'Obtém estatísticas sobre roles e permissões (Moderador/Admin)',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Estatísticas obtidas com sucesso',
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
                          totalRoles: {
                            type: 'integer',
                            description: 'Total de roles no sistema'
                          },
                          totalPermissions: {
                            type: 'integer',
                            description: 'Total de permissões no sistema'
                          },
                          roleDistribution: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                userCount: { type: 'integer' },
                                permissionCount: { type: 'integer' }
                              }
                            }
                          },
                          permissionsByResource: {
                            type: 'object',
                            description: 'Contagem de permissões por recurso',
                            additionalProperties: {
                              type: 'integer'
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

  '/api/roles/health': {
    get: {
      tags: ['Sistema'],
      summary: 'Health check do serviço de roles',
      description: 'Verifica se o serviço de roles está funcionando',
      responses: {
        '200': {
          description: 'Serviço funcionando corretamente',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                  service: { type: 'string' }
                }
              }
            }
          }
        },
        '500': {
          description: 'Erro no serviço',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                  service: { type: 'string' },
                  error: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }
}