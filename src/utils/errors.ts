/**
 * Classes de erro customizadas para padronização do tratamento de erros
 */

/**
 * Classe base para erros da aplicação
 */
export abstract class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly code?: string
  public readonly details?: any

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    code?: string,
    details?: any
  ) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.code = code
    this.details = details

    // Mantém o stack trace correto
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Erro de validação de dados
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

/**
 * Erro de autenticação
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Credenciais inválidas') {
    super(message, 401, true, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
  }
}

/**
 * Erro de autorização
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Acesso negado') {
    super(message, 403, true, 'AUTHORIZATION_ERROR')
    this.name = 'AuthorizationError'
  }
}

/**
 * Erro de recurso não encontrado
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso não encontrado') {
    super(message, 404, true, 'NOT_FOUND_ERROR')
    this.name = 'NotFoundError'
  }
}

/**
 * Erro de conflito (dados duplicados)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Conflito de dados') {
    super(message, 409, true, 'CONFLICT_ERROR')
    this.name = 'ConflictError'
  }
}

/**
 * Erro de rate limiting
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Muitas tentativas. Tente novamente mais tarde.') {
    super(message, 429, true, 'RATE_LIMIT_ERROR')
    this.name = 'RateLimitError'
  }
}

/**
 * Erro interno do servidor
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Erro interno do servidor', details?: any) {
    super(message, 500, true, 'INTERNAL_SERVER_ERROR', details)
    this.name = 'InternalServerError'
  }
}

/**
 * Erro de serviço indisponível
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Serviço temporariamente indisponível') {
    super(message, 503, true, 'SERVICE_UNAVAILABLE_ERROR')
    this.name = 'ServiceUnavailableError'
  }
}

/**
 * Erro de negócio/regra de negócio
 */
export class BusinessError extends AppError {
  constructor(message: string, statusCode: number = 400, details?: any) {
    super(message, statusCode, true, 'BUSINESS_ERROR', details)
    this.name = 'BusinessError'
  }
}

/**
 * Erro de token JWT
 */
export class TokenError extends AppError {
  constructor(message: string = 'Token inválido ou expirado') {
    super(message, 401, true, 'TOKEN_ERROR')
    this.name = 'TokenError'
  }
}

/**
 * Erro de banco de dados
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Erro de banco de dados', details?: any) {
    super(message, 500, true, 'DATABASE_ERROR', details)
    this.name = 'DatabaseError'
  }
}

/**
 * Erro de arquivo/upload
 */
export class FileError extends AppError {
  constructor(message: string, statusCode: number = 400) {
    super(message, statusCode, true, 'FILE_ERROR')
    this.name = 'FileError'
  }
}

/**
 * Utilitário para criar erros baseados em códigos Prisma
 */
export class PrismaErrorHandler {
  static handle(error: any): AppError {
    if (!error.code) {
      return new DatabaseError('Erro desconhecido do banco de dados', error)
    }

    switch (error.code) {
      case 'P2002':
        return new ConflictError('Dados duplicados: este registro já existe')
      
      case 'P2025':
        return new NotFoundError('Registro não encontrado')
      
      case 'P1001':
        return new ServiceUnavailableError('Erro de conexão com o banco de dados')
      
      case 'P2003':
        return new ValidationError('Violação de chave estrangeira')
      
      case 'P2004':
        return new ValidationError('Violação de restrição no banco de dados')
      
      case 'P2011':
        return new ValidationError('Violação de restrição de nulidade')
      
      case 'P2012':
        return new ValidationError('Valor obrigatório ausente')
      
      case 'P2013':
        return new ValidationError('Argumento obrigatório ausente')
      
      case 'P2014':
        return new ValidationError('Mudança violaria uma relação obrigatória')
      
      case 'P2015':
        return new NotFoundError('Registro relacionado não encontrado')
      
      case 'P2016':
        return new ValidationError('Erro de interpretação de consulta')
      
      case 'P2017':
        return new ValidationError('Registros não conectados')
      
      case 'P2018':
        return new NotFoundError('Registros conectados obrigatórios não encontrados')
      
      case 'P2019':
        return new ValidationError('Erro de entrada')
      
      case 'P2020':
        return new ValidationError('Valor fora do intervalo para o tipo')
      
      case 'P2021':
        return new NotFoundError('Tabela não existe no banco de dados atual')
      
      case 'P2022':
        return new NotFoundError('Coluna não existe no banco de dados atual')
      
      default:
        return new DatabaseError(`Erro do banco de dados: ${error.code}`, error)
    }
  }
}

/**
 * Utilitário para verificar se um erro é operacional
 */
export const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return error.isOperational
  }
  return false
}

/**
 * Utilitário para formatar erros para logging
 */
export const formatErrorForLogging = (error: Error, context?: any) => {
  const errorInfo: any = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  }

  if (error instanceof AppError) {
    errorInfo.statusCode = error.statusCode
    errorInfo.code = error.code
    errorInfo.isOperational = error.isOperational
    errorInfo.details = error.details
  }

  if (context) {
    errorInfo.context = context
  }

  return errorInfo
}