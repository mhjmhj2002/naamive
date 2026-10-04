import { RegistroProveniencia, VinculoCausal } from "./contexto.js";
import { TipoEntidadeContexto, TipoRegistroProveniencia } from "./tipos-contexto.js";

/**
 * Filtros opcionais para listagem de registros de proveniência.
 */
export interface FiltrosListagemProveniencia {
  entidadeTipo?: TipoEntidadeContexto | undefined;
  entidadeId?: string | undefined;
  codigoReferencia?: string | undefined;
  tipoRegistro?: TipoRegistroProveniencia | undefined;
  apenasVigentes?: boolean | undefined;
}

/**
 * Contrato de repositório puro para persistência e recuperação de registros de proveniência
 * e vínculos causais direcionados (M-004 / EV-004).
 */
export interface RepositorioContexto {
  /**
   * Salva um registro de proveniência.
   * Suporta idempotência: se já existir registro com mesmo id ou dados equivalentes, preserva cronologia.
   */
  salvarRegistro(registro: RegistroProveniencia): Promise<void>;

  /**
   * Obtém um registro de proveniência por seu identificador único.
   */
  obterRegistroPorId(id: string): Promise<RegistroProveniencia | null>;

  /**
   * Obtém os registros associados a um código de referência (ex: N-001, P-001, EV-004).
   */
  obterRegistrosPorCodigo(codigoReferencia: string): Promise<RegistroProveniencia[]>;

  /**
   * Lista registros de proveniência conforme filtros informados.
   */
  listarRegistros(filtros?: FiltrosListagemProveniencia): Promise<RegistroProveniencia[]>;

  /**
   * Salva um vínculo causal direcionado no grafo relacional.
   * Garante chave única direcionada (origem, destino, tipo).
   */
  salvarVinculo(vinculo: VinculoCausal): Promise<void>;

  /**
   * Obtém um vínculo causal por identificador único.
   */
  obterVinculoPorId(id: string): Promise<VinculoCausal | null>;

  /**
   * Lista todos os vínculos causais incidentes (onde o registro é origem ou destino).
   */
  listarVinculosPorRegistro(registroId: string): Promise<VinculoCausal[]>;

  /**
   * Lista todos os vínculos causais do repositório.
   */
  listarTodosVinculos(): Promise<VinculoCausal[]>;

  /**
   * Lista todos os registros de proveniência cadastrados.
   */
  listarTodosRegistros(): Promise<RegistroProveniencia[]>;
}
