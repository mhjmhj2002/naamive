import { FilaTarefas, TarefaTrabalho } from "../infrastructure/adapters/fila-tarefas.js";
import {
  PortaIntegracaoProjeto,
  PortaIntegracaoContexto,
  AdaptadorIntegracaoProjeto,
} from "../infrastructure/adapters/integracao-modulos.js";
import { RepositorioNecessidade } from "../domain/repositorio-necessidade.js";
import { StatusNecessidade } from "../domain/tipos.js";
import { ServicoAplicacaoCoordenacao } from "../application/servico-aplicacao-coordenacao.js";
import { ServicoContexto } from "../application/servico-contexto.js";
import { ServicoVerificacao } from "../application/servico-verificacao.js";
import {
  DespachanteAutonomoAgentes,
  ResultadoCicloDespachoAutonomo,
  ReferenciasContextoDespacho,
} from "../domain/despachante-autonomo-agentes.js";

export type ManipuladorTarefa = (tarefa: TarefaTrabalho) => Promise<void>;

export interface ConfiguracaoWorker {
  intervaloPollingMs?: number;
  maxExecucoesPorCiclo?: number;
  modoAutonomoAtivo?: boolean;
}

/**
 * Worker em background desacoplado do ciclo HTTP.
 * Executa tarefas assíncronas em loop contínuo, reconciliação de estado, despacho autônomo de agentes e eventos de integração.
 */
export class WorkerSegundoPlano {
  private fila: FilaTarefas;
  private repositorio: RepositorioNecessidade;
  private portaProjeto: PortaIntegracaoProjeto;
  private portaContexto: PortaIntegracaoContexto;
  private servicoCoordenacao?: ServicoAplicacaoCoordenacao | undefined;
  private servicoContexto?: ServicoContexto | undefined;
  private servicoVerificacao?: ServicoVerificacao | undefined;
  private despachanteAutonomo?: DespachanteAutonomoAgentes | undefined;
  private manipuladores: Map<string, ManipuladorTarefa> = new Map();

  private executando: boolean = false;
  private timer: NodeJS.Timeout | null = null;
  private intervaloPollingMs: number;
  private modoAutonomoAtivo: boolean = true;
  private tarefasProcessadasContador: number = 0;

  constructor(
    fila: FilaTarefas,
    repositorio: RepositorioNecessidade,
    portaProjeto: PortaIntegracaoProjeto,
    portaContexto: PortaIntegracaoContexto,
    config: ConfiguracaoWorker = {},
    servicoCoordenacao?: ServicoAplicacaoCoordenacao | undefined,
    servicoContexto?: ServicoContexto | undefined,
    servicoVerificacao?: ServicoVerificacao | undefined,
    despachanteAutonomo?: DespachanteAutonomoAgentes | undefined
  ) {
    this.fila = fila;
    this.repositorio = repositorio;
    this.portaProjeto = portaProjeto;
    this.portaContexto = portaContexto;
    this.servicoCoordenacao = servicoCoordenacao;
    this.servicoContexto = servicoContexto;
    this.servicoVerificacao = servicoVerificacao;
    this.despachanteAutonomo = despachanteAutonomo;
    this.intervaloPollingMs = config.intervaloPollingMs ?? 100;
    this.modoAutonomoAtivo = config.modoAutonomoAtivo ?? true;

    this.registrarManipuladoresPadrao();
  }

  public get estaExecutando(): boolean {
    return this.executando;
  }

  public get totalProcessado(): number {
    return this.tarefasProcessadasContador;
  }

  public get estaModoAutonomoAtivo(): boolean {
    return this.modoAutonomoAtivo;
  }

  public definirModoAutonomo(ativo: boolean): void {
    this.modoAutonomoAtivo = ativo;
  }

  /**
   * Executa diretamente um ciclo do despachante autônomo de agentes, se configurado e ativo.
   */
  public async executarCicloDespachoAutonomo(
    projetoId: string,
    referenciasContexto?: ReferenciasContextoDespacho
  ): Promise<ResultadoCicloDespachoAutonomo | null> {
    if (!this.despachanteAutonomo || !this.modoAutonomoAtivo) {
      return null;
    }
    return this.despachanteAutonomo.executarCicloAutonomo(projetoId, referenciasContexto);
  }

