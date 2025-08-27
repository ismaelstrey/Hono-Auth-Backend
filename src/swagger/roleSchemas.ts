/**
 * Schemas para roles e permissões
 */
export const roleSchemas = {
  Role: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID único do role',
        example: 'clm1234567890abcdef'
      },
      name: {
        type: 'string',
        description: 'Nome do role',
        example: 'admin',
        enum: ['admin', 'moderator', 'user']
      },
      description: {
        type: 'string',
        description: 'Descrição do role',
        example: 'Administrador com acesso total ao sistema'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Data de criação do role'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Data da última atualização'
      }
    },
    required: ['id', 'name', 'description']
  },

  Permission: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID único da permissão',
        example: 'clm1234567890abcdef'
      },
      resource: {
        type: 'string',
        description: 'Recurso da permissão',
        example: 'users',
        enum: ['users', 'profile', 'admin', 'logs', 'notifications', 'roles']
      },
      action: {
        type: 'string',
        description: 'Ação da permissão',
        example: 'read',
        enum: ['create', 'read', 'update', 'delete', 'manage', 'full']
      },
      name: {
        type: 'string',
        description: 'Nome completo da permissão',
        example: 'users:read'
      },
      description: {
        type: 'string',
        description: 'Descrição da permissão',
        example: 'Permite visualizar informações de usuários'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Data de criação da permissão'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Data da última atualização'
      }
    },
    required: ['id', 'resource', 'action', 'name']
  },

  RoleWithPermissions: {
    allOf: [
      { $ref: '#/components/schemas/Role' },
      {
        type: 'object',
        properties: {
          permissions: {
            type: 'array',
            items: { $ref: '#/components/schemas/Permission' },
            description: 'Lista de permissões associadas ao role'
          },
          userCount: {
            type: 'integer',
            description: 'Número de usuários com este role',
            example: 5
          }
        }
      }
    ]
  },

  RolePermission: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID único da associação role-permissão'
      },
      roleId: {
        type: 'string',
        description: 'ID do role'
      },
      permissionId: {
        type: 'string',
        description: 'ID da permissão'
      },
      role: {
        $ref: '#/components/schemas/Role'
      },
      permission: {
        $ref: '#/components/schemas/Permission'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Data de criação da associação'
      }
    },
    required: ['id', 'roleId', 'permissionId']
  },

  UserWithRole: {
    allOf: [
      { $ref: '#/components/schemas/User' },
      {
        type: 'object',
        properties: {
          role: {
            $ref: '#/components/schemas/RoleWithPermissions'
          }
        }
      }
    ]
  },

  PermissionCheck: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'ID do usuário'
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
      },
      hasPermission: {
        type: 'boolean',
        description: 'Se o usuário tem a permissão'
      }
    },
    required: ['userId', 'resource', 'action', 'hasPermission']
  },

  RoleStats: {
    type: 'object',
    properties: {
      totalRoles: {
        type: 'integer',
        description: 'Total de roles no sistema',
        example: 3
      },
      totalPermissions: {
        type: 'integer',
        description: 'Total de permissões no sistema',
        example: 15
      },
      roleDistribution: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID do role'
            },
            name: {
              type: 'string',
              description: 'Nome do role'
            },
            userCount: {
              type: 'integer',
              description: 'Número de usuários com este role'
            },
            permissionCount: {
              type: 'integer',
              description: 'Número de permissões do role'
            }
          }
        },
        description: 'Distribuição de usuários por role'
      },
      permissionsByResource: {
        type: 'object',
        description: 'Contagem de permissões por recurso',
        additionalProperties: {
          type: 'integer'
        },
        example: {
          users: 4,
          profile: 3,
          admin: 2,
          logs: 2,
          notifications: 3,
          roles: 1
        }
      }
    },
    required: ['totalRoles', 'totalPermissions', 'roleDistribution', 'permissionsByResource']
  },

  UpdateUserRoleRequest: {
    type: 'object',
    properties: {
      roleId: {
        type: 'string',
        description: 'ID do novo role para o usuário',
        example: 'clm1234567890abcdef'
      }
    },
    required: ['roleId']
  },

  CheckPermissionRequest: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'ID do usuário a verificar',
        example: 'clm1234567890abcdef'
      },
      resource: {
        type: 'string',
        description: 'Recurso da permissão',
        example: 'users',
        enum: ['users', 'profile', 'admin', 'logs', 'notifications', 'roles']
      },
      action: {
        type: 'string',
        description: 'Ação da permissão',
        example: 'read',
        enum: ['create', 'read', 'update', 'delete', 'manage', 'full']
      }
    },
    required: ['userId', 'resource', 'action']
  },

  UserPermissions: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'ID do usuário'
      },
      role: {
        $ref: '#/components/schemas/RoleWithPermissions'
      },
      permissions: {
        type: 'array',
        items: { $ref: '#/components/schemas/Permission' },
        description: 'Lista completa de permissões do usuário'
      },
      permissionNames: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Lista de nomes das permissões',
        example: ['users:read', 'users:update', 'profile:update']
      }
    },
    required: ['userId', 'role', 'permissions', 'permissionNames']
  },

  RoleHealthCheck: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        description: 'Status do serviço'
      },
      message: {
        type: 'string',
        description: 'Mensagem de status',
        example: 'Role service is healthy'
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
        description: 'Timestamp da verificação'
      },
      service: {
        type: 'string',
        description: 'Nome do serviço',
        example: 'role-service'
      },
      error: {
        type: 'string',
        description: 'Mensagem de erro (se houver)'
      }
    },
    required: ['success', 'message', 'timestamp', 'service']
  }
}