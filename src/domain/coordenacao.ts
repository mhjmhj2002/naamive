import { randomUUID } from "node:crypto";
import { CondicaoOperacionalTrabalho } from "./tipos-coordenacao.js";
import {
  DadosCriacaoTrabalhoCoordenado,
  DadosCriacaoHandoff,
  DadosCriacaoRetorno,
  ConteudoHandoff,
  RegistroHistoricoCoordenacao,
} from "./valores-coordenacao.js";
import {
  InvarianteVioladaErro,
  TransicaoInvalidaErro,
} from "./erros.js";

/**
 * Entidade de Domínio Puro: RetornoCoordenacao
 * Representa o registro imutável do resultado de execução reportado para um handoff despachado.
 */
export class RetornoCoordenacao {
  readonly id: string;
  readonly handoffId: string;
  readonly sucesso: boolean;
  readonly resultadoObservavel: string;
  readonly pendenciasOuBloqueios: string | null;
  readonly recebidoEm: Date;

  constructor(dados: DadosCriacaoRetorno) {
    if (!dados.id || dados.id.trim() === "") {
      throw new InvarianteVioladaErro("O identificador do Retorno de Coordenação é obrigatório.");
    }
    if (!dados.handoffId || dados.handoffId.trim() === "") {
      throw new InvarianteVioladaErro("O vínculo com o Handoff (handoffId) é obrigatório.");
    }
    if (typeof dados.sucesso !== "boolean") {
      throw new InvarianteVioladaErro("O indicador de sucesso do Retorno deve ser booleano.");
    }
    if (!dados.resultadoObservavel || dados.resultadoObservavel.trim() === "") {
      throw new InvarianteVioladaErro("O resultado observável do Retorno é obrigatório.");
    }

    this.id = dados.id;
    this.handoffId = dados.handoffId;
    this.sucesso = dados.sucesso;
    this.resultadoObservavel = dados.resultadoObservavel.trim();
    this.pendenciasOuBloqueios = dados.pendenciasOuBloqueios ? dados.pendenciasOuBloqueios.trim() : null;
    this.recebidoEm = dados.recebidoEm ?? new Date();
  }
}

/**
 * Entidade de Domínio Puro: HandoffCoordenacao
 * Representa o pacote de despacho com token único de correlação e referências recuperáveis.
 */
export class HandoffCoordenacao {
  readonly id: string;
  readonly trabalhoId: string;
  readonly tokenCorrelacao: string;
  readonly atorDestinatario: string;
  readonly skillDestinataria: string | null;
  readonly conteudoHandoff: ConteudoHandoff;
  readonly despachadoEm: Date;

  private _retorno: RetornoCoordenacao | null = null;

  constructor(dados: DadosCriacaoHandoff) {
    if (!dados.id || dados.id.trim() === "") {
      throw new InvarianteVioladaErro("O identificador do Handoff de Coordenação é obrigatório.");
    }
    if (!dados.trabalhoId || dados.trabalhoId.trim() === "") {
      throw new InvarianteVioladaErro("O vínculo com o Trabalho (trabalhoId) é obrigatório no Handoff.");
    }
    if (!dados.tokenCorrelacao || dados.tokenCorrelacao.trim() === "") {
      throw new InvarianteVioladaErro("O token de correlação é obrigatório para rastreabilidade do Handoff.");
    }
    if (!dados.atorDestinatario || dados.atorDestinatario.trim() === "") {
      throw new InvarianteVioladaErro("O Ator destinatário é obrigatório no Handoff.");
    }
    if (!dados.conteudoHandoff) {
      throw new InvarianteVioladaErro("O conteúdo estruturado do Handoff é obrigatório.");
    }

    this.id = dados.id;
    this.trabalhoId = dados.trabalhoId;
    this.tokenCorrelacao = dados.tokenCorrelacao;
    this.atorDestinatario = dados.atorDestinatario.trim();
    this.skillDestinataria = dados.skillDestinataria ? dados.skillDestinataria.trim() : null;
    this.conteudoHandoff = dados.conteudoHandoff;
    this.despachadoEm = dados.despachadoEm ?? new Date();
  }

  get retorno(): RetornoCoordenacao | null {
    return this._retorno;
  }

  /**
   * Associa o retorno de execução a este handoff.
   */
  anexarRetorno(retorno: RetornoCoordenacao): void {
    if (this._retorno) {
      throw new InvarianteVioladaErro("Este Handoff já possui um Retorno associado (imutabilidade violada).");
    }
    if (retorno.handoffId !== this.id) {
      throw new InvarianteVioladaErro(
        `O Retorno informado referencia o handoffId '${retorno.handoffId}', mas este Handoff é '${this.id}'.`
      );
    }
    this._retorno = retorno;
  }
}

