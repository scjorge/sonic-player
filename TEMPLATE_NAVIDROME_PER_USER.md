# Template Navidrome por Usuário

## Visão Geral

Implementação de isolamento de dados por usuário para o Template de Salvamento do Navidrome (General Settings), seguindo o mesmo padrão usado para outras configurações.

## Alterações Implementadas

### 1. Entidade do Backend

#### GeneralSettingsEntity (`src/backend/entities/GeneralSettings.ts`)
- ✅ Adicionado campo `userId` (VARCHAR 255, NOT NULL)
- ✅ Criado índice único em `userId`
- ✅ Cada configuração de template agora pertence a um usuário específico

**Estrutura:**
```typescript
@Entity({ name: 'general_settings' })
@Index(['userId'], { unique: true })
export class GeneralSettingsEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  userId!: string;

  @Column({ type: 'text' })
  navidromeSaveFormat!: string;
}
```

### 2. Serviço do Backend

#### generalSettingsService (`src/backend/services/generalSettings.ts`)
- ✅ `getGeneralSettings(userId)` - Retorna configurações do usuário, cria com valor padrão se não existir
- ✅ `saveGeneralSettings(userId, navidromeSaveFormat)` - Salva template do usuário

**Mudanças:**
- Métodos agora aceitam `userId` como primeiro parâmetro
- Busca e salva apenas configurações do usuário logado
- Cria automaticamente configurações padrão na primeira chamada

### 3. Controller do Backend

#### generalSettings (`src/backend/controllers/generalSettings.ts`)
- ✅ Alterado para usar `AuthRequest` em vez de `Request`
- ✅ Validação de autenticação em todas as rotas
- ✅ Uso de `req.user.id` para operações por usuário
- ✅ Retorna 401 se não autenticado

**Endpoints:**
- `GET /general-settings` - Busca template do usuário
- `POST /general-settings` - Salva template do usuário

### 4. Rotas do Backend

#### generalSettingsRouter (`src/backend/routes/generalSettings.ts`)
- ✅ Aplicado `authMiddleware` em todas as rotas:
  - `GET /` - Buscar configurações
  - `POST /` - Salvar configurações

### 5. Integração com Downloads Service

#### downloadService (`src/backend/services/downloads.ts`)
- ✅ Método `buildNavidromeTargetPath` agora aceita `userId`
- ✅ Método `finalizeDownload` agora aceita `userId` e passa para `buildNavidromeTargetPath`
- ✅ Usa o template do usuário logado ao finalizar downloads

**Controller de Downloads:**
- ✅ `finalizeDownload` agora usa `AuthRequest`
- ✅ Rota `/downloads/finalize` protegida com `authMiddleware`
- ✅ Passa `req.user.id` ao serviço

### 6. Frontend Repository

#### generalSettings.ts (`src/frontend/repository/generalSettings.ts`)
- ✅ Importado `authService`
- ✅ Adicionado token JWT em todas as requisições:
  - `getGeneralSettings()` - GET /general-settings
  - `saveGeneralSettings()` - POST /general-settings

### 7. Script de Migração

#### migrateSettings.ts (`src/backend/scripts/migrateSettings.ts`)
- ✅ Adicionada migração para `general_settings`:
  - Cria nova tabela com coluna `userId`
  - Migra dados existentes com `userId = 'default-user-id'`
  - Cria índice único `IDX_general_settings_userId`

## Padrão de Autenticação

Todas as operações seguem o padrão estabelecido:

1. **Frontend**: Obtém token JWT via `authService.getToken()`
2. **Frontend**: Inclui token no header `Authorization: Bearer <token>`
3. **Backend**: Middleware `authMiddleware` valida o token
4. **Backend**: Token decodificado é anexado a `req.user`
5. **Backend**: Controller usa `req.user.id` para filtrar dados
6. **Backend**: Service opera apenas nos dados do usuário

## Template Padrão

