import {
  ResultadoSoftware,
  CriterioVerificavel,
  EvidenciaVerificacao,
  LaudoVerificacao,
} from "../domain/verificacao.js";
import { RepositorioVerificacao } from "../domain/repositorio-verificacao.js";
import { MotorVerificacaoSoftware } from "../domain/motor-verificacao.js";
import { MetodoObservacao } from "../domain/tipos-verificacao.js";
import { LaudoVerificacaoAgregado } from "../domain/valores-verificacao.js";
import { RecursoNaoEncontradoErro } from "../domain/erros.js";
import { PortaIntegracaoContexto } from "../infrastructure/adapters/integracao-modulos.js";
import { FilaTarefas } from "../infrastructure/adapters/fila-tarefas.js";

/**
 * Parâmetros de entrada para registrar um resultado de software no serviço.
 */
export interface DadosRegistrarResultadoSoftware {
  id?: string | undefined;
  codigoReferencia: string;
  moduloOrigem: string;
  entregaValorCodigo: string;
  versaoArtefato: string;
  descricao: string;
  declaradoPor: string;
}

/**
 * Parâmetros de entrada para cadastrar um critério verificável no serviço.
 */
export interface DadosCadastrarCriterioVerificavel {
  id?: string | undefined;
  codigo: string;
  resultadoSoftwareId: string;
  origemNormativa: string;
  descricaoComportamento: string;
  metodoObservacao: MetodoObservacao;
  condicaoSatisfacao: string;
  limitesOuTolerancias?: string | null | undefined;
}

/**
 * Parâmetros de entrada para coletar uma evidência de verificação no serviço.
 */
export interface DadosColetarEvidenciaVerificacao {
  id?: string | undefined;
  criterioId: string;
  procedimentoExecutado: string;
  resultadoObservado: string;
  dadosDetalhados?: Record<string, unknown> | undefined;
  sucesso: boolean;
  coletadoPor: string;
}

/**
 * Resultado completo da avaliação de conformidade técnica emitida pelo serviço de aplicação.
 */
export interface ResultadoAvaliacaoConformidade {
  laudoAgregado: LaudoVerificacaoAgregado;
  laudosIndividuais: LaudoVerificacao[];
  eventoContextoRegistrado: boolean;
}

/**
 * Serviço de Aplicação: ServicoVerificacao (M-005 / EV-005)
 * Orquestra:
 * 1. registrarResultadoSoftware: registro transacional e idempotente de incrementos de software.
 * 2. cadastrarCriterioVerificavel: definição normativa de condições de satisfação observáveis.
 * 3. registrarEvidenciaVerificacao: coleta de dados de execução empírica de testes e telemetria.
 * 4. avaliarConformidadeResultado: emissão de laudo técnico individual e agregado via MotorVerificacaoSoftware,
 *    com persistência relacional e geração de vínculo causal de rastreabilidade com M-004.
 * 5. obterMatrizConformidade: visão consolidada dos resultados, critérios e laudos emitidos.
 * 6. agendarReavaliacaoBackground: enfileiramento assíncrono para reconciliação contínua no worker.
 */
export class ServicoVerificacao {
  private repositorio: RepositorioVerificacao;
  private motor: MotorVerificacaoSoftware;
  private portaContexto?: PortaIntegracaoContexto | undefined;
  private filaTarefas?: FilaTarefas | undefined;

  constructor(
    repositorio: RepositorioVerificacao,
    motor: MotorVerificacaoSoftware = new MotorVerificacaoSoftware(),
    portaContexto?: PortaIntegracaoContexto | undefined,
    filaTarefas?: FilaTarefas | undefined
  ) {
    this.repositorio = repositorio;
    this.motor = motor;
    this.portaContexto = portaContexto;
    this.filaTarefas = filaTarefas;
  }

