# Interface Web KODIE — execução rápida sem Docker

A interface é um diferencial visual ao projeto. É servida pela API Express existente, sem outra hospedagem ou framework de interface.

## 1. Atualizar o projeto no VS Code

Abra Git Bash na pasta que contém package.json:

    cd ~/Documents/Projetos/kodie-triagem-inteligente
    git status
    git pull --ff-only origin main
    npm install
    npm test

Se git status indicar alterações locais, preserve-as antes de atualizar. **Nunca publique o arquivo .env.**

## 2. Confirmar Gemini real

No arquivo .env mantenha a chave já configurada:

    PORT=3000
    AI_MODE=live
    AI_PROVIDER=gemini
    GEMINI_API_KEY=SUA_CHAVE_REAL_GEMINI
    GEMINI_MODEL=gemini-3.5-flash-lite
    API_ACCESS_KEY=SUA_CHAVE_INTERNA_EXISTENTE

Use somente dados fictícios e não exponha os valores das chaves nos prints.

## 3. Iniciar a interface

**Terminal 1**, na pasta do projeto:

    node --env-file=.env src/server.js

Abra **http://localhost:3000**. A página e a API rodam na mesma porta. Não utilize Live Server nem abra o HTML como arquivo.

A interface consulta /health e identifica se o servidor está em modo live ou mock.

## 4. Modo direto: Gemini + API Express

1. No campo **Chave interna da API**, insira o valor de API_ACCESS_KEY do seu .env — **não é a chave Gemini**.
2. Clique em **Inserir exemplo crítico** ou escreva um relato fictício com pelo menos 15 caracteres.
3. Marque **Direto pela API Gemini**.
4. Clique em **Analisar solicitação**.

O navegador envia duas chamadas autenticadas:
- POST /api/analisar — classificação e aplicação das regras de criticidade;
- POST /api/encaminhamentos — gravação do registro e protocolo.

O painel mostra prioridade, setor, fila, status, protocolo e histórico. Neste modo, **os nodes do n8n não são executados**.

## 5. Modo completo: Gemini + API + n8n

1. Em um **Terminal 2**, execute:

       npx n8n@2

2. Abra http://localhost:5678 e entre no workflow KODIE.
3. Clique no node **01 — Receber solicitação** e depois em **Listen for test event**.
4. Volte ao painel em http://localhost:3000.
5. Marque **Fluxo completo pelo n8n** e clique em **Analisar solicitação**.

A API Express encaminha a solicitação ao endpoint local de teste do n8n:

    http://127.0.0.1:5678/webhook-test/kodie-triagem

O n8n executa seus seis nodes e retorna protocolo e status. A conexão é feita pelo backend para evitar bloqueios CORS entre as portas.

O Webhook de teste só responde enquanto **Listen for test event** estiver ativo. Em novos testes, pode ser necessário ativá-lo de novo.

## 6. Segurança e limitações

- A chave interna fica apenas no campo da sessão atual, sem gravação em localStorage ou sessionStorage.
- A chave do Gemini nunca é colocada no navegador. Fica apenas no .env do servidor.
- O painel é para **execução local educacional**. Não hospedá-lo publicamente sem controles adicionais de acesso e HTTPS.
- Não conecta SAP, sistemas corporativos ou equipamentos de campo.
- Em riscos críticos, é obrigatória revisão profissional; a IA não executa intervenções.
- O histórico usa o registro JSONL local da API.
- O modo direto não prova execução de automação no n8n; para demonstrá-la, use o modo completo.

## 7. Evidências

A interface visual é **opcional no desafio da KODIE**. Após testar com IA real e fluxo n8n, salve prints sem chaves de API na pasta docs/evidencias e atualize o README. Os requisitos obrigatórios de API, IA, automação e README já possuem documentação separada.
