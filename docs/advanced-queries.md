# Consultas Avançadas - Paginação, Filtros e Busca

Este documento descreve como usar as funcionalidades avançadas de paginação, filtros e busca implementadas na API.

## Parâmetros de Query Suportados

### Paginação

- `page`: Número da página (padrão: 1)
- `limit`: Número de itens por página (padrão: 10, máximo: 100)

### Ordenação

- `sortBy`: Campo para ordenação
- `sortOrder`: Direção da ordenação (`asc` ou `desc`)

### Filtros de Data

- `dateFrom`: Data inicial (formato ISO 8601)
- `dateTo`: Data final (formato ISO 8601)

### Busca

- `search`: Termo de busca (busca em múltiplos campos)

### Filtros Específicos

#### Filtros Gerais
- `status`: Status do item
- `search`: Busca textual em múltiplos campos

#### Filtros de Usuários
- `role`: Role do usuário
- `roles`: Array de múltiplos roles
- `emailVerified`: Se o email foi verificado (true/false)
- `emailDomain`: Filtrar por domínio de email
- `lastLoginFrom`: Data inicial do último login
- `lastLoginTo`: Data final do último login
- `neverLoggedIn`: Usuários que nunca fizeram login (true/false)
- `inactiveDays`: Usuários inativos por X dias
- `hasProfile`: Se o usuário tem perfil (true/false)

#### Filtros de Notificações
- `channel`: Canal de notificação
- `channels`: Array de múltiplos canais
- `priority`: Prioridade
- `priorities`: Array de múltiplas prioridades
- `statuses`: Array de múltiplos status
- `read`: Se foi lida (true/false)
- `readFrom`: Data inicial de leitura
- `readTo`: Data final de leitura
- `sentFrom`: Data inicial de envio
- `sentTo`: Data final de envio
- `retryCount`: Número de tentativas de reenvio
- `hasFailed`: Notificações com falha (true/false)
- `unreadDays`: Notificações não lidas há X dias

#### Filtros de Logs
- `level`: Nível do log
- `levels`: Array de múltiplos níveis
- `action`: Ação específica
- `actions`: Array de múltiplas ações
- `method`: Método HTTP
- `methods`: Array de múltiplos métodos
- `statusCode`: Código de status específico
- `statusCodeFrom`: Código de status inicial
- `statusCodeTo`: Código de status final
- `durationFrom`: Duração mínima em ms
- `durationTo`: Duração máxima em ms
- `ip`: IP específico
- `ipPattern`: Padrão de IP (prefixo)
- `hasError`: Logs com erro (true/false)
- `slowRequests`: Requisições lentas (threshold em ms)
- `userAgentPattern`: Padrão do user agent
- `errorCodes`: Apenas códigos de erro HTTP (true/false)
- `successCodes`: Apenas códigos de sucesso HTTP (true/false)

#### Filtros de Perfis
- `role`: Role do usuário
- `roles`: Array de múltiplos roles
- `isPublic`: Perfil público (true/false)
- `showEmail`: Mostra email (true/false)
- `showPhone`: Mostra telefone (true/false)
- `location`: Localização específica
- `locations`: Array de múltiplas localizações
- `company`: Empresa específica
- `companies`: Array de múltiplas empresas
- `jobTitle`: Cargo específico
- `ageFrom`: Idade mínima
- `ageTo`: Idade máxima
- `hasAvatar`: Tem avatar (true/false)
- `hasBio`: Tem biografia (true/false)
- `hasPhone`: Tem telefone (true/false)
- `hasWebsite`: Tem website (true/false)
- `isComplete`: Perfil completo (true/false)
- `updatedFrom`: Data inicial de atualização
- `updatedTo`: Data final de atualização

## Exemplos de Uso

### Listar Usuários com Paginação

```http
GET /api/users?page=2&limit=20&sortBy=createdAt&sortOrder=desc
```

### Buscar Usuários por Nome ou Email

