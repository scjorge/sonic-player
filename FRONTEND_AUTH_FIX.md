# Correção: Autenticação nas Requisições Frontend

## Problema Identificado

As requisições do frontend para as APIs de configurações do YouTube e Spotify não estavam enviando o token JWT de autenticação, causando erro 401 (Não autenticado) ao tentar acessar ou salvar configurações.

## Causa

Após implementar autenticação obrigatória nas rotas de configurações (`authMiddleware`), o frontend continuava fazendo requisições sem incluir o header `Authorization` com o token JWT.

## Solução Implementada

### 1. YouTube Repository

**Arquivo:** `/app/src/frontend/repository/youtube.ts`

**Mudanças:**

1. **Import adicionado:**
```typescript
import { authService } from '../services/authService';
```

2. **Função `getYoutubeConfig()`:**
```typescript
const token = authService.getToken();
const headers: HeadersInit = {};

if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

const res = await fetch(`${BACKEND_BASE_URL}/youtube-settings`, { headers });
```

3. **Função `saveYoutubeConfig()`:**
```typescript
const token = authService.getToken();
const headers: HeadersInit = { 'Content-Type': 'application/json' };

if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

const res = await fetch(`${BACKEND_BASE_URL}/youtube-settings`, {
  method: 'PUT',
  headers,
  body: JSON.stringify({ apiKey: config.apiKey }),
});
```

4. **Função `deleteYoutubeConfig()`:**
```typescript
const token = authService.getToken();
const headers: HeadersInit = {};

if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

const res = await fetch(`${BACKEND_BASE_URL}/youtube-settings`, {
  method: 'DELETE',
  headers,
});
```

### 2. Spotify Repository

**Arquivo:** `/app/src/frontend/repository/spotify.ts`

**Mudanças:**

1. **Import adicionado:**
```typescript
import { authService } from '../services/authService';
```

2. **Função `getSpotifyCredentials()`:**
```typescript
const token = authService.getToken();
const headers: HeadersInit = {};

if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

await fetch(`${BACKEND_BASE_URL}/spotify-settings`, { headers })
```

3. **Função `saveSpotifyCredentials()`:**
```typescript
const token = authService.getToken();
const headers: HeadersInit = { 'Content-Type': 'application/json' };

if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

await fetch(`${BACKEND_BASE_URL}/spotify-settings`, {
  method: 'PUT',
  headers,
  body: JSON.stringify({ clientId, clientSecret, redirectUri, accessToken, refreshToken, expiresAt }),
});
```

4. **Função `deleteSpotifyCredentials()`:**
```typescript
const token = authService.getToken();
const headers: HeadersInit = {};

if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

await fetch(`${BACKEND_BASE_URL}/spotify-settings`, {
  method: 'DELETE',
  headers,
});
```

## Padrão Implementado

Para todas as requisições:

1. **Obter o token:**
```typescript
const token = authService.getToken();
```

2. **Criar headers:**
```typescript
const headers: HeadersInit = {};
// ou com Content-Type se for POST/PUT
const headers: HeadersInit = { 'Content-Type': 'application/json' };
```

3. **Adicionar Authorization se token existir:**
```typescript
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}
```

4. **Usar headers na requisição:**
```typescript
await fetch(url, { headers, ...otherOptions });
```

## Benefícios

✅ **Autenticação funcionando**: Requisições agora incluem token JWT  
✅ **Sem erros 401**: Backend reconhece o usuário autenticado  
✅ **Isolamento de dados**: Cada usuário acessa apenas suas configurações  
✅ **Código consistente**: Mesmo padrão em todos os repositórios  
✅ **Segurança**: Token validado em cada requisição  

## Verificação

Para testar se está funcionando:

1. **Fazer login no sistema**
2. **Abrir DevTools > Network**
3. **Navegar para Configurações > YouTube ou Spotify**
4. **Verificar requisições para `/youtube-settings` ou `/spotify-settings`**
5. **Confirmar que header `Authorization: Bearer <token>` está presente**

Exemplo de header esperado:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Fluxo Completo

### Antes (❌ Erro)

```
Frontend: fetch('/youtube-settings')
          ↓
Backend:  authMiddleware verifica header Authorization
          ↓
          ❌ Token não encontrado
          ↓
          Retorna 401 Unauthorized
```

### Depois (✅ Sucesso)

```
Frontend: authService.getToken()
          ↓
          Adiciona Authorization: Bearer <token>
          ↓
          fetch('/youtube-settings', { headers })
          ↓
Backend:  authMiddleware verifica header Authorization
          ↓
          ✅ Token válido
          ↓
          Extrai userId do token
          ↓
          Busca/salva configuração do usuário
          ↓
          Retorna 200 OK com dados
```

## Arquivos Modificados

1. `/app/src/frontend/repository/youtube.ts`
   - Adicionado import de `authService`
   - Adicionado token em todas as requisições

2. `/app/src/frontend/repository/spotify.ts`
   - Adicionado import de `authService`
   - Adicionado token em todas as requisições

## Próximos Passos

Para garantir consistência em todo o projeto, aplicar o mesmo padrão para:

- [ ] `/app/src/frontend/repository/generalSettings.ts`
- [ ] `/app/src/frontend/repository/navidrome.ts`
- [ ] Qualquer outro repositório que faça requisições autenticadas

## Exemplo de Implementação para Outros Repositórios

```typescript
import { authService } from '../services/authService';

export const getData = async () => {
  const token = authService.getToken();
  const headers: HeadersInit = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/endpoint`, { headers });
  return response.json();
};

export const saveData = async (data: any) => {
  const token = authService.getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  await fetch(`${API_URL}/endpoint`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
};
```

## Conclusão

A correção garante que todas as requisições do frontend para as APIs de configurações incluam o token JWT de autenticação, permitindo que o backend identifique o usuário e retorne/salve suas configurações específicas.

O padrão implementado é simples, consistente e pode ser facilmente replicado para outros endpoints que requeiram autenticação.

