import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { errorResponse } from '@/utils/helpers'
import {
  PrismaErrorHandler,
  formatErrorForLogging,
  TokenError,
  RateLimitError,
  FileError,
  ServiceUnavailableError,
  InternalServerError
} from '@/utils/errors'

/**
 * Middleware global de tratamento de erros
 */
export const errorHandler: ErrorHandler = (err, c) => {
  // Contexto da requisição para logging
  const requestContext = {
    url: c.req.url,
    method: c.req.method,
    userAgent: c.req.header('User-Agent'),
    ip: c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown',
    requestId: c.get('requestId')
  }

  // Log estruturado do erro
  const errorLog = formatErrorForLogging(err, requestContext)
  console.error('Error occurred:', errorLog)

  // Se for um erro customizado da aplicação (com statusCode)
  if ('statusCode' in err && typeof err.statusCode === 'number') {
    const customError = err as any
    return c.json(
      errorResponse(err.message, customError.details?.errors),
      customError.statusCode as any
    )
  }

  // Se for uma HTTPException do Hono
  if (err instanceof HTTPException) {
    return c.json(
      errorResponse(err.message || 'Erro interno do servidor'),
      err.status
    )
  }

  // Erros de validação do Zod
  if (err.name === 'ZodError') {
    const zodError = err as any
    const validationErrors = zodError.issues?.map((issue: any) => ({
      field: issue.path.join('.'),
      message: issue.message
    }))

    return c.json(
      errorResponse('Dados de entrada inválidos', validationErrors),
      400 as any
    )
  }

  // Erros de JWT
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    const tokenError = new TokenError(
      err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido'
    )
    return c.json(
      errorResponse(tokenError.message),
      tokenError.statusCode as any
    )
  }

  // Erros do Prisma
  if ('code' in err && typeof err.code === 'string' && err.code.startsWith('P')) {
    const prismaError = PrismaErrorHandler.handle(err)
    return c.json(
      errorResponse(prismaError.message),
      prismaError.statusCode as any
    )
  }

  // Erros de rate limiting
  if (err.message?.includes('rate limit') || err.name === 'RateLimitError') {
    const rateLimitError = new RateLimitError()
    return c.json(
      errorResponse(rateLimitError.message),
      rateLimitError.statusCode as any
    )
  }

  // Erros de arquivo/upload
  if ('code' in err && (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_UNEXPECTED_FILE')) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Arquivo muito grande'
      : 'Tipo de arquivo não permitido'
    const fileError = new FileError(message, err.code === 'LIMIT_FILE_SIZE' ? 413 : 400)
    return c.json(
      errorResponse(fileError.message),
      fileError.statusCode as any
    )
  }

  // Erros de rede/timeout
  if ('code' in err && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT')) {
    const serviceError = new ServiceUnavailableError()
    return c.json(
      errorResponse(serviceError.message),
      serviceError.statusCode as any
    )
  }

  // Erro genérico - não operacional
  const internalError = new InternalServerError(
    process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor'
      : err.message,
    process.env.NODE_ENV !== 'production' ? { originalError: err.message, stack: err.stack } : undefined
  )

  return c.json(
    errorResponse(internalError.message, internalError.details?.errors),
    internalError.statusCode as any
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