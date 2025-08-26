const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testLoginLogs() {
  console.log('🧪 Testando logs de atividade de login...')
  
  try {
    // 1. Teste de login bem-sucedido
    console.log('\n1. Testando login bem-sucedido...')
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.100' // IP de teste
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'Admin123!'
      })
    })
    
    const loginResult = await loginResponse.json()
    console.log('Status:', loginResponse.status)
    console.log('Resposta:', loginResult)
    
    // 2. Teste de login com credenciais inválidas
    console.log('\n2. Testando login com credenciais inválidas...')
    const invalidLoginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.101' // IP de teste diferente
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'SenhaErrada123!'
      })
    })
    
    const invalidResult = await invalidLoginResponse.json()
    console.log('Status:', invalidLoginResponse.status)
    console.log('Resposta:', invalidResult)
    
    // 3. Teste de registro de usuário
    console.log('\n3. Testando registro de usuário...')
    const registerResponse = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.102'
      },
      body: JSON.stringify({
        name: 'Usuário Teste Logs',
        email: `teste.logs.${Date.now()}@example.com`,
        password: 'TesteLogs123!'
      })
    })
    
    const registerResult = await registerResponse.json()
    console.log('Status:', registerResponse.status)
    console.log('Resposta:', registerResult)
    
    // 4. Teste de forgot password
    console.log('\n4. Testando forgot password...')
    const forgotResponse = await fetch('http://localhost:3001/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.103'
      },
      body: JSON.stringify({
        email: 'admin@example.com'
      })
    })
    
    const forgotResult = await forgotResponse.json()
    console.log('Status:', forgotResponse.status)
    console.log('Resposta:', forgotResult)
    
    // 5. Verificar logs no banco de dados
    console.log('\n5. Verificando logs no banco de dados...')
    const recentLogs = await prisma.log.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Últimos 5 minutos
        },
        resource: 'auth'
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    })
    
    console.log(`\nEncontrados ${recentLogs.length} logs de autenticação nos últimos 5 minutos:`)
    recentLogs.forEach((log, index) => {
      console.log(`\n${index + 1}. ${log.action} - ${log.level.toUpperCase()}`)
      console.log(`   Timestamp: ${log.timestamp.toISOString()}`)
      console.log(`   IP: ${log.ip}`)
      console.log(`   Status: ${log.statusCode}`)
      console.log(`   Usuário: ${log.userId || 'N/A'}`)
      if (log.error) {
        console.log(`   Erro: ${log.error}`)
      }
      if (log.metadata) {
        console.log(`   Metadata: ${JSON.stringify(log.metadata, null, 2)}`)
      }
    })
    
    console.log('\n✅ Teste de logs de atividade concluído!')
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar o teste
testLoginLogs()