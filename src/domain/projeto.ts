import { randomUUID } from "node:crypto";
import {
  StatusProjeto,
  EtapaFormacaoProjeto,
  TipoResultadoProcessoProjeto,
  DecisaoMaterialOwnerProjeto,
  AtorCompetenteProjeto,
} from "./tipos-projeto.js";
import {
  TransicaoInvalidaErro,
  AutoridadeInvalidaErro,
  InvarianteVioladaErro,
  AutenticacaoRequeridaErro,
} from "./erros.js";
import {
  DadosCriacaoProjeto,
  RegistroEtapaFormacaoProjeto,
  RegistroAuditoriaProjeto,
  DirecaoProjeto,
  RegistroDecisaoOwnerProjeto,
  RegistroHistoricoProjeto,
} from "./valores-projeto.js";

/**
 * Entidade raiz de domínio puro de Projeto.
 * Encapsula o ciclo de vida, integridade de etapas, auditorias e direção.
 * 
 * Regras invariantes fundamentais (documentacao/projeto/):
 * 1. Posição atual (status) pertence exclusivamente ao catálogo de Status: EM_FORMACAO, FORMADO, CONCLUIDO, CANCELADO.
 * 2. Projeto nasce obrigatoriamente a partir de uma Necessidade com compromisso aprovado, no status EM_FORMACAO.
 * 3. Relação 1:1 estrita com a Necessidade de origem (necessidadeId).
 * 4. Etapas de formação (ENQUADRAMENTO, DESCOBERTA, DIREÇÃO DA SOLUÇÃO) são conduzidas pelo Especialista em Formação do Projeto.
 * 5. Transição EM_FORMACAO -> FORMADO requer aprovação prévia com FORMACAO_SUFICIENTE emitida pelo Auditor do Projeto.
 * 6. FORMACAO_SUFICIENTE gera e disponibiliza a Direção do Projeto consolidada.
 * 7. FORMACAO_INSUFICIENTE mantém o Projeto em EM_FORMACAO para saneamento de lacunas.
 * 8. Cancelamento exige decisão material CANCELAMENTO_APROVADO emitida exclusivamente pelo Owner (usuário autenticado).
 * 9. Status terminais (CONCLUIDO e CANCELADO) são imutáveis e não permitem novas transições.
 */
export class Projeto {
  readonly id: string;
  readonly codigo: string;
  readonly necessidadeId: string;
  private _titulo: string;
  readonly criadoEm: Date;

  private _status: StatusProjeto;
  private _atualizadoEm: Date;

  private _etapas: RegistroEtapaFormacaoProjeto[] = [];
  private _auditorias: RegistroAuditoriaProjeto[] = [];
  private _decisoes: RegistroDecisaoOwnerProjeto[] = [];
  private _historico: RegistroHistoricoProjeto[] = [];
  private _direcao: DirecaoProjeto | null = null;

  constructor(dados: DadosCriacaoProjeto, criadoEm: Date = new Date()) {
    if (!dados.id || dados.id.trim() === "") {
      throw new InvarianteVioladaErro("O identificador (id) do Projeto é obrigatório.");
    }
    if (!dados.codigo || dados.codigo.trim() === "") {
      throw new InvarianteVioladaErro("O código do Projeto é obrigatório.");
    }
    if (!dados.necessidadeId || dados.necessidadeId.trim() === "") {
      throw new InvarianteVioladaErro("A Necessidade de origem (necessidadeId) é obrigatória para o Projeto.");
    }
    if (!dados.titulo || dados.titulo.trim() === "") {
      throw new InvarianteVioladaErro("O título do Projeto é obrigatório.");
    }

    this.id = dados.id;
    this.codigo = dados.codigo;
    this.necessidadeId = dados.necessidadeId;
    this._titulo = dados.titulo;
    this.criadoEm = criadoEm;
    this._atualizadoEm = criadoEm;

    // Regra: O Projeto nasce obrigatoriamente em EM_FORMACAO.
    this._status = StatusProjeto.EM_FORMACAO;

    this.registrarHistorico(
      AtorCompetenteProjeto.ESPECIALISTA_FORMACAO_PROJETO,
      "Bootstrap e criação do Projeto",
      null,
      StatusProjeto.EM_FORMACAO,
      { codigo: this.codigo, necessidadeId: this.necessidadeId, titulo: this._titulo }
    );
  }

