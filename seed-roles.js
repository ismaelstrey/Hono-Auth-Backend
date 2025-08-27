const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedRoles() {
  console.log('🌱 Inserindo roles e permissões padrão...')
  
  try {
    // 1. Criar roles padrão
    console.log('🏷️ Criando roles...')
    
    const roles = [
      {
        id: 'admin_role',
        name: 'admin',
        description: 'Administrador com acesso total ao sistema'
      },
      {
        id: 'user_role',
        name: 'user',
        description: 'Usuário padrão com acesso básico'
      },
      {
        id: 'moderator_role',
        name: 'moderator',
        description: 'Moderador com permissões intermediárias'
      }
    ]
    
    for (const role of roles) {
      try {
        await prisma.role.upsert({
          where: { id: role.id },
          update: {
            name: role.name,
            description: role.description
          },
          create: role
        })
        console.log(`✅ Role '${role.name}' criada/atualizada`)
      } catch (error) {
        console.error(`❌ Erro ao criar role '${role.name}':`, error.message)
      }
    }
    
    // 2. Criar permissões padrão
    console.log('\n🔐 Criando permissões...')
    
    const permissions = [
      // Permissões de usuários
      { id: 'perm_users_read', name: 'users:read', resource: 'users', action: 'read', description: 'Visualizar usuários' },
      { id: 'perm_users_create', name: 'users:create', resource: 'users', action: 'create', description: 'Criar usuários' },
      { id: 'perm_users_update', name: 'users:update', resource: 'users', action: 'update', description: 'Atualizar usuários' },
      { id: 'perm_users_delete', name: 'users:delete', resource: 'users', action: 'delete', description: 'Deletar usuários' },
      
      // Permissões de perfil
      { id: 'perm_profile_read', name: 'profile:read', resource: 'profile', action: 'read', description: 'Visualizar perfil' },
      { id: 'perm_profile_update', name: 'profile:update', resource: 'profile', action: 'update', description: 'Atualizar perfil' },
      
      // Permissões de logs
      { id: 'perm_logs_read', name: 'logs:read', resource: 'logs', action: 'read', description: 'Visualizar logs' },
      
      // Permissões administrativas
      { id: 'perm_admin_full', name: 'admin:full', resource: 'admin', action: 'full', description: 'Acesso administrativo completo' },
      { id: 'perm_roles_manage', name: 'roles:manage', resource: 'roles', action: 'manage', description: 'Gerenciar roles e permissões' }
    ]
    
    for (const perm of permissions) {
      try {
        await prisma.permission.upsert({
          where: { id: perm.id },
          update: {
            name: perm.name,
            resource: perm.resource,
            action: perm.action,
            description: perm.description
          },
          create: perm
        })
        console.log(`✅ Permissão '${perm.name}' criada/atualizada`)
      } catch (error) {
        console.error(`❌ Erro ao criar permissão '${perm.name}':`, error.message)
      }
    }
    
    // 3. Associar permissões aos roles
    console.log('\n🔗 Associando permissões aos roles...')
    
    const rolePermissions = [
      // Admin tem todas as permissões
      {
        roleId: 'admin_role',
        permissions: [
          'perm_users_read', 'perm_users_create', 'perm_users_update', 'perm_users_delete',
          'perm_profile_read', 'perm_profile_update',
          'perm_logs_read',
          'perm_admin_full', 'perm_roles_manage'
        ]
      },
      
      // User tem permissões básicas
      {
        roleId: 'user_role',
        permissions: ['perm_profile_read', 'perm_profile_update']
      },
      
      // Moderator tem permissões intermediárias
      {
        roleId: 'moderator_role',
        permissions: ['perm_users_read', 'perm_profile_read', 'perm_profile_update', 'perm_logs_read']
      }
    ]
    
    for (const rp of rolePermissions) {
      for (const permId of rp.permissions) {
        try {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: rp.roleId,
                permissionId: permId
              }
            },
            update: {},
            create: {
              roleId: rp.roleId,
              permissionId: permId
            }
          })
        } catch (error) {
          console.log(`ℹ️ Associação ${rp.roleId} -> ${permId} já existe`)
        }
      }
    }
    
    console.log('✅ Associações de permissões criadas')
    
    // 4. Atualizar usuários para usar os novos roleIds
    console.log('\n👥 Atualizando usuários...')
    
    // Ler backup se existir
    const fs = require('fs')
    let userData = []
    
    try {
      const backupContent = fs.readFileSync('backup-users-roles.json', 'utf8')
      const backupData = JSON.parse(backupContent)
      userData = backupData.users
      console.log(`📋 Usando backup: ${userData.length} usuários`)
    } catch (error) {
      console.log('⚠️ Backup não encontrado, todos os usuários receberão role user_role')
    }
    
    const roleMapping = {
      'admin': 'admin_role',
      'ADMIN': 'admin_role',
      'user': 'user_role',
      'USER': 'user_role',
      'moderator': 'moderator_role',
      'MODERATOR': 'moderator_role'
    }
    
    if (userData.length > 0) {
      // Usar dados do backup
      for (const user of userData) {
        try {
          const oldRole = user.role || 'user'
          const newRoleId = roleMapping[oldRole] || 'user_role'
          
          await prisma.user.update({
            where: { id: user.id },
            data: { roleId: newRoleId }
          })
          
          console.log(`✅ ${user.email}: ${oldRole} -> ${newRoleId}`)
        } catch (error) {
          console.error(`❌ Erro ao atualizar ${user.email}:`, error.message)
        }
      }
    } else {
      // Atualizar todos os usuários para user_role
      await prisma.user.updateMany({
        data: { roleId: 'user_role' }
      })
      console.log('✅ Todos os usuários atualizados para user_role')
    }
    
    // 5. Estatísticas finais
    console.log('\n📊 Estatísticas finais:')
    
    const roleStats = await prisma.user.groupBy({
      by: ['roleId'],
      _count: { id: true }
    })
    
    console.log('Distribuição de roles:')
    for (const stat of roleStats) {
      const role = await prisma.role.findUnique({
        where: { id: stat.roleId },
        select: { name: true }
      })
      console.log(`  ${role?.name || stat.roleId}: ${stat._count.id} usuários`)
    }
    
    const totalPermissions = await prisma.permission.count()
    const totalRolePermissions = await prisma.rolePermission.count()
    
    console.log(`\n📈 Resumo:`)
    console.log(`- Roles criados: ${roles.length}`)
    console.log(`- Permissões criadas: ${totalPermissions}`)
    console.log(`- Associações role-permissão: ${totalRolePermissions}`)
    
    console.log('\n🎉 Sistema de roles e permissões configurado com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro durante o seed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar o seed
seedRoles().catch(console.error)