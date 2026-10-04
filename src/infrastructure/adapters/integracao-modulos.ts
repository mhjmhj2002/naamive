import { InvarianteVioladaErro } from "../../domain/erros.js";
import { CompromissoNecessidade } from "../../domain/valores.js";

/**
 * Dados de solicitação de bootstrap do Projeto a partir de uma Necessidade aprovada.
 */
export interface SolicitacaoBootstrapProjeto {
  necessidadeId: string;
  codigoNecessidade: string;
  tituloProjeto: string;
  problemaOrigem: string;
  resultadoPretendido: string;
  escopoInicial: string;
  usuarioAprovador: string;
}

/**
 * Resposta de confirmação de bootstrap do Projeto emitida por M-002.
 */
export interface ConfirmacaoBootstrapProjeto {
  projetoId: string;
  necessidadeId: string;
  criadoEm: Date;
  jaExistente: boolean;
}

/**
 * Porta de integração com o Módulo M-002 (Formação do Projeto).
 */
export interface PortaIntegracaoProjeto {
  solicitarBootstrapProjeto(
    solicitacao: SolicitacaoBootstrapProjeto
  ): Promise<ConfirmacaoBootstrapProjeto>;
  obterProjetoPorNecessidade(necessidadeId: string): Promise<ConfirmacaoBootstrapProjeto | null>;
}

/**
 * Registro de contexto preservado para rastreabilidade com M-004.
 */
export interface RegistroRastreabilidadeContexto {
  entidadeOrigem: string;
  idOrigem: string;
  tipoEvento: string;
  dados: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Porta de integração com o Módulo M-004 (Contexto e Rastreabilidade).
 */
export interface PortaIntegracaoContexto {
  registrarEventoRastreabilidade(
    registro: RegistroRastreabilidadeContexto
  ): Promise<void>;
  obterHistoricoContexto(idOrigem: string): Promise<RegistroRastreabilidadeContexto[]>;
}

/**
 * Adaptador de integração com M-002 (Formação do Projeto) com garantia de idempotência estrita (1 Necessidade aprovada -> 1 Projeto).
 */
export class AdaptadorIntegracaoProjeto implements PortaIntegracaoProjeto {
  // Mapeamento em memória/persistência de projetos por necessidadeId para assegurar 1:1 e idempotência
  private readonly projetosPorNecessidade: Map<string, ConfirmacaoBootstrapProjeto> = new Map();
  private servicoAplicacao:
    | {
        solicitarBootstrapProjeto(solicitacao: SolicitacaoBootstrapProjeto): Promise<ConfirmacaoBootstrapProjeto>;
        obterProjetoPorNecessidadeId(necessidadeId: string): Promise<{ id: string; necessidadeId: string; criadoEm: Date } | null>;
      }
    | undefined;

  constructor(
    servicoAplicacao?: {
      solicitarBootstrapProjeto(solicitacao: SolicitacaoBootstrapProjeto): Promise<ConfirmacaoBootstrapProjeto>;
      obterProjetoPorNecessidadeId(necessidadeId: string): Promise<{ id: string; necessidadeId: string; criadoEm: Date } | null>;
    } | undefined
  ) {
    this.servicoAplicacao = servicoAplicacao;
  }

  public async solicitarBootstrapProjeto(
    solicitacao: SolicitacaoBootstrapProjeto
  ): Promise<ConfirmacaoBootstrapProjeto> {
    if (!solicitacao.necessidadeId || solicitacao.necessidadeId.trim() === "") {
      throw new InvarianteVioladaErro(
        "Identificador da Necessidade é obrigatório para bootstrap de Projeto no M-002."
      );
    }

    if (this.servicoAplicacao) {
      return this.servicoAplicacao.solicitarBootstrapProjeto(solicitacao);
    }

    const necessidadeId = solicitacao.necessidadeId.trim();

    // Idempotência: Se já houver um Projeto registrado para esta Necessidade, retorna o existente sem criar novo ID
    const existente = this.projetosPorNecessidade.get(necessidadeId);
    if (existente) {
      return {
        ...existente,
        jaExistente: true,
      };
    }

    // Cria o identificador determinístico/único do Projeto associado
    const novoProjetoId = `proj-${necessidadeId}`;
    const confirmacao: ConfirmacaoBootstrapProjeto = {
      projetoId: novoProjetoId,
      necessidadeId,
      criadoEm: new Date(),
      jaExistente: false,
    };

    this.projetosPorNecessidade.set(necessidadeId, confirmacao);
    return confirmacao;
  }

  public async obterProjetoPorNecessidade(
    necessidadeId: string
  ): Promise<ConfirmacaoBootstrapProjeto | null> {
    if (this.servicoAplicacao) {
      const proj = await this.servicoAplicacao.obterProjetoPorNecessidadeId(necessidadeId.trim());
      if (!proj) return null;
      return {
        projetoId: proj.id,
        necessidadeId: proj.necessidadeId,
        criadoEm: proj.criadoEm,
        jaExistente: true,
      };
    }
    return this.projetosPorNecessidade.get(necessidadeId.trim()) ?? null;
  }

  /**
   * Helper para gerar a solicitação de bootstrap a partir do Compromisso consolidado.
   */
  public static criarSolicitacaoDeCompromisso(
    codigo: string,
    titulo: string,
    compromisso: CompromissoNecessidade
  ): SolicitacaoBootstrapProjeto {
    return {
      necessidadeId: compromisso.necessidadeId,
      codigoNecessidade: codigo,
      tituloProjeto: `Projeto ${titulo}`,
      problemaOrigem: compromisso.problemaAssumido,
      resultadoPretendido: compromisso.resultadoPretendido,
      escopoInicial: compromisso.escopoAssumido,
      usuarioAprovador: compromisso.usuarioAprovador,
    };
  }
}

/**
 * Adaptador de integração com M-004 (Contexto e Rastreabilidade).
 * Mantém trilha auditável de eventos de domínio sem perda de contexto.
 */
export class AdaptadorIntegracaoContexto implements PortaIntegracaoContexto {
  private readonly eventosPorId: Map<string, RegistroRastreabilidadeContexto[]> = new Map();

  public async registrarEventoRastreabilidade(
    registro: RegistroRastreabilidadeContexto
  ): Promise<void> {
    const lista = this.eventosPorId.get(registro.idOrigem) ?? [];
    lista.push({ ...registro });
    this.eventosPorId.set(registro.idOrigem, lista);
  }

  public async obterHistoricoContexto(
    idOrigem: string
  ): Promise<RegistroRastreabilidadeContexto[]> {
    return this.eventosPorId.get(idOrigem) ?? [];
  }
}
