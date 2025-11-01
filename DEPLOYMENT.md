# Guia de Deployment - Cuidar+

## 🚀 Visão Geral

Este guia cobre o processo completo de deployment do sistema Cuidar+ para produção.

## 📋 Pré-requisitos

### 1. Conta Supabase
- Criar projeto em [supabase.com](https://supabase.com)
- Anotar Project URL e Anon Key
- Configurar região (preferencialmente próxima aos usuários)

### 2. Ambiente de Desenvolvimento
```bash
Node.js >= 18.x
npm >= 9.x ou bun >= 1.x
Git
```

### 3. Variáveis de Ambiente Necessárias
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_anon_key
```

## 🔧 Configuração Inicial

### 1. Clone e Instalação
```bash
# Clone o repositório
git clone <seu-repositorio>
cd cuidar-plus

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais
```

### 2. Configuração do Supabase

#### A. Database Setup
```bash
# Instale Supabase CLI
npm install -g supabase

# Faça login
supabase login

# Link ao projeto
supabase link --project-ref SEU_PROJECT_REF

# Execute migrations
supabase db push
```

#### B. Configurar Auth Providers
Acesse: `https://supabase.com/dashboard/project/{project_id}/auth/providers`

**Email Provider:**
- ✅ Enable Email Provider
- ✅ Confirm email: ON
- ✅ Secure email change: ON
- Configure SMTP (ou use Supabase SMTP)

**Google OAuth (Opcional):**
1. Criar projeto no [Google Cloud Console](https://console.cloud.google.com)
2. Habilitar Google Calendar API
3. Configurar OAuth consent screen
4. Criar credenciais OAuth 2.0
5. Adicionar redirect URI: `https://{project_ref}.supabase.co/auth/v1/callback`
6. Copiar Client ID e Client Secret para Supabase

#### C. Configurações de Segurança
Acesse: `https://supabase.com/dashboard/project/{project_id}/auth/settings`

**OBRIGATÓRIO:**
- ✅ Leaked Password Protection: **ON**
- ✅ Minimum password length: 8
- ✅ Enable email confirmations: ON
- ✅ Enable custom access token: OFF (padrão)

**Rate Limiting:**
```
Authentication rate limit: 5 requests/hour
Password recovery rate limit: 3 requests/hour
```

#### D. Configurar Edge Functions

**Secrets necessários:**
```bash
# Configurar secrets no Supabase
supabase secrets set GOOGLE_CLIENT_ID="seu_client_id"
supabase secrets set GOOGLE_CLIENT_SECRET="seu_client_secret"
```

**Deploy de Edge Functions:**
```bash
# Deploy todas as functions
supabase functions deploy calendar-sync
supabase functions deploy google-oauth
supabase functions deploy notification-generator
```

#### E. Configurar Cron Jobs
Adicione em `supabase/config.toml`:

```toml
[functions.notification-generator]
verify_jwt = false

[[services.pg_cron]]
enabled = true
```

Execute SQL para configurar cron:
```sql
-- Gerar notificações a cada hora
SELECT cron.schedule(
  'generate-notifications',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://SEU_PROJECT_REF.supabase.co/functions/v1/notification-generator',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer SEU_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);
```

### 3. Configuração do Frontend

#### A. Build para Produção
```bash
# Teste build local
npm run build

# Teste preview da build
npm run preview
```

#### B. Deploy via Lovable
1. Click no botão "Publish" no canto superior direito
2. Aguarde o deploy automático
3. Anote a URL de produção: `https://seu-app.lovable.app`

#### C. Configurar Domínio Customizado (Opcional)
No Lovable:
1. Project > Settings > Domains
2. Adicionar seu domínio
3. Configurar DNS records:
```
Type: CNAME
Name: @
Value: cname.lovable.app
```

## 🔐 Configuração de Segurança Pós-Deploy

### 1. Primeiros Passos
```sql
-- Criar primeiro usuário admin
-- Execute no SQL Editor do Supabase
SELECT assign_pastor_role_to_user('seu-email@exemplo.com');
```

### 2. Verificar RLS
```sql
-- Verificar que todas as tabelas têm RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Todas devem ter rowsecurity = true
```

### 3. Teste de Segurança
- [ ] Login com usuário sem roles → deve ver apenas próprio perfil
- [ ] Login com pastor → deve ver todos os dados
- [ ] Tentar acessar dados de outro usuário → deve falhar
- [ ] Verificar audit logs → devem registrar ações

### 4. Configurar CORS (se necessário)
No Supabase Dashboard > API Settings:
```json
{
  "allowed_origins": [
    "https://seu-dominio.com",
    "https://seu-app.lovable.app"
  ]
}
```

## 📊 Monitoramento

### 1. Logs de Aplicação
**Supabase Logs:**
- Database logs: `https://supabase.com/dashboard/project/{project_id}/logs/postgres-logs`
- Auth logs: `https://supabase.com/dashboard/project/{project_id}/logs/auth-logs`
- Edge Function logs: `https://supabase.com/dashboard/project/{project_id}/functions`

### 2. Métricas de Performance
**Database Stats:**
```sql
-- Queries mais lentas
SELECT * FROM pg_stat_statements 
ORDER BY total_exec_time DESC 
LIMIT 10;

-- Tamanho das tabelas
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. Alertas Recomendados
Configure alertas para:
- Taxa de erro em Edge Functions > 5%
- Latência de queries > 1s
- Falhas de autenticação > 10/min
- Uso de storage > 80%

## 🔄 Processo de Atualização

### 1. Atualizações de Database
```bash
# Criar nova migration
supabase migration new nome_da_alteracao

# Editar arquivo em supabase/migrations/

# Testar localmente
supabase db reset

# Deploy para produção
supabase db push
```

### 2. Atualizações de Código
```bash
# Desenvolva e teste localmente
npm run dev

# Commit e push
git add .
git commit -m "Descrição da mudança"
git push

# Deploy via Lovable (automático) ou manual
npm run build
```

### 3. Rollback de Emergência

**Frontend:**
1. No Lovable, use o histórico de versões
2. Reverta para versão anterior estável

**Database:**
```bash
# Criar migration de rollback
supabase migration new rollback_nome

# Escrever SQL para reverter mudanças
# Deploy
supabase db push
```

## 📝 Checklist de Deploy

### Pré-Deploy
- [ ] Todas as migrations testadas localmente
- [ ] Build de produção funciona sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] Secrets do Supabase configurados
- [ ] RLS testado para todas as roles
- [ ] Testes de segurança passando

### Deploy
- [ ] Migrations aplicadas em produção
- [ ] Edge Functions deployadas
- [ ] Cron jobs configurados
- [ ] Frontend deployado
- [ ] SSL/HTTPS verificado

### Pós-Deploy
- [ ] Criar primeiro usuário admin
- [ ] Testar login/logout
- [ ] Verificar funcionalidades críticas
- [ ] Validar notificações
- [ ] Testar integração Google Calendar (se configurada)
- [ ] Verificar logs por erros
- [ ] Monitoramento configurado

## 🆘 Troubleshooting

### Problema: "Row violates RLS policy"
**Solução:**
1. Verificar se usuário está autenticado
2. Verificar se usuário tem role necessária
3. Verificar se `auth.uid()` está correto
4. Revisar políticas RLS da tabela

### Problema: Edge Function timeout
**Solução:**
1. Verificar logs da function
2. Otimizar queries lentas
3. Adicionar índices no database
4. Considerar batch processing

### Problema: "Invalid JWT"
**Solução:**
1. Verificar se JWT não expirou
2. Refresh token do usuário
3. Verificar se `SUPABASE_ANON_KEY` está correto

### Problema: Google Calendar não sincroniza
**Solução:**
1. Verificar se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão configurados
2. Verificar redirect URI no Google Console
3. Verificar logs da edge function `calendar-sync`
4. Re-conectar conta Google

## 📚 Recursos Adicionais

### Documentação
- [Supabase Documentation](https://supabase.com/docs)
- [Lovable Documentation](https://docs.lovable.dev)
- [React Documentation](https://react.dev)

### Comunidade
- [Supabase Discord](https://discord.supabase.com)
- [Lovable Discord](https://discord.com/channels/1119885301872070706)

### Ferramentas Úteis
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [pgAdmin](https://www.pgadmin.org/) - Para administração do PostgreSQL
- [Postman](https://www.postman.com/) - Para testar Edge Functions

## 🔄 Backup e Recuperação

### Backups Automáticos
O Supabase faz backups automáticos diários no plano Pro:
- Retenção: 7 dias (Free) / 30 dias (Pro)
- Point-in-time recovery disponível no plano Pro

### Backup Manual
```bash
# Backup do database
supabase db dump -f backup.sql

# Backup de arquivos (se usar Storage)
# Use dashboard do Supabase para download
```

### Restauração
```bash
# Restaurar de backup
psql -h db.PROJECT_REF.supabase.co -U postgres -d postgres -f backup.sql
```

---

**Última atualização**: 2025-11-01
**Versão**: 1.0

## 📞 Suporte

Para questões técnicas ou problemas de deployment:
1. Consulte a documentação oficial
2. Verifique os logs de erro
3. Entre em contato com suporte do Supabase (para questões de infraestrutura)
