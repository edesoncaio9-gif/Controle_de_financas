# Documentação do Sistema — Gestão Financeira

Versão: 1.0
Data: 2026-06-10

Resumo
- Aplicação web single-user para controle pessoal de finanças (receitas e despesas).
- Projeto leve, executado localmente no navegador com persistência em `localStorage`.
- Suporte PWA para instalação em dispositivos móveis; possibilidade de empacotar com Capacitor.

Objetivo
- Permitir adicionar/editar/remover transações, visualizar resumo (saldo, receitas, despesas), filtrar e fazer backup via CSV.

Arquitetura e arquivos principais
- `index.html`: estrutura da interface (formulário, resumo, lista, controles de import/export, botão de instalação PWA).
- `styles.css`: estilos responsivos e regras de acessibilidade/touch targets.
- `app.js`: lógica principal:
  - Modelo de dados: cada transação tem `{ id, type, amount, date, category, note }`.
  - Persistência: usa `localStorage` sob a chave `transactions_v1`.
  - Render: funções para renderizar resumo (`renderSummary`) e lista (`renderTransactions`).
  - Operações: criar (`addTransactionFromForm`), remover (`deleteTransaction`), exportar/importar CSV.
  - PWA: registro do `service-worker.js` e tratamento do evento `beforeinstallprompt` para mostrar botão de instalação.
- `manifest.json`: metadados para PWA (nome, ícones, start_url, display).
- `service-worker.js`: cache simples do app shell para funcionar offline.
- `icon.svg`: ícone do app usado no manifest e em atalhos.
- `README.md`: instruções rápidas de uso e empacotamento com Capacitor.
- `DOCUMENTATION.md`: este documento.

Modelo de dados
- Transaction:
  - `id`: identificador único (string).
  - `type`: `income` ou `expense`.
  - `amount`: número (positivo) — armazenado como um número decimal.
  - `date`: string no formato ISO `YYYY-MM-DD`.
  - `category`: string opcional.
  - `note`: string opcional.

Formato CSV suportado
- Cabeçalho esperado: `id,type,amount,date,category,note`.
- Cada linha corresponde a uma transação; campos envoltos por aspas são suportados.

Como funciona (fluxo de uso)
1. O usuário abre `index.html` (preferível via servidor local para ativar service worker).
2. Preenche o formulário e envia: `app.js` valida os campos, cria um objeto `Transaction`, persiste no `localStorage` e re-renderiza a UI.
3. Resumo (saldo, receitas, despesas) é calculado a partir das transações armazenadas.
4. Usuário pode filtrar a lista por categoria/nota, exportar todas as transações em CSV ou importar um CSV existente.
5. No navegador compatível, o app pode ser instalado como PWA (botão ou menu do navegador). Service worker provê cache do app shell.

Rodando localmente (recomendações)
- Rode um servidor estático para ativar PWA/service worker. Exemplos:

```bash
npx http-server -c-1
# ou
python -m http.server 8000
```

- Abra `http://localhost:8080` (ou porta exibida) no navegador. Para testes em celular, use a mesma URL na rede local.

Empacotamento para app nativo (opcional)
- Recomendo usar Capacitor para gerar builds Android/iOS. Fluxo resumido:

```bash
npm init -y
npm install @capacitor/cli @capacitor/core --save-dev
npx cap init
# Copie a pasta do projeto para `www` e então:
npx cap add android
npx cap add ios
npx cap copy
npx cap open android
```

Considerações de segurança e privacidade
- Todos os dados ficam localmente no dispositivo (localStorage). Não há transmissão para servidores.
- Faça exportação/backup periódico em CSV para prevenir perda.

Possíveis melhorias futuras
- Edição de transações (atualmente há remover; pode-se adicionar editar inline/modal).
- Relatórios mensais e gráficos por categoria (SVG ou Chart.js) — pendente.
- Suporte a transações recorrentes e orçamentos mensais.
- Backend opcional (Node + SQLite/Postgres) para sincronização multiusuário.
- Melhor tratamento do service worker para atualizações (cache versioning e fallback melhorado).

Testes e verificação
- Testes manuais recomendados:
  - Adicionar 5 receitas e 5 despesas; verificar valores de resumo e persistência após reload.
  - Exportar CSV e reimportar; verificar integridade dos dados.
  - Testar instalação PWA em Android/iOS (via Chrome/Edge/Safari) e comportamento offline.

Notas do desenvolvedor
- Projeto construído para ser simples, legível e fácil de estender. Código central em `app.js` é modular o suficiente para migrar a persistência para um backend posteriormente.

Como foi criado
- Planejamento rápido: definiu-se escopo single-user com foco em simplicidade (CRUD de transações, resumo, import/export).
- Estrutura: criei manualmente os arquivos principais (`index.html`, `styles.css`, `app.js`) e um `manifest.json` e `service-worker.js` para PWA.
- Implementação: usei JavaScript vanilla (ES6+), manipulando o DOM diretamente, sem frameworks para manter a base leve e fácil de entender.
- Testes: verificação manual em navegador desktop e mobile (inserir/editar/remover, export/import CSV, instalar PWA).

Tecnologias usadas
- HTML5 e CSS3: marcação semântica e estilos responsivos.
- JavaScript (ES6+): lógica de aplicação, módulos simples e eventos DOM.
- `localStorage`: armazenamento local para persistência de dados no cliente.
- Service Worker & Web App Manifest: suporte PWA (instalável e cache offline).
- SVG: ícone simples (`icon.svg`) incluído no manifest.
- Ferramentas opcionais de empacotamento: Capacitor (recomendado) para transformar em app Android/iOS.

Boas práticas aplicadas
- Separação clara entre apresentação (`index.html` / `styles.css`) e lógica (`app.js`).
- Uso de `aria-live` em resumo para informar alterações de valores para leitores de tela.
- Valores monetários formatados com `Intl.NumberFormat` para `pt-BR`.
- CSV import/export com tratamento básico de aspas e separadores.

Contato
- Se quiser que eu expanda a documentação com diagramas, fluxos de dados ou um guia step-by-step para empacotar no Android/iOS, diga qual opção prefere.
