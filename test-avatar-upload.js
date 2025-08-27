/**
 * Script para testar o upload de avatar
 * 
 * Este script testa:
 * 1. Login de usuário
 * 2. Upload de avatar
 * 3. Verificação do perfil atualizado
 */

const fs = require('fs')
const path = require('path')

const BASE_URL = 'http://localhost:3002'

// Função para fazer login e obter token
async function login() {
  console.log('🔐 Fazendo login...')
  
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'Admin123!'
    })
  })
  
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`Erro no login: ${data.message}`)
  }
  
  console.log('✅ Login realizado com sucesso')
  return data.data.token
}

// Função para criar um arquivo de teste (imagem fake)
function createTestImage() {
  const testImagePath = path.join(__dirname, 'test-avatar.png')
  
  // Criar um arquivo PNG simples (1x1 pixel transparente)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
    0x1F, 0x15, 0xC4, 0x89, // CRC
    0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // compressed data
    0x0D, 0x0A, 0x2D, 0xB4, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ])
  
  fs.writeFileSync(testImagePath, pngData)
  console.log('📷 Arquivo de teste criado:', testImagePath)
  
  return testImagePath
}

// Função para fazer upload do avatar
async function uploadAvatar(token, imagePath) {
  console.log('📤 Fazendo upload do avatar...')
  
  const formData = new FormData()
  const imageBuffer = fs.readFileSync(imagePath)
  const blob = new Blob([imageBuffer], { type: 'image/png' })
  formData.append('avatar', blob, 'test-avatar.png')
  
  const response = await fetch(`${BASE_URL}/api/profiles/me/avatar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  })
  
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`Erro no upload: ${data.message}`)
  }
  
  console.log('✅ Avatar enviado com sucesso!')
  console.log('📄 Resposta:', JSON.stringify(data, null, 2))
  
  return data
}

// Função para verificar o perfil
async function checkProfile(token) {
  console.log('👤 Verificando perfil...')
  
  const response = await fetch(`${BASE_URL}/api/profiles/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`Erro ao buscar perfil: ${data.message}`)
  }
  
  console.log('✅ Perfil obtido com sucesso!')
  console.log('📄 Avatar URL:', data.data.avatar)
  
  return data
}

// Função principal
async function testAvatarUpload() {
  try {
    console.log('🧪 Iniciando teste de upload de avatar...\n')
    
    // 1. Fazer login
    const token = await login()
    console.log('')
    
    // 2. Criar arquivo de teste
    const imagePath = createTestImage()
    console.log('')
    
    // 3. Fazer upload
    const uploadResult = await uploadAvatar(token, imagePath)
    console.log('')
    
    // 4. Verificar perfil
    const profileResult = await checkProfile(token)
    console.log('')
    
    // 5. Limpar arquivo de teste
    fs.unlinkSync(imagePath)
    console.log('🧹 Arquivo de teste removido')
    
    console.log('\n🎉 Teste de upload de avatar concluído com sucesso!')
    console.log('📊 Resumo:')
    console.log(`   - Avatar URL: ${profileResult.data.avatar}`)
    console.log(`   - Arquivo: ${uploadResult.data.avatar.filename}`)
    console.log(`   - Tamanho: ${uploadResult.data.avatar.size} bytes`)
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
    process.exit(1)
  }
}

// Executar teste
testAvatarUpload()