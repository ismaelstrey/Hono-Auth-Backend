import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { errorResponse } from '@/utils/helpers'

/**
 * Middleware global de tratamento de erros
 */
export const errorHandler: ErrorHandler = (err, c) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: c.req.url,
    method: c.req.method,
    timestamp: new Date().toISOString()
  })

  // Se for uma HTTPException do Hono
  if (err instanceof HTTPException) {
    return c.json(
      errorResponse(err.message || 'Erro interno do servidor'),
      err.status
    )
  }

  // Erros de validação
  if (err.name === 'ValidationError') {
    return c.json(
      errorResponse('Dados inválidos', [{
        field: 'validation',
        message: err.message
      }]),
      400
    )
  }

  // Erros de JWT
  if (err.name === 'JsonWebTokenError') {
    return c.json(
      errorResponse('Token inválido'),
      401
    )
  }

  if (err.name === 'TokenExpiredError') {
    return c.json(
      errorResponse('Token expirado'),
      401
    )
  }

  // Erros de banco de dados (Prisma)
  if ('code' in err && err.code === 'P2002') {
    return c.json(
      errorResponse('Dados duplicados: este registro já existe'),
      409
    )
  }

  if ('code' in err && err.code === 'P2025') {
    return c.json(
      errorResponse('Registro não encontrado'),
      404
    )
  }

  // Erros de conexão com banco
  if ('code' in err && err.code === 'P1001') {
    return c.json(
      errorResponse('Erro de conexão com o banco de dados'),
      503
    )
  }

  // Erro de sintaxe SQL
  if ('code' in err && typeof err.code === 'string' && err.code.startsWith('P2')) {
    return c.json(
      errorResponse('Erro interno do banco de dados'),
      500
    )
  }

  // Erros de rate limiting
  if (err.message?.includes('rate limit')) {
    return c.json(
      errorResponse('Muitas tentativas. Tente novamente mais tarde.'),
      429
    )
  }

  // Erros de arquivo/upload
  if ('code' in err && err.code === 'LIMIT_FILE_SIZE') {
    return c.json(
      errorResponse('Arquivo muito grande'),
      413
    )
  }

  if ('code' in err && err.code === 'LIMIT_UNEXPECTED_FILE') {
    return c.json(
      errorResponse('Tipo de arquivo não permitido'),
      400
    )
  }

  // Erros de rede/timeout
  if ('code' in err && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT')) {
    return c.json(
      errorResponse('Serviço temporariamente indisponível'),
      503
    )
  }

  // Erro genérico
  return c.json(
    errorResponse(
      process.env.NODE_ENV === 'production' 
        ? 'Erro interno do servidor' 
        : err.message
    ),
    500
  )
}

/**
 * Wrapper para capturar erros assíncronos em handlers
 */
export const asyncHandler = (fn: (c: any, next?: any) => Promise<any>) => {
  return (c: any, next?: any) => {
    return Promise.resolve(fn(c, next)).catch(next)
  }
}

/**
 * Middleware para capturar erros não tratados
 */
export const uncaughtErrorHandler = () => {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
    process.exit(1)
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
    process.exit(1)
  })
}