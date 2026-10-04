import { Necessidade } from "./necessidade.js";
import { CompromissoNecessidade } from "./valores.js";
import { InvarianteVioladaErro } from "./erros.js";

/**
 * Serviço de domínio responsável pela geração e validação da visão consolidada
 * do Compromisso da Necessidade.
 * Conforme documentacao/necessidade/02_MODELO_DE_NECESSIDADE.md e 05_CICLO_DE_VIDA_DA_NECESSIDADE.md
 */
export class ServicoCompromissoNecessidade {
  /**
   * Compõe a visão consolidada do Compromisso a partir da entidade Necessidade.
   * Invariante estrita: Somente pode ser composto se a decisão humana APROVADO
   * do Owner estiver registrada e a Necessidade estiver em estado elegível.
   */
  public static compor(
    necessidade: Necessidade,
    contextoAdicional?: string
  ): CompromissoNecessidade {
    if (!necessidade) {
      throw new InvarianteVioladaErro("A entidade Necessidade é obrigatória para composição do Compromisso.");
    }

    return necessidade.consolidarCompromisso(contextoAdicional);
  }

  /**
   * Valida se um objeto Compromisso possui todos os campos obrigatórios previstos no modelo.
   */
  public static validarEstrutura(compromisso: CompromissoNecessidade): boolean {
    if (!compromisso.id || compromisso.id.trim() === "") return false;
    if (!compromisso.necessidadeId || compromisso.necessidadeId.trim() === "") return false;
    if (!compromisso.problemaAssumido || compromisso.problemaAssumido.trim() === "") return false;
    if (!compromisso.resultadoPretendido || compromisso.resultadoPretendido.trim() === "") return false;
    if (!compromisso.escopoAssumido || compromisso.escopoAssumido.trim() === "") return false;
    if (!compromisso.foraDeEscopo || compromisso.foraDeEscopo.trim() === "") return false;
    if (!compromisso.criterioDeAtendimento || compromisso.criterioDeAtendimento.trim() === "") return false;
    if (!compromisso.decisaoId || compromisso.decisaoId.trim() === "") return false;
    if (!compromisso.usuarioAprovador || compromisso.usuarioAprovador.trim() === "") return false;
    return true;
  }
}