/**
 * Entidade Raiz de Domínio Puro: TrabalhoCoordenado
 * Encapsula as regras de transição de condições operacionais, encadeamento de especialização
 * e gestão de handoffs/retornos.
 */
export class TrabalhoCoordenado {
  readonly id: string;
  readonly codigo: string;
  readonly projetoId: string;
  private _titulo: string;
  private _objetivo: string;
  private _condicaoOperacional: CondicaoOperacionalTrabalho;
  private _competenciaRequerida: string;
  private _atorRequerido: string;
  private _skillRequerida: string | null;
  private _executorDesignado: string | null;
  private _criterioTermino: string;
  private _dependencias: string[];
  private _motivoBloqueio: string | null;
  readonly criadoEm: Date;
  private _atualizadoEm: Date;

  private _handoffs: HandoffCoordenacao[] = [];
  private _historico: RegistroHistoricoCoordenacao[] = [];

  constructor(dados: DadosCriacaoTrabalhoCoordenado, criadoEm: Date = new Date()) {
    if (!dados.id || dados.id.trim() === "") {
      throw new InvarianteVioladaErro("O identificador (id) do Trabalho Coordenado é obrigatório.");
    }
    if (!dados.codigo || dados.codigo.trim() === "") {
      throw new InvarianteVioladaErro("O código do Trabalho Coordenado é obrigatório.");
    }
    if (!dados.projetoId || dados.projetoId.trim() === "") {
      throw new InvarianteVioladaErro("O identificador do Projeto de origem (projetoId) é obrigatório.");
    }
    if (!dados.titulo || dados.titulo.trim() === "") {
      throw new InvarianteVioladaErro("O título do Trabalho Coordenado é obrigatório.");
    }
    if (!dados.objetivo || dados.objetivo.trim() === "") {
      throw new InvarianteVioladaErro("O objetivo do Trabalho Coordenado é obrigatório.");
    }
    if (!dados.competenciaRequerida || dados.competenciaRequerida.trim() === "") {
      throw new InvarianteVioladaErro("A competência requerida é obrigatória.");
    }
    if (!dados.atorRequerido || dados.atorRequerido.trim() === "") {
      throw new InvarianteVioladaErro("O Ator requerido é obrigatório.");
    }
    if (!dados.criterioTermino || dados.criterioTermino.trim() === "") {
      throw new InvarianteVioladaErro("O critério observável de término é obrigatório.");
    }

    this.id = dados.id;
    this.codigo = dados.codigo;
    this.projetoId = dados.projetoId;
    this._titulo = dados.titulo.trim();
    this._objetivo = dados.objetivo.trim();
    this._competenciaRequerida = dados.competenciaRequerida.trim();
    this._atorRequerido = dados.atorRequerido.trim();
    this._skillRequerida = dados.skillRequerida ? dados.skillRequerida.trim() : null;
    this._executorDesignado = dados.executorDesignado ? dados.executorDesignado.trim() : null;
    this._criterioTermino = dados.criterioTermino.trim();
    this._dependencias = dados.dependencias ? [...dados.dependencias] : [];
    this._motivoBloqueio = dados.motivoBloqueio ? dados.motivoBloqueio.trim() : null;
    this.criadoEm = criadoEm;
    this._atualizadoEm = criadoEm;

    // Condição inicial padrão: POSSIVEL
    const condicaoInicial = dados.condicaoOperacional ?? CondicaoOperacionalTrabalho.POSSIVEL;

    // Se nascer como PREPARADO, deve satisfazer o invariante de especialização
    if (condicaoInicial === CondicaoOperacionalTrabalho.PREPARADO) {
      this.validarInvarianteEspecializacao();
    }

    this._condicaoOperacional = condicaoInicial;

    this.registrarHistorico(
      "Coordenação",
      "Criação do Trabalho Coordenado",
      null,
      this._condicaoOperacional,
      { codigo: this.codigo, projetoId: this.projetoId }
    );
  }

  get condicaoOperacional(): CondicaoOperacionalTrabalho {
    return this._condicaoOperacional;
  }

  get titulo(): string {
    return this._titulo;
  }

  get objetivo(): string {
    return this._objetivo;
  }

  get competenciaRequerida(): string {
    return this._competenciaRequerida;
  }

  get atorRequerido(): string {
    return this._atorRequerido;
  }

  get skillRequerida(): string | null {
    return this._skillRequerida;
  }

