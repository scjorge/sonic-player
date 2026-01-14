# 🧪 Guia de Teste - Sistema de Autenticação

## Pré-requisitos

1. **Criar usuário administrador**:
   ```bash
   npm run create-admin
   ```

2. **Iniciar o backend** (em um terminal):
   ```bash
   npm run dev:backend
   ```

3. **Iniciar o frontend** (em outro terminal):
   ```bash
   npm run dev:frontend
   ```

4. **Acessar**: http://localhost:5173

---

## ✅ Checklist de Testes

### 1. Tela de Login/Registro

#### Login com Admin
- [ ] Abrir a aplicação
- [ ] Inserir username: `admin`
- [ ] Inserir password: `admin123`
- [ ] Clicar em "Entrar"
- [ ] ✅ Deve entrar na aplicação

#### Registro de Novo Usuário
- [ ] Na tela de login, clicar em "Não tem uma conta? Registre-se"
- [ ] Preencher:
  - Username: `testuser`
  - Email: `test@example.com`
  - Password: `senha123`
  - Confirmar Password: `senha123`
- [ ] Clicar em "Registrar"
- [ ] ✅ Deve criar a conta e fazer login automaticamente

#### Validações de Registro
- [ ] Tentar registrar com senha < 6 caracteres
- [ ] ✅ Deve mostrar erro: "A senha deve ter no mínimo 6 caracteres"
- [ ] Tentar registrar com senhas diferentes
- [ ] ✅ Deve mostrar erro: "As senhas não coincidem"
- [ ] Tentar registrar com username já existente
- [ ] ✅ Deve mostrar erro: "Nome de usuário já está em uso"

### 2. Interface do Usuário Logado

#### Sidebar - Informações do Usuário
- [ ] Verificar que no rodapé da sidebar aparece:
  - Nome do usuário
  - Role (Admin ou Usuário)
  - Ícone de usuário
  - Botão de logout (ícone de sair)
- [ ] Se admin, verificar botão "Gerenciar Usuários"

#### Logout
- [ ] Clicar no botão de logout (ícone vermelho)
- [ ] ✅ Deve fazer logout e voltar para tela de login
- [ ] ✅ Token deve ser removido do localStorage

### 3. Gerenciamento de Usuários (Admin)

#### Acessar Gerenciamento
- [ ] Fazer login como admin
- [ ] Clicar em "Gerenciar Usuários" na sidebar
- [ ] ✅ Deve abrir modal com lista de usuários

#### Visualizar Usuários
- [ ] Verificar que a lista mostra:
  - Nome de usuário
  - Email
  - Role (Admin/Usuário)
  - Status (Ativo/Inativo)
  - Data de criação
- [ ] Verificar indicador "Você" no próprio usuário
- [ ] Verificar badge "Admin" em administradores

#### Desativar Usuário
- [ ] Criar um usuário de teste (via registro)
- [ ] Como admin, abrir gerenciamento
- [ ] Clicar em "Desativar" no usuário de teste
- [ ] ✅ Status deve mudar para "Inativo"
- [ ] Fazer logout
- [ ] Tentar login com usuário desativado
- [ ] ✅ Deve mostrar erro: "Usuário desativado"

#### Reativar Usuário
- [ ] Como admin, abrir gerenciamento
- [ ] Clicar em "Ativar" no usuário desativado
- [ ] ✅ Status deve mudar para "Ativo"
- [ ] Fazer logout
- [ ] Tentar login com usuário reativado
- [ ] ✅ Deve permitir login normalmente

### 4. Alteração de Senha

#### Acessar via Sidebar
- [ ] Fazer login
- [ ] Clicar no nome do usuário ou ícone na sidebar
- [ ] ✅ Modal de alterar senha deve abrir

#### Acessar via Configurações
- [ ] Fazer login
- [ ] Clicar em "Configurações" na sidebar
- [ ] Clicar na aba "Geral"
- [ ] Clicar na sub-aba "Conta"
- [ ] Clicar em "Alterar Senha"
- [ ] ✅ Modal de alterar senha deve abrir

#### Alterar Senha com Sucesso
- [ ] Clicar em "Alterar Senha"
- [ ] Preencher:
  - Senha Atual: `admin123` (ou sua senha)
  - Nova Senha: `novasenha123`
  - Confirmar Nova Senha: `novasenha123`
- [ ] Clicar em "Alterar Senha"
- [ ] ✅ Deve mostrar toast de sucesso
- [ ] ✅ Modal deve fechar
- [ ] Fazer logout
- [ ] Tentar login com senha antiga
- [ ] ✅ Deve falhar
- [ ] Fazer login com nova senha
- [ ] ✅ Deve funcionar

