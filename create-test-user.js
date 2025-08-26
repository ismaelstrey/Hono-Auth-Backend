const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestUser() {
  console.log('🔧 Criando usuário de teste...')
  
  try {
    // Verifica se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    })
    
    if (existingUser) {
      console.log('✅ Usuário admin@example.com já existe!')
      console.log('ID:', existingUser.id)
      console.log('Nome:', existingUser.name)
      console.log('Email:', existingUser.email)
      console.log('Ativo:', existingUser.isActive)
      return
    }
    
    // Hash da senha Admin123! usando bcrypt com salt 10
    // $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi (password)
    const hashedPassword = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
    
    // Cria o usuário
    const user = await prisma.user.create({
      data: {
        name: 'Administrador',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'ADMIN',
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