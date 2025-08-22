# Backend Hono - Sistema de Autenticação e Gerenciamento de Usuários

Um backend robusto e reutilizável construído com **Bun** e **Hono** para autenticação de usuários, proteção de rotas e gerenciamento de níveis de acesso.

## 🚀 Características

- ✅ **Autenticação JWT** completa (login, registro, refresh token)
- ✅ **Proteção de rotas** baseada em roles (admin, moderator, user)
- ✅ **Gerenciamento de usuários** com diferentes níveis de acesso
- ✅ **Validação de dados** com Zod
- ✅ **Rate limiting** configurável
- ✅ **Logging** de ações e erros
- ✅ **Middleware de segurança** (CORS, headers seguros)
- ✅ **Recuperação de senha** com tokens seguros
- ✅ **Verificação de email** (estrutura preparada)
- ✅ **Arquitetura em camadas** (controllers, services, repositories)
- ✅ **TypeScript** com tipagem completa
- ✅ **Configuração de ambiente** validada

## 📋 Pré-requisitos

- [Bun](https://bun.sh/) v1.0+
- Node.js v18+ (para compatibilidade)

## 🛠️ Instalação

1. **Clone o repositório:**
```bash
git clone <url-do-repositorio>
cd backend_hono
```

2. **Instale as dependências:**
```bash
bun install
```

3. **Configure as variáveis de ambiente:**
```bash
cp .env.example .env
```

4. **Edite o arquivo `.env`** com suas configurações:
```env
# IMPORTANTE: Altere estas chaves em produção!
JWT_SECRET=sua_chave_jwt_super_secreta_com_pelo_menos_32_caracteres_aqui
JWT_REFRESH_SECRET=sua_chave_refresh_jwt_super_secreta_com_pelo_menos_32_caracteres_aqui

# Outras configurações...
PORT=3000
NODE_ENV=development
```

5. **Execute o servidor:**
```bash
# Desenvolvimento
bun run dev

# Produção
bun run start
```

## 📁 Estrutura do Projeto

```
src/
├── config/           # Configurações de ambiente
│   └── env.ts
├── controllers/      # Controladores HTTP
│   ├── authController.ts
│   └── userController.ts
├── middlewares/      # Middlewares personalizados
│   ├── auth.ts
│   ├── errorHandler.ts
│   ├── logging.ts
│   └── rateLimiter.ts
├── repositories/     # Camada de dados
│   └── userRepository.ts
├── routes/          # Definição de rotas
│   ├── authRoutes.ts
│   └── userRoutes.ts
├── services/        # Lógica de negócio
│   ├── authService.ts
│   └── userService.ts
├── types/           # Tipos TypeScript
│   └── index.ts
├── utils/           # Utilitários
│   ├── helpers.ts
│   ├── jwt.ts
│   └── password.ts
├── validators/      # Schemas de validação
│   ├── authValidators.ts
│   └── userValidators.ts
└── server.ts        # Arquivo principal
```

## 🔐 Autenticação

### Endpoints de Autenticação

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|-------------|
| POST | `/auth/register` | Registrar usuário | ❌ |
| POST | `/auth/login` | Fazer login | ❌ |
| POST | `/auth/logout` | Fazer logout | ✅ |
| POST | `/auth/refresh-token` | Renovar token | ❌ |
| POST | `/auth/forgot-password` | Esqueci senha | ❌ |
| POST | `/auth/reset-password` | Resetar senha | ❌ |
| POST | `/auth/change-password` | Alterar senha | ✅ |
| POST | `/auth/verify-email` | Verificar email | ❌ |
| GET | `/auth/profile` | Obter perfil | ✅ |
| POST | `/auth/validate-token` | Validar token | ❌ |

### Exemplo de Uso

**Registro:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "password": "MinhaSenh@123",
    "confirmPassword": "MinhaSenh@123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@exemplo.com",
    "password": "MinhaSenh@123"
  }'
```

## 👥 Gerenciamento de Usuários

### Níveis de Acesso

- **admin**: Acesso total ao sistema
- **moderator**: Pode gerenciar usuários (exceto outros admins)
- **user**: Acesso básico, pode gerenciar apenas próprio perfil

### Endpoints de Usuários

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|----------|
| GET | `/users` | Listar usuários | Admin/Moderator |
| GET | `/users/:id` | Obter usuário | Owner/Admin |
| POST | `/users/create` | Criar usuário | Admin |
| PUT | `/users/:id` | Atualizar usuário | Owner/Admin |
| DELETE | `/users/:id/delete` | Deletar usuário | Admin |
| PATCH | `/users/:id/toggle-status` | Ativar/desativar | Admin |
| PATCH | `/users/:id/change-role` | Alterar role | Admin |
| GET | `/users/search` | Buscar usuários | Authenticated |
| GET | `/users/stats` | Estatísticas | Admin/Moderator |

## 🛡️ Segurança

### Rate Limiting
- **Autenticação**: 5 tentativas por 15 minutos
- **Registro**: 3 tentativas por 15 minutos
- **Reset de senha**: 3 tentativas por 15 minutos
- **APIs públicas**: 100 requests por 15 minutos

### Validação de Senhas
- Mínimo 8 caracteres
- Pelo menos 1 letra minúscula
- Pelo menos 1 letra maiúscula
- Pelo menos 1 número
- Pelo menos 1 caractere especial

### Headers de Segurança
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

## 📊 Logging

O sistema registra automaticamente:
- Tentativas de login (sucesso/falha)
- Criação/atualização de usuários
- Alterações de roles
- Erros de autenticação
- Requests com rate limit excedido

## 🔧 Configuração

### Variáveis de Ambiente Principais

```env
# Servidor
PORT=3000
NODE_ENV=development

# JWT (OBRIGATÓRIO)
JWT_SECRET=sua_chave_secreta_aqui
JWT_REFRESH_SECRET=sua_chave_refresh_aqui

# Rate Limiting
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_REGISTRATION_MAX=3

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

## 🚀 Deploy

### Produção

1. **Configure as variáveis de ambiente de produção**
2. **Gere chaves JWT seguras:**
```bash
# Gerar chave de 64 caracteres
openssl rand -hex 32
```

3. **Execute em produção:**
```bash
NODE_ENV=production bun run start
```

### Docker (Opcional)

```dockerfile
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# Instalar dependências
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copiar código
COPY . .

# Expor porta
EXPOSE 3000

# Executar
CMD ["bun", "run", "start"]
```

## 🧪 Testes

```bash
# Executar testes
bun test

# Testes com coverage
bun test --coverage
```

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento com hot reload
bun run dev

# Produção
bun run start

# Linting
bun run lint

# Formatação
bun run format

# Build (se necessário)
bun run build
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

Se você encontrar algum problema ou tiver dúvidas:

1. Verifique se todas as variáveis de ambiente estão configuradas
2. Confirme que as chaves JWT têm pelo menos 32 caracteres
3. Verifique os logs do servidor para erros específicos
4. Abra uma issue no repositório

## 🔄 Reutilização

Este projeto foi desenvolvido para ser **reutilizável**. Para usar em um novo projeto:

1. Clone o repositório
2. Atualize as configurações no `.env`
3. Modifique os tipos e validadores conforme necessário
4. Adicione suas regras de negócio específicas
5. Customize os middlewares se necessário

---

**Desenvolvido com ❤️ usando Bun + Hono**