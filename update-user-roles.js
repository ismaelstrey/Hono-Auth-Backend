const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateUserRoles() {
  console.log('🔄 Atualizando roleIds dos usuários existentes...')
  
  try {
    // 1. Ler backup dos dados
    const fs = require('fs')
    let backupData
    
    try {
      const backupContent = fs.readFileSync('backup-users-roles.json', 'utf8')
      backupData = JSON.parse(backupContent)
      console.log(`📋 Backup carregado: ${backupData.users.length} usuários`)
    } catch (error) {
      console.log('⚠️ Backup não encontrado, buscando usuários diretamente...')
      // Se não há backup, buscar usuários atuais (que agora têm roleId)
      const users = await prisma.user.findMany({
        select: { id: true, roleId: true, email: true }
      })
      console.log(`📊 Encontrados ${users.length} usuários no banco`)
      return
    }
    
    // 2. Mapear roles antigos para novos IDs
    const roleMapping = {
      'admin': 'admin_role',
      'ADMIN': 'admin_role',
      'user': 'user_role',
      'USER': 'user_role',
      'moderator': 'moderator_role',
      'MODERATOR': 'moderator_role'
    }
    
    // 3. Atualizar cada usuário
    console.log('🔄 Atualizando usuários...')
    let updated = 0
    let errors = 0
    
    for (const user of backupData.users) {
      try {
        const oldRole = user.role || 'user'
        const newRoleId = roleMapping[oldRole] || 'user_role'
        
        await prisma.user.update({
          where: { id: user.id },
          data: { roleId: newRoleId }
        })
        
        console.log(`✅ ${user.email}: ${oldRole} -> ${newRoleId}`)
        updated++
        
      } catch (error) {
        console.error(`❌ Erro ao atualizar ${user.email}:`, error.message)
        errors++
      }
    }
    
    // 4. Verificar se todos os usuários têm roles válidos
    console.log('\n🔍 Verificando integridade dos dados...')
    
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        roleId: true
      }
    })
    
    const validRoleIds = ['admin_role', 'user_role', 'moderator_role']
    const usersWithInvalidRoles = allUsers.filter(user => !validRoleIds.includes(user.roleId))
    
    if (usersWithInvalidRoles.length > 0) {
      console.log(`⚠️ Encontrados ${usersWithInvalidRoles.length} usuários com roles inválidos`)
      
      for (const user of usersWithInvalidRoles) {
        await prisma.user.update({
          where: { id: user.id },
          data: { roleId: 'user_role' }
        })
        console.log(`🔧 Corrigido: ${user.email} -> user_role`)
      }
    }
    
    // 5. Criar perfis básicos para usuários existentes
    console.log('\n👤 Criando perfis básicos para usuários...')
    
    const usersWithoutProfile = await prisma.user.findMany({
      where: {
        profile: null
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })
    
    console.log(`📊 ${usersWithoutProfile.length} usuários sem perfil`)
    
    for (const user of usersWithoutProfile) {
      try {
        // Dividir nome em firstName e lastName
        const nameParts = user.name.split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        await prisma.userProfile.create({
          data: {
            userId: user.id,
            firstName: firstName,
            lastName: lastName || null
          }
        })
        
        console.log(`✅ Perfil criado para: ${user.email}`)
      } catch (error) {
        console.log(`ℹ️ Perfil já existe para: ${user.email}`)
      }
    }
    
    // 6. Estatísticas finais
    console.log('\n📊 Estatísticas finais:')
    console.log(`✅ Usuários atualizados: ${updated}`)
    console.log(`❌ Erros: ${errors}`)
    
    // Contar usuários por role
    const roleStats = await prisma.user.groupBy({
      by: ['roleId'],
      _count: {
        id: true
      }
    })
    
    console.log('\n📈 Distribuição atual de roles:')
    for (const stat of roleStats) {
      console.log(`  ${stat.roleId}: ${stat._count.id} usuários`)
    }
    
    // Verificar se há perfis criados
    const profileCount = await prisma.userProfile.count()
    console.log(`\n👤 Total de perfis criados: ${profileCount}`)
    
    console.log('\n🎉 Migração de roles concluída com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro durante a atualização:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar a atualização
updateUserRoles().catch(console.error)