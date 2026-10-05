import { TrabalhoCoordenado } from "./coordenacao.js";
import { PortaDespachoAgente } from "./porta-despacho-agente.js";
import { RepositorioCoordenacao } from "./repositorio-coordenacao.js";
import { MotorCoordenacaoTrabalho } from "./motor-coordenacao.js";
import { CondicaoOperacionalTrabalho } from "./tipos-coordenacao.js";
import { InvarianteVioladaErro } from "./erros.js";

export interface ReferenciasContextoDespacho {
  projeto: string;
  necessidade?: string | undefined;
  modulo?: string | undefined;
  entregaDeValor?: string | undefined;
  documentosNormativos?: string[] | undefined;
}

export interface ResultadoCicloDespachoAutonomo {
  projetoId: string;
  trabalhosAvaliados: number;
  despachosRealizados: number;
  handoffsDespachados: {
    trabalhoId: string;
    codigoTrabalho: string;
    tokenCorrelacao: string;
    atorDestinatario: string;
    skillDestinataria: string | null;
  }[];
  contencoesHumanas: {
    trabalhoId: string;
    codigoTrabalho: string;
    motivo: string;
  }[];
  retornosProcessados: {
    tokenCorrelacao: string;
    sucesso: boolean;
    condicaoResultante: CondicaoOperacionalTrabalho;
  }[];
}

/**
 * Despachante Autônomo de Agentes (Domain Service / Orchestrator).
 * Núcleo do motor de autonomia agêntica do NAAMIVE (M-003 / Resolução DEB-TEC-001).
 * 
 * Responsabilidades:
 * 1. Avaliar periodicamente trabalhos em condição PREPARADO (ou elegíveis para promoção).
 * 2. Assegurar contenção estrita contra autoatribuição ou autoaprovação de etapas do Ator Humano ('Owner'),
 *    colocando trabalhos do Owner em AGUARDANDO_DECISAO_HUMANA.
 * 3. Emitir handoffs estruturados para Atores agênticos e acioná-los através da PortaDespachoAgente.
 * 4. Processar o retorno da execução do agente, promovendo sucessores em caso de sucesso
 *    ou contendo em BLOQUEADO / AGUARDANDO_DECISAO_HUMANA em caso de pendências/dilemas.
 */
export class DespachanteAutonomoAgentes {
  private repositorioCoordenacao: RepositorioCoordenacao;
  private portaDespacho: PortaDespachoAgente;

  constructor(
    repositorioCoordenacao: RepositorioCoordenacao,
    portaDespacho: PortaDespachoAgente
  ) {
    this.repositorioCoordenacao = repositorioCoordenacao;
    this.portaDespacho = portaDespacho;
  }

