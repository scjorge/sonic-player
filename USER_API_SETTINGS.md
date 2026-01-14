# Configurações de API por Usuário

## Resumo das Mudanças

Implementada funcionalidade para que as configurações das APIs do **YouTube** e **Spotify** sejam salvas individualmente por usuário. Cada usuário agora tem suas próprias credenciais e configurações isoladas.

## Motivação

Antes dessa implementação, as configurações de API eram globais - todos os usuários compartilhavam as mesmas credenciais. Agora, cada usuário pode configurar suas próprias APIs, permitindo:

- ✅ Isolamento de dados entre usuários
- ✅ Cada usuário usa suas próprias chaves de API
- ✅ Configurações independentes para YouTube e Spotify
- ✅ Maior privacidade e segurança

## Mudanças Implementadas

### 1. YouTube Settings

#### Entity (`YoutubeSetting.ts`)

**Antes:**
```typescript
@Entity({ name: 'youtube_settings' })
export class YoutubeSetting {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', nullable: true })
  apiKey!: string | null;
}
```

**Depois:**
```typescript
@Entity({ name: 'youtube_settings' })
@Index(['userId'], { unique: true })
export class YoutubeSetting {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  userId!: string;

  @Column({ type: 'text', nullable: true })
  apiKey!: string | null;
}
```

**Mudanças:**
- ➕ Adicionada coluna `userId` (obrigatória)
- ➕ Índice único em `userId` (um registro por usuário)

#### Service (`youtubeSettings.ts`)

**Antes:**
```typescript
async get() {
  const repo = AppDataSource.getRepository(YoutubeSetting);
  const existing = await repo.find();
  return existing[0] || null;
}
```

**Depois:**
```typescript
async get(userId: string) {
  const repo = AppDataSource.getRepository(YoutubeSetting);
  const existing = await repo.findOne({ where: { userId } });
  return existing || null;
}
```

**Mudanças:**
- Todos os métodos agora recebem `userId` como parâmetro
- Busca e salva apenas configurações do usuário específico

#### Controller (`youtubeSettings.ts`)

**Antes:**
```typescript
export const getYoutubeSettings = async (_req: Request, res: Response) => {
  const setting = await youtubeSettingsService.get();
  // ...
}
```

**Depois:**
```typescript
export const getYoutubeSettings = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const setting = await youtubeSettingsService.get(req.user.id);
  // ...
}
```

**Mudanças:**
- Controllers agora usam `AuthRequest` (inclui informações do usuário)
- Validação de autenticação obrigatória
- Usa `req.user.id` para buscar/salvar configurações

#### Routes (`youtubeSettings.ts`)

**Antes:**
```typescript
youtubeSettingsRouter.get('/', getYoutubeSettings);
youtubeSettingsRouter.put('/', saveYoutubeSettings);
youtubeSettingsRouter.delete('/', clearYoutubeSettings);
```

**Depois:**
```typescript
youtubeSettingsRouter.get('/', authMiddleware, getYoutubeSettings);
youtubeSettingsRouter.put('/', authMiddleware, saveYoutubeSettings);
youtubeSettingsRouter.delete('/', authMiddleware, clearYoutubeSettings);
```

**Mudanças:**
- ➕ Adicionado `authMiddleware` em todas as rotas
- Rotas agora exigem autenticação JWT

### 2. Spotify Settings

As mesmas mudanças foram aplicadas ao Spotify:

#### Entity (`SpotifySetting.ts`)
- ➕ Coluna `userId` (obrigatória)
- ➕ Índice único em `userId`

#### Service (`spotifySettings.ts`)
- Métodos agora recebem `userId`
- Busca/salva por usuário específico

#### Controller (`spotifySettings.ts`)
- Usa `AuthRequest`
- Validação de autenticação
- Usa `req.user.id`

#### Routes (`spotifySettings.ts`)
- ➕ `authMiddleware` em todas as rotas

### 3. Script de Migração

Criado script para migrar dados existentes:

**Arquivo:** `/app/src/backend/scripts/migrateSettings.ts`

**Funcionalidades:**
- Verifica se as tabelas já possuem coluna `userId`
- Cria tabelas temporárias com nova estrutura
- Copia dados existentes (atribui a 'default-user-id')
- Remove tabelas antigas e renomeia novas
- Cria índices únicos

