'use strict';

const $ = (id) => document.getElementById(id);
const form = $('form-solicitacao');
const feedback = $('form-feedback');
const sample = 'A elevatória está parada e sem bombeamento. O único grupo motobomba em operação apresentou falha e não há equipamento reserva disponível. Solicito avaliação imediata.';
const labels = {
  P1: 'P1 · Crítica', P2: 'P2 · Alta', P3: 'P3 · Média', P4: 'P4 · Baixa',
  ELETROMECANICA: 'Eletromecânica', AUTOMACAO: 'Automação',
  OPERACAO: 'Operação', PCM: 'PCM', SEGURANCA: 'Segurança', ATENDIMENTO: 'Atendimento',
  CORRETIVA: 'Corretiva', PREVENTIVA: 'Preventiva', MELHORIA: 'Melhoria',
  DUVIDA: 'Dúvida', OUTROS: 'Outros',
  PENDENTE_TRIAGEM_HUMANA: 'Aguardando revisão humana',
  PENDENTE_ATENDIMENTO: 'Pendente de atendimento'
};
const pretty = (value) => labels[value] || (value === undefined || value === null || value === '' ? '—' : String(value));
const key = () => $('api-key').value.trim();

function setFeedback(message, kind) {
  feedback.textContent = message || '';
  feedback.className = 'feedback' + (kind ? ' ' + kind : '');
}

function setBusy(busy) {
  $('submit-button').disabled = busy;
  $('submit-label').textContent = busy ? 'Processando solicitação...' : 'Analisar solicitação';
}

async function requestJson(path, data, secret) {
  const headers = { 'x-api-key': secret };
  const options = { method: data === undefined ? 'GET' : 'POST', headers };
  if (data !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }
  const response = await fetch(path, options);
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('A API retornou uma resposta inesperada (não é JSON).'); }
  if (!response.ok) {
    throw new Error(payload.mensagem || payload.message || payload.erro || ('Falha HTTP ' + response.status));
  }
  return payload;
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return 'UI-' + window.crypto.randomUUID();
  }
  return 'UI-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

async function submitRequest(event) {
  event.preventDefault();
  setFeedback('', '');
  const secret = key();
  const descricao = $('solicitacao-descricao').value.trim();
  if (!secret) {
    setFeedback('Informe a chave interna API_ACCESS_KEY para autenticar.', 'error');
    $('api-key').focus();
    return;
  }
  if (descricao.length < 15) {
    setFeedback('A descrição deve ter pelo menos 15 caracteres.', 'error');
    return;
  }
  const idInput = $('solicitacao-id');
  const id = idInput.value.trim() || makeId();
  idInput.value = id;
  const solicitacao = {
    id, descricao,
    unidade: $('solicitacao-unidade').value.trim(),
    origem: 'interface-web-kodie'
  };
  const mode = form.querySelector('input[name="execution-mode"]:checked').value;
  setBusy(true);
  try {
    let record, classification = null, via;
    if (mode === 'n8n') {
      // O backend encaminha ao n8n local para evitar problema de CORS.
      record = await requestJson('/api/fluxo-n8n', solicitacao, secret);
      via = 'Fluxo n8n';
    } else {
      classification = await requestJson('/api/analisar', solicitacao, secret);
      const d = classification.decisao;
      record = await requestJson('/api/encaminhamentos', {
        solicitacao_id: classification.solicitacao.id,
        resumo: classification.classificacao_ia.resumo,
        setor: d.setor,
        fila: d.fila,
        prioridade: d.prioridade,
        categoria: d.categoria,
        status: d.status,
        revisao_humana: d.revisao_humana
      }, secret);
      via = classification.modo === 'IA_REAL' ? 'IA real · API' : 'Simulação · API';
    }
    renderResult(record, classification, via);
    const repeated = record.novo === false ? ' Este ID já tinha um protocolo: foi reutilizado sem duplicação.' : '';
    setFeedback('Solicitação processada e registrada.' + repeated, 'success');
    await loadHistory();
  } catch (error) {
    setFeedback(error.message + (mode === 'n8n' ? ' Se estiver usando a URL de teste, clique em “Listen for test event” no n8n e tente novamente.' : ''), 'error');
  } finally {
    setBusy(false);
  }
}

