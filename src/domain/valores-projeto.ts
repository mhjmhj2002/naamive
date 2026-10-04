/**
 * Interfaces de dados, estruturas imutáveis e registros da vertical Projeto.
 * Conforme documentacao/projeto/02_MODELO_DE_PROJETO.md e 04_FORMACAO_DO_PROJETO.md
 */
import {
  StatusProjeto,
  EtapaFormacaoProjeto,
  TipoResultadoProcessoProjeto,
  DecisaoMaterialOwnerProjeto,
} from "./tipos-projeto.js";

export interface DadosCriacaoProjeto {
  id: string;
  codigo: string;
  necessidadeId: string;
  titulo: string;
}

export interface RegistroEtapaFormacaoProjeto {
  id: string;
  projetoId: string;
  etapa: EtapaFormacaoProjeto;
  conteudo: Record<string, unknown>;
  registradoPor: string;
  registradoEm: Date;
}

export interface RegistroAuditoriaProjeto {
  id: string;
  projetoId: string;
  resultado: TipoResultadoProcessoProjeto;
  parecer: string;
  auditor: string;
  auditadoEm: Date;
}

export interface DirecaoProjeto {
  id: string;
  projetoId: string;
  compromissoOrigem: string;
  objetivoProjeto: string;
  fronteiras: string;
  contextoRelevante: string;
  aprovadoEm: Date;
}

export interface RegistroDecisaoOwnerProjeto {
  id: string;
  projetoId: string;
  decisao: DecisaoMaterialOwnerProjeto;
  usuarioAutenticado: string;
  justificativa?: string | undefined;
  decididoEm: Date;
}

export interface RegistroHistoricoProjeto {
  id: string;
  projetoId: string;
  atorCompetente: string;
  atividade: string;
  statusAnterior: StatusProjeto | null;
  statusNovo: StatusProjeto | null;
  detalhes?: Record<string, unknown> | undefined;
  registradoEm: Date;
}
