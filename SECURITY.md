# Guia de Segurança - Cuidar+

## 🔒 Práticas de Segurança Implementadas

### 1. Autenticação e Autorização

#### Sistema de Roles
- **Separação de privilégios**: Roles armazenadas em tabela dedicada `user_roles`
- **Tipos de roles disponíveis**: `pastor`, `discipulador`, `lider_casa`, `membro`
- **Função de verificação segura**: `has_role()` com `SECURITY DEFINER` para evitar recursão RLS

```sql
-- Exemplo de verificação de role
SELECT has_role(auth.uid(), 'pastor'::app_role);
```

#### Autenticação Obrigatória
- Todas as políticas RLS verificam explicitamente `auth.uid() IS NOT NULL`
- Proteção contra acesso não autenticado em todas as tabelas
- Session management via Supabase Auth

### 2. Row-Level Security (RLS)

#### Tabelas Protegidas
Todas as tabelas possuem RLS habilitado:

| Tabela | Políticas | Acesso |
|--------|-----------|--------|
| `profiles` | SELECT, INSERT, UPDATE, DELETE | Apenas próprio usuário |
| `membros` | SELECT, INSERT, UPDATE, DELETE | Pastores, discipuladores, membros (self) |
| `casas` | SELECT, INSERT, UPDATE, DELETE | Pastores, líderes, discipuladores |
| `encontros_1a1` | SELECT, INSERT, UPDATE, DELETE | Pastores, discipuladores envolvidos |
| `reunioes_gerais` | SELECT, INSERT, UPDATE, DELETE | Todos leem, pastores gerenciam |
| `planos_estudo` | SELECT, INSERT, UPDATE, DELETE | Todos leem, pastores gerenciam |
| `progresso` | SELECT, INSERT, UPDATE | Pastor, discipulador, membro (self) |
| `notifications` | SELECT, INSERT, UPDATE, DELETE | Apenas próprio usuário |
| `google_tokens` | ALL | Apenas próprio usuário |
| `audit_logs` | SELECT | Apenas pastores |
| `user_roles` | SELECT, INSERT, UPDATE, DELETE | Self (view), Pastores (manage) |

#### Princípios Aplicados
- **Least Privilege**: Usuários têm apenas permissões necessárias
- **Defense in Depth**: Múltiplas camadas de verificação
- **Fail Secure**: Negação por padrão, permissão explícita

### 3. Dados Sensíveis

#### Informações Pessoais (PII)
- **Criptografia em trânsito**: HTTPS obrigatório
- **Criptografia em repouso**: Gerenciada pelo Supabase
- **Acesso limitado**: RLS garante que usuários vejam apenas seus dados

#### Tokens OAuth
- Tabela `google_tokens` com RLS restrito
- Refresh tokens armazenados de forma segura
- Políticas impedem acesso cruzado entre usuários

#### Audit Logs
- Registro de todas as alterações (INSERT, UPDATE, DELETE)
- Acesso restrito apenas a pastores
- Dados históricos em JSONB para auditoria

### 4. Proteção Contra Ataques

#### SQL Injection
- ✅ Uso exclusivo de prepared statements via Supabase client
- ✅ Validação de entrada com Zod schemas
- ✅ Sanitização automática pelo ORM

#### XSS (Cross-Site Scripting)
- ✅ React escapa conteúdo automaticamente
- ✅ Sanitização de inputs em formulários
- ✅ CSP headers configurados no deployment

#### CSRF (Cross-Site Request Forgery)
- ✅ Tokens CSRF gerenciados pelo Supabase Auth
- ✅ SameSite cookies configurados
- ✅ Verificação de origem das requisições

#### Privilege Escalation
- ✅ Roles em tabela separada (não em localStorage)
- ✅ Verificação server-side obrigatória
- ✅ Impossível manipular roles via client

### 5. Configurações Supabase Obrigatórias

#### Auth Settings
Acesse: `https://supabase.com/dashboard/project/{project_id}/auth/providers`

1. **Enable Email Confirmations**: ✅ Ativado
2. **Leaked Password Protection**: ⚠️ **ATIVAR MANUALMENTE**
   - Vai para Auth > Settings
   - Ative "Leaked Password Protection"
   - Requer PostgreSQL 15+

3. **Rate Limiting**: Configurar limites
   - Login attempts: 5 por hora
   - Password reset: 3 por hora

#### Database Settings
1. **SSL Mode**: Require
2. **Connection Pooling**: Configurado para produção
3. **Backups**: Automáticos diários

### 6. Monitoramento e Auditoria

#### Logs de Auditoria
- Todas as operações críticas são registradas
- Tabela `audit_logs` rastreia:
  - Quem fez a alteração (`changed_by`)
  - Quando foi feita (`changed_at`)
  - O que foi alterado (`old_data`, `new_data`)
  - Qual tabela (`table_name`)

#### Monitoramento de Edge Functions
- Logs disponíveis no Supabase Dashboard
- Erros são capturados e registrados
- Retry logic para operações críticas

### 7. Segurança no Frontend

#### Proteção de Rotas
```typescript
// Componente ProtectedRoute valida autenticação
<ProtectedRoute>
  <DashboardPage />
</ProtectedRoute>
```

#### Validação de Dados
- Zod schemas para todos os formulários
- Validação client-side e server-side
- Mensagens de erro sanitizadas

#### Gestão de Secrets
- Variáveis de ambiente via `.env`
- **NUNCA** commitar credenciais
- Usar secrets do Supabase para Edge Functions

## 🚨 Checklist de Segurança (Deployment)

### Pré-Deploy
- [ ] Todas as tabelas têm RLS habilitado
- [ ] Políticas RLS testadas para cada role
- [ ] Leaked Password Protection ativado
- [ ] SSL certificates configurados
- [ ] Variáveis de ambiente configuradas
- [ ] Secrets do Supabase configurados
- [ ] Rate limiting configurado

### Pós-Deploy
- [ ] Testar login/logout
- [ ] Verificar acesso de cada role
- [ ] Testar criação/edição de dados sensíveis
- [ ] Verificar logs de auditoria
- [ ] Monitorar erros nas Edge Functions
- [ ] Validar HTTPS obrigatório

## 🔐 Boas Práticas

### Para Desenvolvedores
1. **Nunca desabilitar RLS** para "facilitar" desenvolvimento
2. **Sempre usar** `auth.uid()` para verificar identidade
3. **Testar políticas** com diferentes roles antes do deploy
4. **Revisar audit logs** regularmente
5. **Manter dependências atualizadas** (npm audit)

### Para Administradores
1. **Atribuir roles com cuidado** - pastor tem acesso total
2. **Revisar user_roles** periodicamente
3. **Monitorar atividades suspeitas** nos audit logs
4. **Fazer backups** antes de alterações críticas
5. **Documentar mudanças** de permissões

## 📚 Referências

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Best Practices](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/user-manag.html)

## 🆘 Suporte

Em caso de incidentes de segurança:
1. Revogue tokens comprometidos imediatamente
2. Analise audit logs para identificar escopo
3. Notifique usuários afetados
4. Documente o incidente
5. Implemente correções

---

**Última atualização**: 2025-11-01
**Versão**: 1.0
