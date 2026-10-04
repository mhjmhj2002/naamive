import {
  TipoEntidadeContexto,
  TipoRegistroProveniencia,
  TipoRelacaoCausal,
  FinalidadeContexto,
  DiagnosticoContexto,
} from "./tipos-contexto.js";
import {
  ConsultaContexto,
  PacoteContextoProporcional,
  EloCausal,
  AlertaContexto,
} from "./valores-contexto.js";
import { RegistroProveniencia, VinculoCausal } from "./contexto.js";
import { InvarianteVioladaErro } from "./erros.js";

/**
 * Serviço de Domínio Puro: MotorRecuperacaoContexto
 * Implementa as regras de filtragem proporcional de contexto por finalidade declarada,
 * travessia do grafo causal e diagnóstico explícito de lacunas ou contradições.
 * Em estrita conformidade com EV-004 e M-004.
 */
export class MotorRecuperacaoContexto {
  /**
   * Executa a recuperação proporcional a partir dos registros e vínculos fornecidos.
   */
  recuperarProporcional(
    consulta: ConsultaContexto,
    registros: RegistroProveniencia[],
    vinculos: VinculoCausal[]
  ): PacoteContextoProporcional {
    if (!consulta.finalidade || !Object.values(FinalidadeContexto).includes(consulta.finalidade)) {
      throw new InvarianteVioladaErro(`Finalidade '${consulta.finalidade}' é inválida para recuperação de contexto.`);
    }

    const alertas: AlertaContexto[] = [];
    const registrosPorId = new Map<string, RegistroProveniencia>();
    for (const r of registros) {
      registrosPorId.set(r.id, r);
    }

    // 1. Identificar o Alvo Principal da Consulta
    let registroAlvo: RegistroProveniencia | undefined;
    if (consulta.codigoReferencia) {
      const encontrados = registros.filter(
        (r) => r.codigoReferencia.toUpperCase() === consulta.codigoReferencia?.trim().toUpperCase()
      );
      // Priorizar registro vigente mais recente
      registroAlvo = encontrados.find((r) => r.vigente) ?? encontrados[0];
    } else if (consulta.entidadeId) {
      registroAlvo = registros.find((r) => r.entidadeId === consulta.entidadeId);
    }

    const alvoPrincipal = registroAlvo
      ? {
          codigo: registroAlvo.codigoReferencia,
          entidadeTipo: registroAlvo.entidadeTipo,
          entidadeId: registroAlvo.entidadeId,
        }
      : null;

    if (!registroAlvo && (consulta.codigoReferencia || consulta.entidadeId)) {
      alertas.push({
        diagnostico: DiagnosticoContexto.LACUNA_DETECTADA,
        mensagem: `Entidade alvo '${consulta.codigoReferencia || consulta.entidadeId}' não encontrada no repositório de proveniência.`,
        referenciaAlvo: consulta.codigoReferencia || consulta.entidadeId || "DESCONHECIDO",
      });
    }

    // 2. Travessia de Grafo Causal (Ascendência)
    const elosCausais: EloCausal[] = [];
    const idsRelevantes = new Set<string>();

    if (registroAlvo) {
      idsRelevantes.add(registroAlvo.id);
      this.percorrerAscendencia(
        registroAlvo.id,
        vinculos,
        registrosPorId,
        idsRelevantes,
        elosCausais,
        alertas,
        consulta.profundidadeAscendencia ?? 10
      );
    } else {
      // Se não há alvo específico, seleciona os registros do escopo de tipo ou gerais
      for (const r of registros) {
        if (!consulta.entidadeTipo || r.entidadeTipo === consulta.entidadeTipo) {
          idsRelevantes.add(r.id);
        }
      }
    }

    // 3. Filtragem Proporcional por Finalidade Declarada
    const registrosCandidatos = Array.from(idsRelevantes)
      .map((id) => registrosPorId.get(id))
      .filter((r): r is RegistroProveniencia => r !== undefined);

    const { vigentes, historicos } = this.filtrarPorFinalidade(
      consulta.finalidade,
      registrosCandidatos,
      consulta.incluirHistoricoSuperado ?? false
    );

    // 4. Verificação de Integridade Epistêmica e Detecção de Lacunas/Contradições
    this.verificarIntegridadeEpistemica(vigentes, historicos, elosCausais, alertas);

    const temContradicao = alertas.some((a) => a.diagnostico === DiagnosticoContexto.CONTRADICAO_DETECTADA);
    const temLacuna = alertas.some((a) => a.diagnostico === DiagnosticoContexto.LACUNA_DETECTADA);

    const diagnosticoGeral = temContradicao
      ? DiagnosticoContexto.CONTRADICAO_DETECTADA
      : temLacuna
        ? DiagnosticoContexto.LACUNA_DETECTADA
        : DiagnosticoContexto.CONSISTENTE;

    return {
      finalidadeDeclarada: consulta.finalidade,
      alvoPrincipal,
      registrosVigentes: vigentes.map((r) => r.paraDados()),
      registrosHistoricos: historicos.map((r) => r.paraDados()),
      cadeiaAscendencia: elosCausais,
      alertas,
      diagnosticoGeral,
      geradoEm: new Date(),
    };
  }