  get executorDesignado(): string | null {
    return this._executorDesignado;
  }

  get criterioTermino(): string {
    return this._criterioTermino;
  }

  get dependencias(): readonly string[] {
    return this._dependencias;
  }

  get motivoBloqueio(): string | null {
    return this._motivoBloqueio;
  }

  get atualizadoEm(): Date {
    return this._atualizadoEm;
  }

  get handoffs(): readonly HandoffCoordenacao[] {
    return this._handoffs;
  }

  get historico(): readonly RegistroHistoricoCoordenacao[] {
    return this._historico;
  }

  /**
   * Invariante de Especialização:
   * Para transicionar para PREPARADO ou emitir handoff, deve haver Ator competente.
   * Se o Ator for agêntico (diferente de "Owner"), deve possuir Skill canônica correspondente.
   */
  validarInvarianteEspecializacao(): void {
    if (!this._atorRequerido || this._atorRequerido.trim() === "") {
      throw new InvarianteVioladaErro(
        `Invariante de Especialização violado no trabalho '${this.codigo}': Ator requerido não informado.`
      );
    }
    const isOwner = this._atorRequerido.trim().toLowerCase() === "owner";
    if (!isOwner && (!this._skillRequerida || this._skillRequerida.trim() === "")) {
      throw new InvarianteVioladaErro(
        `Invariante de Especialização violado no trabalho '${this.codigo}': Ator agêntico '${this._atorRequerido}' requer a especificação da Skill principal correspondente.`
      );
    }
  }

  /**
   * Atualiza atribuições de especialização técnica (Ator, Skill, Executor).
   */
  atribuirEspecializacao(
    atorRequerido: string,
    skillRequerida?: string | null,
    executorDesignado?: string | null
  ): void {
    if (this._condicaoOperacional === CondicaoOperacionalTrabalho.ENCERRADO) {
      throw new TransicaoInvalidaErro(
        this._condicaoOperacional,
        "Atribuir especialização",
        "Trabalhos já ENCERRADOS não podem ter suas especializações alteradas."
      );
    }
    if (!atorRequerido || atorRequerido.trim() === "") {
      throw new InvarianteVioladaErro("O Ator requerido não pode ser vazio.");
    }

    this._atorRequerido = atorRequerido.trim();
    this._skillRequerida = skillRequerida ? skillRequerida.trim() : null;
    if (executorDesignado !== undefined) {
      this._executorDesignado = executorDesignado ? executorDesignado.trim() : null;
    }
    this._atualizadoEm = new Date();

    this.registrarHistorico(
      "Coordenação",
      "Especialização técnica atualizada",
      this._condicaoOperacional,
      this._condicaoOperacional,
      {
        atorRequerido: this._atorRequerido,
        skillRequerida: this._skillRequerida,
        executorDesignado: this._executorDesignado,
      }
    );
  }

  /**
   * Transiciona o trabalho para a condição PREPARADO.
   * Valida estritamente o invariante de especialização e o fluxo permitido.
   */
  marcarComoPreparado(): void {
    if (
      this._condicaoOperacional !== CondicaoOperacionalTrabalho.POSSIVEL &&
      this._condicaoOperacional !== CondicaoOperacionalTrabalho.BLOQUEADO &&
      this._condicaoOperacional !== CondicaoOperacionalTrabalho.AGUARDANDO_DECISAO_HUMANA
    ) {
      throw new TransicaoInvalidaErro(
        this._condicaoOperacional,
        "Marcar como PREPARADO",
        `Apenas trabalhos em POSSIVEL, BLOQUEADO ou AGUARDANDO_DECISAO_HUMANA podem se tornar PREPARADO (atual: ${this._condicaoOperacional}).`
      );
    }

    // Invariante de especialização
    this.validarInvarianteEspecializacao();

    const anterior = this._condicaoOperacional;
    this._condicaoOperacional = CondicaoOperacionalTrabalho.PREPARADO;
    this._motivoBloqueio = null;
    this._atualizadoEm = new Date();

    this.registrarHistorico(
      "Coordenação",
      "Trabalho qualificado como PREPARADO",
      anterior,
      CondicaoOperacionalTrabalho.PREPARADO
    );
  }

