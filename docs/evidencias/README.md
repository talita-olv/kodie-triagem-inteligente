# Índice de evidências — n8n + Express + Gemini (execução real e simulação)

**Capturas publicadas em 25–26/11/2026** a partir do ambiente local do projeto, usando solicitações fictícias. Incluem uma demonstração anterior em modo simulado e três capturas posteriores identificadas como execução com Gemini.

> **Transparência:** a série numerada de 01 a 13 corresponde à execução `AI_MODE=mock`, sem IA generativa. Os três arquivos `IA_REAL` foram adicionados depois e associados pela responsável à execução local Gemini. Sua existência no GitHub foi confirmada; o conteúdo visual exato não foi verificado nesta revisão.

## Prints enviados para a execução Gemini

| Arquivo | O que documenta | 
|---|---|
| [`API IA_REAL.png`](API%20IA_REAL.png) | Captura enviada como evidência da saída do Node 03 com Gemini; conferir visualmente o campo `modo: IA_REAL` |
| [`Fluxo IA_REAL.png`](Fluxo%20IA_REAL.png) | Captura enviada do fluxo n8n; conferir se os seis nodes terminaram sem erro |
| [`RESPOSTA DE PROTOCOLO IA_REAL.png`](RESPOSTA%20DE%20PROTOCOLO%20IA_REAL.png) | Captura enviada da resposta final com protocolo de atendimento |

As capturas foram publicadas no [commit `6117d4a`](https://github.com/talita-olv/kodie-triagem-inteligente/commit/6117d4a) e estão incorporadas no [README principal](../../README.md).

## Prints da demonstração anterior (`AI_MODE=mock`)

| Arquivo | O que documenta |
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
5. Para revisar a execução de IA real, use `AI_MODE=live` e `AI_PROVIDER=gemini` com chave válida, confira a classificação do Node 03 (`modo: IA_REAL`) e compare com os três PNGs já enviados. Preserve a série antiga para fins de rastreabilidade.

**Segurança:** nunca inclua `.env` nem valores de `GEMINI_API_KEY` ou `API_ACCESS_KEY`. Verifique também que os prints não exponham credenciais antes de reutilizá-los.
