# Guia rapido — IA real Gemini no projeto KODIE (sem Docker)

> Este guia configura uma **IA real**, em lugar da demonstracao `AI_MODE=mock`. Os testes do cliente HTTP usam uma resposta simulada de rede; **ainda e necessario executar Gemini com sua chave** e documentar o resultado. A faixa gratuita depende dos limites e elegibilidade no Google AI Studio.

## 1. Preparar a chave do Google AI Studio

1. Acesse https://aistudio.google.com/apikey e entre na sua conta Google.
2. Crie uma API key em um projeto que apresente acesso a modelos com faixa gratuita.
3. Consulte os limites em https://aistudio.google.com/usage e em https://ai.google.dev/gemini-api/docs/pricing.
4. Nao ative faturamento pago se a sua intencao for utilizar apenas a faixa gratuita. Disponibilidade e limites podem mudar.
5. Use somente relatos **ficticios**: no nivel gratuito, o provedor pode utilizar dados enviados para melhoria de produtos.

## 2. Trazer o codigo atualizado para o Windows

No Git Bash, dentro da pasta local que voce publicou:

```bash
cd ~/Documents/Projetos/kodie-triagem-inteligente
git status
git pull --ff-only
npm install
npm test
```

Se `git status` mostrar mudancas locais nao salvas, preserve-as antes de fazer `git pull`. Nao apague seu `.env`.

## 3. Editar somente o .env LOCAL (nunca publicar)

```dotenv
AI_MODE=live
AI_PROVIDER=gemini
GEMINI_API_KEY=COLE_AQUI_SUA_CHAVE_REAL_DO_GOOGLE
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_TIMEOUT_MS=45000
```

Mantenha `API_ACCESS_KEY` como esta, pois o n8n ja utiliza essa credencial. A chave Gemini e **outra chave**, que fica somente no backend; nao a coloque em credenciais HTTP do n8n.

## 4. Reiniciar a API

No terminal **API**: Ctrl+C e, depois:

```bash
node --env-file=.env src/server.js
```

O log deve mostrar `IA: live`. Em outro terminal:

```bash
curl -s http://127.0.0.1:3000/health
```

Esperado: `{"status":"ok","ia":"live","provedor":"gemini"}`.
Esse teste confirma somente a configuracao, **nao a inferencia real**.

## 5. Testar uma classificacao real

Em outro terminal, dentro do projeto:

```bash
export API_ACCESS_KEY="$(sed -n 's/^API_ACCESS_KEY=//p' .env | tr -d '\r')"
sh scripts/teste-endpoint.sh
```

O resultado precisa mostrar `"modo":"IA_REAL"`, dados em `classificacao_ia` e prioridade em `decisao`. Nao inclua sua chave nos prints.

Se ocorrer:
- `502 ... HTTP 401/403`: verifique a chave, autorizacao ou elegibilidade do projeto.
- `502 ... HTTP 404`: verifique se o modelo `gemini-3.5-flash-lite` esta disponivel no seu projeto e na API.
- `502 ... HTTP 429`: sem cota disponivel ou limite de chamadas excedido; confira o painel do AI Studio.
- `502 ... RESPOSTA_IA_INVALIDA`: a resposta foi incompleta ou nao seguiu o JSON Schema, precisando revisao.
Nao altere automaticamente para modo mock para apresentar o teste como sucesso real.

## 6. Executar os 6 nodes no n8n

Mantenha a API e o n8n abertos. **Nao precisa modificar os nodes**: eles continuam apontando para `http://127.0.0.1:3000`.

1. Abra http://localhost:5678.
2. Abra o workflow KODIE e clique em **01 — Receber solicitacao > Listen for test event**.
3. Em outro Git Bash, execute:

```bash
curl -i -X POST http://127.0.0.1:5678/webhook-test/kodie-triagem \
  -H 'Content-Type: application/json' \
  --data-binary @examples/solicitacao-critica.json
```

4. Confirme os 6 nodes verdes e a devolucao de protocolo.
5. Clique no node 03: confirme `"modo":"IA_REAL"` no OUTPUT.

## 7. Evidencias finais e GitHub

Salve capturas reais **sem credenciais** com nomes novos, preservando as antigas:
- `docs/evidencias/14-gemini-classificacao-ia-real.png` — node 03 exibindo `modo: IA_REAL`.
- `docs/evidencias/15-gemini-fluxo-completo.png` — seis nodes concluidos com Gemini.
- `docs/evidencias/16-gemini-protocolo.png` — node 06 com o registro final.

Atualize a situacao do README e `docs/VALIDACAO.md` **somente apos** comprovar a execucao real. Entao publique:

```bash
git add README.md docs/
git commit -m "Evidencias: IA real Gemini validada no n8n"
git push origin main
```

Repositório: https://github.com/talita-olv/kodie-triagem-inteligente

**Observacao:** a IA pode produzir erros e nao substitui avaliacao humana em seguranca/operacao.