  /**
   * Emite um Handoff de despacho com contexto recuperável e transiciona a condição para EM_EXECUCAO.
   */
  despacharHandoff(
    tokenCorrelacao: string,
    referenciasContexto: {
      projeto: string;
      necessidade?: string;
      modulo?: string;
      entregaDeValor?: string;
      documentosNormativos?: string[];
    },
    executorDesignado?: string | null
  ): HandoffCoordenacao {
    if (this._condicaoOperacional !== CondicaoOperacionalTrabalho.PREPARADO) {
      throw new TransicaoInvalidaErro(
        this._condicaoOperacional,
        "Despachar Handoff",
        `Apenas trabalhos com condição operacional PREPARADO podem emitir Handoff para execução (atual: ${this._condicaoOperacional}).`
      );
    }

    this.validarInvarianteEspecializacao();

    if (!tokenCorrelacao || tokenCorrelacao.trim() === "") {
      throw new InvarianteVioladaErro("O token de correlação é obrigatório para emissão do handoff.");
    }

    if (executorDesignado !== undefined && executorDesignado !== null) {
      this._executorDesignado = executorDesignado.trim();
    }

    const conteudo: ConteudoHandoff = {
      projetoId: this.projetoId,
      trabalhoId: this.id,
      codigoTrabalho: this.codigo,
      titulo: this._titulo,
      objetivo: this._objetivo,
      competenciaRequerida: this._competenciaRequerida,
      atorDestinatario: this._atorRequerido,
      skillDestinataria: this._skillRequerida,
      criterioTermino: this._criterioTermino,
      dependenciasVerificadas: [...this._dependencias],
      referenciasContexto,
      geradoEm: new Date().toISOString(),
    };

    const handoff = new HandoffCoordenacao({
      id: randomUUID(),
      trabalhoId: this.id,
      tokenCorrelacao: tokenCorrelacao.trim(),
      atorDestinatario: this._atorRequerido,
      skillDestinataria: this._skillRequerida,
      conteudoHandoff: conteudo,
      despachadoEm: new Date(),
    });

    this._handoffs.push(handoff);
    const anterior = this._condicaoOperacional;
    this._condicaoOperacional = CondicaoOperacionalTrabalho.EM_EXECUCAO;
    this._atualizadoEm = new Date();

    this.registrarHistorico(
      "Coordenação",
      `Handoff despachado com token '${tokenCorrelacao}'`,
      anterior,
      CondicaoOperacionalTrabalho.EM_EXECUCAO,
      { handoffId: handoff.id, tokenCorrelacao, atorDestinatario: this._atorRequerido }
    );

    return handoff;
  }

  /**
   * Registra o retorno de uma execução via Handoff.
   * Se sucesso = true, transiciona para ENCERRADO.
   * Se sucesso = false, analisa se há pendências/bloqueios e transiciona para BLOQUEADO ou AGUARDANDO_DECISAO_HUMANA.
   */
  registrarRetorno(
    tokenCorrelacao: string,
    sucesso: boolean,
    resultadoObservavel: string,
    pendenciasOuBloqueios?: string | null
  ): RetornoCoordenacao {
    if (this._condicaoOperacional !== CondicaoOperacionalTrabalho.EM_EXECUCAO) {
      throw new TransicaoInvalidaErro(
        this._condicaoOperacional,
        "Registrar Retorno",
        `Apenas trabalhos em condição operacional EM_EXECUCAO podem receber retornos (atual: ${this._condicaoOperacional}).`
      );
    }

    const handoff = this._handoffs.find((h) => h.tokenCorrelacao === tokenCorrelacao);
    if (!handoff) {
      throw new InvarianteVioladaErro(
        `Nenhum Handoff encontrado no trabalho '${this.codigo}' com o token de correlação '${tokenCorrelacao}'.`
      );
    }

    const retorno = new RetornoCoordenacao({
      id: randomUUID(),
      handoffId: handoff.id,
      sucesso,
      resultadoObservavel,
      pendenciasOuBloqueios,
      recebidoEm: new Date(),
    });

    handoff.anexarRetorno(retorno);

    const anterior = this._condicaoOperacional;
    if (sucesso) {
      this._condicaoOperacional = CondicaoOperacionalTrabalho.ENCERRADO;
      this._motivoBloqueio = null;
    } else {
      const pendenciasTexto = (pendenciasOuBloqueios ?? "").toLowerCase();
      if (pendenciasTexto.includes("owner") || pendenciasTexto.includes("decisão humana") || pendenciasTexto.includes("decisao humana")) {
        this._condicaoOperacional = CondicaoOperacionalTrabalho.AGUARDANDO_DECISAO_HUMANA;
      } else {
        this._condicaoOperacional = CondicaoOperacionalTrabalho.BLOQUEADO;
      }
      this._motivoBloqueio = pendenciasOuBloqueios ?? resultadoObservavel;
    }

    this._atualizadoEm = new Date();

    this.registrarHistorico(
      "Coordenação",
      `Retorno registrado: ${sucesso ? "SUCESSO" : "FALHA/BLOQUEIO"}`,
      anterior,
      this._condicaoOperacional,
      { retornoId: retorno.id, sucesso, resultadoObservavel }
    );

    return retorno;
  }

