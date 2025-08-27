import { z } from 'zod'

/**
 * Schema de validação para variáveis de ambiente
 */
const envSchema = z.object({
  // Configurações do servidor
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('9000'),
  HOST: z.string().default('localhost'),

  // Configurações JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET deve ter pelo menos 32 caracteres'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Configurações de senha
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),

  // Configurações de email (para futuras implementações)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().optional(),

  // Configurações de rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutos
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  RATE_LIMIT_AUTH_MAX: z.string().transform(Number).default('5'),
  RATE_LIMIT_REGISTRATION_MAX: z.string().transform(Number).default('3'),
  RATE_LIMIT_PASSWORD_RESET_MAX: z.string().transform(Number).default('3'),

  // Configurações de CORS
  CORS_ORIGIN: z.string().default('*'),
  CORS_CREDENTIALS: z.string().transform(val => val === 'true').default('true'),

  // Configurações de logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_MAX_ENTRIES: z.string().transform(Number).default('1000'),

  // Configurações de segurança
  SECURE_HEADERS: z.string().transform(val => val === 'true').default('true'),

  // Configurações de upload (para futuras implementações)
  MAX_FILE_SIZE: z.string().transform(Number).default('5242880'), // 5MB
  ALLOWED_FILE_TYPES: z.string().default('image/jpeg,image/png,image/gif,image/webp'),

  // URL base da aplicação
  APP_URL: z.string().url().default('http://localhost:9000'),

  // Configurações de banco de dados (para futuras implementações com Prisma)
  DATABASE_URL: z.string().optional(),

  // Configurações de cache (para futuras implementações)
  REDIS_URL: z.string().optional(),

  // Configurações de monitoramento
  ENABLE_METRICS: z.string().transform(val => val === 'true').default('false'),

  // Configurações de desenvolvimento
  ENABLE_SWAGGER: z.string().transform(val => val === 'true').default('true'),
  SWAGGER_PATH: z.string().default('/docs'),
})

/**
 * Tipo das variáveis de ambiente validadas
 */
export type EnvConfig = z.infer<typeof envSchema>

/**
 * Função para carregar e validar variáveis de ambiente
 */
function loadEnv(): EnvConfig {
  try {
    // Carrega variáveis do processo
    const env = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      HOST: process.env.HOST,
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
      BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      SMTP_FROM: process.env.SMTP_FROM,
      SMTP_FROM_NAME: process.env.SMTP_FROM_NAME,
      RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
      RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
      RATE_LIMIT_AUTH_MAX: process.env.RATE_LIMIT_AUTH_MAX,
      RATE_LIMIT_REGISTRATION_MAX: process.env.RATE_LIMIT_REGISTRATION_MAX,
      RATE_LIMIT_PASSWORD_RESET_MAX: process.env.RATE_LIMIT_PASSWORD_RESET_MAX,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      CORS_CREDENTIALS: process.env.CORS_CREDENTIALS,
      LOG_LEVEL: process.env.LOG_LEVEL,
      LOG_MAX_ENTRIES: process.env.LOG_MAX_ENTRIES,
      SECURE_HEADERS: process.env.SECURE_HEADERS,
      MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
      ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES,
      APP_URL: process.env.APP_URL,
      DATABASE_URL: process.env.DATABASE_URL,
      REDIS_URL: process.env.REDIS_URL,
      ENABLE_METRICS: process.env.ENABLE_METRICS,
      ENABLE_SWAGGER: process.env.ENABLE_SWAGGER,
      SWAGGER_PATH: process.env.SWAGGER_PATH,
    }

    // Valida as variáveis usando o schema
    return envSchema.parse(env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Erro na validação das variáveis de ambiente:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
    } else {
      console.error('❌ Erro ao carregar variáveis de ambiente:', error)
    }
    process.exit(1)
  }
}

/**
 * Configuração de ambiente validada
 */
export const env = loadEnv()

/**
 * Função para verificar se está em ambiente de desenvolvimento
 */
export const isDevelopment = () => env.NODE_ENV === 'development'

/**
 * Função para verificar se está em ambiente de produção
 */
export const isProduction = () => env.NODE_ENV === 'production'

/**
 * Função para verificar se está em ambiente de teste
 */
export const isTest = () => env.NODE_ENV === 'test'

/**
 * Função para obter URL completa
 */
export const getFullUrl = (path: string = '') => {
  const baseUrl = env.APP_URL.endsWith('/') ? env.APP_URL.slice(0, -1) : env.APP_URL
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${cleanPath}`
}

/**
 * Configurações derivadas
 */
export const config = {
  server: {
    port: env.PORT,
    host: env.HOST,
    url: env.APP_URL
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN
  },
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM,
    fromName: env.SMTP_FROM_NAME
  },
  security: {
    bcryptRounds: env.BCRYPT_ROUNDS,
    secureHeaders: env.SECURE_HEADERS
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    auth: env.RATE_LIMIT_AUTH_MAX,
    registration: env.RATE_LIMIT_REGISTRATION_MAX,
    passwordReset: env.RATE_LIMIT_PASSWORD_RESET_MAX
  },
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: env.CORS_CREDENTIALS
  },
  logging: {
    level: env.LOG_LEVEL,
    maxEntries: env.LOG_MAX_ENTRIES
  },
  upload: {
    maxFileSize: env.MAX_FILE_SIZE,
    allowedTypes: env.ALLOWED_FILE_TYPES.split(',')
  },
  features: {
    metrics: env.ENABLE_METRICS,
    swagger: env.ENABLE_SWAGGER,
    swaggerPath: env.SWAGGER_PATH
  }
} as const