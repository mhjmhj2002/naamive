import { randomUUID } from "node:crypto";
import { RegistroProveniencia, VinculoCausal } from "../domain/contexto.js";
import { RepositorioContexto } from "../domain/repositorio-contexto.js";
import { MotorRecuperacaoContexto } from "../domain/motor-contexto.js";
import {
  TipoEntidadeContexto,
  TipoRegistroProveniencia,
  ClassificacaoEpistemica,
  TipoRelacaoCausal,
  FinalidadeContexto,
  DiagnosticoContexto,
} from "../domain/tipos-contexto.js";
import {
  ConsultaContexto,
  PacoteContextoProporcional,
  EloCausal,
  AlertaContexto,
} from "../domain/valores-contexto.js";
import { InvarianteVioladaErro, RecursoNaoEncontradoErro } from "../domain/erros.js";
import { FilaTarefas } from "../infrastructure/adapters/fila-tarefas.js";

/**
 * Parâmetros para preservação de um novo registro de proveniência no serviço de aplicação.
 */
export interface DadosPreservarRegistro {
  id?: string | undefined;
  entidadeTipo: TipoEntidadeContexto;
  entidadeId: string;
  codigoReferencia: string;
  tipoRegistro: TipoRegistroProveniencia;
  autorResponsavel: string;
  classificacaoEpistemica: ClassificacaoEpistemica;
  dadosContexto?: Record<string, unknown> | undefined;
  vigente?: boolean | undefined;
}

/**
 * Estrutura da árvore genealógica de rastreabilidade causal.
 */
export interface TrilhaRastreabilidade {
  codigoEntidade: string;
  alvo: RegistroProveniencia | null;
  registrosRelacionados: RegistroProveniencia[];
  elosAscendencia: EloCausal[];
  elosDerivacao: EloCausal[];
  alertas: AlertaContexto[];
  diagnostico: DiagnosticoContexto;
  recuperadoEm: Date;
}

/**
 * Relatório de consistência e auditoria de contexto.
 */
export interface RelatorioConsistenciaContexto {
  projetoId?: string | undefined;
  totalRegistrosAuditados: number;
  totalVinculosAuditados: number;
  registrosVigentes: number;
  registrosSuperados: number;
  lacunasDetectadas: AlertaContexto[];
  contradicoesDetectadas: AlertaContexto[];
  diagnosticoGeral: DiagnosticoContexto;
  auditadoEm: Date;
}

/**
 * Serviço de Aplicação para Contexto, Proveniência e Rastreabilidade (M-004 / EV-004).
 * Orquestra:
 * 1. preservarRegistro: ingestão idempotente e tipada de proveniência
 * 2. estabelecerVinculoCausal: conexão de arestas causais no grafo
 * 3. recuperarContextoPorFinalidade: entrega do pacote proporcional sem sobrecarga
 * 4. obterTrilhaRastreabilidade: genealogia completa de uma entidade
 * 5. auditarConsistenciaContexto: verificação de integridade epistêmica e referências órfãs
 * 6. agendarAuditoriaBackground: integração com worker desacoplado
 */
export class ServicoContexto {
  private repositorio: RepositorioContexto;
  private motor: MotorRecuperacaoContexto;
  private filaTarefas?: FilaTarefas | undefined;

  constructor(
    repositorio: RepositorioContexto,
    motor: MotorRecuperacaoContexto = new MotorRecuperacaoContexto(),
    filaTarefas?: FilaTarefas | undefined
  ) {
    this.repositorio = repositorio;
    this.motor = motor;
    this.filaTarefas = filaTarefas;
  }

  /**
   * 1. Preservar Registro de Proveniência
   * Salva o registro no banco com idempotência e garantia de imutabilidade cronológica.
   */
  public async preservarRegistro(dados: DadosPreservarRegistro): Promise<RegistroProveniencia> {
    const id = dados.id ?? randomUUID();
    const registro = new RegistroProveniencia({
      id,
      entidadeTipo: dados.entidadeTipo,
      entidadeId: dados.entidadeId,
      codigoReferencia: dados.codigoReferencia,
      tipoRegistro: dados.tipoRegistro,
      autorResponsavel: dados.autorResponsavel,
      classificacaoEpistemica: dados.classificacaoEpistemica,
      dadosContexto: dados.dadosContexto ?? {},
      vigente: dados.vigente !== undefined ? dados.vigente : true,
      registradoEm: new Date(),
    });

    await this.repositorio.salvarRegistro(registro);
    return registro;
  }

