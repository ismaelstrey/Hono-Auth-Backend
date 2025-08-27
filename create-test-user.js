const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createTestUser() {
  console.log('🔧 Criando usuário de teste...')
  
  try {
    // Verifica se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test-avatar@example.com' }
    })
    
    if (existingUser) {
      console.log('✅ Usuário test-avatar@example.com já existe!')
      console.log('ID:', existingUser.id)
      console.log('Nome:', existingUser.name)
      console.log('Email:', existingUser.email)
      console.log('Ativo:', existingUser.isActive)
      return
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10)
    
    // Buscar role de usuário
    const userRole = await prisma.role.findFirst({
      where: { name: 'user' }
    })
    
    if (!userRole) {
      throw new Error('Role "user" não encontrada')
    }
    
    // Cria o usuário
    const user = await prisma.user.create({
      data: {
        name: 'Test Avatar User',
        email: 'test-avatar@example.com',
        password: hashedPassword,
        roleId: userRole.id,
        isActive: true,
        emailVerified: true
      }
    })
    
    console.log('✅ Usuário criado com sucesso!')
    console.log('ID:', user.id)
    console.log('Nome:', user.name)
    console.log('Email:', user.email)
    console.log('Role:', user.role)
    console.log('Senha: Admin123!')
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar a criação
createTestUser()