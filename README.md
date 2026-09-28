# Sistema de Gestão Financeira

O repositório contém uma aplicação web com frontend em JavaScript, API Node.js/Express e PostgreSQL, além de um aplicativo Android nativo independente.

## Aplicação web

O frontend web autentica usuários com endereço Gmail e senha. As senhas são armazenadas pela API como hashes; após o login, a API emite um token JWT.

As transações financeiras da aplicação web são carregadas e persistidas no PostgreSQL por meio da API autenticada, vinculadas ao usuário conectado. O navegador mantém o token da sessão; não é usado como banco de transações.

O painel oferece:

- Cadastro e login de usuários com Gmail.
- Inclusão e remoção de receitas e despesas.
- Resumo de saldo, receitas e despesas, gráficos e filtro do histórico.
- Importação e exportação de transações CSV.
- Instalação como PWA quando suportada pelo navegador.
- Botão para sair e voltar à tela de login.

### Requisitos

- Node.js e npm.
- PostgreSQL acessível pelo servidor da API.
- Banco configurado com as tabelas `users` e `transactions` usadas pelo backend.

### Configuração e execução

1. Configure `backend/.env` com `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` e `JWT_SECRET`. Use valores próprios do ambiente e não publique credenciais.
2. Instale as dependências do backend a partir da raiz do repositório:

	```bash
	npm install --prefix backend
	```

3. Inicie a API e o servidor web:

	```bash
	npm run backend
	```

4. Abra `http://172.28.4.149:3000/` na rede em que o servidor está acessível.

O endereço da API está configurado em `login.js` e `app.js` como `http://172.28.4.149:3000/api`. Se o endereço ou a porta do servidor mudar, atualize os dois arquivos.

O backend espera as tabelas PostgreSQL `users` (com `id`, `name`, `email`, `password_hash`, `created_at`) e `transactions` (com `id`, `user_id`, `type`, `amount`, `date`, `category`, `note`, `created_at`). O backend não cria essas tabelas automaticamente; preserve e use o esquema já configurado no banco.

Transações antigas que eventualmente existam no navegador não são copiadas automaticamente para o PostgreSQL. A integração não apaga os dados antigos do navegador, mas deixa de carregá-los no painel.

### API web

- `POST /api/users`: cria uma conta Gmail.
- `POST /api/login`: autentica e retorna o token JWT.
- `GET /api/transactions`: lista as transações do usuário autenticado.
- `POST /api/transactions`: cria uma transação para esse usuário.
- `PUT /api/transactions/:id`: atualiza uma transação.
- `DELETE /api/transactions/:id`: remove uma transação.
- `GET /api/dashboard`: retorna os totais do usuário.

### CSV e Excel

A exportação gera `transacoes.csv` em UTF-8 com BOM, usando ponto e vírgula entre colunas, vírgula decimal e datas `dd/mm/aaaa`. Inclui ID, tipo, valor, data, categoria e observação. A importação aceita cabeçalhos em português ou inglês e separadores por ponto e vírgula ou vírgula. Os registros importados são enviados à API e gravados no PostgreSQL.

## Aplicativo Android

A pasta `android/` contém um APK wrapper Android que abre a versão web do sistema. Ele usa a mesma API PostgreSQL e conta do PC, desde que o aparelho consiga acessar `172.28.4.149:3000` pela rede. O servidor atual usa HTTP e deve permanecer em uma rede confiável; configure HTTPS antes de expor o sistema publicamente. As classes Compose/Room antigas continuam no projeto, mas não são abertas pelo launcher atual. Instruções para gerar o APK estão em [android/README.md](android/README.md).

## Arquivos principais

- `login.html` / `login.js`: tela e lógica de cadastro/login web.
- `index.html` / `app.js`: painel e operações web, conectados à API.
- `styles.css`: estilos da aplicação web.
- `backend/server.js`: API Express e servidor dos arquivos web.
- `backend/db.js`: conexão PostgreSQL configurada por `backend/.env`.
- `backend/authMiddleware.js`: validação dos tokens JWT.
- `manifest.json` / `service-worker.js`: instalação PWA e cache de recursos web.

