import { PrismaClient } from '@prisma/client'

/**
 * Cliente Prisma global para conexão com o banco de dados
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Instância do cliente Prisma
 * Em desenvolvimento, reutiliza a instância para evitar múltiplas conexões
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Função para conectar ao banco de dados
 */
export async function connectDatabase() {
  try {
    await prisma.$connect()
    console.log('✅ Conectado ao banco de dados SQLite')
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco de dados:', error)
    process.exit(1)
  }
}

/**
 * Função para desconectar do banco de dados
 */
export async function disconnectDatabase() {
  try {
    await prisma.$disconnect()
    console.log('✅ Desconectado do banco de dados')
  } catch (error) {
    console.error('❌ Erro ao desconectar do banco de dados:', error)
  }
}

/**
 * Função para verificar a saúde da conexão com o banco
 */
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('❌ Erro na verificação de saúde do banco:', error)
    return false
  }
}