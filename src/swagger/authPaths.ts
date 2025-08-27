/**
 * Documentação das rotas de autenticação
 */
export const authPaths = {
  '/api/auth/register': {
    post: {
      tags: ['Autenticação'],
      summary: 'Registrar novo usuário',
      description: 'Cria uma nova conta de usuário no sistema',
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
                  example: 'João Silva'
                },
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'Email do usuário',
                  example: 'joao@example.com'
                },
                password: {
                  type: 'string',
                  minLength: 8,
                  description: 'Senha do usuário (mínimo 8 caracteres)',
                  example: 'MinhaSenh@123'
                }
              },
              required: ['name', 'email', 'password']
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Usuário registrado com sucesso',
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
                          accessToken: {
                            type: 'string',
                            description: 'Token de acesso JWT'
                          },
                          refreshToken: {
                            type: 'string',
                            description: 'Token de refresh'
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
        '409': {
          description: 'Email já está em uso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        '429': { $ref: '#/components/responses/TooManyRequests' }
      }
    }
  },

  '/api/auth/login': {
    post: {
      tags: ['Autenticação'],
      summary: 'Fazer login',
      description: 'Autentica um usuário e retorna tokens de acesso',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'Email do usuário',
                  example: 'joao@example.com'
                },
                password: {
                  type: 'string',
                  description: 'Senha do usuário',
                  example: 'MinhaSenh@123'
                }
              },
              required: ['email', 'password']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Login realizado com sucesso',
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
                          accessToken: {
                            type: 'string',
                            description: 'Token de acesso JWT'
                          },
                          refreshToken: {
                            type: 'string',
                            description: 'Token de refresh'
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
        '401': {
          description: 'Credenciais inválidas',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        '423': {
          description: 'Conta bloqueada',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        '429': { $ref: '#/components/responses/TooManyRequests' }
      }
    }
  },

  '/api/auth/refresh-token': {
    post: {
      tags: ['Autenticação'],
      summary: 'Renovar token de acesso',
      description: 'Gera um novo token de acesso usando o refresh token',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                refreshToken: {
                  type: 'string',
                  description: 'Token de refresh válido'
                }
              },
              required: ['refreshToken']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Token renovado com sucesso',
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
                          accessToken: {
                            type: 'string',
                            description: 'Novo token de acesso'
                          },
                          refreshToken: {
                            type: 'string',
                            description: 'Novo token de refresh'
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
        '401': {
          description: 'Refresh token inválido ou expirado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },

  '/api/auth/forgot-password': {
    post: {
      tags: ['Autenticação'],
      summary: 'Solicitar reset de senha',
      description: 'Envia email com link para reset de senha',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'Email do usuário',
                  example: 'joao@example.com'
                }
              },
              required: ['email']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Email de reset enviado com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '404': {
          description: 'Email não encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        '429': { $ref: '#/components/responses/TooManyRequests' }
      }
    }
  },

  '/api/auth/reset-password': {
    post: {
      tags: ['Autenticação'],
      summary: 'Resetar senha',
      description: 'Redefine a senha do usuário usando token de reset',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  description: 'Token de reset recebido por email'
                },
                newPassword: {
                  type: 'string',
                  minLength: 8,
                  description: 'Nova senha (mínimo 8 caracteres)',
                  example: 'NovaSenha@123'
                }
              },
              required: ['token', 'newPassword']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Senha redefinida com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': {
          description: 'Token de reset inválido ou expirado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },

  '/api/auth/verify-email': {
    post: {
      tags: ['Autenticação'],
      summary: 'Verificar email',
      description: 'Verifica o email do usuário usando token de verificação',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  description: 'Token de verificação recebido por email'
                }
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
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': {
          description: 'Token de verificação inválido ou expirado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },

  '/api/auth/resend-verification': {
    post: {
      tags: ['Autenticação'],
      summary: 'Reenviar email de verificação',
      description: 'Reenvia email de verificação para o usuário',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'Email do usuário',
                  example: 'joao@example.com'
                }
              },
              required: ['email']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Email de verificação reenviado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '404': {
          description: 'Email não encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        '429': { $ref: '#/components/responses/TooManyRequests' }
      }
    }
  },

  '/api/auth/validate-token': {
    get: {
      tags: ['Autenticação'],
      summary: 'Validar token',
      description: 'Valida se o token de acesso é válido',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Token válido',
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
                          valid: {
                            type: 'boolean',
                            example: true
                          },
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
        '401': { $ref: '#/components/responses/Unauthorized' }
      }
    }
  },

  '/api/auth/logout': {
    post: {
      tags: ['Autenticação'],
      summary: 'Fazer logout',
      description: 'Invalida o token de acesso atual',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Logout realizado com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '401': { $ref: '#/components/responses/Unauthorized' }
      }
    }
  },

  '/api/auth/profile': {
    get: {
      tags: ['Autenticação'],
      summary: 'Obter perfil do usuário autenticado',
      description: 'Retorna informações do usuário logado',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Perfil obtido com sucesso',
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

  '/api/auth/change-password': {
    post: {
      tags: ['Autenticação'],
      summary: 'Alterar senha',
      description: 'Altera a senha do usuário autenticado',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                currentPassword: {
                  type: 'string',
                  description: 'Senha atual'
                },
                newPassword: {
                  type: 'string',
                  minLength: 8,
                  description: 'Nova senha (mínimo 8 caracteres)'
                }
              },
              required: ['currentPassword', 'newPassword']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Senha alterada com sucesso',
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

  '/api/auth/token-info': {
    get: {
      tags: ['Autenticação'],
      summary: 'Informações do token',
      description: 'Retorna informações sobre o token atual',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Informações do token',
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
                            format: 'uuid'
                          },
                          role: {
                            type: 'string',
                            enum: ['admin', 'moderator', 'user']
                          },
                          issuedAt: {
                            type: 'string',
                            format: 'date-time'
                          },
                          expiresAt: {
                            type: 'string',
                            format: 'date-time'
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

  '/api/auth/health': {
    get: {
      tags: ['Sistema'],
      summary: 'Health check do serviço de autenticação',
      description: 'Verifica se o serviço de autenticação está funcionando',
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
                    example: 'auth'
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