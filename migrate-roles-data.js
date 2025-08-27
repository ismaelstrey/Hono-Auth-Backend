const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function migrateRolesData() {
  console.log('🔄 Iniciando migração de dados de roles...')
  
  try {
    // 1. Buscar todos os usuários existentes
    console.log('📊 Buscando usuários existentes...')
    const users = await prisma.user.findMany({
      select: {
        id: true,
        role: true,
        email: true
      }
    })
    
    console.log(`Encontrados ${users.length} usuários`)
    
    // 2. Criar roles padrão se não existirem
    console.log('🏷️ Criando roles padrão...')
    
    const defaultRoles = [
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
    
    for (const role of defaultRoles) {
      try {
        await prisma.$executeRaw`
          INSERT OR IGNORE INTO roles (id, name, description, isActive, createdAt, updatedAt)
          VALUES (${role.id}, ${role.name}, ${role.description}, 1, datetime('now'), datetime('now'))
        `
        console.log(`✅ Role '${role.name}' criada/verificada`)
      } catch (error) {
        console.log(`ℹ️ Role '${role.name}' já existe ou erro: ${error.message}`)
      }
    }
    
    // 3. Criar permissões padrão
    console.log('🔐 Criando permissões padrão...')
    
    const defaultPermissions = [
      // Permissões de usuários
      { name: 'users:read', resource: 'users', action: 'read', description: 'Visualizar usuários' },
      { name: 'users:create', resource: 'users', action: 'create', description: 'Criar usuários' },
      { name: 'users:update', resource: 'users', action: 'update', description: 'Atualizar usuários' },
      { name: 'users:delete', resource: 'users', action: 'delete', description: 'Deletar usuários' },
      
      // Permissões de perfil
      { name: 'profile:read', resource: 'profile', action: 'read', description: 'Visualizar perfil' },
      { name: 'profile:update', resource: 'profile', action: 'update', description: 'Atualizar perfil' },
      
      // Permissões de logs
      { name: 'logs:read', resource: 'logs', action: 'read', description: 'Visualizar logs' },
      
      // Permissões administrativas
      { name: 'admin:full', resource: 'admin', action: 'full', description: 'Acesso administrativo completo' },
      { name: 'roles:manage', resource: 'roles', action: 'manage', description: 'Gerenciar roles e permissões' }
    ]
    
    for (const perm of defaultPermissions) {
      try {
        await prisma.$executeRaw`
          INSERT OR IGNORE INTO permissions (id, name, resource, action, description, createdAt, updatedAt)
          VALUES (${`perm_${perm.name.replace(':', '_')}`}, ${perm.name}, ${perm.resource}, ${perm.action}, ${perm.description}, datetime('now'), datetime('now'))
        `
        console.log(`✅ Permissão '${perm.name}' criada`)
      } catch (error) {
        console.log(`ℹ️ Permissão '${perm.name}' já existe ou erro: ${error.message}`)
      }
    }
    
    // 4. Associar permissões aos roles
    console.log('🔗 Associando permissões aos roles...')
    
    const rolePermissions = [
      // Admin tem todas as permissões
      { roleId: 'admin_role', permissions: defaultPermissions.map(p => `perm_${p.name.replace(':', '_')}`) },
      
      // User tem permissões básicas
      { roleId: 'user_role', permissions: ['perm_profile_read', 'perm_profile_update'] },
      
      // Moderator tem permissões intermediárias
      { roleId: 'moderator_role', permissions: ['perm_users_read', 'perm_profile_read', 'perm_profile_update', 'perm_logs_read'] }
    ]
    
    for (const rp of rolePermissions) {
      for (const permId of rp.permissions) {
        try {
          await prisma.$executeRaw`
            INSERT OR IGNORE INTO role_permissions (id, roleId, permissionId, createdAt)
            VALUES (${`rp_${rp.roleId}_${permId}`}, ${rp.roleId}, ${permId}, datetime('now'))
          `
        } catch (error) {
          console.log(`ℹ️ Associação ${rp.roleId} -> ${permId} já existe`)
        }
      }
    }
    
    console.log('✅ Associações de permissões criadas')
    
    // 5. Mapear roles existentes para novos IDs
    console.log('🔄 Mapeando roles existentes...')
    
    const roleMapping = {
      'admin': 'admin_role',
      'user': 'user_role',
      'moderator': 'moderator_role'
    }
    
    // 6. Criar backup dos dados atuais
    console.log('💾 Criando backup dos dados atuais...')
    const backupData = {
      users: users,
      timestamp: new Date().toISOString()
    }
    
    require('fs').writeFileSync(
      'backup-users-roles.json', 
      JSON.stringify(backupData, null, 2)
    )
    
    console.log('✅ Backup criado: backup-users-roles.json')
    
    // 7. Mostrar estatísticas
    console.log('\n📊 Estatísticas:')
    console.log(`- Usuários encontrados: ${users.length}`)
    
    const roleStats = {}
    users.forEach(user => {
      const role = user.role || 'undefined'
      roleStats[role] = (roleStats[role] || 0) + 1
    })
    
    console.log('- Distribuição de roles:')
    Object.entries(roleStats).forEach(([role, count]) => {
      const newRoleId = roleMapping[role] || 'user_role'
      console.log(`  ${role} -> ${newRoleId}: ${count} usuários`)
    })
    
    console.log('\n🎉 Preparação concluída!')
    console.log('\n📋 Próximos passos:')
    console.log('1. Execute: npx prisma migrate dev --name add_roles_permissions_profiles')
    console.log('2. Execute: node update-user-roles.js (para atualizar os roleIds dos usuários)')
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar a migração
migrateRolesData().catch(console.error)