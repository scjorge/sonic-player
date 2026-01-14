# Audio Editor State por Usuário

## Visão Geral

Implementação de isolamento de dados por usuário para o estado persistente do Editor de Áudio, seguindo o mesmo padrão usado para outras configurações.

## Alterações Implementadas

### 1. Entidade do Backend

#### AudioEditorStateEntity (`src/backend/entities/AudioEditorState.ts`)
- ✅ Adicionado campo `userId` (VARCHAR 255, NOT NULL)
- ✅ Criado índice único em `userId`
- ✅ Cada estado de editor agora pertence a um usuário específico

**Estrutura:**
```typescript
@Entity({ name: 'audio_editor_state' })
@Index(['userId'], { unique: true })
export class AudioEditorStateEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  userId!: string;

  @Column({ type: 'text' })
  stateJson!: string;
}
```

### 2. Serviço do Backend

#### audioEditorStateService (`src/backend/services/audioEditorState.ts`)
- ✅ `getState(userId)` - Retorna estado salvo do usuário, null se não existir
- ✅ `saveState(userId, state)` - Salva estado do editor do usuário

**Mudanças:**
- Métodos agora aceitam `userId` como primeiro parâmetro
- Busca e salva apenas estado do usuário logado
- Cria automaticamente novo registro na primeira chamada

### 3. Controller do Backend

#### audioEditorState (`src/backend/controllers/audioEditorState.ts`)
- ✅ Alterado para usar `AuthRequest` em vez de `Request`
- ✅ Validação de autenticação em todas as rotas
- ✅ Uso de `req.user.id` para operações por usuário
- ✅ Retorna 401 se não autenticado

**Endpoints:**
- `GET /audio-editor-state` - Busca estado salvo do usuário
- `POST /audio-editor-state` - Salva estado atual do editor

### 4. Rotas do Backend

#### audioEditorStateRouter (`src/backend/routes/audioEditorState.ts`)
- ✅ Aplicado `authMiddleware` em todas as rotas:
  - `GET /` - Buscar estado
  - `POST /` - Salvar estado

### 5. Frontend Repository

#### audioEditor.ts (`src/frontend/repository/audioEditor.ts`)
- ✅ Importado `authService`
- ✅ Adicionado token JWT em todas as requisições:
  - `getAudioEditorState()` - GET /audio-editor-state
  - `saveAudioEditorState()` - POST /audio-editor-state

### 6. Script de Migração

#### migrateSettings.ts (`src/backend/scripts/migrateSettings.ts`)
- ✅ Adicionada migração para `audio_editor_state`:
  - Cria nova tabela com coluna `userId`
  - Migra dados existentes com `userId = 'default-user-id'`
  - Cria índice único `IDX_audio_editor_state_userId`

## Padrão de Autenticação

Todas as operações seguem o padrão estabelecido:

1. **Frontend**: Obtém token JWT via `authService.getToken()`
2. **Frontend**: Inclui token no header `Authorization: Bearer <token>`
3. **Backend**: Middleware `authMiddleware` valida o token
4. **Backend**: Token decodificado é anexado a `req.user`
5. **Backend**: Controller usa `req.user.id` para filtrar dados
6. **Backend**: Service opera apenas nos dados do usuário

## Estado Persistente

O estado do editor inclui:

```typescript
interface AudioEditorPersistedStateDTO {
  tracks: any[];                    // Faixas de áudio carregadas
  zoom: number;                      // Nível de zoom da timeline
  currentTime: number;               // Posição atual da reprodução
  selectedTrackId: string | null;   // ID da faixa selecionada
  globalSelection: {                 // Seleção ativa
    start: number;
    end: number;
    trackId: string;
  } | null;
}
```

## Benefícios

✅ **Isolamento de Sessão**: Cada usuário mantém seu próprio estado de edição  
✅ **Persistência**: Estado preservado entre sessões de login  
✅ **Privacidade**: Usuários não podem ver projetos de outros  
✅ **Continuidade**: Retome exatamente de onde parou  
✅ **Segurança**: Autenticação JWT obrigatória  

## Uso

### Salvamento Automático

O estado do editor é salvo automaticamente quando:
- Usuário faz alterações no editor
- Usuário adiciona/remove faixas
- Usuário ajusta zoom ou posição
- Usuário faz seleções na timeline

### Restauração Automática

O estado é restaurado automaticamente quando:
- Usuário abre o editor de áudio
- Após login bem-sucedido
- Ao navegar de volta para a tela do editor

