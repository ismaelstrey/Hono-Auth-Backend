import { PrismaClient } from '@prisma/client'
import { LogService } from '@/services/logService'

const prisma = new PrismaClient()
const logService = new LogService()

export async function seedNotificationTypes() {
  try {
    console.log('🌱 Criando tipos de notificação padrão...')

    // Tipos de notificação padrão
    const notificationTypes = [
      {
        name: 'welcome',
        description: 'Notificação de boas-vindas para novos usuários',
        category: 'system',
        isActive: true
      },
      {
        name: 'password_reset',
        description: 'Notificação de redefinição de senha',
        category: 'security',
        isActive: true
      },
      {
        name: 'email_verification',
        description: 'Notificação de verificação de email',
        category: 'security',
        isActive: true
      },
      {
        name: 'profile_update',
        description: 'Notificação de atualização de perfil',
        category: 'account',
        isActive: true
      },
      {
        name: 'login_alert',
        description: 'Alerta de novo login',
        category: 'security',
        isActive: true
      },
      {
        name: 'system_maintenance',
        description: 'Notificação de manutenção do sistema',
        category: 'system',
        isActive: true
      },
      {
        name: 'newsletter',
        description: 'Newsletter e atualizações',
        category: 'marketing',
        isActive: true
      },
      {
        name: 'security_alert',
        description: 'Alertas de segurança',
        category: 'security',
        isActive: true
      }
    ]

    for (const type of notificationTypes) {
      await prisma.notificationType.upsert({
        where: { name: type.name },
        update: type,
        create: type
      })
      console.log(`✅ Tipo de notificação '${type.name}' criado/atualizado`)
    }

    await logService.info('Tipos de notificação criados com sucesso', {
      count: notificationTypes.length,
      types: notificationTypes.map(t => t.name)
    }, {
      action: 'SEED_NOTIFICATION_TYPES',
      resource: 'notification-types',
      method: 'POST',
      path: '/seeds/notification-types',
      ip: 'system'
    })

    console.log(`✅ ${notificationTypes.length} tipos de notificação criados com sucesso!`)
  } catch (error) {
    console.error('❌ Erro ao criar tipos de notificação:', error)
    await logService.error('Erro ao criar tipos de notificação', {
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, {
      action: 'SEED_NOTIFICATION_TYPES_ERROR',
      resource: 'notification-types',
      method: 'POST',
      path: '/seeds/notification-types',
      ip: 'system'
    })
    throw error
  }
}

export async function seedNotificationTemplates() {
  try {
    console.log('🌱 Criando templates de notificação padrão...')

    // Buscar tipos de notificação existentes
    const types = await prisma.notificationType.findMany()
    const typeMap = new Map(types.map(t => [t.name, t.id]))

    // Templates padrão
    const templates = [
      // Welcome - Email
      {
        typeId: typeMap.get('welcome')!,
        channel: 'email' as const,
        subject: 'Bem-vindo(a) ao {{appName}}!',
        title: 'Bem-vindo(a), {{userName}}!',
        body: 'Olá {{userName}}, seja bem-vindo(a) ao {{appName}}! Estamos felizes em tê-lo(a) conosco.',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Bem-vindo(a), {{userName}}!</h2>
            <p>Olá {{userName}},</p>
            <p>Seja bem-vindo(a) ao <strong>{{appName}}</strong>! Estamos felizes em tê-lo(a) conosco.</p>
            <p>Agora você pode aproveitar todos os recursos da nossa plataforma.</p>
            <p>Se tiver alguma dúvida, não hesite em nos contatar.</p>
            <p>Atenciosamente,<br>Equipe {{appName}}</p>
          </div>
        `,
        isActive: true
      },
      // Welcome - Push
      {
        typeId: typeMap.get('welcome')!,
        channel: 'push' as const,
        title: 'Bem-vindo(a)!',
        body: 'Olá {{userName}}, bem-vindo(a) ao {{appName}}!',
        isActive: true
      },
      // Password Reset - Email
      {
        typeId: typeMap.get('password_reset')!,
        channel: 'email' as const,
        subject: 'Redefinição de senha - {{appName}}',
        title: 'Redefinir senha',
        body: 'Você solicitou a redefinição de sua senha. Use o código: {{resetCode}}',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Redefinição de senha</h2>
            <p>Olá {{userName}},</p>
            <p>Você solicitou a redefinição de sua senha no <strong>{{appName}}</strong>.</p>
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; text-align: center;">
              <h3 style="margin: 0; color: #333;">Código de verificação:</h3>
              <p style="font-size: 24px; font-weight: bold; color: #007bff; margin: 10px 0;">{{resetCode}}</p>
            </div>
            <p>Este código expira em 15 minutos.</p>
            <p>Se você não solicitou esta redefinição, ignore este email.</p>
            <p>Atenciosamente,<br>Equipe {{appName}}</p>
          </div>
        `,
        isActive: true
      },
      // Email Verification - Email
      {
        typeId: typeMap.get('email_verification')!,
        channel: 'email' as const,
        subject: 'Verificação de email - {{appName}}',
        title: 'Verificar email',
        body: 'Confirme seu email com o código: {{verificationCode}}',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Verificação de email</h2>
            <p>Olá {{userName}},</p>
            <p>Para completar seu cadastro no <strong>{{appName}}</strong>, confirme seu email.</p>
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; text-align: center;">
              <h3 style="margin: 0; color: #333;">Código de verificação:</h3>
              <p style="font-size: 24px; font-weight: bold; color: #28a745; margin: 10px 0;">{{verificationCode}}</p>
            </div>
            <p>Este código expira em 24 horas.</p>
            <p>Atenciosamente,<br>Equipe {{appName}}</p>
          </div>
        `,
        isActive: true
      },
      // Profile Update - In-App
      {
        typeId: typeMap.get('profile_update')!,
        channel: 'in_app' as const,
        title: 'Perfil atualizado',
        body: 'Seu perfil foi atualizado com sucesso em {{updateDate}}.',
        isActive: true
      },
      // Login Alert - Email
      {
        typeId: typeMap.get('login_alert')!,
        channel: 'email' as const,
        subject: 'Novo login detectado - {{appName}}',
        title: 'Novo login',
        body: 'Um novo login foi detectado em sua conta em {{loginDate}} do IP {{ipAddress}}.',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Novo login detectado</h2>
            <p>Olá {{userName}},</p>
            <p>Detectamos um novo login em sua conta:</p>
            <ul>
              <li><strong>Data:</strong> {{loginDate}}</li>
              <li><strong>IP:</strong> {{ipAddress}}</li>
              <li><strong>Localização:</strong> {{location}}</li>
            </ul>
            <p>Se este login foi feito por você, pode ignorar este email.</p>
            <p>Caso contrário, recomendamos que altere sua senha imediatamente.</p>
            <p>Atenciosamente,<br>Equipe {{appName}}</p>
          </div>
        `,
        isActive: true
      },
      // System Maintenance - Push
      {
        typeId: typeMap.get('system_maintenance')!,
        channel: 'push' as const,
        title: 'Manutenção programada',
        body: 'Manutenção do sistema programada para {{maintenanceDate}}. Duração estimada: {{duration}}.',
        isActive: true
      },
      // Newsletter - Email
      {
        typeId: typeMap.get('newsletter')!,
        channel: 'email' as const,
        subject: '{{newsletterTitle}} - {{appName}}',
        title: '{{newsletterTitle}}',
        body: '{{newsletterContent}}',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">{{newsletterTitle}}</h2>
            <div>{{newsletterContent}}</div>
            <hr style="margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
              Você está recebendo este email porque se inscreveu em nossa newsletter.
              <a href="{{unsubscribeUrl}}">Cancelar inscrição</a>
            </p>
          </div>
        `,
        isActive: true
      },
      // Security Alert - Email
      {
        typeId: typeMap.get('security_alert')!,
        channel: 'email' as const,
        subject: 'Alerta de segurança - {{appName}}',
        title: 'Alerta de segurança',
        body: 'Detectamos atividade suspeita em sua conta: {{alertMessage}}',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc3545; color: white; padding: 15px; margin-bottom: 20px;">
              <h2 style="margin: 0; color: white;">⚠️ Alerta de segurança</h2>
            </div>
            <p>Olá {{userName}},</p>
            <p><strong>Detectamos atividade suspeita em sua conta:</strong></p>
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0;">
              {{alertMessage}}
            </div>
            <p><strong>Recomendações:</strong></p>
            <ul>
              <li>Altere sua senha imediatamente</li>
              <li>Verifique suas configurações de segurança</li>
              <li>Entre em contato conosco se não reconhecer esta atividade</li>
            </ul>
            <p>Atenciosamente,<br>Equipe de Segurança {{appName}}</p>
          </div>
        `,
        isActive: true
      },
      // Security Alert - Push
      {
        typeId: typeMap.get('security_alert')!,
        channel: 'push' as const,
        title: '⚠️ Alerta de segurança',
        body: 'Atividade suspeita detectada. Verifique sua conta.',
        isActive: true
      }
    ]

    for (const template of templates) {
      await prisma.notificationTemplate.upsert({
        where: {
          typeId_channel_language: {
            typeId: template.typeId,
            channel: template.channel,
            language: 'pt-BR'
          }
        },
        update: {
          ...template,
          language: 'pt-BR'
        },
        create: {
          ...template,
          language: 'pt-BR'
        }
      })
      
      const typeName = types.find(t => t.id === template.typeId)?.name
      console.log(`✅ Template '${typeName}' (${template.channel}) criado/atualizado`)
    }

    await logService.info('Templates de notificação criados com sucesso', {
      count: templates.length
    }, {
      action: 'SEED_NOTIFICATION_TEMPLATES',
      resource: 'notification-templates',
      method: 'POST',
      path: '/seeds/notification-templates',
      ip: 'system'
    })

    console.log(`✅ ${templates.length} templates de notificação criados com sucesso!`)
  } catch (error) {
    console.error('❌ Erro ao criar templates de notificação:', error)
    await logService.error('Erro ao criar templates de notificação', {
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, {
      action: 'SEED_NOTIFICATION_TEMPLATES_ERROR',
      resource: 'notification-templates',
      method: 'POST',
      path: '/seeds/notification-templates',
      ip: 'system'
    })
    throw error
  }
}

export async function seedNotificationSystem() {
  try {
    console.log('🌱 Inicializando sistema de notificações...')
    
    await seedNotificationTypes()
    await seedNotificationTemplates()
    
    console.log('✅ Sistema de notificações inicializado com sucesso!')
  } catch (error) {
    console.error('❌ Erro ao inicializar sistema de notificações:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar seeds se chamado diretamente
if (require.main === module) {
  seedNotificationSystem()
    .then(() => {
      console.log('🎉 Seeds executados com sucesso!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Erro ao executar seeds:', error)
      process.exit(1)
    })
}