  get status(): StatusProjeto {
    return this._status;
  }

  get titulo(): string {
    return this._titulo;
  }

  get atualizadoEm(): Date {
    return this._atualizadoEm;
  }

  get etapas(): readonly RegistroEtapaFormacaoProjeto[] {
    return this._etapas;
  }

  get auditorias(): readonly RegistroAuditoriaProjeto[] {
    return this._auditorias;
  }

  get decisoes(): readonly RegistroDecisaoOwnerProjeto[] {
    return this._decisoes;
  }

  get historico(): readonly RegistroHistoricoProjeto[] {
    return this._historico;
  }

  get direcao(): DirecaoProjeto | null {
    return this._direcao;
  }

  /**
   * Permite ao Owner alterar o nome/título do Projeto sem alterar id, código ou necessidadeId.
   */
  atualizarTitulo(novoTitulo: string, usuarioAutenticado: string): void {
    if (!usuarioAutenticado || usuarioAutenticado.trim() === "") {
      throw new AutenticacaoRequeridaErro("A alteração de título requer usuário autenticado.");
    }
    if (!novoTitulo || novoTitulo.trim() === "") {
      throw new InvarianteVioladaErro("O novo título do Projeto não pode ser vazio.");
    }

    const tituloAnterior = this._titulo;
    this._titulo = novoTitulo;
    this._atualizadoEm = new Date();

    this.registrarHistorico(
      AtorCompetenteProjeto.OWNER,
      "Alteração do título do Projeto",
      this._status,
      this._status,
      { tituloAnterior, novoTitulo, alteradoPor: usuarioAutenticado }
    );
  }

  /**
   * Registra o avanço e conteúdo de uma etapa de formação pelo Especialista em Formação do Projeto.
   */
  registrarEtapaFormacao(
    ator: string,
    etapa: EtapaFormacaoProjeto,
    conteudo: Record<string, unknown>
  ): RegistroEtapaFormacaoProjeto {
    if (ator !== AtorCompetenteProjeto.ESPECIALISTA_FORMACAO_PROJETO) {
      throw new AutoridadeInvalidaErro(AtorCompetenteProjeto.ESPECIALISTA_FORMACAO_PROJETO, ator);
    }
    if (this._status !== StatusProjeto.EM_FORMACAO) {
      throw new TransicaoInvalidaErro(
        this._status,
        `Registrar etapa ${etapa}`,
        "Etapas de formação só podem ser registradas com o Projeto no status EM_FORMACAO."
      );
    }
    if (!conteudo || Object.keys(conteudo).length === 0) {
      throw new InvarianteVioladaErro(`O conteúdo da etapa '${etapa}' não pode ser vazio.`);
    }

    const registro: RegistroEtapaFormacaoProjeto = {
      id: randomUUID(),
      projetoId: this.id,
      etapa,
      conteudo,
      registradoPor: ator,
      registradoEm: new Date(),
    };

    this._etapas.push(registro);
    this._atualizadoEm = new Date();

    this.registrarHistorico(
      ator,
      `Etapa de formação registrada: ${etapa}`,
      this._status,
      this._status,
      { etapa, registroId: registro.id }
    );

    return registro;
  }

