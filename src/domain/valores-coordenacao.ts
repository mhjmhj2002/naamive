/**
 * Interfaces de dados, estruturas imutáveis e registros da Coordenação do Trabalho.
 * Conforme dados/entregas-de-valor/EV-003/entrega-de-valor.md
 */
import { CondicaoOperacionalTrabalho } from "./tipos-coordenacao.js";

export interface DadosCriacaoTrabalhoCoordenado {
  id: string;
  codigo: string;
  projetoId: string;
  titulo: string;
  objetivo: string;
  competenciaRequerida: string;
  atorRequerido: string;
  skillRequerida?: string | null | undefined;
  executorDesignado?: string | null | undefined;
  criterioTermino: string;
  dependencias?: string[] | undefined;
  condicaoOperacional?: CondicaoOperacionalTrabalho | undefined;
  motivoBloqueio?: string | null | undefined;
}

export interface ConteudoHandoff {
  projetoId: string;
  trabalhoId: string;
  codigoTrabalho: string;
  titulo: string;
  objetivo: string;
  competenciaRequerida: string;
  atorDestinatario: string;
  skillDestinataria?: string | null | undefined;
  criterioTermino: string;
  dependenciasVerificadas: string[];
  referenciasContexto: {
    projeto: string;
    necessidade?: string | undefined;
    modulo?: string | undefined;
    entregaDeValor?: string | undefined;
    documentosNormativos?: string[] | undefined;
  };
  geradoEm: string;
}

export interface DadosCriacaoHandoff {
  id: string;
  trabalhoId: string;
  tokenCorrelacao: string;
  atorDestinatario: string;
  skillDestinataria?: string | null | undefined;
  conteudoHandoff: ConteudoHandoff;
  despachadoEm?: Date | undefined;
}

export interface DadosCriacaoRetorno {
  id: string;
  handoffId: string;
  sucesso: boolean;
  resultadoObservavel: string;
  pendenciasOuBloqueios?: string | null | undefined;
  recebidoEm?: Date | undefined;
}

export interface RegistroHistoricoCoordenacao {
  id: string;
  trabalhoId: string;
  ator: string;
  atividade: string;
  condicaoAnterior: CondicaoOperacionalTrabalho | null;
  condicaoNova: CondicaoOperacionalTrabalho | null;
  detalhes?: Record<string, unknown> | undefined;
  registradoEm: Date;
}
