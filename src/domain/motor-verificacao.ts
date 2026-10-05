import { ConclusaoVerificacao } from "./tipos-verificacao.js";
import {
  ResumoLaudoCriterio,
  LaudoVerificacaoAgregado,
} from "./valores-verificacao.js";
import {
  ResultadoSoftware,
  CriterioVerificavel,
  EvidenciaVerificacao,
  LaudoVerificacao,
} from "./verificacao.js";
import { InvarianteVioladaErro } from "./erros.js";

/**
 * Serviço de Domínio Puro: MotorVerificacaoSoftware
 * Executa a avaliação técnica de conformidade de um Resultado de Software contra seus Critérios Verificáveis
 * a partir das Evidências observadas, emitindo laudos individuais e agregados explicáveis.
 * 
 * Invariantes nucleares observadas:
 * 1. Não Presunção de Conformidade: ausência de evidência gera EVIDENCIA_INSUFICIENTE; nunca sucesso.
 * 2. Imutabilidade e Idempotência: mesmas evidências para o mesmo critério geram a mesma conclusão.
 * 3. Detecção de Divergências: contradições em evidências ou falha no comportamento geram DIVERGENCIA_ENCONTRADA ou CRITERIO_NAO_DEMONSTRADO.
 * 4. Não invasão de autoridade: emite laudos técnicos internos sem usurpar HOMOLOGADO_PELO_OWNER ou COMPROMISSO_ATENDIDO.
 */
export class MotorVerificacaoSoftware {
  /**
   * Avalia um único critério verificável à luz de suas evidências registradas.
   */
  avaliarCriterio(
    resultadoSoftware: ResultadoSoftware,
    criterio: CriterioVerificavel,
    evidencias: EvidenciaVerificacao[],
    emitidoPor: string
  ): LaudoVerificacao {
    if (criterio.resultadoSoftwareId !== resultadoSoftware.id) {
      throw new InvarianteVioladaErro(
        `O critério '${criterio.codigo}' não pertence ao Resultado de Software '${resultadoSoftware.codigoReferencia}'.`
      );
    }

    if (!emitidoPor || emitidoPor.trim() === "") {
      throw new InvarianteVioladaErro("O Ator/agente emissor da avaliação do critério é obrigatório.");
    }

    // Filtrar apenas evidências associadas ao critério específico
    const evidenciasDoCriterio = evidencias.filter((e) => e.criterioId === criterio.id);

    // Invariante 1: Não Presunção de Conformidade (ausência de evidências)
    if (evidenciasDoCriterio.length === 0) {
      return LaudoVerificacao.criar({
        resultadoSoftwareId: resultadoSoftware.id,
        criterioId: criterio.id,
        conclusao: ConclusaoVerificacao.EVIDENCIA_INSUFICIENTE,
        fundamentacaoTecnica: `Não foram apresentadas evidências técnicas de observação para o critério '${criterio.codigo}'. Em conformidade com o princípio de não presunção de conformidade, a ausência de teste impede atestar o atendimento.`,
        evidenciasUtilizadas: [],
        divergenciasApontadas: "Nenhuma evidência registrada no percurso de verificação.",
        emitidoPor: emitidoPor.trim(),
      });
    }

    const idsEvidencias = evidenciasDoCriterio.map((e) => e.id);
    const todasSucesso = evidenciasDoCriterio.every((e) => e.sucesso);
    const todasFalha = evidenciasDoCriterio.every((e) => !e.sucesso);

    // Invariante 2: Evidências conflitantes (parte sucesso e parte falha) geram DIVERGENCIA_ENCONTRADA
    if (!todasSucesso && !todasFalha) {
      const detalhesConflito = evidenciasDoCriterio
        .map(
          (e) =>
            `[${e.sucesso ? "SUCESSO" : "FALHA"}] Procedimento: ${e.procedimentoExecutado} - Observação: ${e.resultadoObservado}`
        )
        .join("; ");

      return LaudoVerificacao.criar({
        resultadoSoftwareId: resultadoSoftware.id,
        criterioId: criterio.id,
        conclusao: ConclusaoVerificacao.DIVERGENCIA_ENCONTRADA,
        fundamentacaoTecnica: `Foram encontradas evidências contraditórias durante a observação do critério '${criterio.codigo}'. Parte das observações indicou conformidade e parte indicou falha, caracterizando divergência que requer investigação.`,
        evidenciasUtilizadas: idsEvidencias,
        divergenciasApontadas: `Conflito de evidências: ${detalhesConflito}`,
        emitidoPor: emitidoPor.trim(),
      });
    }

    // Invariante 3: Todas as evidências atestam falha -> CRITERIO_NAO_DEMONSTRADO
    if (todasFalha) {
      const falhas = evidenciasDoCriterio
        .map((e) => `Procedimento '${e.procedimentoExecutado}': ${e.resultadoObservado}`)
        .join("; ");

      return LaudoVerificacao.criar({
        resultadoSoftwareId: resultadoSoftware.id,
        criterioId: criterio.id,
        conclusao: ConclusaoVerificacao.CRITERIO_NAO_DEMONSTRADO,
        fundamentacaoTecnica: `As evidências observadas demonstraram que a condição de satisfação do critério '${criterio.codigo}' não foi cumprida.`,
        evidenciasUtilizadas: idsEvidencias,
        divergenciasApontadas: `Falha na verificação: ${falhas}`,
        emitidoPor: emitidoPor.trim(),
      });
    }

    // Invariante 4: Todas as evidências com sucesso -> CRITERIO_DEMONSTRADO
    const sucessos = evidenciasDoCriterio
      .map((e) => `Procedimento '${e.procedimentoExecutado}' demonstrou: ${e.resultadoObservado}`)
      .join("; ");

    return LaudoVerificacao.criar({
      resultadoSoftwareId: resultadoSoftware.id,
      criterioId: criterio.id,
      conclusao: ConclusaoVerificacao.CRITERIO_DEMONSTRADO,
      fundamentacaoTecnica: `Critério demonstrado com sucesso com base em ${evidenciasDoCriterio.length} evidência(s) consistente(s). Condição esperada: '${criterio.condicaoSatisfacao}'. Observado: ${sucessos}.`,
      evidenciasUtilizadas: idsEvidencias,
      divergenciasApontadas: null,
      emitidoPor: emitidoPor.trim(),
    });
  }

