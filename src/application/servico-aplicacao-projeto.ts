import { randomUUID } from "node:crypto";
import { Projeto } from "../domain/projeto.js";
import { RepositorioProjeto } from "../domain/repositorio-projeto.js";
import { RepositorioNecessidade } from "../domain/repositorio-necessidade.js";
import { InvarianteVioladaErro } from "../domain/erros.js";
import {
  EtapaFormacaoProjeto,
  TipoResultadoProcessoProjeto,
  StatusProjeto,
  AtorCompetenteProjeto,
} from "../domain/tipos-projeto.js";
import { DirecaoProjeto } from "../domain/valores-projeto.js";
import {
  SolicitacaoBootstrapProjeto,
  ConfirmacaoBootstrapProjeto,
} from "../infrastructure/adapters/integracao-modulos.js";

export interface VisaoProjeto {
  id: string;
  codigo: string;
  necessidadeId: string;
  titulo: string;
  status: StatusProjeto;
  criadoEm: Date;
  atualizadoEm: Date;
  etapas: readonly {
    id: string;
    etapa: EtapaFormacaoProjeto;
    conteudo: Record<string, unknown>;
    registradoPor: string;
    registradoEm: Date;
  }[];
  auditorias: readonly {
    id: string;
    resultado: TipoResultadoProcessoProjeto;
    parecer: string;
    auditor: string;
    auditadoEm: Date;
  }[];
  direcao: DirecaoProjeto | null;
}

/**
 * Serviço de aplicação para a vertical Projeto (M-002 — Formação do Projeto).
 * Orquestra casos de uso:
 * - solicitarBootstrapProjeto (com idempotência estrita 1:1)
 * - registrarEtapaFormacao
 * - registrarParecerAuditoria
 * - obterProjetoPorId
 * - obterProjetoPorNecessidadeId
 * - obterDirecaoProjeto
 * - listarProjetos
 */
export class ServicoAplicacaoProjeto {
  private repositorioProjeto: RepositorioProjeto;
  private repositorioNecessidade: RepositorioNecessidade | undefined;

  constructor(
    repositorioProjeto: RepositorioProjeto,
    repositorioNecessidade?: RepositorioNecessidade | undefined
  ) {
    this.repositorioProjeto = repositorioProjeto;
    this.repositorioNecessidade = repositorioNecessidade;
  }

  /**
   * Caso de uso: Solicitação de bootstrap idempotente de Projeto a partir de Necessidade comprometida.
   * Regra invariante: 1 Necessidade aprovada -> exatamente 1 Projeto (1:1).
   * Se já existir, retorna o existente com jaExistente: true.
   * Ao materializar, se o repositório de Necessidade estiver conectado, transiciona a Necessidade para EM_PROJETO.
   */
  public async solicitarBootstrapProjeto(
    solicitacao: SolicitacaoBootstrapProjeto
  ): Promise<ConfirmacaoBootstrapProjeto> {
    if (!solicitacao.necessidadeId || solicitacao.necessidadeId.trim() === "") {
      throw new InvarianteVioladaErro(
        "Identificador da Necessidade é obrigatório para bootstrap de Projeto no M-002."
      );
    }

    const necessidadeId = solicitacao.necessidadeId.trim();

    // 1. Verificar idempotência no repositório de Projeto
    const projetoExistente = await this.repositorioProjeto.obterPorNecessidadeId(necessidadeId);
    if (projetoExistente) {
      return {
        projetoId: projetoExistente.id,
        necessidadeId: projetoExistente.necessidadeId,
        criadoEm: projetoExistente.criadoEm,
        jaExistente: true,
      };
    }

    // 2. Determinar código sequencial estável (ex: P-001, P-002)
    const todos = await this.repositorioProjeto.listarTodos();
    const proximoNumero = todos.length + 1;
    const codigo = `P-${String(proximoNumero).padStart(3, "0")}`;

    const id = randomUUID();
    const titulo = solicitacao.tituloProjeto?.trim() || `Projeto ${solicitacao.codigoNecessidade || codigo}`;

    const novoProjeto = new Projeto({
      id,
      codigo,
      necessidadeId,
      titulo,
    });

    await this.repositorioProjeto.salvar(novoProjeto);

    // 3. Sincronizar com M-001: atualizar Necessidade para EM_PROJETO se disponível e elegível
    if (this.repositorioNecessidade) {
      const necessidade = await this.repositorioNecessidade.obterPorId(necessidadeId);
      if (
        necessidade &&
        necessidade.status === "AGUARDANDO_DECISAO" &&
        necessidade.compromisso
      ) {
        necessidade.confirmarMaterializacaoProjeto(novoProjeto.id);
        await this.repositorioNecessidade.salvar(necessidade);
      }
    }

    return {
      projetoId: novoProjeto.id,
      necessidadeId: novoProjeto.necessidadeId,
      criadoEm: novoProjeto.criadoEm,
      jaExistente: false,
    };
  }