**Como executar:**
```bash
npm run migrate-settings
```

**⚠️ IMPORTANTE:**
Após executar a migração, as configurações existentes serão atribuídas a um ID de usuário padrão. Cada usuário precisará reconfigurar suas próprias APIs.

## Estrutura do Banco de Dados

### youtube_settings

| Coluna   | Tipo          | Obrigatório | Descrição                    |
|----------|---------------|-------------|------------------------------|
| id       | INTEGER       | Sim         | Chave primária (auto)        |
| userId   | VARCHAR(255)  | Sim         | ID do usuário (único)        |
| apiKey   | TEXT          | Não         | Chave da API do YouTube      |

**Índices:**
- PRIMARY KEY: `id`
- UNIQUE INDEX: `userId`

### spotify_settings

| Coluna        | Tipo          | Obrigatório | Descrição                    |
|---------------|---------------|-------------|------------------------------|
| id            | INTEGER       | Sim         | Chave primária (auto)        |
| userId        | VARCHAR(255)  | Sim         | ID do usuário (único)        |
| clientId      | TEXT          | Não         | Client ID do Spotify         |
| clientSecret  | TEXT          | Não         | Client Secret do Spotify     |
| redirectUri   | TEXT          | Não         | URI de redirecionamento      |
| accessToken   | TEXT          | Não         | Token de acesso atual        |
| refreshToken  | TEXT          | Não         | Token para renovação         |
| expiresAt     | BIGINT        | Não         | Timestamp de expiração       |

**Índices:**
- PRIMARY KEY: `id`
- UNIQUE INDEX: `userId`

## API Reference

### YouTube Settings

#### GET /api/youtube-settings
**Autenticação:** Obrigatória (JWT)

**Headers:**
```
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "apiKey": "AIza..."
}
```

#### PUT /api/youtube-settings
**Autenticação:** Obrigatória (JWT)

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "apiKey": "AIza..."
}
```

#### DELETE /api/youtube-settings
**Autenticação:** Obrigatória (JWT)

**Headers:**
```
Authorization: Bearer <token>
```

**Resposta:** `204 No Content`

### Spotify Settings

#### GET /api/spotify-settings
**Autenticação:** Obrigatória (JWT)

**Headers:**
```
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "redirectUri": "...",
  "accessToken": "...",
  "refreshToken": "...",
  "expiresAt": 1234567890
}
```

#### PUT /api/spotify-settings
**Autenticação:** Obrigatória (JWT)

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "redirectUri": "...",
  "accessToken": "...",
  "refreshToken": "...",
  "expiresAt": 1234567890
}
```

#### DELETE /api/spotify-settings
**Autenticação:** Obrigatória (JWT)

**Headers:**
```
Authorization: Bearer <token>
```

**Resposta:** `204 No Content`

## Fluxo de Uso

### Configurar API do YouTube

1. Usuário faz login no sistema
2. Navega para Configurações > YouTube
3. Insere sua chave de API do YouTube
4. Clica em Salvar
5. Sistema salva configuração com `userId` do usuário logado
6. Apenas este usuário terá acesso a esta configuração

### Configurar API do Spotify

1. Usuário faz login no sistema
2. Navega para Configurações > Spotify
3. Insere Client ID, Client Secret e Redirect URI
4. Sistema salva configuração com `userId` do usuário logado
5. Processo de OAuth salva tokens automaticamente
6. Apenas este usuário terá acesso a esta configuração

## Segurança

### Validações Implementadas

- ✅ **Autenticação obrigatória**: Todas as rotas exigem JWT válido
- ✅ **Isolamento de dados**: Cada usuário só acessa suas configurações
- ✅ **Índice único**: Previne duplicação de configurações por usuário
- ✅ **Validação de usuário**: Controllers verificam `req.user` antes de processar

### Proteções

1. **Autenticação JWT**: Token deve ser válido e não expirado
2. **Middleware de autenticação**: Valida token antes de executar controllers
3. **Isolamento no serviço**: Buscas sempre filtradas por `userId`
4. **Índice único**: Banco de dados garante um registro por usuário

## Migração de Dados Existentes

