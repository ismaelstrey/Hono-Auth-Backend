const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testPasswordReset() {
  try {
    console.log('🔍 Testando recuperação de senha...')
    
    // Busca um usuário existente
    const user = await prisma.user.findFirst({
      where: { email: 'teste.verificacao@exemplo.com' }
    })
    
    if (!user) {
      console.log('❌ Usuário não encontrado')
      return
    }
    
    console.log('👤 Usuário encontrado:')
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    
    // Simula a geração de token de reset de senha
    const crypto = require('crypto')
    const jwt = require('jsonwebtoken')
    
    const resetToken = jwt.sign(
      {
        type: 'password-reset',
        timestamp: Date.now()
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    )
    
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hora
    
    // Salva o token no banco
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      }
    })
    
    console.log('\n🔑 Token de reset gerado:')
    console.log(`   Token: ${resetToken}`)
    console.log(`   Expira em: ${resetExpires}`)
    console.log(`\n🔗 Link de reset: http://localhost:3000/auth/reset-password?token=${resetToken}`)
    
    // Simula o reset da senha
    console.log('\n🧪 Simulando reset de senha...')
    
    const bcrypt = require('bcrypt')
    const newPassword = 'novaSenha123'
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    const finalUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      }
    })
    
    console.log('✅ Senha alterada com sucesso!')
    console.log('\n📊 Status após reset:')
    console.log(`   Token de Reset: ${finalUser.passwordResetToken ? 'Presente' : 'Removido'}`)
    console.log(`   Nova senha definida: Sim`)
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPasswordReset()