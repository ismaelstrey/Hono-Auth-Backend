/**
 * Utilitário de logging simples
 */

export interface Logger {
  info(message: string, meta?: unknown): void
  warn(message: string, meta?: unknown): void
  error(message: string, meta?: unknown): void
  debug(message: string, meta?: unknown): void
}

class SimpleLogger implements Logger {
  private formatMessage(level: string, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString()
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`
  }

  info(message: string, meta?: unknown): void {
    console.log(this.formatMessage('info', message, meta))
  }

  warn(message: string, meta?: unknown): void {
    console.warn(this.formatMessage('warn', message, meta))
  }

  error(message: string, meta?: unknown): void {
    console.error(this.formatMessage('error', message, meta))
  }

  debug(message: string, meta?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, meta))
    }
  }
}

export const logger = new SimpleLogger()