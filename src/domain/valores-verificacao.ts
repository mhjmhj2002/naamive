/**
 * Interfaces de dados e Value Objects de Verificação do Resultado de Software.
 * Em estrita conformidade com EV-005, M-005 e a migração 007.
 */
import { MetodoObservacao, ConclusaoVerificacao } from "./tipos-verificacao.js";

/**
 * Parâmetros de criação de um ResultadoSoftware.
 */
export interface DadosCriacaoResultadoSoftware {
  id: string;
  codigoReferencia: string;
  moduloOrigem: string;
  entregaValorCodigo: string;
  versaoArtefato: string;
  descricao: string;
  declaradoPor: string;
  registradoEm?: Date | undefined;
}

/**
 * Parâmetros de criação de um CriterioVerificavel.
 */
export interface DadosCriacaoCriterioVerificavel {
  id: string;
  codigo: string;
  resultadoSoftwareId: string;
  origemNormativa: string;
  descricaoComportamento: string;
  metodoObservacao: MetodoObservacao;
  condicaoSatisfacao: string;
  limitesOuTolerancias?: string | null | undefined;
  criadoEm?: Date | undefined;
}

/**
 * Parâmetros de criação de uma EvidenciaVerificacao.
 */
export interface DadosCriacaoEvidenciaVerificacao {
  id: string;
  criterioId: string;
  procedimentoExecutado: string;
  resultadoObservado: string;
  dadosDetalhados?: Record<string, unknown> | undefined;
  sucesso: boolean;
  coletadoPor: string;
  coletadoEm?: Date | undefined;
}

/**
 * Parâmetros de criação de um LaudoVerificacao.
 */
export interface DadosCriacaoLaudoVerificacao {
  id: string;
  resultadoSoftwareId: string;
  criterioId: string;
  conclusao: ConclusaoVerificacao;
  fundamentacaoTecnica: string;
  evidenciasUtilizadas?: string[] | undefined;
  divergenciasApontadas?: string | null | undefined;
  emitidoPor: string;
  emitidoEm?: Date | undefined;
}

/**
 * Resumo do laudo individual por critério em uma avaliação agregada.
 */
export interface ResumoLaudoCriterio {
  criterioId: string;
  criterioCodigo: string;
  metodoObservacao: MetodoObservacao;
  conclusao: ConclusaoVerificacao;
  fundamentacaoTecnica: string;
  evidenciasUtilizadas: string[];
  divergenciasApontadas: string | null;
}

/**
 * Value Object: LaudoVerificacaoAgregado
 * Consolida a avaliação de todos os critérios aplicáveis a um Resultado de Software.
 */
export interface LaudoVerificacaoAgregado {
  resultadoSoftwareId: string;
  codigoReferencia: string;
  conclusaoGeral: ConclusaoVerificacao;
  fundamentacaoGeral: string;
  laudosPorCriterio: ResumoLaudoCriterio[];
  totalCriterios: number;
  demonstrados: number;
  naoDemonstrados: number;
  insuficientes: number;
  divergencias: number;
  impossiveis: number;
  emitidoPor: string;
  avaliadoEm: Date;
}
