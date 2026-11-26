# Índice de evidências reais — n8n + API Express em modo mock

**Capturas feitas em 25/11/2026** durante o teste de uma solicitação fictícia. Todas correspondem ao ambiente local do aluno; foram incluídas sem substituir o resultado da aplicação por conteúdo sintetizado.

> **Transparência:** o fluxo foi executado com `AI_MODE=mock`. As evidências mostram integração do n8n com Express e regras de triagem. Não demonstram inferência de IA generativa, que permaneceu pendente por retorno HTTP 429.

| Arquivo | O que comprova |
|---|---|
| `01-fluxo-completo.png` | Workflow com os seis nodes conectados e verdes após execução |
| `01a-fluxo-detalhe-recorte.png` | Recorte ampliado da imagem anterior, sem modificação de dados/resultados |
| `02-execucao-completa.png` | Visão geral do fluxo concluído em execução de teste |
| `03-webhook-configuracao.png` | Parâmetros do Webhook: POST, path e resposta por node dedicado |
| `04-webhook-dados-recebidos.png` | Corpo recebido, com solicitação fictícia, em visualização Table |
| `05-webhook-json-recebido.png` | Corpo recebido, com solicitação fictícia, em visualização JSON |
| `06-validacao-normalizacao.png` | Código JavaScript e saída do node 02 |
| `07-api-classificacao-simulada.png` | POST na API Express e saída estruturada (`SIMULACAO_SEM_IA`) |
| `08-fila-setorial.png` | Código e resultado da definição de fila e prioridade |
| `09-registro-encaminhamento.png` | Configuração HTTP POST e protocolo retornado pelo registro |
| `10-resposta-protocolo.png` | Saída do node Respond to Webhook com protocolo e status |
| `11-webhook-tabela-entrada.png` | Visão alternativa da entrada tabular do Webhook |
| `13-ambiente-vscode.png` | Estrutura do projeto aberta no VS Code e README |

## Como conferir

1. Importe `n8n/fluxo_triagem_kodie.json` no n8n local.
2. Configure a credencial `Header Auth` (nome do header `x-api-key`, valor do `.env`) nos nodes 03 e 05.
3. Execute `AI_MODE=mock` e envie `examples/solicitacao-critica.json` ao Webhook de teste.
4. Compare o seu retorno com as capturas de saída e do protocolo.
5. Para a avaliação obrigatória de IA real, troque para `AI_MODE=live` **somente com credenciais/quota válidas** e anexe capturas adicionais da execução live.

**Segurança:** as imagens não incluem o conteúdo do `.env` nem o valor de segredo da credencial; o repositório nunca deve incluir esses arquivos.
