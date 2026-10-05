import {
  ResultadoSoftware,
  CriterioVerificavel,
  EvidenciaVerificacao,
  LaudoVerificacao,
} from "./verificacao.js";

/**
 * Contrato de repositório puro para persistência e recuperação de
 * Resultados de Software, Critérios Verificáveis, Evidências de Verificação
 * e Laudos Técnicos de Verificação (M-005 / EV-005).
 */
export interface RepositorioVerificacao {
  // 1. Resultados de Software
  salvarResultado(resultado: ResultadoSoftware): Promise<void>;
  obterResultadoPorId(id: string): Promise<ResultadoSoftware | null>;
  obterResultadoPorCodigo(codigoReferencia: string): Promise<ResultadoSoftware | null>;
  listarResultados(filtros?: { moduloOrigem?: string; entregaValorCodigo?: string }): Promise<ResultadoSoftware[]>;

  // 2. Critérios Verificáveis
  salvarCriterio(criterio: CriterioVerificavel): Promise<void>;
  obterCriterioPorId(id: string): Promise<CriterioVerificavel | null>;
  obterCriterioPorCodigo(codigo: string): Promise<CriterioVerificavel | null>;
  listarCriteriosPorResultado(resultadoSoftwareId: string): Promise<CriterioVerificavel[]>;
  listarTodosCriterios(): Promise<CriterioVerificavel[]>;

  // 3. Evidências de Verificação
  salvarEvidencia(evidencia: EvidenciaVerificacao): Promise<void>;
  obterEvidenciaPorId(id: string): Promise<EvidenciaVerificacao | null>;
  listarEvidenciasPorCriterio(criterioId: string): Promise<EvidenciaVerificacao[]>;
  listarEvidenciasPorResultado(resultadoSoftwareId: string): Promise<EvidenciaVerificacao[]>;

  // 4. Laudos Técnicos de Verificação
  salvarLaudo(laudo: LaudoVerificacao): Promise<void>;
  obterLaudoPorId(id: string): Promise<LaudoVerificacao | null>;
  obterLaudoPorResultadoECriterio(
    resultadoSoftwareId: string,
    criterioId: string
  ): Promise<LaudoVerificacao | null>;
  listarLaudosPorResultado(resultadoSoftwareId: string): Promise<LaudoVerificacao[]>;
  listarTodosLaudos(): Promise<LaudoVerificacao[]>;
}
