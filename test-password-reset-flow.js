const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function testPasswordResetFlow() {
  console.log('🧪 Testando fluxo completo de recuperação de senha...')
  
  try {
    // 1. Limpar usuário de teste se existir
    console.log('\n🧹 Limpando usuário de teste...')
    await prisma.user.deleteMany({
      where: { email: 'test-reset@example.com' }
    })
    
    // 2. Criar usuário de teste
    console.log('\n👤 Criando usuário de teste...')
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10)
    const testUser = await prisma.user.create({
      data: {
        name: 'Test Reset User',
        email: 'test-reset@example.com',
        password: hashedPassword,
        emailVerified: true
      }
    })
    console.log(`✅ Usuário criado: ${testUser.email}`)
    
    // 3. Testar endpoint forgot-password
    console.log('\n📧 Testando endpoint forgot-password...')
    const forgotResponse = await fetch('http://localhost:3002/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test-reset@example.com'
      })
    })
    
    const forgotResult = await forgotResponse.json()
    console.log(`Status: ${forgotResponse.status}`)
    console.log(`Resposta:`, forgotResult)
    
    if (forgotResponse.status !== 200) {
      throw new Error('Erro no endpoint forgot-password')
    }
    
    // 4. Verificar se o token foi salvo no banco
    console.log('\n🔍 Verificando token no banco de dados...')
    const userWithToken = await prisma.user.findUnique({
      where: { email: 'test-reset@example.com' }
    })
    
    if (!userWithToken.passwordResetToken) {
      throw new Error('Token de reset não foi salvo no banco')
    }
    
    console.log(`✅ Token encontrado: ${userWithToken.passwordResetToken.substring(0, 10)}...`)
    console.log(`✅ Expira em: ${userWithToken.passwordResetExpires}`)
    
    // 5. Testar endpoint reset-password
    console.log('\n🔐 Testando endpoint reset-password...')
    const resetResponse = await fetch('http://localhost:3002/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: userWithToken.passwordResetToken,
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      })
    })
    
    const resetResult = await resetResponse.json()
    console.log(`Status: ${resetResponse.status}`)
    console.log(`Resposta:`, resetResult)
    
    if (resetResponse.status !== 200) {
      throw new Error('Erro no endpoint reset-password')
    }
    
    // 6. Verificar se a senha foi alterada e o token foi limpo
    console.log('\n✅ Verificando alterações no banco...')
    const finalUser = await prisma.user.findUnique({
      where: { email: 'test-reset@example.com' }
    })
    
    const passwordChanged = await bcrypt.compare('NewPassword123!', finalUser.password)
    
    console.log(`✅ Senha alterada: ${passwordChanged ? 'Sim' : 'Não'}`)
    console.log(`✅ Token limpo: ${!finalUser.passwordResetToken ? 'Sim' : 'Não'}`)
    console.log(`✅ Expiração limpa: ${!finalUser.passwordResetExpires ? 'Sim' : 'Não'}`)
    
    // 7. Testar login com nova senha
    console.log('\n🔑 Testando login com nova senha...')
    const loginResponse = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test-reset@example.com',
        password: 'NewPassword123!'
      })
    })
    
    const loginResult = await loginResponse.json()
    console.log(`Status: ${loginResponse.status}`)
    console.log(`Login bem-sucedido: ${loginResponse.status === 200 ? 'Sim' : 'Não'}`)
    
    if (loginResponse.status === 200) {
      console.log('\n🎉 TESTE COMPLETO: Fluxo de recuperação de senha funcionando perfeitamente!')
    } else {
      console.log('\n❌ ERRO: Login com nova senha falhou')
      console.log('Resposta do login:', loginResult)
    }
    
    // 8. Limpar dados de teste
    console.log('\n🧹 Limpando dados de teste...')
    await prisma.user.delete({
      where: { email: 'test-reset@example.com' }
    })
    console.log('✅ Dados de teste removidos')
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message)
    
    // Tentar limpar dados mesmo em caso de erro
    try {
      await prisma.user.deleteMany({
        where: { email: 'test-reset@example.com' }
      })
    } catch (cleanupError) {
      console.error('Erro na limpeza:', cleanupError.message)
    }
  } finally {
    await prisma.$disconnect()
  }
}

testPasswordResetFlow()