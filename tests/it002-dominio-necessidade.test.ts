import { describe, it, expect } from "vitest";
import {
  Necessidade,
  StatusNecessidade,
  TipoNecessidade,
  TipoResultadoProcesso,
  DecisaoMaterialOwner,
  AtorCompetenteNecessidade,
  ServicoCompromissoNecessidade,
  TransicaoInvalidaErro,
  AutoridadeInvalidaErro,
  InvarianteVioladaErro,
  DadosCriacaoNecessidade,
} from "../src/index.js";

const dadosValidos: DadosCriacaoNecessidade = {
  id: "nec-001",
  codigo: "N-001",
  titulo: "Autonomia do NAAMIVE",
  tipo: TipoNecessidade.NOVO_PRODUTO,
  problemaOuOportunidade: "Processos manuais exigem orquestração automatizada e auditável.",
  quemEAfetado: "Equipes de engenharia de software e agentes autônomos.",
  resultadoPretendido: "Conduzir necessidades de negócio até software verificável.",
  escopoInicial: "Ciclo de vida de necessidades, módulos, entregas e itens de trabalho.",
  foraDeEscopo: "Substituição completa do julgamento humano do Owner.",
  criterioDeAtendimento: "Software executável testado e validado em ambiente local.",
  porQueIssoImporta: "Garante rastreabilidade e governança estrita.",
  restricoesOuDependencias: "Nenhuma conhecida neste momento.",
  origem: "Demanda estratégica interna.",
};

