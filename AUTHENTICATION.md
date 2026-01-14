# Sistema de Autenticação Multi-Usuários - Sonic Player

Este documento explica como funciona o sistema de autenticação multi-usuários implementado no Sonic Player.

## 📋 Visão Geral

O sistema de autenticação permite que múltiplos usuários acessem a plataforma com contas individuais, com suporte a diferentes níveis de permissão (usuário comum e administrador).

## 🔑 Funcionalidades

### Para Usuários
- ✅ **Registro de Conta**: Criar nova conta com username, email e senha
- ✅ **Login/Logout**: Sistema seguro de autenticação com JWT
- ✅ **Perfil**: Visualizar informações da conta
- ✅ **Alterar Senha**: Atualizar senha da conta

### Para Administradores
- ✅ **Gerenciar Usuários**: Visualizar lista de todos os usuários
- ✅ **Ativar/Desativar Usuários**: Controlar acesso de usuários específicos
- ✅ **Visualizar Detalhes**: Ver informações completas de cada usuário

## 🚀 Como Usar

### Primeiro Acesso

1. **Criar o usuário administrador inicial:**
   ```bash
   npm run create-admin
   ```

   Isso criará um usuário administrador com as seguintes credenciais:
   - **Username:** `admin`
   - **Password:** `admin123`
   - **Email:** `admin@sonicplayer.com`

   ⚠️ **IMPORTANTE**: Altere a senha após o primeiro login!

2. **Iniciar a aplicação:**
   ```bash
   # Terminal 1 - Backend
   npm run dev:backend

   # Terminal 2 - Frontend
   npm run dev:frontend
   ```

3. **Acessar a aplicação:**
   - Abra o navegador em `http://localhost:5173` (ou porta configurada)
   - Faça login com as credenciais do admin
   - Altere a senha nas configurações

### Registro de Novos Usuários

Existem duas formas de criar novos usuários:

1. **Auto-registro (Tela de Login)**:
   - Na tela de login, clique em "Não tem uma conta? Registre-se"
   - Preencha username, email e senha
   - Clique em "Registrar"
   - Novos usuários têm permissão de "usuário" por padrão

2. **Criação pelo Administrador**:
   - Os novos usuários podem se registrar diretamente
   - Administradores podem ativar/desativar usuários após o registro

### Gerenciamento de Usuários (Admin)

1. Na sidebar, clique no botão **"Gerenciar Usuários"** (ícone de pessoas)
2. Visualize a lista completa de usuários com:
   - Nome de usuário
   - Email
   - Role (Admin/Usuário)
   - Status (Ativo/Inativo)
   - Data de criação
3. Ative ou desative usuários conforme necessário

### Alterando Senha

1. Faça login na sua conta
2. Acesse as configurações
3. Use a opção de alterar senha (em desenvolvimento)
4. Forneça a senha atual e a nova senha

## 🔒 Segurança

- **Senhas**: Todas as senhas são criptografadas com bcrypt (hash de 10 rounds)
- **Tokens JWT**: Expiração de 7 dias por padrão
- **Validações**: 
  - Senha mínima de 6 caracteres
  - Username e email únicos
  - Verificação de senha atual ao alterar

## 📁 Estrutura de Arquivos

```
src/
├── backend/
│   ├── entities/
│   │   └── User.ts                 # Entidade de usuário
│   ├── services/
│   │   └── auth.ts                 # Lógica de negócio de autenticação
│   ├── controllers/
│   │   └── auth.ts                 # Controladores de rotas
│   ├── routes/
│   │   └── auth.ts                 # Definição de rotas
│   ├── middleware/
│   │   └── auth.ts                 # Middleware de autenticação
│   └── scripts/
│       └── createAdmin.ts          # Script de criação de admin
├── frontend/
│   ├── contexts/
│   │   └── AuthContext.tsx         # Context de autenticação
│   ├── services/
│   │   └── authService.ts          # Client HTTP de autenticação
│   ├── components/
│   │   └── auth/
│   │       ├── LoginForm.tsx       # Tela de login/registro
│   │       └── UserManagement.tsx  # Interface de gerenciamento
│   └── types/
│       └── auth.ts                 # Tipos TypeScript
```

## 🌐 API Endpoints

### Públicos (sem autenticação)
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Fazer login

### Protegidos (requer autenticação)
- `GET /api/auth/me` - Obter usuário atual
- `PUT /api/auth/password` - Alterar senha

### Admin (requer autenticação + role admin)
- `GET /api/auth/users` - Listar todos os usuários
- `PATCH /api/auth/users/:userId/status` - Ativar/desativar usuário

## 💡 Exemplos de Uso da API

### Registro
```javascript
POST /api/auth/register
{
  "username": "joao",
  "email": "joao@example.com",
  "password": "senha123"
}
```

### Login
```javascript
POST /api/auth/login
{
  "username": "joao",
  "password": "senha123"
}

// Resposta:
{
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "username": "joao",
    "email": "joao@example.com",
    "role": "user"
  }
}
```

### Usar Token em Requisições
```javascript
// Adicionar header em todas as requisições autenticadas:
Authorization: Bearer eyJhbGc...
```

## 🔧 Configuração Avançada

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Secret para assinatura de JWT (use uma chave forte em produção!)
JWT_SECRET=your-super-secret-key-change-me

# Porta do servidor backend
PORT=3001
```

### Personalizando Tempo de Expiração do Token

Edite o arquivo `src/backend/services/auth.ts`:

```typescript
const JWT_EXPIRES_IN = '7d';  // Pode ser '1h', '30m', '90d', etc.
```

## 🐛 Troubleshooting

### "Token inválido ou expirado"
- Faça logout e login novamente
- Verifique se o JWT_SECRET está configurado corretamente
- Limpe o localStorage do navegador

### "Usuário ou senha inválidos"
- Verifique se digitou corretamente
- Certifique-se de que o usuário existe e está ativo
- Use o script create-admin se for o primeiro acesso

### Não consigo criar usuário admin
- Verifique se o banco de dados está vazio
- Delete o arquivo database.sqlite e rode create-admin novamente
- Verifique os logs do console para erros

## 📝 Próximas Funcionalidades

- [ ] Recuperação de senha por email
- [ ] Two-factor authentication (2FA)
- [ ] Logs de auditoria de ações de usuários
- [ ] Perfis de usuário personalizados
- [ ] Permissões granulares por recurso

## 🤝 Contribuindo

Para adicionar novas funcionalidades ao sistema de autenticação:

1. Adicione rotas em `src/backend/routes/auth.ts`
2. Implemente lógica em `src/backend/services/auth.ts`
3. Crie controladores em `src/backend/controllers/auth.ts`
4. Adicione middleware se necessário em `src/backend/middleware/auth.ts`
5. Atualize o frontend em `src/frontend/components/auth/`

---

**Desenvolvido para o Sonic Player** 🎵
