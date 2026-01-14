# 🚀 Deploy em Produção - Sistema de Autenticação

## ⚠️ IMPORTANTE: Checklist de Segurança

Antes de fazer deploy em produção, **OBRIGATORIAMENTE**:

### 1. Configurar JWT_SECRET Seguro

❌ **NUNCA use o secret padrão em produção!**

Crie um arquivo `.env` na raiz do projeto:

```bash
# Gerar um secret seguro
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Copie o resultado e adicione ao .env:
JWT_SECRET=seu_secret_super_seguro_aqui_64_caracteres_minimo
PORT=3001
```

### 2. Alterar Senha do Admin

```bash
# 1. Fazer login como admin
# 2. Ir em Configurações > Geral > Conta
# 3. Clicar em "Alterar Senha"
# 4. Escolher uma senha forte (mínimo 12 caracteres)
```

### 3. Desabilitar Auto-Registro (Opcional)

Se quiser que apenas admins criem usuários:

```typescript
// src/backend/routes/auth.ts
// Comente ou remova a rota:
// router.post('/register', authController.register);
```

### 4. Configurar HTTPS

Em produção, **sempre** use HTTPS para proteger tokens JWT.

### 5. Configurar CORS

```typescript
// src/backend/app.ts
app.use(cors({
  origin: 'https://seu-dominio.com', // Especifique o domínio
  credentials: true
}));
```

---

## 📦 Build para Produção

```bash
# 1. Build do projeto
npm run build

# 2. Verificar arquivos gerados
ls dist/

# 3. Iniciar em produção
npm start
```

---

## 🐳 Docker (Opcional)

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código
COPY . .

# Build
RUN npm run build

# Expor porta
EXPOSE 3001

# Variáveis de ambiente
ENV NODE_ENV=production
ENV JWT_SECRET=change-me-in-production

# Iniciar
CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./database.sqlite:/app/database.sqlite
    restart: unless-stopped
```

---

## 🔐 Segurança Adicional

### 1. Rate Limiting

Instale e configure:

```bash
npm install express-rate-limit
```

```typescript
// src/backend/app.ts
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
});

app.use('/api/auth/login', loginLimiter);
```

### 2. Helmet para Headers de Segurança

```bash
npm install helmet
```

```typescript
// src/backend/app.ts
import helmet from 'helmet';

app.use(helmet());
```

### 3. Validação de Entrada

```bash
npm install express-validator
```

### 4. Logs de Auditoria

Adicione logging de ações críticas:

```typescript
// src/backend/services/auth.ts
console.log(`[AUTH] Login bem-sucedido: ${user.username} às ${new Date()}`);
```

---

## 📊 Monitoramento

### 1. Health Check Endpoint

```typescript
// src/backend/routes/index.ts
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});
```

### 2. Logs

Configure um sistema de logs:

```bash
npm install winston
```

---

## 🔄 Backup do Banco de Dados

```bash
# Backup automático diário
crontab -e

# Adicionar linha:
0 2 * * * cp /app/database.sqlite /app/backups/database-$(date +\%Y\%m\%d).sqlite
```

---

## 🌐 Variáveis de Ambiente (Produção)

```bash
# .env.production
NODE_ENV=production
JWT_SECRET=seu-secret-super-seguro-gerado-com-crypto
PORT=3001
DATABASE_PATH=./database.sqlite

# Frontend
VITE_API_URL=https://api.seu-dominio.com
```

---

## 🚨 Troubleshooting Produção

### Token expirando muito rápido
Ajuste em `src/backend/services/auth.ts`:
```typescript
const JWT_EXPIRES_IN = '30d'; // 30 dias
```

### Muitos usuários sendo criados
Desabilite rota de registro ou adicione CAPTCHA

### Performance lenta
- Use Redis para cache de tokens
- Implemente connection pooling no banco
- Configure CDN para assets estáticos

---

## 📈 Métricas Recomendadas

Monitore:
- ✅ Taxa de login bem-sucedido vs falho
- ✅ Número de usuários ativos
- ✅ Tempo médio de resposta da API
- ✅ Tentativas de login suspeitas
- ✅ Tokens expirados vs renovados

---

## 🔒 Conformidade e Regulamentações

### LGPD/GDPR

Se aplicável, implemente:
- [ ] Política de privacidade
- [ ] Termos de uso
- [ ] Consentimento de cookies
- [ ] Exportação de dados do usuário
- [ ] Exclusão de conta (right to be forgotten)

---

## ✅ Checklist Final

Antes de ir para produção:

- [ ] JWT_SECRET configurado
- [ ] Senha do admin alterada
- [ ] HTTPS configurado
- [ ] CORS configurado corretamente
- [ ] Rate limiting implementado
- [ ] Helmet instalado
- [ ] Logs configurados
- [ ] Backup automatizado
- [ ] Health check endpoint
- [ ] Monitoramento configurado
- [ ] Variáveis de ambiente setadas
- [ ] Build testado
- [ ] Documentação atualizada

---

## 🎯 Performance

### Otimizações Recomendadas

1. **Caching de Usuários**
```typescript
// Cache em memória para usuários ativos
const userCache = new Map();
```

2. **Índices no Banco**
```typescript
// User.ts
@Index(['username'])
@Index(['email'])
```

3. **Compressão**
```bash
npm install compression
```

```typescript
import compression from 'compression';
app.use(compression());
```

---

## 🌍 Escalabilidade

Para múltiplas instâncias:

1. **Use Redis para sessões**
```bash
npm install redis
```

2. **Load Balancer**
Configure nginx ou AWS ALB

3. **Banco de Dados**
Considere migrar para PostgreSQL em produção

---

## 📞 Suporte em Produção

### Logs Importantes

```bash
# Ver logs em tempo real
tail -f logs/app.log

# Buscar erros
grep ERROR logs/app.log

# Contar tentativas de login falhas
grep "Login failed" logs/app.log | wc -l
```

### Comandos Úteis

```bash
# Ver usuários ativos
sqlite3 database.sqlite "SELECT COUNT(*) FROM users WHERE isActive=1;"

# Ver último login (se implementado)
sqlite3 database.sqlite "SELECT username, lastLogin FROM users ORDER BY lastLogin DESC LIMIT 10;"

# Resetar senha de usuário
sqlite3 database.sqlite "UPDATE users SET password='hash_nova_senha' WHERE username='usuario';"
```

---

## 🎉 Conclusão

Seguindo este guia, seu sistema estará seguro e pronto para produção!

**Lembre-se**: Segurança é um processo contínuo. Mantenha dependências atualizadas e monitore constantemente.

---

**Boa sorte com o deploy! 🚀**