describe("IT-002 — Núcleo de Domínio da Necessidade, Regras de Transição e Compromisso", () => {
  it("deve criar uma Necessidade no status EM_FORMACAO com histórico de criação", () => {
    const nec = new Necessidade(dadosValidos);

    expect(nec.id).toBe("nec-001");
    expect(nec.codigo).toBe("N-001");
    expect(nec.status).toBe(StatusNecessidade.EM_FORMACAO);
    expect(nec.historico.length).toBe(1);
    expect(nec.historico[0]?.atividade).toBe("Criação da Necessidade");
    expect(nec.historico[0]?.statusNovo).toBe(StatusNecessidade.EM_FORMACAO);
    expect(nec.resultados.length).toBe(0);
    expect(nec.decisoes.length).toBe(0);
    expect(nec.compromisso).toBeNull();
  });

  it("deve impedir criação de Necessidade sem campos obrigatórios", () => {
    expect(() => new Necessidade({ ...dadosValidos, id: "" })).toThrow(InvarianteVioladaErro);
    expect(() => new Necessidade({ ...dadosValidos, codigo: "   " })).toThrow(InvarianteVioladaErro);
    expect(() => new Necessidade({ ...dadosValidos, titulo: "" })).toThrow(InvarianteVioladaErro);
  });

  it("deve permitir emissão de Resultados do Processo por atores competentes mantendo separação do status", () => {
    const nec = new Necessidade(dadosValidos);

    // Auditor emite QUALIFICAVEL
    const resAuditoria = nec.registrarResultadoProcesso(
      AtorCompetenteNecessidade.AUDITOR_NECESSIDADE,
      TipoResultadoProcesso.QUALIFICAVEL,
      { parecer: "Formação completa e suficiente" }
    );

    expect(resAuditoria.tipoResultado).toBe(TipoResultadoProcesso.QUALIFICAVEL);
    expect(nec.status).toBe(StatusNecessidade.EM_FORMACAO); // Status não se altera com emissão de resultado!
    expect(nec.resultados.length).toBe(1);
    expect(nec.historico.length).toBe(2);
  });

  it("deve rejeitar emissão de Resultados do Processo por atores não autorizados", () => {
    const nec = new Necessidade(dadosValidos);

    // Especialista em Formação tentando emitir QUALIFICAVEL (competência do Auditor)
    expect(() =>
      nec.registrarResultadoProcesso(
        AtorCompetenteNecessidade.ESPECIALISTA_FORMACAO,
        TipoResultadoProcesso.QUALIFICAVEL
      )
    ).toThrow(AutoridadeInvalidaErro);

    // Auditor tentando emitir ASSUMIR_COMPROMISSO (competência do Especialista em Qualificação)
    expect(() =>
      nec.registrarResultadoProcesso(
        AtorCompetenteNecessidade.AUDITOR_NECESSIDADE,
        TipoResultadoProcesso.ASSUMIR_COMPROMISSO
      )
    ).toThrow(AutoridadeInvalidaErro);
  });

  it("deve impedir avanço para EM_QUALIFICACAO sem parecer QUALIFICAVEL prévio", () => {
    const nec = new Necessidade(dadosValidos);

    expect(() =>
      nec.avancarParaQualificacao(AtorCompetenteNecessidade.ESPECIALISTA_FORMACAO)
    ).toThrow(InvarianteVioladaErro);

    expect(nec.status).toBe(StatusNecessidade.EM_FORMACAO);
  });

  it("deve avançar para EM_QUALIFICACAO quando houver parecer QUALIFICAVEL do Auditor", () => {
    const nec = new Necessidade(dadosValidos);

    nec.registrarResultadoProcesso(
      AtorCompetenteNecessidade.AUDITOR_NECESSIDADE,
      TipoResultadoProcesso.QUALIFICAVEL
    );

    nec.avancarParaQualificacao(AtorCompetenteNecessidade.ESPECIALISTA_FORMACAO);

    expect(nec.status).toBe(StatusNecessidade.EM_QUALIFICACAO);
    expect(nec.historico.length).toBe(3);
  });

  it("deve impedir submissão para decisão sem recomendação prévia do Especialista em Qualificação", () => {
    const nec = new Necessidade(dadosValidos);
    nec.registrarResultadoProcesso(
      AtorCompetenteNecessidade.AUDITOR_NECESSIDADE,
      TipoResultadoProcesso.QUALIFICAVEL
    );
    nec.avancarParaQualificacao(AtorCompetenteNecessidade.ESPECIALISTA_FORMACAO);

    expect(() =>
      nec.submeterParaDecisao(AtorCompetenteNecessidade.ESPECIALISTA_QUALIFICACAO)
    ).toThrow(InvarianteVioladaErro);

    expect(nec.status).toBe(StatusNecessidade.EM_QUALIFICACAO);
  });

  it("deve permitir submissão para decisão após recomendação de qualificação", () => {
    const nec = new Necessidade(dadosValidos);
    nec.registrarResultadoProcesso(
      AtorCompetenteNecessidade.AUDITOR_NECESSIDADE,
      TipoResultadoProcesso.QUALIFICAVEL
    );
    nec.avancarParaQualificacao(AtorCompetenteNecessidade.ESPECIALISTA_FORMACAO);

    nec.registrarResultadoProcesso(
      AtorCompetenteNecessidade.ESPECIALISTA_QUALIFICACAO,
      TipoResultadoProcesso.ASSUMIR_COMPROMISSO,
      { justificativa: "Alto valor para o negócio" }
    );

    nec.submeterParaDecisao(AtorCompetenteNecessidade.ESPECIALISTA_QUALIFICACAO);

    expect(nec.status).toBe(StatusNecessidade.AGUARDANDO_DECISAO);
  });

  it("deve rejeitar decisão material do Owner sem usuário autenticado", () => {
    const nec = new Necessidade(dadosValidos);

    expect(() =>
      nec.registrarDecisaoOwner(DecisaoMaterialOwner.APROVADO, "")
    ).toThrow(AutoridadeInvalidaErro);

    expect(() =>
      nec.registrarDecisaoOwner(DecisaoMaterialOwner.APROVADO, "   ")
    ).toThrow(AutoridadeInvalidaErro);
  });

  it("deve rejeitar decisão APROVADO se o status não for AGUARDANDO_DECISAO", () => {
    const nec = new Necessidade(dadosValidos); // Status: EM_FORMACAO

    expect(() =>
      nec.registrarDecisaoOwner(DecisaoMaterialOwner.APROVADO, "usuario-owner")
    ).toThrow(TransicaoInvalidaErro);

    expect(nec.status).toBe(StatusNecessidade.EM_FORMACAO);
    expect(nec.decisoes.length).toBe(0);
  });

  it("deve permitir decisão CANCELAMENTO_APROVADO transicionando qualquer status não terminal para CANCELADA", () => {
    const nec = new Necessidade(dadosValidos);
    expect(nec.status).toBe(StatusNecessidade.EM_FORMACAO);

    const decisao = nec.registrarDecisaoOwner(
      DecisaoMaterialOwner.CANCELAMENTO_APROVADO,
      "owner-master",
      "Demanda não estratégica no momento"
    );

    expect(decisao.decisao).toBe(DecisaoMaterialOwner.CANCELAMENTO_APROVADO);
    expect(nec.status).toBe(StatusNecessidade.CANCELADA);

    // Estado terminal não pode aceitar novas ações
    expect(() =>
      nec.registrarResultadoProcesso(
        AtorCompetenteNecessidade.AUDITOR_NECESSIDADE,
        TipoResultadoProcesso.QUALIFICAVEL
      )
    ).toThrow(TransicaoInvalidaErro);
  });

  it("deve consolidar o Compromisso da Necessidade com sucesso apenas após APROVADO", () => {
    const nec = new Necessidade(dadosValidos);

    // Tentar compor compromisso antes de APROVADO deve falhar
    expect(() => ServicoCompromissoNecessidade.compor(nec)).toThrow(InvarianteVioladaErro);

    // Percurso canônico até APROVADO
    nec.registrarResultadoProcesso(
      AtorCompetenteNecessidade.AUDITOR_NECESSIDADE,
      TipoResultadoProcesso.QUALIFICAVEL
    );
    nec.avancarParaQualificacao(AtorCompetenteNecessidade.ESPECIALISTA_FORMACAO);

    nec.registrarResultadoProcesso(
      AtorCompetenteNecessidade.ESPECIALISTA_QUALIFICACAO,
      TipoResultadoProcesso.ASSUMIR_COMPROMISSO
    );
    nec.submeterParaDecisao(AtorCompetenteNecessidade.ESPECIALISTA_QUALIFICACAO);

    nec.registrarDecisaoOwner(DecisaoMaterialOwner.APROVADO, "mhj", "Aprovado conforme planejado");

    // Agora a composição do compromisso é válida
    const compromisso = ServicoCompromissoNecessidade.compor(nec);

    expect(compromisso).toBeDefined();
    expect(compromisso.necessidadeId).toBe(nec.id);
    expect(compromisso.problemaAssumido).toBe(nec.problemaOuOportunidade);
    expect(compromisso.resultadoPretendido).toBe(nec.resultadoPretendido);
    expect(compromisso.usuarioAprovador).toBe("mhj");
    expect(ServicoCompromissoNecessidade.validarEstrutura(compromisso)).toBe(true);
    expect(nec.compromisso).toEqual(compromisso);
  });

  it("deve transicionar para EM_PROJETO após APROVADO e confirmação do bootstrap do Projeto 1:1", () => {
    const nec = new Necessidade(dadosValidos);
    nec.registrarResultadoProcesso(
      AtorCompetenteNecessidade.AUDITOR_NECESSIDADE,
      TipoResultadoProcesso.QUALIFICAVEL
    );
    nec.avancarParaQualificacao(AtorCompetenteNecessidade.ESPECIALISTA_FORMACAO);
    nec.registrarResultadoProcesso(
      AtorCompetenteNecessidade.ESPECIALISTA_QUALIFICACAO,
      TipoResultadoProcesso.ASSUMIR_COMPROMISSO
    );
    nec.submeterParaDecisao(AtorCompetenteNecessidade.ESPECIALISTA_QUALIFICACAO);
    nec.registrarDecisaoOwner(DecisaoMaterialOwner.APROVADO, "mhj");
    ServicoCompromissoNecessidade.compor(nec);

    // Transição para EM_PROJETO com ID de Projeto
    nec.confirmarMaterializacaoProjeto("proj-5575efa1");
    expect(nec.status).toBe(StatusNecessidade.EM_PROJETO);

    // Transição final para ATENDIDA quando o Projeto for concluído
    nec.marcarComoAtendida("Projeto P-001 entregue com sucesso");
    expect(nec.status).toBe(StatusNecessidade.ATENDIDA);

    // Estado terminal não aceita mais transições
    expect(() => nec.marcarComoAtendida()).toThrow(TransicaoInvalidaErro);
  });
});
