/**
 * Interfaces dos dados brutos e eventos do domínio da Necessidade.
 */
import {
  StatusNecessidade,
  TipoNecessidade,
  TipoResultadoProcesso,
  DecisaoMaterialOwner,
} from "./tipos.js";

export interface DadosCriacaoNecessidade {
  id: string;
  codigo: string;
  titulo: string;
  tipo: TipoNecessidade;
  problemaOuOportunidade: string;
  quemEAfetado: string;
  resultadoPretendido: string;
  escopoInicial: string;
  foraDeEscopo: string;
  criterioDeAtendimento: string;
  porQueIssoImporta: string;
  restricoesOuDependencias?: string | undefined;
  origem: string;
}

export interface RegistroHistoricoAtividade {
  id: string;
  necessidadeId: string;
  atorCompetente: string;
  atividade: string;
  statusAnterior: StatusNecessidade | null;
  statusNovo: StatusNecessidade | null;
  detalhes?: Record<string, unknown> | undefined;
  registradoEm: Date;
}

export interface RegistroResultadoProcesso {
  id: string;
  necessidadeId: string;
  atorCompetente: string;
  tipoResultado: TipoResultadoProcesso;
  conteudo?: Record<string, unknown> | undefined;
  emitidoEm: Date;
}

export interface RegistroDecisaoOwner {
  id: string;
  necessidadeId: string;
  decisao: DecisaoMaterialOwner;
  usuarioAutenticado: string;
  justificativa?: string | undefined;
  decididoEm: Date;
}

export interface CompromissoNecessidade {
  id: string;
  necessidadeId: string;
  problemaAssumido: string;
  resultadoPretendido: string;
  escopoAssumido: string;
  foraDeEscopo: string;
  criterioDeAtendimento: string;
  restricoesAPreservar: string;
  contextoRelevante: string;
  decisaoId: string;
  usuarioAprovador: string;
  consolidadoEm: Date;
}