  /**
   * Inicia o loop contínuo de background.
   */
  public iniciar(): void {
    if (this.executando) return;
    this.executando = true;
    this.agendarProximoCiclo();
  }

  /**
   * Para o loop contínuo graciosamente sem deixar timers pendentes.
   */
  public async parar(): Promise<void> {
    this.executando = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Registra um manipulador customizado para um tipo de tarefa.
   */
  public registrarManipulador(tipo: string, manipulador: ManipuladorTarefa): void {
    this.manipuladores.set(tipo, manipulador);
  }

  /**
   * Executa um único ciclo de polling/processamento de forma síncrona/esperável (útil para testes).
   */
  public async executarCicloUnico(): Promise<boolean> {
    const tarefa = await this.fila.obterProximaTarefa();
    if (!tarefa) {
      return false;
    }

    try {
      const manipulador = this.manipuladores.get(tarefa.tipo);
      if (!manipulador) {
        throw new Error(`Nenhum manipulador registrado para o tipo de tarefa '${tarefa.tipo}'.`);
      }

      await manipulador(tarefa);
      await this.fila.concluirTarefa(tarefa.id);
      this.tarefasProcessadasContador += 1;
      return true;
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : String(erro);
      await this.fila.falharTarefa(tarefa.id, msg);
      return false;
    }
  }

  private agendarProximoCiclo(): void {
    if (!this.executando) return;

    this.timer = setTimeout(async () => {
      try {
        await this.executarCicloUnico();
      } finally {
        if (this.executando) {
          this.agendarProximoCiclo();
        }
      }
    }, this.intervaloPollingMs);
  }

  private registrarManipuladoresPadrao(): void {
    // 1. Processamento de reconciliação e bootstrap de projeto após compromisso da necessidade
    this.registrarManipulador("BOOTSTRAP_PROJETO_M002", async (tarefa) => {
      const payload = tarefa.payload as { necessidadeId: string };
      const necessidade = await this.repositorio.obterPorId(payload.necessidadeId);
      if (!necessidade) {
        throw new Error(`Necessidade ${payload.necessidadeId} não encontrada para processar bootstrap.`);
      }

      if (necessidade.status === StatusNecessidade.AGUARDANDO_DECISAO && necessidade.compromisso) {
        // Solicita bootstrap ao M-002 de forma idempotente
        const solicitacao = AdaptadorIntegracaoProjeto.criarSolicitacaoDeCompromisso(
          necessidade.codigo,
          necessidade.titulo,
          necessidade.compromisso
        );

        const confirmacao = await this.portaProjeto.solicitarBootstrapProjeto(solicitacao);

        // Se a necessidade ainda não tiver sido transicionada para EM_PROJETO, avança e confirma
        necessidade.confirmarMaterializacaoProjeto(confirmacao.projetoId);
        await this.repositorio.salvar(necessidade);

        // Registra evento de rastreabilidade no M-004
        await this.portaContexto.registrarEventoRastreabilidade({
          entidadeOrigem: "Necessidade",
          idOrigem: necessidade.id,
          tipoEvento: "BOOTSTRAP_PROJETO_CONCLUIDO",
          dados: {
            projetoId: confirmacao.projetoId,
            jaExistente: confirmacao.jaExistente,
          },
          timestamp: new Date(),
        });
      }
    });

    // 2. Tarefa genérica de reconciliação periódica de contexto
    this.registrarManipulador("RECONCILIACAO_CONTEXTO", async (tarefa) => {
      const payload = tarefa.payload as { idOrigem: string; tipoEvento: string; dados: Record<string, unknown> };
      await this.portaContexto.registrarEventoRastreabilidade({
        entidadeOrigem: "WorkerSegundoPlano",
        idOrigem: payload.idOrigem ?? "sistema",
        tipoEvento: payload.tipoEvento ?? "RECONCILIACAO",
        dados: payload.dados ?? {},
        timestamp: new Date(),
      });
    });

    // 3. Tarefa de reavaliação de elegibilidade e avanço de coordenação (EV-003)
    this.registrarManipulador("REAVALIAR_COORDENACAO", async (tarefa) => {
      const payload = tarefa.payload as { projetoId: string; trabalhoId?: string; sucesso?: boolean };
      if (this.servicoCoordenacao && payload.projetoId) {
        await this.servicoCoordenacao.avaliarElegibilidadeTrabalhos(payload.projetoId);
        await this.portaContexto.registrarEventoRastreabilidade({
          entidadeOrigem: "WorkerSegundoPlano",
          idOrigem: payload.projetoId,
          tipoEvento: "COORDENACAO_REAVALIADA",
          dados: {
            projetoId: payload.projetoId,
            trabalhoId: payload.trabalhoId ?? null,
            sucesso: payload.sucesso ?? null,
          },
          timestamp: new Date(),
        });
      }
    });

    // 4. Tarefa de auditoria periódica de proveniência e consistência de contexto (EV-004 / IT-015)
    this.registrarManipulador("AUDITORIA_CONTEXTO_PROVENIENCIA", async (tarefa) => {
      const payload = (tarefa.payload ?? {}) as { projetoId?: string };
      if (this.servicoContexto) {
        const relatorio = await this.servicoContexto.auditarConsistenciaContexto(payload.projetoId);
        await this.portaContexto.registrarEventoRastreabilidade({
          entidadeOrigem: "WorkerSegundoPlano",
          idOrigem: payload.projetoId ?? "GLOBAL",
          tipoEvento: "AUDITORIA_CONTEXTO_CONCLUIDA",
          dados: {
            diagnosticoGeral: relatorio.diagnosticoGeral,
            totalAuditados: relatorio.totalRegistrosAuditados,
            lacunas: relatorio.lacunasDetectadas.length,
            contradicoes: relatorio.contradicoesDetectadas.length,
            auditadoEm: relatorio.auditadoEm,
          },
          timestamp: new Date(),
        });
      }
    });

    // 5. Tarefa de reavaliação periódica de conformidade técnica de software (EV-005 / IT-019)
    this.registrarManipulador("REAVALIAR_CONFORMIDADE_SOFTWARE", async (tarefa) => {
      const payload = tarefa.payload as { resultadoSoftwareId: string; emitidoPor?: string };
      if (this.servicoVerificacao && payload.resultadoSoftwareId) {
        const emissor = payload.emitidoPor ?? "WorkerSegundoPlano (Avaliação Assíncrona)";
        const resultadoAvaliacao = await this.servicoVerificacao.avaliarConformidadeResultado(
          payload.resultadoSoftwareId,
          emissor
        );
        await this.portaContexto.registrarEventoRastreabilidade({
          entidadeOrigem: "WorkerSegundoPlano",
          idOrigem: payload.resultadoSoftwareId,
          tipoEvento: "CONFORMIDADE_SOFTWARE_REAVALIADA",
          dados: {
            resultadoSoftwareId: payload.resultadoSoftwareId,
            conclusaoGeral: resultadoAvaliacao.laudoAgregado.conclusaoGeral,
            totalCriterios: resultadoAvaliacao.laudoAgregado.totalCriterios,
            demonstrados: resultadoAvaliacao.laudoAgregado.demonstrados,
            divergencias: resultadoAvaliacao.laudoAgregado.divergencias,
            avaliadoEm: resultadoAvaliacao.laudoAgregado.avaliadoEm,
          },
          timestamp: new Date(),
        });
      }
    });

    // 6. Tarefa de despacho autônomo de agentes e handoffs (DEB-TEC-001)
    this.registrarManipulador("DESPACHAR_HANDOFF_AUTONOMO", async (tarefa) => {
      const payload = tarefa.payload as {
        projetoId: string;
        referenciasContexto?: ReferenciasContextoDespacho;
      };
      if (this.despachanteAutonomo && this.modoAutonomoAtivo && payload.projetoId) {
        const resultadoDespacho = await this.despachanteAutonomo.executarCicloAutonomo(
          payload.projetoId,
          payload.referenciasContexto
        );

        await this.portaContexto.registrarEventoRastreabilidade({
          entidadeOrigem: "WorkerSegundoPlano",
          idOrigem: payload.projetoId,
          tipoEvento: "DESPACHO_AUTONOMO_PROCESSADO",
          dados: {
            projetoId: payload.projetoId,
            despachosRealizados: resultadoDespacho.despachosRealizados,
            contencoesHumanas: resultadoDespacho.contencoesHumanas.length,
            retornosProcessados: resultadoDespacho.retornosProcessados.length,
            processadoEm: new Date().toISOString(),
          },
          timestamp: new Date(),
        });
      }
    });
  }
}