  /**
   * Registra o parecer de auditoria do Auditor do Projeto.
   */
  registrarAuditoria(
    ator: string,
    resultado: TipoResultadoProcessoProjeto,
    parecer: string
  ): RegistroAuditoriaProjeto {
    if (ator !== AtorCompetenteProjeto.AUDITOR_PROJETO) {
      throw new AutoridadeInvalidaErro(AtorCompetenteProjeto.AUDITOR_PROJETO, ator);
    }
    if (this._status !== StatusProjeto.EM_FORMACAO) {
      throw new TransicaoInvalidaErro(
        this._status,
        "Auditoria de formação",
        "A auditoria de formação só pode ser realizada quando o Projeto estiver no status EM_FORMACAO."
      );
    }
    if (
      resultado !== TipoResultadoProcessoProjeto.FORMACAO_SUFICIENTE &&
      resultado !== TipoResultadoProcessoProjeto.FORMACAO_INSUFICIENTE
    ) {
      throw new InvarianteVioladaErro(
        `O resultado de auditoria de formação deve ser FORMACAO_SUFICIENTE ou FORMACAO_INSUFICIENTE (recebido: ${resultado}).`
      );
    }
    if (!parecer || parecer.trim() === "") {
      throw new InvarianteVioladaErro("O parecer descritivo de auditoria é obrigatório.");
    }

    const auditoria: RegistroAuditoriaProjeto = {
      id: randomUUID(),
      projetoId: this.id,
      resultado,
      parecer,
      auditor: ator,
      auditadoEm: new Date(),
    };

    this._auditorias.push(auditoria);
    this._atualizadoEm = new Date();

    this.registrarHistorico(
      ator,
      `Auditoria de formação realizada: ${resultado}`,
      this._status,
      this._status,
      { resultado, parecer, auditoriaId: auditoria.id }
    );

    return auditoria;
  }

  /**
   * Conclui a formação do Projeto e transiciona para FORMADO com geração da Direção do Projeto.
   * Exige que a última auditoria tenha sido FORMACAO_SUFICIENTE.
   */
  concluirFormacao(
    ator: string,
    dadosDirecao: {
      compromissoOrigem: string;
      objetivoProjeto: string;
      fronteiras: string;
      contextoRelevante: string;
    }
  ): DirecaoProjeto {
    if (
      ator !== AtorCompetenteProjeto.AUDITOR_PROJETO &&
      ator !== AtorCompetenteProjeto.ESPECIALISTA_FORMACAO_PROJETO
    ) {
      throw new AutoridadeInvalidaErro(
        `${AtorCompetenteProjeto.AUDITOR_PROJETO} ou ${AtorCompetenteProjeto.ESPECIALISTA_FORMACAO_PROJETO}`,
        ator
      );
    }

    if (this._status !== StatusProjeto.EM_FORMACAO) {
      throw new TransicaoInvalidaErro(
        this._status,
        "Transição para FORMADO",
        "Apenas projetos em EM_FORMACAO podem transicionar para FORMADO."
      );
    }

    const ultimaAuditoria = this._auditorias[this._auditorias.length - 1];
    if (!ultimaAuditoria || ultimaAuditoria.resultado !== TipoResultadoProcessoProjeto.FORMACAO_SUFICIENTE) {
      throw new InvarianteVioladaErro(
        "A transição para FORMADO exige parecer prévio de FORMACAO_SUFICIENTE emitido pelo Auditor do Projeto."
      );
    }

    if (!dadosDirecao.compromissoOrigem || dadosDirecao.compromissoOrigem.trim() === "") {
      throw new InvarianteVioladaErro("O compromisso de origem da Direção do Projeto é obrigatório.");
    }
    if (!dadosDirecao.objetivoProjeto || dadosDirecao.objetivoProjeto.trim() === "") {
      throw new InvarianteVioladaErro("O objetivo do Projeto na Direção é obrigatório.");
    }
    if (!dadosDirecao.fronteiras || dadosDirecao.fronteiras.trim() === "") {
      throw new InvarianteVioladaErro("As fronteiras do Projeto na Direção são obrigatórias.");
    }
    if (!dadosDirecao.contextoRelevante || dadosDirecao.contextoRelevante.trim() === "") {
      throw new InvarianteVioladaErro("O contexto relevante da Direção é obrigatório.");
    }

    const direcao: DirecaoProjeto = {
      id: randomUUID(),
      projetoId: this.id,
      compromissoOrigem: dadosDirecao.compromissoOrigem,
      objetivoProjeto: dadosDirecao.objetivoProjeto,
      fronteiras: dadosDirecao.fronteiras,
      contextoRelevante: dadosDirecao.contextoRelevante,
      aprovadoEm: new Date(),
    };

    const statusAnterior = this._status;
    this._status = StatusProjeto.FORMADO;
    this._direcao = direcao;
    this._atualizadoEm = new Date();

    this.registrarHistorico(
      ator,
      "Conclusão da Formação e consolidação da Direção do Projeto",
      statusAnterior,
      StatusProjeto.FORMADO,
      { direcaoId: direcao.id, objetivo: direcao.objetivoProjeto }
    );

    return direcao;
  }

