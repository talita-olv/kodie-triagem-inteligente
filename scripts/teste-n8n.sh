#!/usr/bin/env sh
set -eu
N8N_URL="${N8N_URL:-http://localhost:5678/webhook-test/kodie-triagem}"
curl -fsS -X POST "$N8N_URL" -H 'Content-Type: application/json' \
  --data-binary @examples/solicitacao-critica.json
printf '\n'