```http
GET /api/users/search?search=joão&page=1&limit=10
```

### Filtrar Usuários por Status e Role

```http
GET /api/users?status=active&role=admin&sortBy=name&sortOrder=asc
```

### Filtrar por Período de Data

```http
GET /api/users?dateFrom=2024-01-01T00:00:00Z&dateTo=2024-12-31T23:59:59Z
```

### Listar Notificações com Filtros

```http
GET /api/notifications?userId=123&status=pending&priority=high&page=1&limit=25
```

### Buscar Logs por Ação

```http
GET /api/logs?search=login&level=info&dateFrom=2024-01-01T00:00:00Z
```

### Exemplos de Filtros Avançados

#### Usuários Inativos por Domínio

```http
GET /api/users?emailDomain=empresa.com&inactiveDays=30&sortBy=lastLogin&sortOrder=asc
```

#### Notificações Não Lidas com Falha

```http
GET /api/notifications?read=false&hasFailed=true&unreadDays=7&priority=high
```

#### Logs de Erro com Duração Alta

```http
GET /api/logs?errorCodes=true&durationFrom=1000&slowRequests=2000&sortBy=duration&sortOrder=desc
```

#### Perfis Completos por Localização

```http
GET /api/profiles?isComplete=true&locations=["São Paulo","Rio de Janeiro"]&hasAvatar=true
```

#### Usuários por Múltiplos Roles

```http
GET /api/users?roles=["admin","moderator"]&emailVerified=true&hasProfile=true
```

#### Logs por Faixa de Status Code

```http
GET /api/logs?statusCodeFrom=400&statusCodeTo=499&methods=["POST","PUT"]&dateFrom=2024-01-01
```

#### Notificações por Múltiplos Canais

```http
GET /api/notifications?channels=["email","push"]&statuses=["sent","delivered"]&priorities=["high","urgent"]
```

#### Perfis por Faixa Etária

```http
GET /api/profiles?ageFrom=25&ageTo=35&companies=["Tech Corp","StartupXYZ"]&isPublic=true
```

## Estrutura de Resposta

Todas as consultas paginadas retornam a seguinte estrutura:

```json
{
  "success": true,
  "data": {
    "data": [...], // Array com os itens
    "total": 150,   // Total de itens
    "page": 2,      // Página atual
    "limit": 20,    // Itens por página
    "totalPages": 8, // Total de páginas
    "hasNext": true, // Se há próxima página
    "hasPrev": true  // Se há página anterior
  }
}
```

## Campos de Ordenação Suportados

### Usuários
- `name`, `email`, `role`, `createdAt`, `updatedAt`, `lastLogin`

### Notificações
- `createdAt`, `updatedAt`, `title`, `priority`, `status`, `readAt`

### Logs
- `timestamp`, `action`, `resource`, `level`, `statusCode`, `duration`

## Validação

Todos os parâmetros são validados usando Zod schemas:

- Valores de paginação são limitados (máximo 100 itens por página)
- Campos de ordenação são validados contra listas permitidas
- Datas devem estar em formato ISO 8601
- Termos de busca têm comprimento mínimo e máximo

## Performance

- Índices de banco de dados otimizados para consultas frequentes
- Consultas são limitadas para evitar sobrecarga
- Campos de busca são indexados para melhor performance
- Paginação baseada em offset para consistência

## Exemplos Avançados

### Combinando Múltiplos Filtros

```http
GET /api/users?search=admin&status=active&role=admin&sortBy=lastLogin&sortOrder=desc&page=1&limit=50
```

### Relatório de Notificações por Período

```http
GET /api/notifications?dateFrom=2024-01-01T00:00:00Z&dateTo=2024-01-31T23:59:59Z&status=sent&channel=email&sortBy=createdAt&sortOrder=asc
```

### Auditoria de Logs com Filtros

```http
GET /api/logs?search=error&level=error&dateFrom=2024-01-15T00:00:00Z&sortBy=timestamp&sortOrder=desc&limit=100
```