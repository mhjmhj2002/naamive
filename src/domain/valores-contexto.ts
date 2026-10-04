/**
 * Interfaces de dados, estruturas imutáveis e Value Objects de Contexto e Rastreabilidade.
 * Em estrita conformidade com EV-004 e M-004.
 */
import {
  TipoEntidadeContexto,
  TipoRegistroProveniencia,
  ClassificacaoEpistemica,
  TipoRelacaoCausal,
  FinalidadeContexto,
  DiagnosticoContexto,
} from "./tipos-contexto.js";

/**
 * Parâmetros de criação de um RegistroProveniencia.
 */
export interface DadosCriacaoRegistroProveniencia {
  id: string;
  entidadeTipo: TipoEntidadeContexto;
  entidadeId: string;
  codigoReferencia: string;
  tipoRegistro: TipoRegistroProveniencia;
  autorResponsavel: string;
  classificacaoEpistemica: ClassificacaoEpistemica;
  dadosContexto?: Record<string, unknown> | undefined;
  vigente?: boolean | undefined;
  registradoEm?: Date | undefined;
}

/**
 * Parâmetros de criação de um VinculoCausal.
 */
export interface DadosCriacaoVinculoCausal {
  id: string;
  origemRegistroId: string;
  destinoRegistroId: string;
  tipoRelacao: TipoRelacaoCausal;
  justificativa?: string | null | undefined;
  criadoEm?: Date | undefined;
}

/**
 * Value Object: ConsultaContexto
 * Modela a intenção de recuperação de contexto expressando a finalidade declarada.
 */
export interface ConsultaContexto {
  finalidade: FinalidadeContexto;
  codigoReferencia?: string | undefined;
  entidadeTipo?: TipoEntidadeContexto | undefined;
  entidadeId?: string | undefined;
  incluirHistoricoSuperado?: boolean | undefined;
  profundidadeAscendencia?: number | undefined;
}

/**
 * Elo causal no caminho de ascendência ou derivação.
 */
export interface EloCausal {
  registroOrigemId: string;
  registroDestinoId: string;
  codigoOrigem: string;
  codigoDestino: string;
  tipoRelacao: TipoRelacaoCausal;
  justificativa: string | null;
}

/**
 * Alerta de lacuna ou inconsistência detectada na recuperação.
 */
export interface AlertaContexto {
  diagnostico: DiagnosticoContexto;
  mensagem: string;
  referenciaAlvo: string;
  detalhes?: Record<string, unknown> | undefined;
}

/**
 * Value Object: PacoteContextoProporcional
 * Retorno enxuto e estruturado contendo apenas o necessário à finalidade declarada.
 */
export interface PacoteContextoProporcional {
  finalidadeDeclarada: FinalidadeContexto;
  alvoPrincipal: {
    codigo: string;
    entidadeTipo: TipoEntidadeContexto;
    entidadeId: string;
  } | null;
  registrosVigentes: DadosCriacaoRegistroProveniencia[];
  registrosHistoricos: DadosCriacaoRegistroProveniencia[];
  cadeiaAscendencia: EloCausal[];
  alertas: AlertaContexto[];
  diagnosticoGeral: DiagnosticoContexto;
  geradoEm: Date;
}