  /**
   * 2. Estabelecer Vínculo Causal
   * Conecta dois registros no grafo causal relacional com validação e integridade.
   */
  public async estabelecerVinculoCausal(
    origemRegistroId: string,
    destinoRegistroId: string,
    tipoRelacao: TipoRelacaoCausal,
    justificativa?: string | null
  ): Promise<VinculoCausal> {
    if (!origemRegistroId || !destinoRegistroId) {
      throw new InvarianteVioladaErro(
        "Identificadores de origem e destino são obrigatórios para estabelecer vínculo causal."
      );
    }
    if (origemRegistroId.trim() === destinoRegistroId.trim()) {
      throw new InvarianteVioladaErro(
        "Não é permitido criar vínculo causal de um registro para ele próprio."
      );
    }

    const regOrigem = await this.repositorio.obterRegistroPorId(origemRegistroId.trim());
    if (!regOrigem) {
      throw new RecursoNaoEncontradoErro("Registro de Origem", origemRegistroId);
    }

    const regDestino = await this.repositorio.obterRegistroPorId(destinoRegistroId.trim());
    if (!regDestino) {
      throw new RecursoNaoEncontradoErro("Registro de Destino", destinoRegistroId);
    }

    // Regra de domínio: se a relação for SUBSTITUI, o registro de destino (anterior) deve ser marcado como superado
    if (tipoRelacao === TipoRelacaoCausal.SUBSTITUI && regDestino.vigente) {
      regDestino.marcarComoSuperado();
      await this.repositorio.salvarRegistro(regDestino);
    }

    const vinculo = VinculoCausal.criar(
      origemRegistroId.trim(),
      destinoRegistroId.trim(),
      tipoRelacao,
      justificativa
    );

    await this.repositorio.salvarVinculo(vinculo);
    return vinculo;
  }

  /**
   * 3. Recuperar Contexto por Finalidade Declarada
   * Consulta proporcional delegada ao motor de domínio puro.
   */
  public async recuperarContextoPorFinalidade(
    consulta: ConsultaContexto
  ): Promise<PacoteContextoProporcional> {
    const todosRegistros = await this.repositorio.listarTodosRegistros();
    const todosVinculos = await this.repositorio.listarTodosVinculos();

    return this.motor.recuperarProporcional(consulta, todosRegistros, todosVinculos);
  }

  /**
   * 4. Obter Trilha de Rastreabilidade Genealógica
   * Monta o caminho completo de ascendência e derivação para um código humano (ex: N-001, P-001, EV-004, IT-010).
   */
  public async obterTrilhaRastreabilidade(codigoEntidade: string): Promise<TrilhaRastreabilidade> {
    const codigoNormalizado = codigoEntidade.trim().toUpperCase();
    const registrosEncontrados = await this.repositorio.obterRegistrosPorCodigo(codigoNormalizado);

    const todosRegistros = await this.repositorio.listarTodosRegistros();
    const todosVinculos = await this.repositorio.listarTodosVinculos();

    const alvo = registrosEncontrados.find((r) => r.vigente) ?? registrosEncontrados[0] ?? null;

    if (!alvo) {
      return {
        codigoEntidade: codigoNormalizado,
        alvo: null,
        registrosRelacionados: [],
        elosAscendencia: [],
        elosDerivacao: [],
        alertas: [
          {
            diagnostico: DiagnosticoContexto.LACUNA_DETECTADA,
            mensagem: `Nenhum registro de proveniência encontrado para o código '${codigoNormalizado}'.`,
            referenciaAlvo: codigoNormalizado,
          },
        ],
        diagnostico: DiagnosticoContexto.LACUNA_DETECTADA,
        recuperadoEm: new Date(),
      };
    }

    const registrosPorId = new Map<string, RegistroProveniencia>();
    for (const r of todosRegistros) {
      registrosPorId.set(r.id, r);
    }

    // Recupera ascendência (quem originou/habilitou/sustentou este alvo)
    const elosAscendencia: EloCausal[] = [];
    const vinculosAsc = todosVinculos.filter((v) => v.destinoRegistroId === alvo.id);
    for (const v of vinculosAsc) {
      const orig = registrosPorId.get(v.origemRegistroId);
      if (orig) {
        elosAscendencia.push({
          registroOrigemId: v.origemRegistroId,
          registroDestinoId: v.destinoRegistroId,
          codigoOrigem: orig.codigoReferencia,
          codigoDestino: alvo.codigoReferencia,
          tipoRelacao: v.tipoRelacao,
          justificativa: v.justificativa,
        });
      }
    }

    // Recupera derivação (quem foi originado/habilitado/sustentado a partir deste alvo)
    const elosDerivacao: EloCausal[] = [];
    const vinculosDeriv = todosVinculos.filter((v) => v.origemRegistroId === alvo.id);
    for (const v of vinculosDeriv) {
      const dest = registrosPorId.get(v.destinoRegistroId);
      if (dest) {
        elosDerivacao.push({
          registroOrigemId: v.origemRegistroId,
          registroDestinoId: v.destinoRegistroId,
          codigoOrigem: alvo.codigoReferencia,
          codigoDestino: dest.codigoReferencia,
          tipoRelacao: v.tipoRelacao,
          justificativa: v.justificativa,
        });
      }
    }

    // Consulta proporcional de inspeção geral para captar alertas e consistência
    const pacote = this.motor.recuperarProporcional(
      {
        finalidade: FinalidadeContexto.INSPECAO_GERAL,
        codigoReferencia: codigoNormalizado,
        incluirHistoricoSuperado: true,
      },
      todosRegistros,
      todosVinculos
    );

    return {
      codigoEntidade: codigoNormalizado,
      alvo,
      registrosRelacionados: registrosEncontrados,
      elosAscendencia,
      elosDerivacao,
      alertas: pacote.alertas,
      diagnostico: pacote.diagnosticoGeral,
      recuperadoEm: new Date(),
    };
  }

