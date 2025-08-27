import { createMiddleware } from 'hono/factory'
import type { Context } from 'hono'
import { PermissionService } from '@/services/permissionService'
import { errorResponse } from '@/utils/helpers'
import type { JWTPayload } from '@/types'

/**
 * Middleware para verificar permissões específicas
 */
export const requirePermission = (resource: string, action: string) => {
  return createMiddleware(async (c: Context, next) => {
    const user = c.get('user') as JWTPayload
    
    if (!user) {
      return c.json(errorResponse('Usuário não autenticado'), 401)
    }

    const hasPermission = await PermissionService.hasPermission(
      user.userId,
      resource,
      action
    )

    if (!hasPermission) {
      return c.json(
        errorResponse(`Acesso negado: permissão '${resource}:${action}' requerida`),
        403
      )
    }

    await next()
  })
}

/**
 * Middleware para verificar se o usuário tem qualquer uma das permissões especificadas
 */
export const requireAnyPermission = (
  permissions: Array<{ resource: string; action: string }>
) => {
  return createMiddleware(async (c: Context, next) => {
    const user = c.get('user') as JWTPayload
    
    if (!user) {
      return c.json(errorResponse('Usuário não autenticado'), 401)
    }

    const hasAnyPermission = await PermissionService.hasAnyPermission(
      user.userId,
      permissions
    )

    if (!hasAnyPermission) {
      const permissionNames = permissions
        .map(p => `${p.resource}:${p.action}`)
        .join(', ')
      
      return c.json(
        errorResponse(`Acesso negado: uma das seguintes permissões é requerida: ${permissionNames}`),
        403
      )
    }

    await next()
  })
}

/**
 * Middleware para verificar se o usuário tem todas as permissões especificadas
 */
export const requireAllPermissions = (
  permissions: Array<{ resource: string; action: string }>
) => {
  return createMiddleware(async (c: Context, next) => {
    const user = c.get('user') as JWTPayload
    
    if (!user) {
      return c.json(errorResponse('Usuário não autenticado'), 401)
    }

    const hasAllPermissions = await PermissionService.hasAllPermissions(
      user.userId,
      permissions
    )

    if (!hasAllPermissions) {
      const permissionNames = permissions
        .map(p => `${p.resource}:${p.action}`)
        .join(', ')
      
      return c.json(
        errorResponse(`Acesso negado: todas as seguintes permissões são requeridas: ${permissionNames}`),
        403
      )
    }

    await next()
  })
}

/**
 * Middleware para verificar acesso a recurso com ownership
 */
export const requireResourceAccess = (
  resource: string,
  action: string,
  getResourceOwnerId?: (c: Context) => string | Promise<string>
) => {
  return createMiddleware(async (c: Context, next) => {
    const user = c.get('user') as JWTPayload
    
    if (!user) {
      return c.json(errorResponse('Usuário não autenticado'), 401)
    }

    let resourceOwnerId: string | undefined
    
    if (getResourceOwnerId) {
      try {
        resourceOwnerId = await getResourceOwnerId(c)
      } catch (error) {
        console.error('Erro ao obter owner do recurso:', error)
        return c.json(errorResponse('Erro interno do servidor'), 500)
      }
    }

    const canAccess = await PermissionService.canAccessResource(
      user.userId,
      resource,
      action,
      resourceOwnerId
    )

    if (!canAccess) {
      return c.json(
        errorResponse(`Acesso negado: você não pode ${action} este ${resource}`),
        403
      )
    }

    await next()
  })
}

/**
 * Middleware para verificar se o usuário é admin
 */
export const requireAdmin = createMiddleware(async (c: Context, next) => {
  const user = c.get('user') as JWTPayload
  
  if (!user) {
    return c.json(errorResponse('Usuário não autenticado'), 401)
  }

  const isAdmin = await PermissionService.isAdmin(user.userId)

  if (!isAdmin) {
    return c.json(
      errorResponse('Acesso negado: permissões de administrador requeridas'),
      403
    )
  }

  await next()
})

/**
 * Middleware para verificar se o usuário é moderador ou admin
 */
export const requireModerator = createMiddleware(async (c: Context, next) => {
  const user = c.get('user') as JWTPayload
  
  if (!user) {
    return c.json(errorResponse('Usuário não autenticado'), 401)
  }

  const isModerator = await PermissionService.isModerator(user.userId)

  if (!isModerator) {
    return c.json(
      errorResponse('Acesso negado: permissões de moderador ou administrador requeridas'),
      403
    )
  }

  await next()
})

/**
 * Middleware para verificar ownership ou permissões admin
 */
export const requireOwnershipOrPermission = (
  resource: string,
  action: string,
  getResourceOwnerId: (c: Context) => string | Promise<string>
) => {
  return createMiddleware(async (c: Context, next) => {
    const user = c.get('user') as JWTPayload
    
    if (!user) {
      return c.json(errorResponse('Usuário não autenticado'), 401)
    }

    try {
      const resourceOwnerId = await getResourceOwnerId(c)
      
      // Se é o próprio recurso, permite
      if (user.userId === resourceOwnerId) {
        await next()
        return
      }

      // Caso contrário, verifica permissões
      const hasPermission = await PermissionService.hasPermission(
        user.userId,
        resource,
        action
      )

      if (!hasPermission) {
        return c.json(
          errorResponse('Acesso negado: você só pode acessar seus próprios recursos ou precisa de permissões específicas'),
          403
        )
      }

      await next()
    } catch (error) {
      console.error('Erro ao verificar ownership:', error)
      return c.json(errorResponse('Erro interno do servidor'), 500)
    }
  })
}

/**
 * Middleware para adicionar informações de permissões ao contexto
 */
export const attachPermissions = createMiddleware(async (c: Context, next) => {
  const user = c.get('user') as JWTPayload
  
  if (user) {
    try {
      const permissions = await PermissionService.getUserPermissions(user.userId)
      const role = await PermissionService.getUserRole(user.userId)
      
      c.set('userPermissions', permissions)
      c.set('userRole', role)
    } catch (error) {
      console.error('Erro ao carregar permissões do usuário:', error)
    }
  }

  await next()
})

// Helpers para permissões comuns
export const canReadUsers = requirePermission('users', 'read')
export const canCreateUsers = requirePermission('users', 'create')
export const canUpdateUsers = requirePermission('users', 'update')
export const canDeleteUsers = requirePermission('users', 'delete')

export const canReadProfile = requirePermission('profile', 'read')
export const canUpdateProfile = requirePermission('profile', 'update')

export const canReadLogs = requirePermission('logs', 'read')

export const canManageRoles = requirePermission('roles', 'manage')
export const canFullAdmin = requirePermission('admin', 'full')

// Combinações comuns
export const canManageUsers = requireAnyPermission([
  { resource: 'users', action: 'create' },
  { resource: 'users', action: 'update' },
  { resource: 'users', action: 'delete' }
])

export const canViewUserData = requireAnyPermission([
  { resource: 'users', action: 'read' },
  { resource: 'admin', action: 'full' }
])