### Exemplo de Fluxo

1. **Usuário A** abre o editor de áudio
   - Sistema busca estado salvo de A
   - Restaura faixas, zoom, posição e seleções anteriores

2. **Usuário A** edita e fecha o navegador
   - Estado é salvo automaticamente
   - Dados persistem no banco de dados

3. **Usuário B** abre o editor de áudio
   - Sistema busca estado salvo de B (diferente de A)
   - Restaura o estado específico de B
   - Não vê nada do trabalho de A

4. **Usuário A** retorna dias depois
   - Sistema restaura exatamente o estado anterior
   - Pode continuar de onde parou

## Casos de Uso

### DJ/Produtor Musical
```
- Trabalha em múltiplas mixagens simultaneamente
- Cada projeto mantém seu próprio estado
- Zoom e seleções preservadas entre sessões
```

### Estúdio Compartilhado
```
- Múltiplos engenheiros usando o mesmo sistema
- Cada um tem suas próprias sessões de edição
- Trabalhos não se misturam
```

### Educação Musical
```
- Professor e alunos compartilham mesma instalação
- Cada aluno preserva seus próprios projetos
- Estados de edição isolados por usuário
```

## Estrutura de Dados

### Audio Editor State
```typescript
{
  id: number,           // ID auto-incrementado
  userId: string,       // ID do usuário proprietário
  stateJson: string     // Estado serializado em JSON
}
```

## Implementação Técnica

### Salvamento
```typescript
// Frontend chama ao fazer alterações
await saveAudioEditorState({
  tracks: [...],
  zoom: 1.5,
  currentTime: 45.2,
  selectedTrackId: "track-1",
  globalSelection: { start: 10, end: 30, trackId: "track-1" }
});

// Backend recebe com JWT token
// Extrai userId do token
// Salva apenas para aquele usuário
```

### Restauração
```typescript
// Frontend chama ao abrir editor
const state = await getAudioEditorState();

// Backend recebe com JWT token
// Extrai userId do token
// Retorna apenas estado daquele usuário
// Frontend restaura tracks, zoom, etc.
```

## Testes

Após a implementação, teste:

1. ✅ Abrir editor como usuário A, fazer edições
2. ✅ Fechar e reabrir editor - verificar restauração
3. ✅ Logar como usuário B
4. ✅ Verificar que editor está vazio (estado diferente)
5. ✅ Fazer edições como usuário B
6. ✅ Retornar como usuário A - verificar estado de A intacto
7. ✅ Tentar acessar sem autenticação (deve retornar 401)

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

## Compatibilidade

### Dados Existentes
- Estados de editor criados antes da migração são atribuídos a `'default-user-id'`
- Usuários novos começam com estado vazio
- Não há perda de dados durante a migração

### Frontend
- Componente `AudioEditor` já está preparado para trabalhar com autenticação
- Requisições automaticamente incluem token JWT
- Comportamento transparente para o usuário

## Performance

### Otimizações
- Estado salvo em formato JSON compacto
- Índice único em `userId` para buscas rápidas
- Um único registro por usuário (UPDATE em vez de INSERT)

### Tamanho de Dados
- Estado típico: ~1-5KB por usuário
- Máximo esperado: ~50KB para projetos complexos
- Compressão JSON automática pelo SQLite

## Resumo de Todas as Configurações por Usuário

Até agora, foram implementadas isolamento por usuário para:

1. ✅ **YouTube Settings** - API Key do YouTube
2. ✅ **Spotify Settings** - Credenciais e tokens do Spotify
3. ✅ **Navidrome Settings** - Credenciais do servidor Navidrome
4. ✅ **Tag Groups** - Grupos de tags personalizados
5. ✅ **Genres** - Lista de gêneros musicais
6. ✅ **General Settings** - Template Navidrome
7. ✅ **Audio Editor State** - Estado persistente do editor ← NOVO!

Todas seguem o mesmo padrão de:
- Entidade com `userId`
- Índice único em `userId`
- Serviços que aceitam `userId`
- Controllers com `AuthRequest`
- Rotas protegidas com `authMiddleware`
- Frontend com tokens JWT

## Próximas Possibilidades

Considerar aplicar o mesmo padrão para:
- [ ] Histórico de downloads por usuário
- [ ] Preferências de visualização (colunas, ordenação)
- [ ] Playlists personalizadas
- [ ] Favoritos/Curtidas
