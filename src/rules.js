import { FILAS, NIVEL_POR_URGENCIA, URGENCIAS } from './constants.js';

const SAFETY = [
  /risco de choque el[eé]trico/i, /vazamento de cloro/i, /inc[eê]ndio/i,
  /pessoa ferida/i, /risco de morte/i, /risco de acidente grave/i,
];
const STOPPAGE = [
  /(?:elevat[oó]ria|esta[cç][aã]o|unidade|bomba).{0,35}(?:parada|paralisada|sem opera[cç][aã]o)/i,
  /sem bombeamento/i, /risco de transbordamento/i, /transbordando/i,
  /[uú]nico grupo.{0,40}(?:parou|inoperante|falha)/i,
];
const RANK = Object.fromEntries(URGENCIAS.map((name, index) => [name, index]));

/** Regras adicionais nunca diminuem a criticidade sugerida pela IA. */
export function triage(solicitacao, classificacao, modo = 'live') {
  const descricao = solicitacao.descricao;
  let urgencia = classificacao.urgencia;
  let setor = classificacao.setor;
  const alertas = [];
  if (SAFETY.some(pattern => pattern.test(descricao))) {
    urgencia = 'CRITICA';
    setor = 'SEGURANCA';
    alertas.push('Gatilho de seguranca reconhecido: encaminhamento para avaliacao imediata.');
  } else if (STOPPAGE.some(pattern => pattern.test(descricao))) {
    urgencia = 'CRITICA';
    if (setor === 'PCM' || setor === 'ATENDIMENTO') setor = 'ELETROMECANICA';
    alertas.push('Possivel parada operacional: revisar imediatamente.');
  }
  // Esta comparacao existe para proteger uma eventual evolucao das regras.
  if (RANK[urgencia] < RANK[classificacao.urgencia]) urgencia = classificacao.urgencia;
  const revisaoHumana = classificacao.revisao_humana || urgencia === 'CRITICA' || !solicitacao.unidade || modo === 'mock';
  return {
    solicitacao,
    classificacao_ia: classificacao,
    decisao: {
      categoria: classificacao.categoria,
      urgencia,
      prioridade: NIVEL_POR_URGENCIA[urgencia],
      setor,
      fila: FILAS[setor],
      revisao_humana: revisaoHumana,
      status: revisaoHumana ? 'PENDENTE_TRIAGEM_HUMANA' : 'PENDENTE_ATENDIMENTO',
      alertas,
    },
    modo: modo === 'mock' ? 'SIMULACAO_SEM_IA' : 'IA_REAL',
  };
}