  /**
   * Avalia a conformidade agregada de todos os critérios aplicáveis ao Resultado de Software.
   */
  avaliarConformidadeAgregada(
    resultadoSoftware: ResultadoSoftware,
    criterios: CriterioVerificavel[],
    evidencias: EvidenciaVerificacao[],
    emitidoPor: string
  ): {
    laudoAgregado: LaudoVerificacaoAgregado;
    laudosIndividuais: LaudoVerificacao[];
  } {
    if (!emitidoPor || emitidoPor.trim() === "") {
      throw new InvarianteVioladaErro("O Ator/agente emissor da avaliação agregada é obrigatório.");
    }

    // Validar critérios do resultado
    const criteriosDoResultado = criterios.filter(
      (c) => c.resultadoSoftwareId === resultadoSoftware.id
    );

    const laudosIndividuais: LaudoVerificacao[] = [];
    const resumosPorCriterio: ResumoLaudoCriterio[] = [];

    let demonstrados = 0;
    let naoDemonstrados = 0;
    let insuficientes = 0;
    let divergencias = 0;
    let impossiveis = 0;

    for (const criterio of criteriosDoResultado) {
      const laudo = this.avaliarCriterio(resultadoSoftware, criterio, evidencias, emitidoPor);
      laudosIndividuais.push(laudo);

      switch (laudo.conclusao) {
        case ConclusaoVerificacao.CRITERIO_DEMONSTRADO:
          demonstrados++;
          break;
        case ConclusaoVerificacao.CRITERIO_NAO_DEMONSTRADO:
          naoDemonstrados++;
          break;
        case ConclusaoVerificacao.EVIDENCIA_INSUFICIENTE:
          insuficientes++;
          break;
        case ConclusaoVerificacao.DIVERGENCIA_ENCONTRADA:
          divergencias++;
          break;
        case ConclusaoVerificacao.VERIFICACAO_IMPOSSIVEL:
          impossiveis++;
          break;
      }

      resumosPorCriterio.push({
        criterioId: criterio.id,
        criterioCodigo: criterio.codigo,
        metodoObservacao: criterio.metodoObservacao,
        conclusao: laudo.conclusao,
        fundamentacaoTecnica: laudo.fundamentacaoTecnica,
        evidenciasUtilizadas: [...laudo.evidenciasUtilizadas],
        divergenciasApontadas: laudo.divergenciasApontadas,
      });
    }

    // Determinar a Conclusão Geral Agregada
    let conclusaoGeral: ConclusaoVerificacao;
    let fundamentacaoGeral: string;

    if (criteriosDoResultado.length === 0) {
      conclusaoGeral = ConclusaoVerificacao.EVIDENCIA_INSUFICIENTE;
      fundamentacaoGeral = `O Resultado de Software '${resultadoSoftware.codigoReferencia}' não possui nenhum critério verificável cadastrado. Avaliação impossível sem critérios definidos.`;
    } else if (divergencias > 0) {
      conclusaoGeral = ConclusaoVerificacao.DIVERGENCIA_ENCONTRADA;
      fundamentacaoGeral = `Foram detectadas divergências técnicas ou conflitos de evidência em ${divergencias} critério(s). A conformidade global requer saneamento prévio das discrepâncias.`;
    } else if (naoDemonstrados > 0) {
      conclusaoGeral = ConclusaoVerificacao.CRITERIO_NAO_DEMONSTRADO;
      fundamentacaoGeral = `A avaliação identificou ${naoDemonstrados} critério(s) com comprovação negativa de conformidade (critério não demonstrado).`;
    } else if (insuficientes > 0) {
      conclusaoGeral = ConclusaoVerificacao.EVIDENCIA_INSUFICIENTE;
      fundamentacaoGeral = `Existem ${insuficientes} critério(s) com evidência insuficiente para atestar a conformidade do incremento de software.`;
    } else if (impossiveis > 0) {
      conclusaoGeral = ConclusaoVerificacao.VERIFICACAO_IMPOSSIVEL;
      fundamentacaoGeral = `A verificação foi considerada impossível para ${impossiveis} critério(s) devido à indisponibilidade de ambiente ou dados técnicos.`;
    } else {
      conclusaoGeral = ConclusaoVerificacao.CRITERIO_DEMONSTRADO;
      fundamentacaoGeral = `Todos os ${demonstrados} critério(s) verificáveis aplicáveis ao Resultado de Software foram demonstrados satisfatoriamente com evidências técnicas auditáveis.`;
    }

    const laudoAgregado: LaudoVerificacaoAgregado = {
      resultadoSoftwareId: resultadoSoftware.id,
      codigoReferencia: resultadoSoftware.codigoReferencia,
      conclusaoGeral,
      fundamentacaoGeral,
      laudosPorCriterio: resumosPorCriterio,
      totalCriterios: criteriosDoResultado.length,
      demonstrados,
      naoDemonstrados,
      insuficientes,
      divergencias,
      impossiveis,
      emitidoPor: emitidoPor.trim(),
      avaliadoEm: new Date(),
    };

    return {
      laudoAgregado,
      laudosIndividuais,
    };
  }
}
