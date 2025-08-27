import path from 'path'
import fs from 'fs'
import { createMiddleware } from 'hono/factory'
import type { Context } from 'hono'
import { ValidationError, InternalServerError } from '@/utils/errors'
import { logger } from '@/utils/logger'
import { generateId } from '@/utils/helpers'

/**
 * Middleware para upload de avatar usando Hono nativo
 */
export const uploadAvatar = createMiddleware(async (c: Context, next) => {
  try {
    const contentType = c.req.header('content-type')
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      throw new ValidationError('Content-Type deve ser multipart/form-data')
    }
    
    // Parse do form data
    const formData = await c.req.formData()
    const file = formData.get('avatar') as File
    
    if (!file) {
      throw new ValidationError('Nenhum arquivo foi enviado')
    }
    
    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      throw new ValidationError('Tipo de arquivo não permitido. Apenas imagens são aceitas (JPEG, PNG, GIF, WebP).')
    }
    
    // Validar tamanho do arquivo (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      throw new ValidationError('Arquivo muito grande. Tamanho máximo: 5MB')
    }
    
    // Criar diretório se não existir
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + generateId()
    const extension = path.extname(file.name) || '.png'
    const filename = `avatar-${uniqueSuffix}${extension}`
    const filePath = path.join(uploadDir, filename)
    
    // Salvar arquivo
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(filePath, buffer)
    
    // Adicionar informações do arquivo ao contexto
    c.set('uploadedFile', {
      filename,
      originalname: file.name,
      mimetype: file.type,
      size: file.size,
      path: filePath,
      url: `/uploads/avatars/${filename}`
    })
    
    logger.info('Avatar uploaded successfully', {
      filename,
      size: file.size,
      mimetype: file.type,
      originalname: file.name
    })
    
    await next()
  } catch (error) {
    logger.error('Erro no upload de avatar', { error: error instanceof Error ? error.message : error })
    
    if (error instanceof ValidationError) {
      throw error
    }
    
    throw new InternalServerError('Erro no upload do arquivo')
  }
})

/**
 * Função para deletar arquivo de avatar antigo
 */
export const deleteOldAvatar = (avatarUrl: string): void => {
  try {
    if (avatarUrl && avatarUrl.startsWith('/uploads/avatars/')) {
      const filename = path.basename(avatarUrl)
      const filePath = path.join(process.cwd(), 'uploads', 'avatars', filename)
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        logger.info('Avatar antigo deletado', { filename })
      }
    }
  } catch (error) {
    logger.error('Erro ao deletar avatar antigo', { error, avatarUrl })
  }
}

/**
 * Função para validar se o arquivo é uma imagem válida
 */
export const validateImageFile = (file: { mimetype: string; size: number }): boolean => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  const maxSize = 5 * 1024 * 1024 // 5MB
  
  return allowedTypes.includes(file.mimetype) && file.size <= maxSize
}

/**
 * Função para obter URL completa do avatar
 */
export const getAvatarUrl = (filename: string, baseUrl?: string): string => {
  const base = baseUrl || process.env.BASE_URL || 'http://localhost:3002'
  return `${base}/uploads/avatars/${filename}`
}

// Exportação removida pois não há definição de upload neste arquivo