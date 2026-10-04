import {
  StatusNecessidade,
  TipoNecessidade,
  TipoResultadoProcesso,
  DecisaoMaterialOwner,
  AtorCompetenteNecessidade,
} from "./tipos.js";
import {
  TransicaoInvalidaErro,
  AutoridadeInvalidaErro,
  InvarianteVioladaErro,
} from "./erros.js";
import {
  DadosCriacaoNecessidade,
  RegistroHistoricoAtividade,
  RegistroResultadoProcesso,
  RegistroDecisaoOwner,
  CompromissoNecessidade,
} from "./valores.js";

/**
 * Entidade raiz de domínio puro da Necessidade.
 * Encapsula o estado, as regras de ciclo de vida e a integridade de negócio.
 * 
 * Regras invariantes fundamentais:
 * 1. Posição atual (status) pertence exclusivamente ao catálogo de Status.
 * 2. Atividades, Resultados do Processo e Decisões são registros separados do status.
 * 3. Criação entra diretamente em EM_FORMACAO.
 * 4. Transição EM_FORMACAO -> EM_QUALIFICACAO requer parecer prévio QUALIFICAVEL por Auditor da Necessidade.
 * 5. Transição EM_QUALIFICACAO -> AGUARDANDO_DECISAO requer parecer prévio de recomendação (ASSUMIR ou NAO_ASSUMIR).
 * 6. Decisão material exige Owner identificado/autenticado.
 * 7. Compromisso só pode ser consolidado após decisão válida APROVADO em AGUARDANDO_DECISAO.
 * 8. Transição para EM_PROJETO só ocorre a partir de AGUARDANDO_DECISAO após APROVADO e confirmação do bootstrap do Projeto.
 * 9. CANCELAMENTO_APROVADO transiciona qualquer status não terminal para CANCELADA.
 * 10. ATENDIDA só pode ser alcançada a partir de EM_PROJETO após conclusão do Projeto.
 * 11. Estados terminais (ATENDIDA e CANCELADA) não aceitam novas transições.
 */
export class Necessidade {
  readonly id: string;
  readonly codigo: string;
  readonly titulo: string;
  readonly tipo: TipoNecessidade;
  readonly problemaOuOportunidade: string;
  readonly quemEAfetado: string;
  readonly resultadoPretendido: string;
  readonly escopoInicial: string;
  readonly foraDeEscopo: string;
  readonly criterioDeAtendimento: string;
  readonly porQueIssoImporta: string;
  readonly restricoesOuDependencias: string;
  readonly origem: string;
  readonly criadoEm: Date;

  private _status: StatusNecessidade;
  private _atualizadoEm: Date;

  private _historico: RegistroHistoricoAtividade[] = [];
  private _resultados: RegistroResultadoProcesso[] = [];
  private _decisoes: RegistroDecisaoOwner[] = [];
  private _compromisso: CompromissoNecessidade | null = null;

  constructor(dados: DadosCriacaoNecessidade, criadoEm: Date = new Date()) {
    if (!dados.id || dados.id.trim() === "") {
      throw new InvarianteVioladaErro("O identificador (id) da Necessidade é obrigatório.");
    }
    if (!dados.codigo || dados.codigo.trim() === "") {
      throw new InvarianteVioladaErro("O código da Necessidade é obrigatório.");
    }
    if (!dados.titulo || dados.titulo.trim() === "") {
      throw new InvarianteVioladaErro("O título da Necessidade é obrigatório.");
    }

    this.id = dados.id;
    this.codigo = dados.codigo;
    this.titulo = dados.titulo;
    this.tipo = dados.tipo;
    this.problemaOuOportunidade = dados.problemaOuOportunidade;
    this.quemEAfetado = dados.quemEAfetado;
    this.resultadoPretendido = dados.resultadoPretendido;
    this.escopoInicial = dados.escopoInicial;
    this.foraDeEscopo = dados.foraDeEscopo;
    this.criterioDeAtendimento = dados.criterioDeAtendimento;
    this.porQueIssoImporta = dados.porQueIssoImporta;
    this.restricoesOuDependencias = dados.restricoesOuDependencias ?? "Nenhuma conhecida neste momento.";
    this.origem = dados.origem;
    this.criadoEm = criadoEm;
    this._atualizadoEm = criadoEm;

    // Regra: A Necessidade entra diretamente no status EM_FORMACAO.
    this._status = StatusNecessidade.EM_FORMACAO;

    this.registrarAtividade(
      AtorCompetenteNecessidade.ESPECIALISTA_FORMACAO,
      "Criação da Necessidade",
      null,
      StatusNecessidade.EM_FORMACAO,
      { codigo: this.codigo, titulo: this.titulo }
    );
  }