  /**
   * Percorre recursivamente o grafo de proveniência buscando as origens causais e conexões até a raiz.
   */
  private percorrerAscendencia(
    registroAtualId: string,
    vinculos: VinculoCausal[],
    registrosPorId: Map<string, RegistroProveniencia>,
    idsColetados: Set<string>,
    elosCausais: EloCausal[],
    alertas: AlertaContexto[],
    profundidadeRestante: number
  ): void {
    if (profundidadeRestante <= 0) return;

    // Vínculos incidentes sobre o registro atual:
    // 1. Onde ele é o destino e a origem é a causa/predecessora (ex: ORIGINADO_DE, HABILITADO_POR, SUSTENTADO_POR, DEPENDE_DE)
    // 2. Onde ele é a origem substituta e o destino é o substituído (SUBSTITUI)
    const vinculosEntrada = vinculos.filter(
      (v) =>
        v.destinoRegistroId === registroAtualId ||
        (v.origemRegistroId === registroAtualId && v.tipoRelacao === TipoRelacaoCausal.SUBSTITUI)
    );

    for (const v of vinculosEntrada) {
      const regOrigem = registrosPorId.get(v.origemRegistroId);
      const regDestino = registrosPorId.get(v.destinoRegistroId);

      if (!regOrigem) {
        alertas.push({
          diagnostico: DiagnosticoContexto.LACUNA_DETECTADA,
          mensagem: `Vínculo causal aponta para origem inexistente (ID: ${v.origemRegistroId}).`,
          referenciaAlvo: v.origemRegistroId,
        });
        continue;
      }

      if (!regDestino) {
        alertas.push({
          diagnostico: DiagnosticoContexto.LACUNA_DETECTADA,
          mensagem: `Vínculo causal aponta para destino inexistente (ID: ${v.destinoRegistroId}).`,
          referenciaAlvo: v.destinoRegistroId,
        });
        continue;
      }

      elosCausais.push({
        registroOrigemId: v.origemRegistroId,
        registroDestinoId: v.destinoRegistroId,
        codigoOrigem: regOrigem.codigoReferencia,
        codigoDestino: regDestino.codigoReferencia,
        tipoRelacao: v.tipoRelacao,
        justificativa: v.justificativa,
      });

      const proximoId =
        v.destinoRegistroId === registroAtualId ? v.origemRegistroId : v.destinoRegistroId;

      if (!idsColetados.has(proximoId)) {
        idsColetados.add(proximoId);
        this.percorrerAscendencia(
          proximoId,
          vinculos,
          registrosPorId,
          idsColetados,
          elosCausais,
          alertas,
          profundidadeRestante - 1
        );
      }
    }
  }

  /**
   * Filtra os registros conforme a finalidade, eliminando ruído desnecessário.
   */
  private filtrarPorFinalidade(
    finalidade: FinalidadeContexto,
    candidatos: RegistroProveniencia[],
    incluirSuperados: boolean
  ): { vigentes: RegistroProveniencia[]; historicos: RegistroProveniencia[] } {
    const vigentes: RegistroProveniencia[] = [];
    const historicos: RegistroProveniencia[] = [];

    for (const reg of candidatos) {
      if (reg.vigente) {
        if (this.pertenceAFinalidade(reg, finalidade)) {
          vigentes.push(reg);
        }
      } else if (
        incluirSuperados ||
        finalidade === FinalidadeContexto.AUDITAR_GOVERNANCA ||
        finalidade === FinalidadeContexto.INSPECAO_GERAL
      ) {
        historicos.push(reg);
      }
    }

    return { vigentes, historicos };
  }

