const axios = require('axios');

const BASE_URL = 'http://localhost:3002';

async function testNotificationSystem() {
  console.log('🧪 Testando Sistema de Notificações por Email\n');

  try {
    // 1. Fazer login para obter token
    console.log('1. Fazendo login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'testvy9qie8xy@example.com',
      password: 'TestPassword123!'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login realizado com sucesso\n');

    // 2. Buscar tipos de notificação disponíveis
    console.log('2. Buscando tipos de notificação...');
    const typesResponse = await axios.get(`${BASE_URL}/api/notifications/types`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const notificationTypes = typesResponse.data.data;
    console.log(`✅ Encontrados ${notificationTypes.length} tipos de notificação`);
    
    // Encontrar tipo 'welcome'
    const welcomeType = notificationTypes.find(type => type.name === 'welcome');
    if (!welcomeType) {
      throw new Error('Tipo de notificação "welcome" não encontrado');
    }
    console.log(`📧 Usando tipo: ${welcomeType.name} (${welcomeType.description})\n`);

    // 3. Buscar informações do usuário
    console.log('3. Buscando informações do usuário...');
    const userResponse = await axios.get(`${BASE_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const user = userResponse.data.data;
    console.log(`✅ Usuário: ${user.name} (${user.email})\n`);

    // 4. Criar e enviar notificação de boas-vindas
    console.log('4. Criando notificação de boas-vindas...');
    const notificationData = {
      userId: user.id,
      typeId: welcomeType.id,
      title: 'Bem-vindo ao Sistema!',
      message: 'Esta é uma notificação de teste do sistema.',
      channel: 'email',
      priority: 'medium',
      data: {
        userName: user.name,
        appName: 'Hono Auth Backend',
        testMode: true
      }
    };

    const createResponse = await axios.post(`${BASE_URL}/api/notifications`, notificationData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const notification = createResponse.data.data;
    console.log(`✅ Notificação criada: ${notification.id}`);
    console.log(`📧 Status: ${notification.status}\n`);

    // 5. Enviar a notificação
    console.log('5. Enviando notificação...');
    const sendResponse = await axios.post(`${BASE_URL}/api/notifications/${notification.id}/send`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ Resultado do envio: ${sendResponse.data.message}`);
    console.log(`📊 Sucesso: ${sendResponse.data.data.success}\n`);

    // 6. Verificar status da notificação
    console.log('6. Verificando status da notificação...');
    const statusResponse = await axios.get(`${BASE_URL}/api/notifications/${notification.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const updatedNotification = statusResponse.data.data;
    console.log(`📧 Status atualizado: ${updatedNotification.status}`);
    if (updatedNotification.sentAt) {
      console.log(`⏰ Enviado em: ${new Date(updatedNotification.sentAt).toLocaleString()}`);
    }
    if (updatedNotification.failureReason) {
      console.log(`❌ Motivo da falha: ${updatedNotification.failureReason}`);
    }

    // 7. Testar notificação de newsletter
    console.log('\n7. Testando notificação de newsletter...');
    const newsletterType = notificationTypes.find(type => type.name === 'newsletter');
    if (newsletterType) {
      const newsletterData = {
        userId: user.id,
        typeId: newsletterType.id,
        title: 'Newsletter Semanal',
        message: 'Confira as novidades desta semana!',
        channel: 'email',
        priority: 'low',
        data: {
          userName: user.name,
          appName: 'Hono Auth Backend',
          newsletterTitle: 'Newsletter Semanal - Edição #1',
          newsletterContent: '<h3>Novidades desta semana:</h3><ul><li>Sistema de notificações implementado</li><li>Envio de emails com Nodemailer</li><li>Templates personalizáveis</li></ul>',
          unsubscribeUrl: `${BASE_URL}/unsubscribe?token=example`
        }
      };

      const newsletterResponse = await axios.post(`${BASE_URL}/api/notifications`, newsletterData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newsletterNotification = newsletterResponse.data.data;
      console.log(`✅ Newsletter criada: ${newsletterNotification.id}`);

      // Enviar newsletter
      await axios.post(`${BASE_URL}/api/notifications/${newsletterNotification.id}/send`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Newsletter enviada!');
    }

    console.log('\n🎉 Teste do sistema de notificações concluído com sucesso!');
    console.log('\n📧 Verifique o console do servidor para ver os emails simulados ou');
    console.log('📬 sua caixa de entrada se o SMTP estiver configurado.');

  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data?.message || error.message);
    if (error.response?.data?.details) {
      console.error('📋 Detalhes:', error.response.data.details);
    }
  }
}

// Executar teste
testNotificationSystem();