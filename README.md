# Cuidar+ - Sistema de Gestão Pastoral e Discipulado

Sistema completo de gestão pastoral desenvolvido com React, TypeScript, Tailwind CSS e Supabase.

## 🚀 Quick Start

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 📚 Documentação Completa

Consulte [SISTEMA_COMPLETO.md](./SISTEMA_COMPLETO.md) para documentação detalhada de todas as funcionalidades implementadas.

## ✨ Principais Funcionalidades

- 🔐 Autenticação e sistema de permissões (roles)
- 👥 Gestão completa de membros
- 🏠 Gerenciamento de Igrejas no Lar
- 📅 Encontros 1 a 1 com integração Google Calendar
- 🎯 Reuniões gerais
- 📚 Planos de estudo e acompanhamento de progresso
- 🔔 Sistema de notificações automáticas
- 📊 Dashboard com métricas e gráficos
- 📈 Relatórios consolidados
- 🛡️ Auditoria completa de operações
- 👤 Perfil de usuário

## 🏗️ Stack Tecnológica

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Forms**: React Hook Form + Zod
- **Calendar**: Google Calendar API
- **Charts**: Recharts

## 📦 Estrutura

```
src/
├── components/     # Componentes React
├── pages/          # Páginas da aplicação
├── hooks/          # Custom hooks
├── lib/            # Utilitários e helpers
└── integrations/   # Integrações (Supabase)

supabase/
├── functions/      # Edge Functions
└── config.toml     # Configuração
```

## 🔒 Segurança

- Row Level Security (RLS) em todas as tabelas
- Sistema de roles granular
- Auditoria de todas as operações
- Error boundary para captura de erros

## 📱 Responsividade

Design 100% responsivo, funciona perfeitamente em:
- Desktop
- Tablet
- Mobile

## 🎨 Design System

Sistema de design completo com:
- Tokens semânticos HSL
- Suporte a dark mode
- Gradientes e animações
- Componentes altamente customizáveis

## 📊 Status do Projeto

✅ **100% Funcional** - Todas as funcionalidades core implementadas e testadas.

---

## Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/1c72844c-9f9b-4a74-85df-380fb0f72768

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/1c72844c-9f9b-4a74-85df-380fb0f72768) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/1c72844c-9f9b-4a74-85df-380fb0f72768) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
