const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testEmailVerification() {
  try {
    console.log('🔍 Testando verificação de email...')
    
    // Busca o usuário recém-criado
    const user = await prisma.user.findUnique({
      where: { email: 'teste.verificacao@exemplo.com' }
    })
    
    if (!user) {
      console.log('❌ Usuário não encontrado')
      return
    }
    
    console.log('👤 Usuário encontrado:')
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Email Verificado: ${user.emailVerified}`)
    console.log(`   Token de Verificação: ${user.emailVerificationToken ? 'Presente' : 'Ausente'}`)
    console.log(`   Token Expira em: ${user.emailVerificationExpires}`)
    
    if (user.emailVerificationToken) {
      console.log(`\n🔑 Token: ${user.emailVerificationToken}`)
      console.log(`\n🔗 Link de verificação: http://localhost:3000/auth/verify-email?token=${user.emailVerificationToken}`)
      
      // Simula a verificação atualizando diretamente no banco
      console.log('\n🧪 Simulando verificação...')
      
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null
        }
      })
      
      console.log('✅ Email verificado com sucesso!')
      console.log('\n📊 Status após verificação:')
      console.log(`   Email Verificado: ${updatedUser.emailVerified}`)
      console.log(`   Token de Verificação: ${updatedUser.emailVerificationToken ? 'Presente' : 'Removido'}`)
    }
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testEmailVerification()