  /**
   * 1. Registrar Resultado de Software
   */
  public async registrarResultadoSoftware(
    dados: DadosRegistrarResultadoSoftware
  ): Promise<ResultadoSoftware> {
    const existente = await this.repositorio.obterResultadoPorCodigo(dados.codigoReferencia);
    if (existente) {
      return existente;
    }

    const resultado = ResultadoSoftware.criar({
      id: dados.id,
      codigoReferencia: dados.codigoReferencia,
      moduloOrigem: dados.moduloOrigem,
      entregaValorCodigo: dados.entregaValorCodigo,
      versaoArtefato: dados.versaoArtefato,
      descricao: dados.descricao,
      declaradoPor: dados.declaradoPor,
    });

    await this.repositorio.salvarResultado(resultado);

    if (this.portaContexto) {
      await this.portaContexto.registrarEventoRastreabilidade({
        entidadeOrigem: "ResultadoSoftware",
        idOrigem: resultado.id,
        tipoEvento: "RESULTADO_SOFTWARE_REGISTRADO",
        dados: {
          codigoReferencia: resultado.codigoReferencia,
          moduloOrigem: resultado.moduloOrigem,
          entregaValorCodigo: resultado.entregaValorCodigo,
          versaoArtefato: resultado.versaoArtefato,
        },
        timestamp: new Date(),
      });
    }

    return resultado;
  }

  /**
   * 2. Cadastrar Critério Verificável
   */
  public async cadastrarCriterioVerificavel(
    dados: DadosCadastrarCriterioVerificavel
  ): Promise<CriterioVerificavel> {
    const resultado = await this.repositorio.obterResultadoPorId(dados.resultadoSoftwareId);
    if (!resultado) {
      throw new RecursoNaoEncontradoErro("Resultado de Software", dados.resultadoSoftwareId);
    }

    const criterioExistente = await this.repositorio.obterCriterioPorCodigo(dados.codigo);
    if (criterioExistente) {
      return criterioExistente;
    }

    const criterio = CriterioVerificavel.criar({
      id: dados.id,
      codigo: dados.codigo,
      resultadoSoftwareId: dados.resultadoSoftwareId,
      origemNormativa: dados.origemNormativa,
      descricaoComportamento: dados.descricaoComportamento,
      metodoObservacao: dados.metodoObservacao,
      condicaoSatisfacao: dados.condicaoSatisfacao,
      limitesOuTolerancias: dados.limitesOuTolerancias,
    });

    await this.repositorio.salvarCriterio(criterio);

    if (this.portaContexto) {
      await this.portaContexto.registrarEventoRastreabilidade({
        entidadeOrigem: "CriterioVerificavel",
        idOrigem: criterio.id,
        tipoEvento: "CRITERIO_VERIFICAVEL_CADASTRADO",
        dados: {
          codigo: criterio.codigo,
          resultadoSoftwareId: criterio.resultadoSoftwareId,
          origemNormativa: criterio.origemNormativa,
          metodoObservacao: criterio.metodoObservacao,
        },
        timestamp: new Date(),
      });
    }

    return criterio;
  }

  /**
   * 3. Registrar Evidência de Verificação
   */
  public async registrarEvidenciaVerificacao(
    dados: DadosColetarEvidenciaVerificacao
  ): Promise<EvidenciaVerificacao> {
    const criterio = await this.repositorio.obterCriterioPorId(dados.criterioId);
    if (!criterio) {
      throw new RecursoNaoEncontradoErro("Critério Verificável", dados.criterioId);
    }

    const evidencia = EvidenciaVerificacao.criar({
      id: dados.id,
      criterioId: dados.criterioId,
      procedimentoExecutado: dados.procedimentoExecutado,
      resultadoObservado: dados.resultadoObservado,
      dadosDetalhados: dados.dadosDetalhados,
      sucesso: dados.sucesso,
      coletadoPor: dados.coletadoPor,
    });

    await this.repositorio.salvarEvidencia(evidencia);

    return evidencia;
  }