  /**
   * Caso de uso: Registrar etapa de formação (ENQUADRAMENTO, DESCOBERTA, DIREÇÃO DA SOLUÇÃO).
   */
  public async registrarEtapaFormacao(
    projetoId: string,
    etapa: EtapaFormacaoProjeto,
    conteudo: Record<string, unknown>,
    registradoPor: string = AtorCompetenteProjeto.ESPECIALISTA_FORMACAO_PROJETO
  ): Promise<void> {
    const projeto = await this.repositorioProjeto.obterPorId(projetoId);
    if (!projeto) {
      throw new InvarianteVioladaErro(`Projeto com id '${projetoId}' não encontrado.`);
    }

    projeto.registrarEtapaFormacao(registradoPor, etapa, conteudo);
    await this.repositorioProjeto.salvar(projeto);
  }

  /**
   * Caso de uso: Registrar parecer de auditoria independente do Projeto.
   * Se FORMACAO_SUFICIENTE e dadosDirecao fornecidos, conclui a formação e consolida a Direção.
   */
  public async registrarParecerAuditoria(
    projetoId: string,
    resultado: TipoResultadoProcessoProjeto,
    parecer: string,
    auditor: string = AtorCompetenteProjeto.AUDITOR_PROJETO,
    dadosDirecao?: {
      compromissoOrigem: string;
      objetivoProjeto: string;
      fronteiras: string;
      contextoRelevante: string;
    } | undefined
  ): Promise<void> {
    const projeto = await this.repositorioProjeto.obterPorId(projetoId);
    if (!projeto) {
      throw new InvarianteVioladaErro(`Projeto com id '${projetoId}' não encontrado.`);
    }

    projeto.registrarAuditoria(auditor, resultado, parecer);

    if (resultado === TipoResultadoProcessoProjeto.FORMACAO_SUFICIENTE && dadosDirecao) {
      projeto.concluirFormacao(auditor, dadosDirecao);
    }

    await this.repositorioProjeto.salvar(projeto);
  }

  /**
   * Caso de uso: Obter visão de Projeto por ID.
   */
  public async obterProjetoPorId(projetoId: string): Promise<VisaoProjeto | null> {
    const projeto = await this.repositorioProjeto.obterPorId(projetoId);
    if (!projeto) return null;
    return this.mapearVisaoProjeto(projeto);
  }

  /**
   * Caso de uso: Obter visão de Projeto por Necessidade ID (vínculo 1:1).
   */
  public async obterProjetoPorNecessidadeId(necessidadeId: string): Promise<VisaoProjeto | null> {
    const projeto = await this.repositorioProjeto.obterPorNecessidadeId(necessidadeId);
    if (!projeto) return null;
    return this.mapearVisaoProjeto(projeto);
  }

  /**
   * Caso de uso: Obter Direção aprovada de um Projeto.
   */
  public async obterDirecaoProjeto(projetoId: string): Promise<DirecaoProjeto | null> {
    const projeto = await this.repositorioProjeto.obterPorId(projetoId);
    if (!projeto) return null;
    return projeto.direcao;
  }

  /**
   * Caso de uso: Listar todos os projetos.
   */
  public async listarProjetos(): Promise<VisaoProjeto[]> {
    const projetos = await this.repositorioProjeto.listarTodos();
    return projetos.map((p) => this.mapearVisaoProjeto(p));
  }

  private mapearVisaoProjeto(projeto: Projeto): VisaoProjeto {
    return {
      id: projeto.id,
      codigo: projeto.codigo,
      necessidadeId: projeto.necessidadeId,
      titulo: projeto.titulo,
      status: projeto.status,
      criadoEm: projeto.criadoEm,
      atualizadoEm: projeto.atualizadoEm,
      etapas: projeto.etapas,
      auditorias: projeto.auditorias,
      direcao: projeto.direcao,
    };
  }
}
