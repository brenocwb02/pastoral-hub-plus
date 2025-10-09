# Cuidar+ - Sistema Completo de Gestão Pastoral

## 📋 Visão Geral

Sistema completo de gestão pastoral e discipulado desenvolvido com React, TypeScript, Tailwind CSS e Supabase. O Cuidar+ facilita o acompanhamento de membros, organização de casas de paz, agendamento de encontros 1 a 1, e muito mais.

## ✨ Funcionalidades Implementadas

### 🔐 Autenticação e Segurança
- [x] Sistema de autenticação completo com Supabase Auth
- [x] Row Level Security (RLS) em todas as tabelas
- [x] Sistema de roles (Pastor, Discipulador, Líder de Casa, Membro)
- [x] Auditoria completa de todas as operações (audit logs)
- [x] Protected Routes para páginas autenticadas
- [x] Error Boundary para captura de erros globais

### 👥 Gestão de Membros
- [x] CRUD completo de membros
- [x] Busca e filtros avançados (por nome, casa, discipulador)
- [x] Vinculação de membros a discipuladores e casas
- [x] Página de detalhes de cada membro
- [x] Histórico de progresso espiritual
- [x] Validação de dados com Zod

### 🏠 Igrejas no Lar (Casas)
- [x] Gerenciamento de casas de paz
- [x] Atribuição de líderes
- [x] Visualização de membros por casa
- [x] Controle de permissões por casa

### 📅 Encontros 1 a 1
- [x] Agendamento de encontros individuais
- [x] Integração com Google Calendar
- [x] Notificações automáticas de lembretes
- [x] Registro de outcomes e notas
- [x] Filtros por discipulador e status

### 🎯 Reuniões Gerais
- [x] Criação e gerenciamento de reuniões
- [x] Sincronização com Google Calendar
- [x] Controle de local e descrição
- [x] Notificações de eventos

### 📚 Planos de Estudo
- [x] Criação de planos de estudo bíblico
- [x] Atribuição de planos a membros
- [x] Acompanhamento de progresso
- [x] Status: não iniciado, em progresso, concluído

### 📊 Dashboard e Métricas
- [x] Métricas gerais (total de membros, casas, encontros)
- [x] Gráfico de membros por casa (BarChart)
- [x] Gráfico de progresso de estudos (PieChart)
- [x] Gráfico de crescimento mensal (LineChart)
- [x] Alertas de membros sem discipulador
- [x] Atividades recentes
- [x] Próximos eventos

### 🔔 Sistema de Notificações
- [x] Notificações automáticas de lembretes de encontros (1 hora antes)
- [x] Alertas de membros inativos (sem encontro há 30+ dias)
- [x] Cron job automático rodando a cada hora
- [x] Interface de visualização e gerenciamento de notificações
- [x] Status de notificações (pendente, enviada, erro)

### 📈 Relatórios
- [x] Relatório consolidado de membros
- [x] Relatório de casas e líderes
- [x] Relatório de encontros 1 a 1
- [x] Relatório de reuniões gerais
- [x] Relatório de progresso de estudos
- [x] Exportação de relatórios (formato texto)
- [x] Permissões: apenas Pastor e Líder de Casa

### 🗓️ Calendário
- [x] Visualização de eventos integrada
- [x] Conexão com Google Calendar
- [x] OAuth 2.0 para autenticação Google
- [x] Criação de eventos direto no calendário
- [x] Filtro por data e tipo de evento

### 👤 Perfil do Usuário
- [x] Página de perfil pessoal
- [x] Edição de informações (nome, telefone)
- [x] Visualização de roles/permissões
- [x] Validação de dados

### 🛡️ Administração
- [x] Gerenciamento de roles (Admin Roles)
- [x] Atribuição de papéis a usuários
- [x] Auditoria de todas as operações
- [x] Filtros de auditoria por tabela e ação
- [x] Apenas pastores têm acesso

### 🎨 Design System
- [x] Design system completo com tokens semânticos HSL
- [x] Suporte a dark mode
- [x] Gradientes e sombras customizadas
- [x] Animações e transições
- [x] Componentes shadcn/ui totalmente customizados
- [x] Responsive design em todas as páginas

### 🔍 SEO e Performance
- [x] Meta tags dinâmicas em todas as páginas
- [x] Títulos e descrições otimizadas
- [x] Loading states em todas as operações
- [x] Error handling robusto
- [x] Componente de loading global

## 🏗️ Arquitetura

### Frontend
- **React 18** - Framework principal
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Componentes UI
- **React Hook Form + Zod** - Validação de formulários
- **TanStack Query** - Data fetching
- **React Router** - Navegação

### Backend
- **Supabase** - Backend as a Service
- **PostgreSQL** - Banco de dados
- **Row Level Security** - Segurança em nível de linha
- **Edge Functions** - Lógica serverless
- **pg_cron** - Agendamento de tarefas

## 📦 Estrutura do Projeto