  get status(): StatusNecessidade {
    return this._status;
  }

  get atualizadoEm(): Date {
    return this._atualizadoEm;
  }

  get historico(): readonly RegistroHistoricoAtividade[] {
    return this._historico;
  }

  get resultados(): readonly RegistroResultadoProcesso[] {
    return this._resultados;
  }

  get decisoes(): readonly RegistroDecisaoOwner[] {
    return this._decisoes;
  }

  get compromisso(): CompromissoNecessidade | null {
    return this._compromisso;
  }

  /**
   * Registra uma atividade no histórico imutável.
   */
  private registrarAtividade(
    atorCompetente: string,
    atividade: string,
    statusAnterior: StatusNecessidade | null,
    statusNovo: StatusNecessidade | null,
    detalhes?: Record<string, unknown>
  ): void {
    const registro: RegistroHistoricoAtividade = {
      id: `${this.id}-act-${this._historico.length + 1}`,
      necessidadeId: this.id,
      atorCompetente,
      atividade,
      statusAnterior,
      statusNovo,
      detalhes,
      registradoEm: new Date(),
    };
    this._historico.push(registro);
    this._atualizadoEm = registro.registradoEm;
  }

  /**
   * Registra um Resultado do Processo formal emitido por um Ator competente.
   * Não altera diretamente o status, mantendo estrita separação conceitual.
   */
  public registrarResultadoProcesso(
    atorCompetente: string,
    tipoResultado: TipoResultadoProcesso,
    conteudo?: Record<string, unknown>
  ): RegistroResultadoProcesso {
    this.assegurarNaoTerminal("registrar resultado do processo");

    // Validação de competência do Ator conforme catálogo normativo
    if (
      tipoResultado === TipoResultadoProcesso.QUALIFICAVEL ||
      tipoResultado === TipoResultadoProcesso.PRECISA_DE_ESCLARECIMENTO ||
      tipoResultado === TipoResultadoProcesso.PRECISA_DE_DECOMPOSICAO ||
      tipoResultado === TipoResultadoProcesso.NAO_CARACTERIZA_NECESSIDADE
    ) {
      if (atorCompetente !== AtorCompetenteNecessidade.AUDITOR_NECESSIDADE) {
        throw new AutoridadeInvalidaErro(
          AtorCompetenteNecessidade.AUDITOR_NECESSIDADE,
          atorCompetente
        );
      }
    } else if (
      tipoResultado === TipoResultadoProcesso.ASSUMIR_COMPROMISSO ||
      tipoResultado === TipoResultadoProcesso.NAO_ASSUMIR_COMPROMISSO
    ) {
      if (atorCompetente !== AtorCompetenteNecessidade.ESPECIALISTA_QUALIFICACAO) {
        throw new AutoridadeInvalidaErro(
          AtorCompetenteNecessidade.ESPECIALISTA_QUALIFICACAO,
          atorCompetente
        );
      }
    }

    const resultado: RegistroResultadoProcesso = {
      id: `${this.id}-res-${this._resultados.length + 1}`,
      necessidadeId: this.id,
      atorCompetente,
      tipoResultado,
      conteudo,
      emitidoEm: new Date(),
    };

    this._resultados.push(resultado);

    this.registrarAtividade(
      atorCompetente,
      `Emissão do Resultado do Processo: ${tipoResultado}`,
      this._status,
      this._status,
      { tipoResultado, conteudo }
    );

    return resultado;
  }

  /**
   * Conclui a formação da Necessidade e transiciona para EM_QUALIFICACAO.
   * Pré-requisito: Deve estar em EM_FORMACAO e possuir parecer QUALIFICAVEL emitido por Auditor da Necessidade.
   */
  public avancarParaQualificacao(atorSolicitante: string): void {
    this.assegurarNaoTerminal("avançar para qualificação");

    if (this._status !== StatusNecessidade.EM_FORMACAO) {
      throw new TransicaoInvalidaErro(
        this._status,
        "avancarParaQualificacao",
        "A Necessidade deve estar em EM_FORMACAO para avançar para EM_QUALIFICACAO."
      );
    }

    const temQualificavel = this._resultados.some(
      (r) =>
        r.tipoResultado === TipoResultadoProcesso.QUALIFICAVEL &&
        r.atorCompetente === AtorCompetenteNecessidade.AUDITOR_NECESSIDADE
    );

    if (!temQualificavel) {
      throw new InvarianteVioladaErro(
        "Para avançar para EM_QUALIFICACAO, é obrigatório parecer prévio QUALIFICAVEL emitido pelo Auditor da Necessidade."
      );
    }

    const statusAnterior = this._status;
    this._status = StatusNecessidade.EM_QUALIFICACAO;

    this.registrarAtividade(
      atorSolicitante,
      "Conclusão da Formação e avanço para Qualificação",
      statusAnterior,
      this._status
    );
  }

