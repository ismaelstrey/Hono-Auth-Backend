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

- `status`: Status do item
- `role`: Role do usuário (para endpoints de usuários)
- `emailVerified`: Se o email foi verificado (true/false)
- `channel`: Canal de notificação (para endpoints de notificações)
- `priority`: Prioridade (para endpoints de notificações)

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