  /**
   * 4. Avaliar Conformidade de um Resultado de Software
   * Executa a confrontação estrita pelo motor de domínio e persiste todos os laudos.
   * Integra também o registro de rastreabilidade causal com o M-004.
   */
  public async avaliarConformidadeResultado(
    resultadoSoftwareId: string,
    emitidoPor: string
  ): Promise<ResultadoAvaliacaoConformidade> {
    const resultado = await this.repositorio.obterResultadoPorId(resultadoSoftwareId);
    if (!resultado) {
      throw new RecursoNaoEncontradoErro("Resultado de Software", resultadoSoftwareId);
    }

    const criterios = await this.repositorio.listarCriteriosPorResultado(resultadoSoftwareId);
    const evidencias = await this.repositorio.listarEvidenciasPorResultado(resultadoSoftwareId);

    const { laudoAgregado, laudosIndividuais } = this.motor.avaliarConformidadeAgregada(
      resultado,
      criterios,
      evidencias,
      emitidoPor
    );

    // Persistir todos os laudos individuais atualizados/emitidos
    for (const laudo of laudosIndividuais) {
      await this.repositorio.salvarLaudo(laudo);
    }

    let eventoContextoRegistrado = false;
    if (this.portaContexto) {
      await this.portaContexto.registrarEventoRastreabilidade({
        entidadeOrigem: "ResultadoSoftware",
        idOrigem: resultado.id,
        tipoEvento: "LAUDO_CONFORMIDADE_EMITIDO",
        dados: {
          resultadoSoftwareId: resultado.id,
          codigoReferencia: resultado.codigoReferencia,
          conclusaoGeral: laudoAgregado.conclusaoGeral,
          fundamentacaoGeral: laudoAgregado.fundamentacaoGeral,
          totalCriterios: laudoAgregado.totalCriterios,
          demonstrados: laudoAgregado.demonstrados,
          naoDemonstrados: laudoAgregado.naoDemonstrados,
          insuficientes: laudoAgregado.insuficientes,
          divergencias: laudoAgregado.divergencias,
          emitidoPor: laudoAgregado.emitidoPor,
        },
        timestamp: new Date(),
      });
      eventoContextoRegistrado = true;
    }

    return {
      laudoAgregado,
      laudosIndividuais,
      eventoContextoRegistrado,
    };
  }

  /**
   * 5. Obter Matriz de Conformidade de um Resultado de Software
   * Monta o laudo agregado e busca detalhamentos do resultado, critérios, laudos e evidências.
   */
  public async obterMatrizConformidade(resultadoSoftwareId: string): Promise<{
    resultado: ResultadoSoftware;
    criterios: CriterioVerificavel[];
    evidencias: EvidenciaVerificacao[];
    laudos: LaudoVerificacao[];
    laudoAgregado: LaudoVerificacaoAgregado;
  }> {
    const resultado = await this.repositorio.obterResultadoPorId(resultadoSoftwareId);
    if (!resultado) {
      throw new RecursoNaoEncontradoErro("Resultado de Software", resultadoSoftwareId);
    }

    const criterios = await this.repositorio.listarCriteriosPorResultado(resultadoSoftwareId);
    const evidencias = await this.repositorio.listarEvidenciasPorResultado(resultadoSoftwareId);
    const laudos = await this.repositorio.listarLaudosPorResultado(resultadoSoftwareId);

    const { laudoAgregado } = this.motor.avaliarConformidadeAgregada(
      resultado,
      criterios,
      evidencias,
      "Sistema de Verificação (Consulta Matriz)"
    );

    return {
      resultado,
      criterios,
      evidencias,
      laudos,
      laudoAgregado,
    };
  }

  /**
   * 6. Agendar Reavaliação de Conformidade em Background
   */
  public async agendarReavaliacaoBackground(resultadoSoftwareId: string): Promise<string | null> {
    if (!this.filaTarefas) {
      return null;
    }

    const tarefa = await this.filaTarefas.enfileirar("REAVALIAR_CONFORMIDADE_SOFTWARE", {
      resultadoSoftwareId,
      solicitadoEm: new Date().toISOString(),
    });

    return tarefa.id;
  }
}
