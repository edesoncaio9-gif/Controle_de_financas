# Sistema de Gestão Financeira (local)

Aplicação web simples para controlar receitas e despesas localmente usando `localStorage`.

Como usar

1. Abra `index.html` no seu navegador (recomendado via servidor local, ex: `npx http-server` ou `python -m http.server`).
2. Preencha o formulário para adicionar transações (Receita/Despesa).
3. Utilize o filtro para buscar por categoria ou nota.
4. Exporte ou importe transações em CSV para backup/restore.

PWA / App para celular

- O aplicativo já tem suporte PWA: instale pelo navegador (menu > "Adicionar à tela inicial") ou use o botão "Instalar app" quando disponível.
- Para testar o PWA localmente rode um servidor estático e abra `index.html` pelo `http://localhost:PORT`.
- Para empacotar como app nativo, recomendo usar Capacitor (Ionic) ou Cordova. Exemplo rápido com Capacitor:

```bash
npm init -y
npm install @capacitor/cli @capacitor/core --save-dev
npx cap init
# Copie os arquivos da pasta para www e depois:
npx cap add android
npx cap add ios
npx cap copy
npx cap open android
```

Observações

- Aplicação single-user; os dados ficam no navegador (`localStorage`). Fazer backup/export regularmente.
- Service Worker simples para cache de recursos; rode via servidor para ativá-lo.

Tecnologias e como foi criado

- Estrutura: HTML5, CSS3 e JavaScript (ES6+), sem frameworks para manter a aplicação leve.
- Persistência: `localStorage` para armazenamento local das transações.
- PWA: `manifest.json` e `service-worker.js` para instalação e cache offline.
- Ícone: `icon.svg` (SVG) usado no manifest.
- Empacotamento: use Capacitor para transformar em app nativo (Android/iOS).