  /**
   * Bloqueia o trabalho explicitando o motivo.
   */
  bloquear(motivo: string): void {
    if (this._condicaoOperacional === CondicaoOperacionalTrabalho.ENCERRADO) {
      throw new TransicaoInvalidaErro(
        this._condicaoOperacional,
        "Bloquear trabalho",
        "Trabalhos ENCERRADOS não podem ser bloqueados."
      );
    }
    if (!motivo || motivo.trim() === "") {
      throw new InvarianteVioladaErro("O motivo do bloqueio é obrigatório.");
    }

    const anterior = this._condicaoOperacional;
    this._condicaoOperacional = CondicaoOperacionalTrabalho.BLOQUEADO;
    this._motivoBloqueio = motivo.trim();
    this._atualizadoEm = new Date();

    this.registrarHistorico(
      "Coordenação",
      `Trabalho bloqueado: ${this._motivoBloqueio}`,
      anterior,
      CondicaoOperacionalTrabalho.BLOQUEADO,
      { motivo: this._motivoBloqueio }
    );
  }

  /**
   * Suspende o trabalho aguardando decisão humana soberana do Owner.
   */
  aguardarDecisaoHumana(dilemaOuPendencia: string): void {
    if (this._condicaoOperacional === CondicaoOperacionalTrabalho.ENCERRADO) {
      throw new TransicaoInvalidaErro(
        this._condicaoOperacional,
        "Aguardar decisão humana",
        "Trabalhos ENCERRADOS não podem ser postos em espera de decisão humana."
      );
    }
    if (!dilemaOuPendencia || dilemaOuPendencia.trim() === "") {
      throw new InvarianteVioladaErro("A descrição do dilema ou pendência humana é obrigatória.");
    }

    const anterior = this._condicaoOperacional;
    this._condicaoOperacional = CondicaoOperacionalTrabalho.AGUARDANDO_DECISAO_HUMANA;
    this._motivoBloqueio = dilemaOuPendencia.trim();
    this._atualizadoEm = new Date();

    this.registrarHistorico(
      "Coordenação",
      `Trabalho aguardando decisão humana: ${this._motivoBloqueio}`,
      anterior,
      CondicaoOperacionalTrabalho.AGUARDANDO_DECISAO_HUMANA,
      { dilema: this._motivoBloqueio }
    );
  }

  /**
   * Registra entrada no histórico de coordenação.
   */
  private registrarHistorico(
    ator: string,
    atividade: string,
    condicaoAnterior: CondicaoOperacionalTrabalho | null,
    condicaoNova: CondicaoOperacionalTrabalho | null,
    detalhes?: Record<string, unknown>
  ): void {
    const registro: RegistroHistoricoCoordenacao = {
      id: randomUUID(),
      trabalhoId: this.id,
      ator,
      atividade,
      condicaoAnterior,
      condicaoNova,
      detalhes,
      registradoEm: new Date(),
    };
    this._historico.push(registro);
  }

  /**
   * Reconstituição de entidade persistida (usado por repositórios).
   */
  static reconstituir(
    dados: DadosCriacaoTrabalhoCoordenado,
    criadoEm: Date,
    atualizadoEm: Date,
    condicaoOperacional: CondicaoOperacionalTrabalho,
    handoffs: HandoffCoordenacao[],
    historico: RegistroHistoricoCoordenacao[]
  ): TrabalhoCoordenado {
    const trabalho = Object.create(TrabalhoCoordenado.prototype) as TrabalhoCoordenado;
    Object.assign(trabalho, {
      id: dados.id,
      codigo: dados.codigo,
      projetoId: dados.projetoId,
      _titulo: dados.titulo,
      _objetivo: dados.objetivo,
      _competenciaRequerida: dados.competenciaRequerida,
      _atorRequerido: dados.atorRequerido,
      _skillRequerida: dados.skillRequerida ?? null,
      _executorDesignado: dados.executorDesignado ?? null,
      _criterioTermino: dados.criterioTermino,
      _dependencias: dados.dependencias ? [...dados.dependencias] : [],
      _motivoBloqueio: dados.motivoBloqueio ?? null,
      criadoEm,
      _atualizadoEm: atualizadoEm,
      _condicaoOperacional: condicaoOperacional,
      _handoffs: [...handoffs],
      _historico: [...historico],
    });
    return trabalho;
  }
}