  /**
   * Cancelamento excepcional aprovado pelo Owner (usuário autenticado).
   * Transiciona qualquer status não terminal para CANCELADO.
   */
  cancelarPorDecisaoOwner(
    usuarioAutenticado: string,
    justificativa: string
  ): RegistroDecisaoOwnerProjeto {
    if (!usuarioAutenticado || usuarioAutenticado.trim() === "") {
      throw new AutenticacaoRequeridaErro("O cancelamento de Projeto exige usuário autenticado como Owner.");
    }

    if (this._status === StatusProjeto.CANCELADO || this._status === StatusProjeto.CONCLUIDO) {
      throw new TransicaoInvalidaErro(
        this._status,
        "Cancelar Projeto",
        "Projetos em status terminais (CANCELADO ou CONCLUIDO) não podem ser alterados."
      );
    }

    if (!justificativa || justificativa.trim() === "") {
      throw new InvarianteVioladaErro("O cancelamento pelo Owner requer justificativa expressa.");
    }

    const decisao: RegistroDecisaoOwnerProjeto = {
      id: randomUUID(),
      projetoId: this.id,
      decisao: DecisaoMaterialOwnerProjeto.CANCELAMENTO_APROVADO,
      usuarioAutenticado,
      justificativa,
      decididoEm: new Date(),
    };

    const statusAnterior = this._status;
    this._status = StatusProjeto.CANCELADO;
    this._decisoes.push(decisao);
    this._atualizadoEm = new Date();

    this.registrarHistorico(
      AtorCompetenteProjeto.OWNER,
      "Cancelamento excepcional aprovado pelo Owner",
      statusAnterior,
      StatusProjeto.CANCELADO,
      { decisaoId: decisao.id, usuarioAutenticado, justificativa }
    );

    return decisao;
  }

  /**
   * Registra entrada de auditoria/histórico do projeto.
   */
  private registrarHistorico(
    atorCompetente: string,
    atividade: string,
    statusAnterior: StatusProjeto | null,
    statusNovo: StatusProjeto | null,
    detalhes?: Record<string, unknown>
  ): void {
    const registro: RegistroHistoricoProjeto = {
      id: randomUUID(),
      projetoId: this.id,
      atorCompetente,
      atividade,
      statusAnterior,
      statusNovo,
      detalhes,
      registradoEm: new Date(),
    };
    this._historico.push(registro);
  }

  /**
   * Reconstituição de entidade persistida (usado por repositórios).
   */
  static reconstituir(
    dados: DadosCriacaoProjeto,
    status: StatusProjeto,
    criadoEm: Date,
    atualizadoEm: Date,
    etapas: RegistroEtapaFormacaoProjeto[],
    auditorias: RegistroAuditoriaProjeto[],
    decisoes: RegistroDecisaoOwnerProjeto[],
    historico: RegistroHistoricoProjeto[],
    direcao: DirecaoProjeto | null
  ): Projeto {
    const projeto = Object.create(Projeto.prototype) as Projeto;
    Object.assign(projeto, {
      id: dados.id,
      codigo: dados.codigo,
      necessidadeId: dados.necessidadeId,
      _titulo: dados.titulo,
      criadoEm,
      _status: status,
      _atualizadoEm: atualizadoEm,
      _etapas: [...etapas],
      _auditorias: [...auditorias],
      _decisoes: [...decisoes],
      _historico: [...historico],
      _direcao: direcao ? { ...direcao } : null,
    });
    return projeto;
  }
}
