# Tags e Metadados por Usuário

## Visão Geral

Implementação de isolamento de dados por usuário para Tags Groups e Genres, seguindo o mesmo padrão usado para YouTube, Spotify e Navidrome settings.

## Alterações Implementadas

### 1. Entidades do Backend

#### TagGroupEntity (`src/backend/entities/TagGroupEntity.ts`)
- ✅ Adicionado campo `userId` (VARCHAR 255, NOT NULL)
- ✅ Criado índice único composto em `[userId, id]`
- ✅ Cada tag group agora pertence a um usuário específico

#### GenreEntity (`src/backend/entities/GenreEntity.ts`)
- ✅ Adicionado campo `userId` (VARCHAR 255, NOT NULL)
- ✅ Criado índice único composto em `[userId, name]`
- ✅ Cada gênero agora pertence a um usuário específico

### 2. Serviços do Backend

#### tagGroupsService (`src/backend/services/tagGroups.ts`)
- ✅ `list(userId)` - Lista apenas grupos do usuário
- ✅ `create(userId, group)` - Cria grupo associado ao usuário
- ✅ `update(userId, id, group)` - Atualiza grupo do usuário
- ✅ `remove(userId, id)` - Remove grupo do usuário

#### genresService (`src/backend/services/genres.ts`)
- ✅ `list(userId)` - Lista apenas gêneros do usuário
- ✅ `add(userId, name)` - Adiciona gênero associado ao usuário
- ✅ `remove(userId, name)` - Remove gênero do usuário

### 3. Controladores do Backend

#### tagGroups (`src/backend/controllers/tagGroups.ts`)
- ✅ Alterado para usar `AuthRequest` em vez de `Request`
- ✅ Validação de autenticação em todas as rotas
- ✅ Uso de `req.user.id` para operações por usuário
- ✅ Retorna 401 se não autenticado

#### genres (`src/backend/controllers/genres.ts`)
- ✅ Alterado para usar `AuthRequest` em vez de `Request`
- ✅ Validação de autenticação em todas as rotas
- ✅ Uso de `req.user.id` para operações por usuário
- ✅ Retorna 401 se não autenticado

### 4. Rotas do Backend

#### tagGroupsRouter (`src/backend/routes/tagGroups.ts`)
- ✅ Aplicado `authMiddleware` em todas as rotas:
  - `GET /` - Listar grupos
  - `POST /` - Criar grupo
  - `PUT /:id` - Atualizar grupo
  - `DELETE /:id` - Deletar grupo

#### genresRouter (`src/backend/routes/genres.ts`)
- ✅ Aplicado `authMiddleware` em todas as rotas:
  - `GET /` - Listar gêneros
  - `POST /` - Adicionar gênero
  - `DELETE /:name` - Deletar gênero

### 5. Frontend Repository

#### metadata.ts (`src/frontend/repository/metadata.ts`)
- ✅ Importado `authService`
- ✅ Adicionado token JWT em todas as requisições:
  - `getStoredGroups()` - GET /tag-groups
  - `addStoredGroup()` - POST /tag-groups
  - `updateStoredGroup()` - PUT /tag-groups/:id
  - `deleteStoredGroup()` - DELETE /tag-groups/:id
  - `getStoredGenres()` - GET /genres
  - `addStoredGenre()` - POST /genres
  - `deleteStoredGenre()` - DELETE /genres/:name

### 6. Script de Migração

#### migrateSettings.ts (`src/backend/scripts/migrateSettings.ts`)
- ✅ Adicionada migração para `tag_groups`:
  - Cria nova tabela com coluna `userId`
  - Migra dados existentes com `userId = 'default-user-id'`
  - Cria índice único composto `IDX_tag_groups_userId_id`
  
- ✅ Adicionada migração para `genres`:
  - Cria nova tabela com coluna `userId`
  - Migra dados existentes com `userId = 'default-user-id'`
  - Cria índice único composto `IDX_genres_userId_name`

## Padrão de Autenticação

Todas as operações seguem o padrão estabelecido:

1. **Frontend**: Obtém token JWT via `authService.getToken()`
2. **Frontend**: Inclui token no header `Authorization: Bearer <token>`
3. **Backend**: Middleware `authMiddleware` valida o token
4. **Backend**: Token decodificado é anexado a `req.user`
5. **Backend**: Controller usa `req.user.id` para filtrar dados
6. **Backend**: Service opera apenas nos dados do usuário

## Benefícios

✅ **Isolamento de Dados**: Cada usuário tem seus próprios tag groups e genres  
✅ **Segurança**: Autenticação JWT obrigatória  
✅ **Consistência**: Mesmo padrão usado em todo o sistema  
✅ **Privacidade**: Usuários não podem ver dados de outros usuários  
✅ **Escalabilidade**: Suporta múltiplos usuários sem conflitos  

## Uso

### Para Novos Usuários
- Ao criar uma conta, o usuário começa com tag groups e genres vazios
- Pode criar suas próprias configurações personalizadas

### Para Dados Existentes
- Se você tinha tags/genres antes desta atualização:
  1. Execute o script de migração: `npm run migrate-settings`
  2. Os dados serão atribuídos a `'default-user-id'`
  3. Reconfigure suas tags e genres para cada usuário

## Estrutura de Dados

### Tag Groups
```typescript
{
  id: string,           // ID único do grupo
  userId: string,       // ID do usuário proprietário
  name: string,         // Nome do grupo
  prefix: string,       // Prefixo do grupo
  items: string[]       // Array de items (JSON serializado no DB)
}
```

### Genres
```typescript
{
  id: number,           // ID auto-incrementado
  userId: string,       // ID do usuário proprietário
  name: string          // Nome do gênero
}
```

## Testes

Após a implementação, teste:

1. ✅ Criar tag group com usuário A
2. ✅ Verificar que usuário B não vê o tag group de A
3. ✅ Criar genre com usuário A
4. ✅ Verificar que usuário B não vê o genre de A
5. ✅ Tentar acessar sem autenticação (deve retornar 401)
6. ✅ Deletar tag group/genre e verificar isolamento

## Migração

Para migrar banco de dados existente:

```bash
npm run migrate-settings
```

Ou deletar e recriar o banco de dados:

```bash
rm /app/database.sqlite
DATABASE_PATH=/app/database.sqlite npm run dev:backend
DATABASE_PATH=/app/database.sqlite npm run create-admin
```

## Próximos Passos

Considerar aplicar o mesmo padrão para:
- [ ] GeneralSettings (se houver)
- [ ] TidalSettings
- [ ] Outras configurações compartilhadas