### Antes da Migração

Se você já tinha configurações de YouTube ou Spotify, execute:

```bash
npm run migrate-settings
```

### Após a Migração

1. As configurações existentes serão atribuídas a `'default-user-id'`
2. Cada usuário precisará reconfigurar suas próprias APIs
3. As tabelas terão a nova estrutura com `userId`

### Limpeza (Opcional)

Se preferir começar do zero:

```bash
# Backup do banco atual
cp database.sqlite database.sqlite.backup

# Limpar configurações antigas
sqlite3 database.sqlite "DELETE FROM youtube_settings;"
sqlite3 database.sqlite "DELETE FROM spotify_settings;"
```

## Arquivos Modificados

### Backend

1. **Entities**
   - `/app/src/backend/entities/YoutubeSetting.ts` - Adicionada coluna `userId`
   - `/app/src/backend/entities/SpotifySetting.ts` - Adicionada coluna `userId`

2. **Services**
   - `/app/src/backend/services/youtubeSettings.ts` - Métodos agora usam `userId`
   - `/app/src/backend/services/spotifySettings.ts` - Métodos agora usam `userId`

3. **Controllers**
   - `/app/src/backend/controllers/youtubeSettings.ts` - Validação de auth, usa `req.user.id`
   - `/app/src/backend/controllers/spotifySettings.ts` - Validação de auth, usa `req.user.id`

4. **Routes**
   - `/app/src/backend/routes/youtubeSettings.ts` - Adicionado `authMiddleware`
   - `/app/src/backend/routes/spotifySettings.ts` - Adicionado `authMiddleware`

5. **Scripts**
   - `/app/src/backend/scripts/migrateSettings.ts` - Novo script de migração

6. **Package.json**
   - `/app/package.json` - Adicionado script `migrate-settings`

## Frontend

**Nenhuma mudança necessária!** 

O frontend já envia o token JWT no header `Authorization`, então as requisições continuam funcionando normalmente. O backend agora usa o `userId` extraído do token para gerenciar as configurações.

## Testes Recomendados

### Teste 1: Configurações Isoladas
- [ ] Usuário A configura YouTube API
- [ ] Usuário B configura YouTube API com chave diferente
- [ ] Verificar que cada um vê apenas sua configuração

### Teste 2: Autenticação
- [ ] Tentar acessar `/api/youtube-settings` sem token
- [ ] Deve retornar 401 Unauthorized
- [ ] Com token válido, deve retornar configurações

### Teste 3: Spotify OAuth
- [ ] Usuário A faz login no Spotify
- [ ] Tokens salvos para usuário A
- [ ] Usuário B não vê tokens do usuário A

### Teste 4: Migração
- [ ] Executar `npm run migrate-settings`
- [ ] Verificar que tabelas foram atualizadas
- [ ] Configurações antigas preservadas

## Benefícios

### Para Usuários
- 🔒 **Privacidade**: Configurações não são compartilhadas
- 🎯 **Personalização**: Cada um usa suas próprias APIs
- 🔑 **Controle**: Total controle sobre credenciais

### Para Administradores
- 📊 **Rastreabilidade**: Saber qual usuário usa qual API
- 🛡️ **Segurança**: Isolamento de dados
- 📈 **Escalabilidade**: Sistema preparado para múltiplos usuários

### Para o Sistema
- ✨ **Arquitetura limpa**: Padrão de isolamento por usuário
- 🔧 **Manutenibilidade**: Código organizado e seguro
- 🚀 **Performance**: Índices otimizados para buscas

## Próximos Passos Sugeridos

1. **Aplicar o mesmo padrão para outras configurações**:
   - GeneralSettings
   - NavidromeSettings
   - TidalSettings
   - TagGroups

2. **Auditoria**:
   - Log de alterações nas configurações
   - Histórico de mudanças por usuário

3. **Compartilhamento (opcional)**:
   - Permitir que admins vejam configurações de todos
   - Opção de compartilhar configurações entre usuários

## Conclusão

O sistema agora garante que cada usuário tenha suas próprias configurações de API do YouTube e Spotify, com total isolamento e segurança. As rotas estão protegidas por autenticação e o banco de dados está estruturado para suportar múltiplos usuários de forma eficiente.