  /**
   * Regras de relevância proporcional por finalidade declarada.
   */
  private pertenceAFinalidade(reg: RegistroProveniencia, finalidade: FinalidadeContexto): boolean {
    switch (finalidade) {
      case FinalidadeContexto.DESPACHAR_TRABALHO:
        // Despacho necessita de: trabalho, handoff, direcionamento ou resultado habilitador
        return (
          reg.tipoRegistro === TipoRegistroProveniencia.HANDOFF ||
          reg.tipoRegistro === TipoRegistroProveniencia.DECISAO_HUMANA ||
          reg.tipoRegistro === TipoRegistroProveniencia.RESULTADO_PROCESSO ||
          reg.entidadeTipo === TipoEntidadeContexto.ITEM_DE_TRABALHO ||
          reg.entidadeTipo === TipoEntidadeContexto.ENTREGA_DE_VALOR
        );

      case FinalidadeContexto.EXECUTAR_ITEM:
        // Execução técnica requer item, entrega de valor proprietária, evidências e decisões vigentes
        return (
          reg.entidadeTipo === TipoEntidadeContexto.ITEM_DE_TRABALHO ||
          reg.entidadeTipo === TipoEntidadeContexto.ENTREGA_DE_VALOR ||
          reg.tipoRegistro === TipoRegistroProveniencia.EVIDENCIA ||
          reg.tipoRegistro === TipoRegistroProveniencia.DECISAO_HUMANA
        );

      case FinalidadeContexto.VERIFICAR_RESULTADO:
        // Verificação precisa de compromisso, direção, evidências, resultados de processo e decisões
        return (
          reg.tipoRegistro === TipoRegistroProveniencia.EVIDENCIA ||
          reg.tipoRegistro === TipoRegistroProveniencia.RESULTADO_PROCESSO ||
          reg.tipoRegistro === TipoRegistroProveniencia.DECISAO_HUMANA ||
          reg.entidadeTipo === TipoEntidadeContexto.NECESSIDADE ||
          reg.entidadeTipo === TipoEntidadeContexto.PROJETO ||
          reg.entidadeTipo === TipoEntidadeContexto.ENTREGA_DE_VALOR
        );

      case FinalidadeContexto.FORMAR_ENTREGA:
      case FinalidadeContexto.AUDITAR_FORMACAO:
      case FinalidadeContexto.AUDITAR_GOVERNANCA:
      case FinalidadeContexto.INSPECAO_GERAL:
      default:
        return true;
    }
  }

  /**
   * Analisa consistência, contradições e lacunas de decisões humanas e substituições.
   */
  private verificarIntegridadeEpistemica(
    vigentes: RegistroProveniencia[],
    _historicos: RegistroProveniencia[],
    elos: EloCausal[],
    alertas: AlertaContexto[]
  ): void {
    // 1. Verificar se há registros que substituem outros mantendo o anterior vigente indevidamente
    const vinculosSubstituicao = elos.filter((e) => e.tipoRelacao === TipoRelacaoCausal.SUBSTITUI);
    for (const sub of vinculosSubstituicao) {
      const regOrigem = vigentes.find((r) => r.id === sub.registroOrigemId);
      const regDestino = vigentes.find((r) => r.id === sub.registroDestinoId);

      // Se o destino (antigo) ainda estiver vigente ao lado da origem (substituta), temos contradição
      if (regOrigem && regDestino) {
        alertas.push({
          diagnostico: DiagnosticoContexto.CONTRADICAO_DETECTADA,
          mensagem: `Registro '${regOrigem.codigoReferencia}' substitui '${regDestino.codigoReferencia}', mas ambos constam como vigentes.`,
          referenciaAlvo: regOrigem.codigoReferencia,
          detalhes: {
            substitutoId: regOrigem.id,
            substituidoId: regDestino.id,
          },
        });
      }
    }

    // 2. Verificar decisões humanas sem fundamentação ou evidência causal
    for (const v of vigentes) {
      if (v.tipoRegistro === TipoRegistroProveniencia.DECISAO_HUMANA) {
        const temCausalidade = elos.some(
          (e) => e.registroDestinoId === v.id || e.registroOrigemId === v.id
        );
        if (!temCausalidade && Object.keys(v.dadosContexto).length === 0) {
          alertas.push({
            diagnostico: DiagnosticoContexto.LACUNA_DETECTADA,
            mensagem: `Decisão humana '${v.codigoReferencia}' por '${v.autorResponsavel}' não possui dados de contexto ou elos causais documentados.`,
            referenciaAlvo: v.codigoReferencia,
          });
        }
      }
    }
  }
}