  /**
   * Conclui a qualificação e avança para AGUARDANDO_DECISAO.
   * Pré-requisito: Deve estar em EM_QUALIFICACAO e possuir recomendação emitida pelo Especialista em Qualificação.
   */
  public submeterParaDecisao(atorSolicitante: string): void {
    this.assegurarNaoTerminal("submeter para decisão");

    if (this._status !== StatusNecessidade.EM_QUALIFICACAO) {
      throw new TransicaoInvalidaErro(
        this._status,
        "submeterParaDecisao",
        "A Necessidade deve estar em EM_QUALIFICACAO para avançar para AGUARDANDO_DECISAO."
      );
    }

    const temRecomendacao = this._resultados.some(
      (r) =>
        (r.tipoResultado === TipoResultadoProcesso.ASSUMIR_COMPROMISSO ||
          r.tipoResultado === TipoResultadoProcesso.NAO_ASSUMIR_COMPROMISSO) &&
        r.atorCompetente === AtorCompetenteNecessidade.ESPECIALISTA_QUALIFICACAO
    );

    if (!temRecomendacao) {
      throw new InvarianteVioladaErro(
        "Para avançar para AGUARDANDO_DECISAO, é obrigatória recomendação prévia (ASSUMIR_COMPROMISSO ou NAO_ASSUMIR_COMPROMISSO) emitida pelo Especialista em Qualificação."
      );
    }

    const statusAnterior = this._status;
    this._status = StatusNecessidade.AGUARDANDO_DECISAO;

    this.registrarAtividade(
      atorSolicitante,
      "Submissão para Decisão do Owner",
      statusAnterior,
      this._status
    );
  }

  /**
   * Registra a Decisão Humana Material do Owner.
   * Exige usuário autenticado e permissão explícita.
   */
  public registrarDecisaoOwner(
    decisao: DecisaoMaterialOwner,
    usuarioAutenticado: string,
    justificativa?: string
  ): RegistroDecisaoOwner {
    if (!usuarioAutenticado || usuarioAutenticado.trim() === "") {
      throw new AutoridadeInvalidaErro(
        "Owner (usuário autenticado obrigatório)",
        "Usuário anônimo / não autenticado"
      );
    }

    this.assegurarNaoTerminal("registrar decisão do Owner");

    if (decisao === DecisaoMaterialOwner.APROVADO) {
      if (this._status !== StatusNecessidade.AGUARDANDO_DECISAO) {
        throw new TransicaoInvalidaErro(
          this._status,
          "registrarDecisaoOwner (APROVADO)",
          "A decisão APROVADO só pode ser registrada quando a Necessidade estiver em AGUARDANDO_DECISAO."
        );
      }
    }

    const registroDecisao: RegistroDecisaoOwner = {
      id: `${this.id}-dec-${this._decisoes.length + 1}`,
      necessidadeId: this.id,
      decisao,
      usuarioAutenticado,
      justificativa,
      decididoEm: new Date(),
    };

    this._decisoes.push(registroDecisao);

    this.registrarAtividade(
      AtorCompetenteNecessidade.OWNER,
      `Decisão Humana Material do Owner: ${decisao}`,
      this._status,
      this._status,
      { decisao, usuarioAutenticado, justificativa }
    );

    if (decisao === DecisaoMaterialOwner.CANCELAMENTO_APROVADO) {
      const statusAnterior = this._status;
      this._status = StatusNecessidade.CANCELADA;
      this.registrarAtividade(
        AtorCompetenteNecessidade.OWNER,
        "Cancelamento da Necessidade por decisão do Owner",
        statusAnterior,
        this._status
      );
    }

    return registroDecisao;
  }

