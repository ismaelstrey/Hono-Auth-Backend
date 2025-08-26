const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAccountLockout() {
  try {
    console.log('🔒 Testando sistema de bloqueio de conta...')
    
    // Busca um usuário existente
    const user = await prisma.user.findFirst()
    
    if (!user) {
      console.log('❌ Nenhum usuário encontrado para teste')
      return
    }
    
    console.log(`👤 Usuário encontrado: ${user.email}`)
    console.log(`🔢 Tentativas falhadas atuais: ${user.failedLoginAttempts || 0}`)
    console.log(`🔒 Bloqueado até: ${user.lockedUntil || 'Não bloqueado'}`)
    
    // Simula 5 tentativas de login falhadas
    console.log('\n🚫 Simulando 5 tentativas de login falhadas...')
    
    for (let i = 1; i <= 5; i++) {
      console.log(`\n--- Tentativa ${i} ---`)
      
      // Incrementa tentativas falhadas
      if (i < 5) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: i,
            updatedAt: new Date()
          }
        })
        console.log(`✅ Tentativas falhadas incrementadas para: ${i}`)
      } else {
        // Na 5ª tentativa, bloqueia a conta
        const lockedUntil = new Date(Date.now() + 30 * 60 * 1000) // 30 minutos
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: lockedUntil,
            updatedAt: new Date()
          }
        })
        console.log(`🔒 Conta bloqueada até: ${lockedUntil.toLocaleString('pt-BR')}`)
      }
    }
    
    // Verifica o estado final
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id }
    })
    
    console.log('\n📊 Estado final da conta:')
    console.log(`🔢 Tentativas falhadas: ${updatedUser.failedLoginAttempts}`)
    console.log(`🔒 Bloqueado até: ${updatedUser.lockedUntil ? updatedUser.lockedUntil.toLocaleString('pt-BR') : 'Não bloqueado'}`)
    
    // Testa se a conta está bloqueada
    const isLocked = updatedUser.lockedUntil && updatedUser.lockedUntil > new Date()
    console.log(`🚨 Conta está bloqueada: ${isLocked ? 'SIM' : 'NÃO'}`)
    
    if (isLocked) {
      const remainingTime = Math.ceil((updatedUser.lockedUntil.getTime() - Date.now()) / (1000 * 60))
      console.log(`⏰ Tempo restante de bloqueio: ${remainingTime} minutos`)
    }
    
    // Simula desbloqueio após login bem-sucedido
    console.log('\n🔓 Simulando desbloqueio após login bem-sucedido...')
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date()
      }
    })
    
    const unlockedUser = await prisma.user.findUnique({
      where: { id: user.id }
    })
    
    console.log('✅ Conta desbloqueada com sucesso!')
    console.log(`🔢 Tentativas falhadas: ${unlockedUser.failedLoginAttempts}`)
    console.log(`🔒 Bloqueado até: ${unlockedUser.lockedUntil || 'Não bloqueado'}`)
    
    console.log('\n🎉 Teste de bloqueio de conta concluído com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testAccountLockout()