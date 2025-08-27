import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { prisma } from '../config/database';
import { config } from '../config/env';

export interface EmailVerificationResult {
  success: boolean;
  message: string;
}

export interface SendVerificationEmailData {
  email: string;
  name: string;
  token: string;
}

export interface SendPasswordResetEmailData {
  email: string;
  name: string;
  token: string;
}

export interface SendNotificationEmailData {
  email: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Inicializa o transporter do Nodemailer
   */
  private initializeTransporter(): void {
    // Só configura o transporter se as variáveis de SMTP estiverem definidas
    if (config.SMTP_HOST && config.SMTP_PORT && config.SMTP_USER && config.SMTP_PASS) {
      this.transporter = nodemailer.createTransporter({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465, // true para 465, false para outras portas
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        },
      });

      // Verifica a conexão SMTP
      this.transporter.verify((error, success) => {
        if (error) {
          console.warn('⚠️ Erro na configuração SMTP:', error.message);
          console.warn('📧 Emails serão simulados no console');
          this.transporter = null;
        } else {
          console.log('✅ Servidor SMTP configurado com sucesso');
        }
      });
    } else {
      console.log('📧 Configurações SMTP não encontradas. Emails serão simulados no console.');
    }
  }
  /**
   * Gera um token de verificação de email seguro
   */
  generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Gera a data de expiração do token (24 horas a partir de agora)
   */
  generateTokenExpiration(): Date {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 24);
    return expiration;
  }

  /**
   * Salva o token de verificação no banco de dados
   */
  async saveVerificationToken(userId: string, token: string): Promise<void> {
    const expires = this.generateTokenExpiration();
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: token,
        emailVerificationExpires: expires
      }
    });
  }

  /**
   * Valida se o token de verificação é válido
   */
  async validateVerificationToken(token: string): Promise<{ valid: boolean; userId?: string }> {
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date()
        },
        emailVerified: false
      }
    });

    if (!user) {
      return { valid: false };
    }

    return { valid: true, userId: user.id };
  }

  /**
   * Marca o email como verificado e remove o token
   */
  async markEmailAsVerified(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    });
  }

  /**
   * Gera um token de reset de senha seguro
   */
  generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Gera a data de expiração do token de reset (1 hora a partir de agora)
   */
  generatePasswordResetExpiration(): Date {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1);
    return expiration;
  }

  /**
   * Salva o token de reset de senha no banco de dados
   */
  async savePasswordResetToken(userId: string, token: string): Promise<void> {
    const expires = this.generatePasswordResetExpiration();
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expires
      }
    });
  }

  /**
   * Valida se o token de reset de senha é válido
   */
  async validatePasswordResetToken(token: string): Promise<{ valid: boolean; userId?: string }> {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return { valid: false };
    }

    return { valid: true, userId: user.id };
  }

  /**
   * Remove o token de reset de senha após uso
   */
  async clearPasswordResetToken(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });
  }

  /**
   * Gera o link de verificação completo
   */
  generateVerificationLink(token: string): string {
    const baseUrl = config.server.url || 'http://localhost:3002';
    return `${baseUrl}/api/auth/verify-email?token=${token}`;
  }

  /**
   * Gera o link de reset de senha completo
   */
  generatePasswordResetLink(token: string): string {
    const baseUrl = config.server.url || 'http://localhost:3002';
    return `${baseUrl}/api/auth/reset-password?token=${token}`;
  }

  /**
   * Gera o template HTML do email de verificação
   */
  generateVerificationEmailTemplate(name: string, verificationLink: string): string {
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verificação de Email</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #4f46e5;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f9fafb;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .button {
            display: inline-block;
            background-color: #4f46e5;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Verificação de Email</h1>
        </div>
        <div class="content">
          <h2>Olá, ${name}!</h2>
          <p>Obrigado por se registrar em nossa plataforma. Para completar seu cadastro, precisamos verificar seu endereço de email.</p>
          <p>Clique no botão abaixo para verificar seu email:</p>
          <a href="${verificationLink}" class="button">Verificar Email</a>
          <p>Ou copie e cole este link em seu navegador:</p>
          <p style="word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 4px;">${verificationLink}</p>
          <p><strong>Este link expira em 24 horas.</strong></p>
          <p>Se você não se registrou em nossa plataforma, pode ignorar este email.</p>
        </div>
        <div class="footer">
          <p>Este é um email automático, não responda a esta mensagem.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Gera o template HTML do email de reset de senha
   */
  generatePasswordResetEmailTemplate(name: string, resetLink: string): string {
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset de Senha</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #ffffff;
            padding: 30px;
            border: 1px solid #dee2e6;
          }
          .button {
            display: inline-block;
            background-color: #dc3545;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
            border-radius: 0 0 8px 8px;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Reset de Senha</h1>
        </div>
        <div class="content">
          <p>Olá, <strong>${name}</strong>!</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
          <p>Clique no botão abaixo para criar uma nova senha:</p>
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Redefinir Senha</a>
          </div>
          <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul>
              <li>Este link expira em 1 hora</li>
              <li>Se você não solicitou este reset, ignore este email</li>
              <li>Sua senha atual permanece ativa até que você a altere</li>
            </ul>
          </div>
          <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
          <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px;">
            ${resetLink}
          </p>
          <p>Se você não solicitou este reset de senha, pode ignorar este email com segurança.</p>
        </div>
        <div class="footer">
          <p>Este é um email automático, não responda a esta mensagem.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Envia email de verificação
   */
  async sendVerificationEmail(data: SendVerificationEmailData): Promise<EmailVerificationResult> {
    try {
      const verificationLink = this.generateVerificationLink(data.token);
      const htmlContent = this.generateVerificationEmailTemplate(data.name, verificationLink);
      const subject = 'Verificação de Email - Confirme sua conta';

      // Se o transporter estiver configurado, envia email real
      if (this.transporter) {
        await this.transporter.sendMail({
          from: config.SMTP_FROM || config.SMTP_USER,
          to: data.email,
          subject: subject,
          html: htmlContent,
          text: `Olá ${data.name}, clique no link para verificar seu email: ${verificationLink}`
        });

        console.log(`✅ Email de verificação enviado para: ${data.email}`);
        return {
          success: true,
          message: 'Email de verificação enviado com sucesso'
        };
      }

      // Fallback: simula o envio no console
      console.log('\n📧 EMAIL DE VERIFICAÇÃO SIMULADO:');
      console.log('Para:', data.email);
      console.log('Nome:', data.name);
      console.log('Assunto:', subject);
      console.log('Token:', data.token);
      console.log('Link de verificação:', verificationLink);
      console.log('\n--- CONTEÚDO DO EMAIL ---');
      console.log(htmlContent);
      console.log('--- FIM DO EMAIL ---\n');

      return {
        success: true,
        message: 'Email de verificação enviado com sucesso (simulado)'
      };
    } catch (error) {
      console.error('Erro ao enviar email de verificação:', error);
      return {
        success: false,
        message: 'Erro ao enviar email de verificação'
      };
    }
  }

  /**
   * Envia email de reset de senha
   */
  async sendPasswordResetEmail(data: SendPasswordResetEmailData): Promise<EmailVerificationResult> {
    try {
      const resetLink = this.generatePasswordResetLink(data.token);
      const htmlContent = this.generatePasswordResetEmailTemplate(data.name, resetLink);
      const subject = 'Redefinição de Senha - Recupere sua conta';

      // Se o transporter estiver configurado, envia email real
      if (this.transporter) {
        await this.transporter.sendMail({
          from: config.SMTP_FROM || config.SMTP_USER,
          to: data.email,
          subject: subject,
          html: htmlContent,
          text: `Olá ${data.name}, clique no link para redefinir sua senha: ${resetLink}`
        });

        console.log(`✅ Email de reset de senha enviado para: ${data.email}`);
        return {
          success: true,
          message: 'Email de reset de senha enviado com sucesso'
        };
      }

      // Fallback: simula o envio no console
      console.log('\n🔐 EMAIL DE RESET DE SENHA SIMULADO:');
      console.log('Para:', data.email);
      console.log('Nome:', data.name);
      console.log('Assunto:', subject);
      console.log('Token:', data.token);
      console.log('Link de reset:', resetLink);
      console.log('\n--- CONTEÚDO DO EMAIL ---');
      console.log(htmlContent);
      console.log('--- FIM DO EMAIL ---\n');

      return {
        success: true,
        message: 'Email de reset de senha enviado com sucesso (simulado)'
      };
    } catch (error) {
      console.error('Erro ao enviar email de reset de senha:', error);
      return {
        success: false,
        message: 'Erro ao enviar email de reset de senha'
      };
    }
  }

  /**
   * Envia email de notificação genérico
   */
  async sendNotificationEmail(data: SendNotificationEmailData): Promise<EmailVerificationResult> {
    try {
      // Se o transporter estiver configurado, envia email real
      if (this.transporter) {
        await this.transporter.sendMail({
          from: config.SMTP_FROM || config.SMTP_USER,
          to: data.email,
          subject: data.subject,
          html: data.htmlContent,
          text: data.textContent || data.subject
        });

        console.log(`✅ Email de notificação enviado para: ${data.email}`);
        return {
          success: true,
          message: 'Email de notificação enviado com sucesso'
        };
      }

      // Fallback: simula o envio no console
      console.log('\n📧 EMAIL DE NOTIFICAÇÃO SIMULADO:');
      console.log('Para:', data.email);
      console.log('Nome:', data.name);
      console.log('Assunto:', data.subject);
      console.log('\n--- CONTEÚDO DO EMAIL ---');
      console.log(data.htmlContent);
      console.log('--- FIM DO EMAIL ---\n');

      return {
        success: true,
        message: 'Email de notificação enviado com sucesso (simulado)'
      };
    } catch (error) {
      console.error('Erro ao enviar email de notificação:', error);
      return {
        success: false,
        message: 'Erro ao enviar email de notificação'
      };
    }
  }

  /**
   * Verifica se um usuário já tem email verificado
   */
  async isEmailVerified(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true }
    });

    return user?.emailVerified || false;
  }

  /**
   * Remove tokens expirados (verificação e reset de senha)
   */
  async cleanupExpiredTokens(): Promise<{ emailVerification: number; passwordReset: number }> {
    const now = new Date();

    // Limpar tokens de verificação de email expirados
    const emailVerificationResult = await prisma.user.updateMany({
      where: {
        emailVerificationExpires: {
          lt: now
        }
      },
      data: {
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    });

    // Limpar tokens de reset de senha expirados
    const passwordResetResult = await prisma.user.updateMany({
      where: {
        passwordResetExpires: {
          lt: now
        }
      },
      data: {
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });

    return {
      emailVerification: emailVerificationResult.count,
      passwordReset: passwordResetResult.count
    };
  }
}

export const emailService = new EmailService();
export default emailService;