  /**
   * Consolida e disponibiliza o Compromisso da Necessidade.
   * Regra: Só pode ser invocado se houver decisão APROVADO pelo Owner em AGUARDANDO_DECISAO.
   */
  public consolidarCompromisso(contextoRelevanteAdicional?: string): CompromissoNecessidade {
    const ultimaDecisaoAprovada = [...this._decisoes]
      .reverse()
      .find((d) => d.decisao === DecisaoMaterialOwner.APROVADO);

    if (!ultimaDecisaoAprovada) {
      throw new InvarianteVioladaErro(
        "O Compromisso da Necessidade só pode ser consolidado após decisão humana válida APROVADO emitida pelo Owner."
      );
    }

    if (this._status !== StatusNecessidade.AGUARDANDO_DECISAO && this._status !== StatusNecessidade.EM_PROJETO) {
      throw new TransicaoInvalidaErro(
        this._status,
        "consolidarCompromisso",
        "O Compromisso só fica disponível em AGUARDANDO_DECISAO (após APROVADO) ou EM_PROJETO."
      );
    }

    const compromisso: CompromissoNecessidade = {
      id: `${this.id}-comp`,
      necessidadeId: this.id,
      problemaAssumido: this.problemaOuOportunidade,
      resultadoPretendido: this.resultadoPretendido,
      escopoAssumido: this.escopoInicial,
      foraDeEscopo: this.foraDeEscopo,
      criterioDeAtendimento: this.criterioDeAtendimento,
      restricoesAPreservar: this.restricoesOuDependencias,
      contextoRelevante: contextoRelevanteAdicional ?? `Origem: ${this.origem}. Valor: ${this.porQueIssoImporta}`,
      decisaoId: ultimaDecisaoAprovada.id,
      usuarioAprovador: ultimaDecisaoAprovada.usuarioAutenticado,
      consolidadoEm: new Date(),
    };

    this._compromisso = compromisso;

    this.registrarAtividade(
      AtorCompetenteNecessidade.OWNER,
      "Consolidação e disponibilização do Compromisso da Necessidade",
      this._status,
      this._status,
      { compromissoId: compromisso.id, aprovador: compromisso.usuarioAprovador }
    );

    return compromisso;
  }

  /**
   * Transiciona para EM_PROJETO após confirmação do bootstrap bem-sucedido de exatamente 1 Projeto em M-002.
   */
  public confirmarMaterializacaoProjeto(
    projetoId: string,
    atorResponsavel: string = AtorCompetenteNecessidade.ESPECIALISTA_FORMACAO_PROJETO
  ): void {
    if (this._status !== StatusNecessidade.AGUARDANDO_DECISAO) {
      throw new TransicaoInvalidaErro(
        this._status,
        "confirmarMaterializacaoProjeto",
        "A Necessidade só pode transicionar para EM_PROJETO a partir de AGUARDANDO_DECISAO após APROVADO."
      );
    }

    if (!this._compromisso) {
      throw new InvarianteVioladaErro(
        "A Necessidade não pode transicionar para EM_PROJETO sem que o Compromisso esteja consolidado."
      );
    }

    if (!projetoId || projetoId.trim() === "") {
      throw new InvarianteVioladaErro(
        "O identificador do Projeto criado em vínculo 1:1 é obrigatório para confirmar a transição para EM_PROJETO."
      );
    }

    const statusAnterior = this._status;
    this._status = StatusNecessidade.EM_PROJETO;

    this.registrarAtividade(
      atorResponsavel,
      "Vínculo 1:1 confirmado com Projeto e transição para EM_PROJETO",
      statusAnterior,
      this._status,
      { projetoId }
    );
  }

  /**
   * Conclui a Necessidade em ATENDIDA após sucesso total do Projeto correspondente.
   */
  public marcarComoAtendida(motivo: string = "Projeto concluído com sucesso"): void {
    if (this._status !== StatusNecessidade.EM_PROJETO) {
      throw new TransicaoInvalidaErro(
        this._status,
        "marcarComoAtendida",
        "Apenas uma Necessidade em EM_PROJETO pode ser concluída como ATENDIDA."
      );
    }

    const statusAnterior = this._status;
    this._status = StatusNecessidade.ATENDIDA;

    this.registrarAtividade(
      "Sistema / Coordenação",
      "Encerramento com sucesso: Necessidade ATENDIDA",
      statusAnterior,
      this._status,
      { motivo }
    );
  }

  private assegurarNaoTerminal(acao: string): void {
    if (this._status === StatusNecessidade.ATENDIDA || this._status === StatusNecessidade.CANCELADA) {
      throw new TransicaoInvalidaErro(
        this._status,
        acao,
        "Estados terminais (ATENDIDA ou CANCELADA) não aceitam novas transições ou resultados."
      );
    }
  }
}