#### Validações de Alteração de Senha
- [ ] Tentar alterar com senha atual incorreta
- [ ] ✅ Deve mostrar erro: "Senha atual incorreta"
- [ ] Tentar alterar com senhas diferentes
- [ ] ✅ Deve mostrar erro: "As senhas não coincidem"
- [ ] Tentar alterar com senha < 6 caracteres
- [ ] ✅ Deve mostrar erro: "A nova senha deve ter no mínimo 6 caracteres"

### 5. Persistência de Sessão

#### Token JWT
- [ ] Fazer login
- [ ] Abrir DevTools > Application > Local Storage
- [ ] Verificar que existe chave `authToken`
- [ ] ✅ Deve ter um valor JWT (eyJhbGc...)

#### Reload da Página
- [ ] Fazer login
- [ ] Recarregar a página (F5)
- [ ] ✅ Deve continuar logado
- [ ] ✅ Não deve pedir login novamente

#### Nova Aba
- [ ] Fazer login
- [ ] Abrir nova aba do navegador
- [ ] Acessar http://localhost:5173
- [ ] ✅ Deve estar logado automaticamente

#### Limpar Storage
- [ ] Fazer login
- [ ] Abrir DevTools > Console
- [ ] Executar: `localStorage.clear()`
- [ ] Recarregar página
- [ ] ✅ Deve pedir login novamente

### 6. Permissões

#### Usuário Comum
- [ ] Criar e fazer login com usuário comum (não admin)
- [ ] Verificar que:
  - [ ] ✅ NÃO aparece botão "Gerenciar Usuários"
  - [ ] ✅ Pode alterar própria senha
  - [ ] ✅ Pode usar todas as funcionalidades normais do app

#### Administrador
- [ ] Fazer login como admin
- [ ] Verificar que:
  - [ ] ✅ Aparece botão "Gerenciar Usuários"
  - [ ] ✅ Pode ver todos os usuários
  - [ ] ✅ Pode ativar/desativar usuários
  - [ ] ✅ NÃO pode desativar a si mesmo

### 7. API Endpoints

#### Testar com Curl/Postman

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Deve retornar: {"token":"...", "user":{...}}

# Usar o token retornado:
TOKEN="seu_token_aqui"

# Buscar usuário atual
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Listar usuários (admin)
curl http://localhost:3001/api/auth/users \
  -H "Authorization: Bearer $TOKEN"
```

### 8. Sidebar Colapsada

#### Testar Sidebar Compacta
- [ ] Fazer login
- [ ] Clicar no botão de colapsar sidebar
- [ ] Verificar seção de usuário:
  - [ ] ✅ Deve mostrar apenas ícone de logout
  - [ ] ✅ Hover deve mostrar tooltip "Sair"
  - [ ] ✅ Botão de gerenciar usuários some (se admin)

### 9. Múltiplos Usuários

#### Criar Vários Usuários
- [ ] Registrar 3-5 usuários diferentes
- [ ] Como admin, visualizar lista completa
- [ ] ✅ Todos devem aparecer na lista
- [ ] Fazer login com cada um
- [ ] ✅ Cada um deve ter sua própria sessão

---

## 🐛 Problemas Comuns

### "Token inválido ou expirado"
**Solução**: Fazer logout e login novamente

### Não consigo criar admin
**Solução**: 
```bash
rm database.sqlite
npm run create-admin
```

### Backend não inicia
**Solução**: Verificar se a porta 3001 está livre
```bash
lsof -i :3001
# Se estiver ocupada, matar o processo ou mudar a porta
```

### Erros de compilação TypeScript
**Solução**:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## ✅ Resultado Esperado

Todos os testes devem passar! ✅

Se algum teste falhar, verifique:
1. Backend está rodando
2. Frontend está rodando  
3. Banco de dados foi inicializado corretamente
4. Token está sendo armazenado no localStorage
5. Não há erros no console do navegador

---

## 📊 Métricas de Sucesso

- ✅ Login funcional: **OBRIGATÓRIO**
- ✅ Registro funcional: **OBRIGATÓRIO**
- ✅ Logout funcional: **OBRIGATÓRIO**
- ✅ Gerenciamento de usuários (admin): **OBRIGATÓRIO**
- ✅ Alteração de senha: **OBRIGATÓRIO**
- ✅ Persistência de sessão: **OBRIGATÓRIO**
- ✅ Controle de permissões: **OBRIGATÓRIO**
- ✅ Validações de segurança: **OBRIGATÓRIO**

**Sistema 100% funcional quando todos os itens estiverem ✅**
