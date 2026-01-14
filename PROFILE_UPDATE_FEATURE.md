# Funcionalidade de Atualização de Perfil

## Resumo
Implementada funcionalidade completa para permitir que usuários alterem seu **nome de usuário** e **email** através da página de Configurações > Geral > Conta.

## Mudanças Implementadas

### Backend

#### 1. Service (`/app/src/backend/services/auth.ts`)
- Adicionado método `updateProfile(userId, username?, email?)`:
  - Verifica se o nome de usuário já está em uso por outro usuário
  - Verifica se o email já está em uso por outro usuário
  - Atualiza os campos fornecidos
  - Gera um novo token JWT com as informações atualizadas
  - Retorna o novo token e os dados atualizados do usuário

#### 2. Controller (`/app/src/backend/controllers/auth.ts`)
- Adicionado controller `updateProfile`:
  - Valida autenticação
  - Valida que pelo menos um campo foi fornecido
  - Chama o serviço e retorna a resposta

#### 3. Route (`/app/src/backend/routes/auth.ts`)
- Adicionada rota `PUT /api/auth/profile`:
  - Protegida com `authMiddleware`
  - Chama o controller `updateProfile`

### Frontend

#### 1. Service (`/app/src/frontend/services/authService.ts`)
- Adicionado método `updateProfile(username?, email?)`:
  - Envia requisição PUT para `/api/auth/profile`
  - Atualiza o token localStorage com o novo token recebido
  - Retorna o novo token e dados do usuário

#### 2. Component (`/app/src/frontend/components/settings/GeneralSettings.tsx`)
- **Campos de Nome e Email**:
  - Removido atributo `disabled`
  - Removida mensagem "em desenvolvimento"
  - Campos agora são editáveis

- **Nova Função `handleSaveProfile`**:
  - Valida que os campos não estão vazios
  - Verifica se houve alteração antes de enviar
  - Chama `authService.updateProfile()`
  - Atualiza o contexto com `refreshUser()`
  - Exibe toast de sucesso ou erro
  - Reverte alterações em caso de erro

- **Botão "Salvar Alterações"**:
  - Cor verde para diferenciar de alteração de senha
  - Desabilitado quando não há mudanças ou durante salvamento
  - Mostra "Salvando..." durante a requisição

## Validações Implementadas

### Backend
- ✅ Verifica se o nome de usuário já existe (por outro usuário)
- ✅ Verifica se o email já existe (por outro usuário)
- ✅ Permite que o usuário mantenha seu próprio nome/email
- ✅ Permite atualizar apenas um campo ou ambos
- ✅ Gera novo token JWT após atualização

### Frontend
- ✅ Valida que campos não estão vazios
- ✅ Verifica se houve mudança antes de enviar
- ✅ Exibe feedback visual durante salvamento
- ✅ Reverte mudanças em caso de erro
- ✅ Atualiza contexto de autenticação após sucesso
- ✅ Botão desabilitado quando não há mudanças

## Fluxo de Atualização

1. Usuário navega para **Configurações > Geral > Conta**
2. Edita nome de usuário e/ou email
3. Clica em **"Salvar Alterações"**
4. Frontend valida e envia para backend
5. Backend valida unicidade e atualiza no banco
6. Backend gera novo token JWT
7. Frontend recebe novo token e atualiza localStorage
8. Frontend chama `refreshUser()` para atualizar contexto
9. Interface é atualizada com novos dados
10. Toast de sucesso é exibido

## Segurança

- ✅ Rota protegida com autenticação JWT
- ✅ Validação de unicidade no backend
- ✅ Novo token JWT gerado após atualização
- ✅ Usuário só pode editar seu próprio perfil
- ✅ Mensagens de erro específicas para conflitos

## UI/UX

- ✅ Campos claramente editáveis
- ✅ Botão verde para "Salvar Alterações" (diferente da senha que usa azul)
- ✅ Botão desabilitado quando não há mudanças
- ✅ Feedback visual durante salvamento
- ✅ Toast de sucesso/erro
- ✅ Separação visual entre seções (perfil e senha)

## Testes Sugeridos

1. **Teste de Atualização de Nome**:
   - Alterar apenas o nome de usuário
   - Verificar se o token é atualizado
   - Verificar se a interface reflete a mudança

2. **Teste de Atualização de Email**:
   - Alterar apenas o email
   - Verificar se o token é atualizado
   - Verificar se a interface reflete a mudança

3. **Teste de Atualização Completa**:
   - Alterar nome e email simultaneamente
   - Verificar ambas as mudanças

4. **Teste de Conflito de Nome**:
   - Tentar usar nome de usuário já existente
   - Verificar mensagem de erro apropriada

5. **Teste de Conflito de Email**:
   - Tentar usar email já existente
   - Verificar mensagem de erro apropriada

6. **Teste de Validação**:
   - Tentar salvar campos vazios
   - Tentar salvar sem fazer mudanças

## API Reference

### PUT /api/auth/profile

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "username": "novo_nome",
  "email": "novo@email.com"
}
```

**Resposta de Sucesso (200):**
```json
{
  "message": "Perfil atualizado com sucesso",
  "token": "novo_jwt_token",
  "user": {
    "id": "uuid",
    "username": "novo_nome",
    "email": "novo@email.com",
    "role": "user"
  }
}
```

**Resposta de Erro (400):**
```json
{
  "error": "Nome de usuário já está em uso"
}
```
ou
```json
{
  "error": "Email já está em uso"
}
```

## Status

✅ **Implementação Completa**
- Backend: Service, Controller, Route
- Frontend: Service, Component, UI
- Validações: Backend e Frontend
- Segurança: Autenticação e unicidade
- UX: Feedback visual e mensagens claras

