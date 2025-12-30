# Edge Functions - Testes Automatizados

Este diretório contém as Edge Functions do sistema e seus testes automatizados.

## Estrutura de Testes

Cada Edge Function crítica possui um arquivo de teste correspondente:

```
supabase/functions/
├── check-achievements/
│   ├── index.ts          # Função principal
│   └── index.test.ts     # Testes
├── notification-generator/
│   ├── index.ts
│   └── index.test.ts
├── calendar-sync/
│   ├── index.ts
│   └── index.test.ts
├── google-oauth/
│   ├── index.ts
│   └── index.test.ts
└── README.md
```

## Executando os Testes

### Pré-requisitos

- [Deno](https://deno.land/) instalado (versão 1.40+)

### Comandos

```bash
# Executar todos os testes
deno test supabase/functions/

# Executar testes de uma função específica
deno test supabase/functions/check-achievements/index.test.ts

# Executar com cobertura
deno test --coverage=coverage supabase/functions/

# Executar em modo watch
deno test --watch supabase/functions/
```

## Cobertura de Testes

### check-achievements
- ✅ Validação de UUID (previne SQL injection)
- ✅ Cálculo de progresso
- ✅ Cálculo de nível
- ✅ Verificação de conquista desbloqueada
- ✅ Headers CORS

### notification-generator
- ✅ Cálculo de tempo de lembrete (1h antes)
- ✅ Verificação de membro inativo (30 dias)
- ✅ Filtro de reuniões próximas (24h)
- ✅ Tipos de eventos de notificação
- ✅ Deduplicação de notificações

### calendar-sync
- ✅ Conversão de datas ISO
- ✅ Verificação de expiração de token
- ✅ Construção de payload de evento
- ✅ Validação de ações
- ✅ Construção de paths da API Google Calendar
- ✅ Validação de intervalos de data

### google-oauth
- ✅ Validação de formato JWT
- ✅ Validação de ações OAuth
- ✅ Construção de URL de autenticação
- ✅ Validação de escopos
- ✅ Validação de resposta de token
- ✅ Cálculo de data de expiração

## Boas Práticas

1. **Isolamento**: Cada teste deve ser independente
2. **Clareza**: Nomes descritivos para os testes
3. **Cobertura**: Testar casos normais e de borda
4. **Segurança**: Incluir testes para validação de entrada

## Adicionando Novos Testes

1. Crie um arquivo `index.test.ts` na pasta da função
2. Importe as assertions do Deno std library
3. Use `Deno.test()` para cada caso de teste
4. Execute os testes localmente antes de fazer commit
