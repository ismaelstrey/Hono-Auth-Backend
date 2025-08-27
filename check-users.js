const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true
      }
    })
    
    console.log('Usuários no banco:')
    users.forEach(user => {
      console.log(`- ${user.email} (${user.name}) - Ativo: ${user.isActive}`)
    })
    
    console.log(`\nTotal: ${users.length} usuários`)
  } catch (error) {
    console.error('Erro:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()