  /**
   * Avalia se um trabalho requer intervenção exclusiva do Ator Humano (Owner).
   */
  public static ehTrabalhoExclusivoHumano(trabalho: TrabalhoCoordenado): boolean {
    const ator = (trabalho.atorRequerido || "").trim().toLowerCase();
    const titulo = (trabalho.titulo || "").toLowerCase();
    const objetivo = (trabalho.objetivo || "").toLowerCase();
    const criterio = (trabalho.criterioTermino || "").toLowerCase();

    // Regra 1: Ator explicitamente declarado como Owner
    if (ator === "owner") {
      return true;
    }

    // Regra 2: Etapas mandatórias de Human-in-the-Loop definidas no DEB-TEC-001 e DEB-GOV-001:
    // - Decisão Material do Owner no Compromisso da Necessidade
    // - Homologação Soberana do Owner na Entrega de Valor
    // - Decisão de cancelamento ou dilema normativo
    if (
      titulo.includes("homologação do owner") ||
      titulo.includes("homologacao do owner") ||
      titulo.includes("decisão do owner") ||
      titulo.includes("decisao do owner") ||
      objetivo.includes("homologação do owner") ||
      objetivo.includes("homologacao do owner") ||
      criterio.includes("homologado_pelo_owner")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Executa uma rodada do ciclo autônomo de orquestração para um determinado projeto.
   */
  public async executarCicloAutonomo(
    projetoId: string,
    referenciasContextoPadrao?: ReferenciasContextoDespacho
  ): Promise<ResultadoCicloDespachoAutonomo> {
    if (!projetoId || projetoId.trim() === "") {
      throw new InvarianteVioladaErro("O identificador do projeto é obrigatório para o ciclo do despachante autônomo.");
    }

    const todosTrabalhos = await this.repositorioCoordenacao.listarPorProjetoId(projetoId);

    // 1. Promove trabalhos elegíveis de POSSIVEL para PREPARADO
    const promovidos = MotorCoordenacaoTrabalho.promoverTrabalhosElegiveis(projetoId, todosTrabalhos);
    for (const p of promovidos) {
      await this.repositorioCoordenacao.salvar(p);
    }

    // 2. Reavalia o conjunto após promoções
    const resultadoAvaliacao = MotorCoordenacaoTrabalho.avaliarElegibilidade(projetoId, todosTrabalhos);

    const resultado: ResultadoCicloDespachoAutonomo = {
      projetoId,
      trabalhosAvaliados: resultadoAvaliacao.totalTrabalhos,
      despachosRealizados: 0,
      handoffsDespachados: [],
      contencoesHumanas: [],
      retornosProcessados: [],
    };

    // Identificar trabalhos PREPARADO aptos para despacho
    for (const trabalho of resultadoAvaliacao.trabalhosPreparados) {
      // Gate de Segurança e Soberania Humana:
      // O despachante autônomo NUNCA autoatribui ou autoexecuta tarefas do Owner.
      if (DespachanteAutonomoAgentes.ehTrabalhoExclusivoHumano(trabalho)) {
        trabalho.aguardarDecisaoHumana(
          "Ponto de Interrupção Humana Mandatório: esta etapa requer decisão soberana ou homologação do Owner."
        );
        await this.repositorioCoordenacao.salvar(trabalho);
        resultado.contencoesHumanas.push({
          trabalhoId: trabalho.id,
          codigoTrabalho: trabalho.codigo,
          motivo: "Etapa de governança exclusiva do Owner (Human-in-the-Loop).",
        });
        continue;
      }

      // Ator Agêntico: emite handoff e despacha através da porta
      const referencias: ReferenciasContextoDespacho = referenciasContextoPadrao ?? {
        projeto: projetoId,
      };

      const tokenCorrelacao = `hdof-${trabalho.codigo.toLowerCase()}-${Date.now()}`;
      const handoff = trabalho.despacharHandoff(
        tokenCorrelacao,
        referencias,
        trabalho.executorDesignado ?? "Agente Autônomo NAAMIVE"
      );
      await this.repositorioCoordenacao.salvar(trabalho);

      resultado.despachosRealizados++;
      resultado.handoffsDespachados.push({
        trabalhoId: trabalho.id,
        codigoTrabalho: trabalho.codigo,
        tokenCorrelacao: handoff.tokenCorrelacao,
        atorDestinatario: handoff.atorDestinatario,
        skillDestinataria: handoff.skillDestinataria,
      });

      // Aciona o agente via porta desacoplada
      try {
        const resultadoExec = await this.portaDespacho.despacharAgente(handoff);

        // Processa o retorno da execução do agente
        const retorno = trabalho.registrarRetorno(
          handoff.tokenCorrelacao,
          resultadoExec.sucesso,
          resultadoExec.resultadoObservavel ?? resultadoExec.mensagemRetorno ?? "Execução autônoma processada.",
          resultadoExec.pendenciasOuBloqueios ?? null
        );

        await this.repositorioCoordenacao.salvar(trabalho);

        resultado.retornosProcessados.push({
          tokenCorrelacao: handoff.tokenCorrelacao,
          sucesso: retorno.sucesso,
          condicaoResultante: trabalho.condicaoOperacional,
        });

        // Se finalizou com sucesso, promove sucessores imediatamente nesta mesma rodada
        if (retorno.sucesso) {
          const atualizados = await this.repositorioCoordenacao.listarPorProjetoId(projetoId);
          const novosPromovidos = MotorCoordenacaoTrabalho.promoverTrabalhosElegiveis(projetoId, atualizados);
          for (const np of novosPromovidos) {
            await this.repositorioCoordenacao.salvar(np);
          }
        }
      } catch (erroExec: any) {
        // Falha no acionamento ou erro inesperado do runtime:
        // Contenção segura: registra retorno negativo ou bloqueia o trabalho
        trabalho.registrarRetorno(
          handoff.tokenCorrelacao,
          false,
          `Falha no acionamento do agente: ${erroExec.message}`,
          erroExec.message
        );
        await this.repositorioCoordenacao.salvar(trabalho);

        resultado.retornosProcessados.push({
          tokenCorrelacao: handoff.tokenCorrelacao,
          sucesso: false,
          condicaoResultante: trabalho.condicaoOperacional,
        });
      }
    }

    return resultado;
  }
}
