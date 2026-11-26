#!/usr/bin/env sh
set -eu
: "${API_ACCESS_KEY:?Defina API_ACCESS_KEY no terminal antes de executar}"
API_URL="${API_URL:-http://localhost:3000}"
curl -fsS -X POST "$API_URL/api/analisar" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_ACCESS_KEY" \
  --data-binary @examples/solicitacao-critica.json
printf '\n'
