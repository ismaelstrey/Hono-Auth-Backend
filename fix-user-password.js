const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function fixUserPassword() {
  console.log('🔧 Corrigindo senha do usuário...')
  
  try {
    // Gera o hash correto da senha
    const hashedPassword = await bcrypt.hash('Admin123!', 10)
    console.log('Hash gerado:', hashedPassword)
    
    // Atualiza o usuário
    const user = await prisma.user.update({
      where: { email: 'admin@example.com' },
      data: {
        password: hashedPassword
      }
    })
    
    console.log('✅ Senha atualizada com sucesso!')
    console.log('ID:', user.id)
    console.log('Email:', user.email)
    
    // Testa se o hash está funcionando
    const isValid = await bcrypt.compare('Admin123!', hashedPassword)
    console.log('✅ Verificação da senha:', isValid ? 'VÁLIDA' : 'INVÁLIDA')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

fixUserPassword()