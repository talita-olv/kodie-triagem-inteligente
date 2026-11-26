import { mkdir, appendFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AppError } from './errors.js';
import { CATEGORIAS, FILAS } from './constants.js';

export class Outbox {
  constructor(dir) {
    this.path = join(dir, 'encaminhamentos.jsonl');
    this.ids = new Map();
    this.tail = Promise.resolve();
  }
  async init() {
    await mkdir(this.path.substring(0, this.path.lastIndexOf('/')) || '.', { recursive: true });
    let raw = '';
    try { raw = await readFile(this.path, 'utf8'); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    for (const line of raw.split('\n').filter(Boolean)) {
      const record = JSON.parse(line);
      this.ids.set(record.solicitacao_id, record);
    }
  }
  async save(payload) {
    const accepted = this.validate(payload);
    const operation = this.tail.then(async () => {
      const existing = this.ids.get(accepted.solicitacao_id);
      if (existing) return { gravado: false, registro: existing };
      const record = { ...accepted, protocolo: `KODIE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, criado_em: new Date().toISOString() };
      await appendFile(this.path, JSON.stringify(record) + '\n', 'utf8');
      this.ids.set(record.solicitacao_id, record);
      return { gravado: true, registro: record };
    });
    this.tail = operation.catch(() => {});
    return operation;
  }
  validate(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AppError(400, 'DADOS_INVALIDOS', 'Objeto esperado.');
    const fields = ['solicitacao_id', 'resumo', 'setor', 'fila', 'prioridade', 'categoria', 'status'];
    for (const f of fields) if (typeof value[f] !== 'string' || !value[f].trim()) throw new AppError(400, 'DADOS_INVALIDOS', `Campo obrigatorio: ${f}`);
    if (value.solicitacao_id.length > 80 || value.resumo.length > 240 || !CATEGORIAS.includes(value.categoria) ||
        !FILAS[value.setor] || FILAS[value.setor] !== value.fila || !['P1', 'P2', 'P3', 'P4'].includes(value.prioridade) ||
        !['PENDENTE_TRIAGEM_HUMANA', 'PENDENTE_ATENDIMENTO'].includes(value.status) ||
        typeof value.revisao_humana !== 'boolean') {
      throw new AppError(400, 'DADOS_INVALIDOS', 'Campos de encaminhamento invalidos.');
    }
    return Object.fromEntries([...fields, 'revisao_humana'].map(field => [field, value[field]]));
  }
  list(limit = 25) { return [...this.ids.values()].reverse().slice(0, limit); }
}