```
src/
├── components/
│   ├── ui/                      # Componentes shadcn/ui
│   ├── google/                  # Componentes Google Calendar
│   ├── ErrorBoundary.tsx        # Error boundary global
│   ├── LoadingScreen.tsx        # Tela de loading
│   ├── Navigation.tsx           # Navegação principal
│   ├── NotificationBell.tsx     # Sino de notificações
│   ├── ProtectedRoute.tsx       # Proteção de rotas
│   └── SearchAndFilters.tsx     # Componente de busca/filtros
├── hooks/
│   ├── useUserRoles.ts          # Hook de roles
│   ├── useGoogleCalendar.ts     # Hook Google Calendar
│   └── use-toast.ts             # Hook de toast
├── integrations/supabase/
│   ├── client.ts                # Cliente Supabase
│   └── types.ts                 # Tipos TypeScript gerados
├── lib/
│   ├── formatters.ts            # Formatadores (telefone, etc)
│   ├── seo.ts                   # Funções SEO
│   ├── utils.ts                 # Utilitários
│   └── validations.ts           # Schemas de validação Zod
├── pages/
│   ├── Index.tsx                # Landing page
│   ├── Auth.tsx                 # Autenticação
│   ├── Dashboard.tsx            # Dashboard principal
│   ├── Members.tsx              # Gestão de membros
│   ├── MemberDetails.tsx        # Detalhes do membro
│   ├── Houses.tsx               # Igrejas no Lar
│   ├── OneOnOnes.tsx            # Encontros 1 a 1
│   ├── Meetings.tsx             # Reuniões gerais
│   ├── Plans.tsx                # Planos de estudo
│   ├── Progress.tsx             # Progresso
│   ├── Calendar.tsx             # Calendário
│   ├── Notifications.tsx        # Notificações
│   ├── Reports.tsx              # Relatórios
│   ├── Profile.tsx              # Perfil do usuário
│   ├── AdminRoles.tsx           # Admin de roles
│   ├── AuditLogs.tsx            # Logs de auditoria
│   └── NotFound.tsx             # Página 404
└── index.css                    # Design system e estilos globais

supabase/
├── functions/
│   ├── calendar-sync/           # Sincronização Google Calendar
│   ├── google-oauth/            # OAuth Google
│   └── notification-generator/  # Gerador de notificações
└── config.toml                  # Configuração Supabase
```

## 🔧 Configuração e Deploy

### 1. Variáveis de Ambiente
O projeto já está configurado com:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET

### 2. Banco de Dados
Todas as tabelas, triggers, functions e RLS policies estão configuradas:
- `membros` - Membros da igreja
- `casas` - Igrejas no Lar
- `encontros_1a1` - Encontros individuais
- `reunioes_gerais` - Reuniões gerais
- `planos_estudo` - Planos de estudo
- `progresso` - Progresso dos membros
- `notifications` - Notificações
- `user_roles` - Roles dos usuários
- `profiles` - Perfis dos usuários
- `google_tokens` - Tokens Google OAuth
- `audit_logs` - Logs de auditoria

### 3. Cron Jobs Configurados
- **Gerador de Notificações**: Roda a cada hora para verificar encontros próximos e membros inativos

### 4. Edge Functions Implementadas
- `notification-generator` - Gera notificações automáticas
- `google-oauth` - Autenticação Google
- `calendar-sync` - Sincronização de calendário

### 5. Segurança (Avisos)
⚠️ **Ações necessárias no Supabase Dashboard:**
1. Habilitar "Leaked Password Protection" nas configurações de Auth
2. Atualizar versão do PostgreSQL para aplicar patches de segurança

## 🚀 Como Usar

### Primeiro Acesso (Admin)
1. Criar conta com email cadastrado como admin
2. O sistema automaticamente atribui role de "pastor"
3. Acessar "Papéis" para gerenciar outros usuários

### Fluxo de Trabalho Típico
1. **Pastor** cria casas e atribui líderes
2. **Pastor/Discipulador** cadastra novos membros
3. **Discipulador** agenda encontros 1 a 1
4. Sistema envia notificações automáticas
5. **Líder/Pastor** acompanha progresso no Dashboard
6. **Pastor** visualiza relatórios consolidados

### Permissões por Role
- **Pastor**: Acesso total ao sistema
- **Discipulador**: Gerencia seus discípulos e encontros
- **Líder de Casa**: Gerencia membros de sua casa
- **Membro**: Visualiza seus próprios dados e progresso

## 📱 Funcionalidades Mobile
- Design 100% responsivo
- Menu mobile otimizado
- Touch-friendly em todos os componentes
- Funciona perfeitamente em smartphones e tablets

## 🎯 Próximos Passos (Opcional)
- [ ] Notificações por email (Resend)
- [ ] Notificações por WhatsApp
- [ ] Sistema de mensagens internas
- [ ] Upload de fotos de perfil
- [ ] Exportação de relatórios em PDF
- [ ] Dashboard personalizado por role
- [ ] Sistema de metas e objetivos

## 📄 Licença
Projeto desenvolvido para gestão pastoral e discipulado.

## 🙏 Suporte
Para dúvidas ou suporte, consulte a documentação do Supabase e React.

---

**Status do Sistema**: ✅ 100% Funcional

Todas as funcionalidades core estão implementadas e testadas. O sistema está pronto para uso em produção.
