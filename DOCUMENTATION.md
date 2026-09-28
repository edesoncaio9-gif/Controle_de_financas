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
# Documentação técnica — Gestão Financeira

## Arquitetura atual

O repositório contém uma aplicação web e um launcher Android:

- **Web:** frontend HTML/CSS/JavaScript servido pelo Express, API Node.js e persistência de contas e transações no PostgreSQL.
- **Android:** atividade WebView que abre o mesmo frontend no servidor e, portanto, compartilha a API e o PostgreSQL com o PC. A implementação Compose/Room anterior permanece no código, mas não é a atividade de entrada atual.

Na aplicação web, o token JWT da sessão fica no navegador. As transações não são armazenadas no `localStorage`: leitura, criação e remoção disponíveis no painel passam pela API e pelo PostgreSQL, associadas ao usuário autenticado. A API também tem rota de atualização, embora a interface ainda não ofereça essa ação.

Transações que eventualmente tenham sido salvas por versões antigas no navegador não são migradas automaticamente. A integração não apaga essa cópia antiga, mas a interface atual não a carrega.

## Fluxo web

1. O usuário cria uma conta ou entra com endereço `@gmail.com` em `login.html`.
2. `login.js` envia as credenciais para `/api/users` ou `/api/login`. O backend usa bcrypt para hash de senha e retorna um JWT após autenticação.
3. `app.js` envia o JWT nas chamadas à API, carrega as transações de `/api/transactions` e mantém os dados carregados em memória enquanto a página está aberta.
4. Inclusões e remoções são enviadas à API. O histórico, os totais e os gráficos são atualizados com a resposta ou com o conjunto carregado do banco.
5. A exportação CSV usa as transações da conta retornadas pela API. A importação valida os campos e envia as linhas ao backend.
6. O botão **Sair** remove o token da sessão no navegador e abre `login.html`.

## API

As rotas de transações exigem um token JWT válido e filtram operações pelo ID do usuário autenticado:

- `POST /api/users`: cadastro de usuário Gmail.
- `POST /api/login`: autenticação e emissão de JWT.
- `GET /api/transactions`: lista transações do usuário.
- `POST /api/transactions`: cria transação (`type`, `amount`, `date`, `category`, `note`). Os tipos aceitos pelo backend são `receita` e `despesa`.
- `PUT /api/transactions/:id`: atualiza transação. A rota existe na API; a interface web atual não oferece edição.
- `DELETE /api/transactions/:id`: remove transação pertencente ao usuário.
- `GET /api/dashboard`: retorna totais agregados do usuário.
- `GET /api/test-db`: testa a conexão com PostgreSQL.

## PostgreSQL e configuração

`backend/db.js` carrega as configurações de `backend/.env`:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`

O esquema deve fornecer a tabela `users` com `id`, `name`, `email`, `password_hash` e `created_at`, e `transactions` com `id`, `user_id`, `type`, `amount`, `date`, `category`, `note` e `created_at`. O backend não executa migrações nem cria essas tabelas automaticamente.

O endereço da API está definido nos dois arquivos do frontend:

- `login.js`: `http://172.28.4.149:3000/api`
- `app.js`: `http://172.28.4.149:3000/api`

Se o servidor mudar de IP ou porta, atualize ambos para apontarem ao mesmo backend. O Express serve os arquivos web na porta `PORT` ou, por padrão, `3000`.

Instalação das dependências e inicialização, na raiz do repositório:

```bash
npm install --prefix backend
npm run backend
```

## Transações e CSV

O modelo usado pela interface web é `{ id, type, amount, date, category, note }`, adaptado pela API aos valores PostgreSQL. A exportação produz `transacoes.csv` em UTF-8 com BOM, ponto e vírgula como delimitador, vírgula decimal e data `dd/mm/aaaa`. A importação reconhece cabeçalhos em português e inglês e formatos delimitados por vírgula ou ponto e vírgula. Cada linha válida é inserida pela rota protegida de criação.

## Android, PWA e arquivos principais

O launcher Android precisa de acesso de rede ao host `172.28.4.149:3000`. Como o servidor atual usa HTTP, `res/xml/network_security_config.xml` permite cleartext apenas para esse host. Use HTTPS antes de expor a aplicação em uma rede pública. A WebView habilita JavaScript e DOM storage para a sessão JWT; usa seletor Android para abrir CSV e `ACTION_CREATE_DOCUMENT` para salvar exportações.

- `index.html`, `login.html`: interfaces web.
- `app.js`, `login.js`: lógica de painel, transações e autenticação.
- `styles.css`: estilos responsivos.
- `backend/server.js`: servidor Express, autenticação e rotas de negócio.
- `backend/authMiddleware.js`: autenticação JWT.
- `backend/db.js`: pool de conexões PostgreSQL.
- `manifest.json`, `service-worker.js`: metadados de instalação e cache dos recursos web.
- `android/`: launcher WebView, política de rede e implementação nativa anterior Compose/Room.
- HTML5 e CSS3: marcação semântica e estilos responsivos.