  /**
   * 5. Auditar Consistência de Contexto
   * Varre o repositório procurando lacunas de proveniência, referências órfãs e contradições.
   */
  public async auditarConsistenciaContexto(
    projetoId?: string
  ): Promise<RelatorioConsistenciaContexto> {
    const todosRegistros = await this.repositorio.listarTodosRegistros();
    const todosVinculos = await this.repositorio.listarTodosVinculos();

    const registrosAuditados = projetoId
      ? todosRegistros.filter(
          (r) =>
            r.entidadeId === projetoId ||
            (r.dadosContexto && (r.dadosContexto as any).projetoId === projetoId)
        )
      : todosRegistros;

    const registrosPorId = new Map<string, RegistroProveniencia>();
    for (const r of todosRegistros) {
      registrosPorId.set(r.id, r);
    }

    const lacunas: AlertaContexto[] = [];
    const contradicoes: AlertaContexto[] = [];

    // Auditoria 1: referências órfãs em vínculos
    for (const v of todosVinculos) {
      const temOrigem = registrosPorId.has(v.origemRegistroId);
      const temDestino = registrosPorId.has(v.destinoRegistroId);

      if (!temOrigem) {
        lacunas.push({
          diagnostico: DiagnosticoContexto.LACUNA_DETECTADA,
          mensagem: `Vínculo causal (${v.id}) aponta para origem inexistente: ${v.origemRegistroId}`,
          referenciaAlvo: v.origemRegistroId,
        });
      }
      if (!temDestino) {
        lacunas.push({
          diagnostico: DiagnosticoContexto.LACUNA_DETECTADA,
          mensagem: `Vínculo causal (${v.id}) aponta para destino inexistente: ${v.destinoRegistroId}`,
          referenciaAlvo: v.destinoRegistroId,
        });
      }
    }

    // Auditoria 2: decisões vigentes substituídas que não foram superadas
    const vinculosSubstituicao = todosVinculos.filter(
      (v) => v.tipoRelacao === TipoRelacaoCausal.SUBSTITUI
    );
    for (const v of vinculosSubstituicao) {
      const orig = registrosPorId.get(v.origemRegistroId);
      const dest = registrosPorId.get(v.destinoRegistroId);
      if (orig && dest && orig.vigente && dest.vigente) {
        contradicoes.push({
          diagnostico: DiagnosticoContexto.CONTRADICAO_DETECTADA,
          mensagem: `Registro '${orig.codigoReferencia}' substitui '${dest.codigoReferencia}', mas ambos permanecem vigentes no repositório.`,
          referenciaAlvo: orig.codigoReferencia,
        });
      }
    }

    let vigentesCount = 0;
    let superadosCount = 0;
    for (const r of registrosAuditados) {
      if (r.vigente) vigentesCount++;
      else superadosCount++;
    }

    const diagnosticoGeral =
      contradicoes.length > 0
        ? DiagnosticoContexto.CONTRADICAO_DETECTADA
        : lacunas.length > 0
          ? DiagnosticoContexto.LACUNA_DETECTADA
          : DiagnosticoContexto.CONSISTENTE;

    return {
      projetoId,
      totalRegistrosAuditados: registrosAuditados.length,
      totalVinculosAuditados: todosVinculos.length,
      registrosVigentes: vigentesCount,
      registrosSuperados: superadosCount,
      lacunasDetectadas: lacunas,
      contradicoesDetectadas: contradicoes,
      diagnosticoGeral,
      auditadoEm: new Date(),
    };
  }

  /**
   * 6. Agendar Auditoria de Contexto em Background
   * Enfileira tarefa no worker assíncrono para execução desacoplada.
   */
  public async agendarAuditoriaBackground(projetoId?: string): Promise<string | null> {
    if (!this.filaTarefas) {
      return null;
    }

    const tarefa = await this.filaTarefas.enfileirar(
      "AUDITORIA_CONTEXTO_PROVENIENCIA",
      {
        projetoId: projetoId ?? null,
        solicitadoEm: new Date().toISOString(),
      }
    );

    return tarefa.id;
  }
}