```
{genre}/Artists/{artist}/{album} ({year})/{track} - {title}.{ext}
```

Variáveis disponíveis:
- `{genre}` - Gênero da música
- `{artist}` - Artista/Banda
- `{album}` - Álbum
- `{year}` - Ano de lançamento
- `{track}` - Número da faixa (00, 01, 02...)
- `{title}` - Título da música
- `{ext}` - Extensão do arquivo (mp3, flac, etc)

## Benefícios

✅ **Isolamento de Dados**: Cada usuário tem seu próprio template de organização  
✅ **Segurança**: Autenticação JWT obrigatória  
✅ **Consistência**: Mesmo padrão usado em todo o sistema  
✅ **Personalização**: Cada usuário pode organizar sua biblioteca de forma única  
✅ **Automação**: Template aplicado automaticamente ao finalizar downloads  

## Uso

### Configuração do Template

1. Acesse **Configurações** → **Template Navidrome**
2. Defina seu template personalizado usando as variáveis disponíveis
3. Clique em **Salvar**

### Aplicação Automática

- Ao finalizar um download (botão "Finalizar" no Audio Editor)
- O arquivo será movido para o diretório do Navidrome
- Seguindo a estrutura definida no template do usuário logado
- Cada usuário terá sua própria estrutura de pastas

### Exemplo de Uso

**Usuário 1** (DJ Profissional):
```
Template: {genre}/{artist} - {album}/{track} - {title}.{ext}
Resultado: Hip Hop/Kendrick Lamar - DAMN/01 - DNA.mp3
```

**Usuário 2** (Colecionador):
```
Template: {genre}/Artists/{artist}/{album} ({year})/{track} - {title}.{ext}
Resultado: Hip Hop/Artists/Kendrick Lamar/DAMN (2017)/01 - DNA.mp3
```

## Estrutura de Dados

### General Settings
```typescript
{
  id: number,                    // ID auto-incrementado
  userId: string,                // ID do usuário proprietário
  navidromeSaveFormat: string    // Template de salvamento
}
```

## Testes

Após a implementação, teste:

1. ✅ Configurar template com usuário A
2. ✅ Verificar que usuário B tem template diferente/padrão
3. ✅ Finalizar download com usuário A e verificar estrutura de pastas
4. ✅ Finalizar download com usuário B e verificar estrutura diferente
5. ✅ Tentar acessar sem autenticação (deve retornar 401)

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

## Rotas Protegidas Adicionais

Como parte desta implementação, a rota de finalização de downloads também foi protegida:

- **POST /downloads/finalize** - Agora requer autenticação
  - Recebe `req.user.id` do token JWT
  - Usa o template do usuário logado para organizar os arquivos

## Impacto no Sistema

### Backend
- Todas as operações de configuração são isoladas por usuário
- Downloads finalizados usam o template do usuário que executou a ação
- Não há mais configurações globais compartilhadas

### Frontend
- Componente `GeneralSettings` já está preparado para trabalhar com autenticação
- Requisições automaticamente incluem token JWT
- Cada usuário vê e edita apenas suas próprias configurações

## Resumo de Todas as Configurações por Usuário

Até agora, foram implementadas isolamento por usuário para:

1. ✅ **YouTube Settings** - API Key do YouTube
2. ✅ **Spotify Settings** - Credenciais e tokens do Spotify
3. ✅ **Navidrome Settings** - Credenciais do servidor Navidrome
4. ✅ **Tag Groups** - Grupos de tags personalizados
5. ✅ **Genres** - Lista de gêneros musicais
6. ✅ **General Settings (Template Navidrome)** - Estrutura de pastas para downloads

Todas seguem o mesmo padrão de:
- Entidade com `userId`
- Índice único em `userId` (ou composto com outros campos)
- Serviços que aceitam `userId`
- Controllers com `AuthRequest`
- Rotas protegidas com `authMiddleware`
- Frontend com tokens JWT