function renderResult(record, classification, via) {
  $('empty-result').hidden = true;
  $('result-content').hidden = false;
  $('result-title').textContent = 'Solicitação classificada';
  $('result-id').textContent = 'Identificador: ' + pretty(record.solicitacao_id || classification?.solicitacao?.id);
  const priority = record.prioridade || classification?.decisao?.prioridade || '';
  $('result-priority').textContent = pretty(priority);
  $('result-priority').className = 'priority-badge ' + String(priority).toLowerCase();
  $('result-category').textContent = pretty(record.categoria || classification?.decisao?.categoria);
  $('result-sector').textContent = pretty(record.setor || classification?.decisao?.setor);
  $('result-queue').textContent = pretty(record.fila || classification?.decisao?.fila);
  $('result-status').textContent = pretty(record.status || classification?.decisao?.status);
  $('result-protocol').textContent = pretty(record.protocolo);
  $('result-mode').textContent = via;
  $('result-review').hidden = record.revisao_humana !== true && classification?.decisao?.revisao_humana !== true;
  const resumo = record.resumo || classification?.classificacao_ia?.resumo || '';
  $('result-summary').hidden = !resumo;
  $('result-summary').textContent = resumo;
  $('resultado').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setTableMessage(message) {
  const tbody = $('history-body');
  tbody.replaceChildren();
  const tr = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 5;
  cell.className = 'empty-row';
  cell.textContent = message;
  tr.appendChild(cell);
  tbody.appendChild(tr);
}

function cell(value, className) {
  const td = document.createElement('td');
  if (className) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = pretty(value);
    td.appendChild(span);
  } else {
    td.textContent = pretty(value);
  }
  return td;
}

function renderHistory(rows) {
  const tbody = $('history-body');
  tbody.replaceChildren();
  if (!rows.length) {
    setTableMessage('Nenhum protocolo registrado até agora.');
    return;
  }
  for (const rec of rows) {
    const tr = document.createElement('tr');
    tr.appendChild(cell(rec.protocolo));
    tr.appendChild(cell(rec.resumo));
    tr.appendChild(cell(rec.setor));
    tr.appendChild(cell(rec.prioridade, 'table-chip ' + String(rec.prioridade).toLowerCase()));
    tr.appendChild(cell(rec.status));
    tbody.appendChild(tr);
  }
}

async function loadHistory() {
  if (!key()) {
    setTableMessage('Digite a chave interna da API e clique em “Atualizar histórico”.');
    return;
  }
  try {
    const data = await requestJson('/api/encaminhamentos?limit=100', undefined, key());
    const records = Array.isArray(data.registros) ? data.registros : [];
    $('metric-total').textContent = String(data.total ?? records.length);
    $('metric-p1').textContent = String(records.filter((item) => item.prioridade === 'P1').length);
    $('metric-revisao').textContent = String(records.filter((item) => item.revisao_humana).length);
    renderHistory(records);
  } catch (error) {
    setTableMessage('Não foi possível consultar: ' + error.message);
  }
}

async function loadHealth() {
  const chip = $('server-chip');
  try {
    const response = await fetch('/health');
    if (!response.ok) throw new Error('Servidor indisponível');
    const data = await response.json();
    chip.className = 'status-chip ok';
    chip.replaceChildren();
    const dot = document.createElement('span');
    dot.className = 'status-dot';
    chip.append(dot, document.createTextNode('API conectada'));
    $('metric-mode').textContent = data.ia === 'mock' ? 'Simulação' : 'IA real';
    $('metric-provider').textContent = 'Provedor: ' + pretty(data.provedor);
  } catch {
    chip.className = 'status-chip fail';
    chip.textContent = 'API desconectada';
    $('metric-mode').textContent = 'Indisponível';
  }
}

$('sample-button').addEventListener('click', () => {
  $('solicitacao-descricao').value = sample;
  $('solicitacao-unidade').value = 'Elevatória Escola - Fictícia';
  $('solicitacao-id').value = '';
});
$('refresh-button').addEventListener('click', loadHistory);
$('api-key').addEventListener('change', loadHistory);
form.addEventListener('submit', submitRequest);
form.addEventListener('reset', () => { setFeedback('', ''); });
loadHealth();
