import { describe, it, expect } from "vitest";
import {
  MetodoObservacao,
  ConclusaoVerificacao,
} from "../src/domain/tipos-verificacao.js";
import {
  ResultadoSoftware,
  CriterioVerificavel,
  EvidenciaVerificacao,
  LaudoVerificacao,
} from "../src/domain/verificacao.js";
import { MotorVerificacaoSoftware } from "../src/domain/motor-verificacao.js";
import { InvarianteVioladaErro } from "../src/domain/erros.js";

describe("IT-018 — Núcleo de Domínio de Verificação de Software e Motor de Avaliação de Conformidade", () => {
  describe("Critério 1: Entidades Ricas e Imutabilidade de Laudos", () => {
    it("deve criar ResultadoSoftware válido com invariantes satisfeitas", () => {
      const resultado = ResultadoSoftware.criar({
        codigoReferencia: "RS-005",
        moduloOrigem: "M-005",
        entregaValorCodigo: "EV-005",
        versaoArtefato: "git-commit-abc1234",
        descricao: "Incremento integrado da suíte de verificação de software",
        declaradoPor: "Engenheiro de Software",
      });

      expect(resultado.id).toBeDefined();
      expect(resultado.codigoReferencia).toBe("RS-005");
      expect(resultado.moduloOrigem).toBe("M-005");
      expect(resultado.entregaValorCodigo).toBe("EV-005");
      expect(resultado.versaoArtefato).toBe("git-commit-abc1234");
      expect(resultado.registradoEm).toBeInstanceOf(Date);
    });

    it("deve lançar InvarianteVioladaErro ao instanciar ResultadoSoftware inválido", () => {
      expect(() => {
        new ResultadoSoftware({
          id: "",
          codigoReferencia: "RS-005",
          moduloOrigem: "M-005",
          entregaValorCodigo: "EV-005",
          versaoArtefato: "v1.0",
          descricao: "Desc",
          declaradoPor: "Dev",
        });
      }).toThrowError(InvarianteVioladaErro);

      expect(() => {
        ResultadoSoftware.criar({
          codigoReferencia: "   ",
          moduloOrigem: "M-005",
          entregaValorCodigo: "EV-005",
          versaoArtefato: "v1.0",
          descricao: "Desc",
          declaradoPor: "Dev",
        });
      }).toThrowError(InvarianteVioladaErro);
    });

    it("deve criar CriterioVerificavel válido com origem normativa e método de observação", () => {
      const criterio = CriterioVerificavel.criar({
        codigo: "CRIT-001",
        resultadoSoftwareId: "res-uuid-1",
        origemNormativa: "EV-005/EspecificacaoTecnica",
        descricaoComportamento: "Avaliação sem evidência deve retornar EVIDENCIA_INSUFICIENTE",
        metodoObservacao: MetodoObservacao.SUITE_AUTOMATIZADA,
        condicaoSatisfacao: "Status do laudo retornado estritamente igual a EVIDENCIA_INSUFICIENTE",
        limitesOuTolerancias: "Apenas suíte local em memória",
      });

      expect(criterio.id).toBeDefined();
      expect(criterio.codigo).toBe("CRIT-001");
      expect(criterio.resultadoSoftwareId).toBe("res-uuid-1");
      expect(criterio.metodoObservacao).toBe(MetodoObservacao.SUITE_AUTOMATIZADA);
      expect(criterio.limitesOuTolerancias).toBe("Apenas suíte local em memória");
      expect(criterio.criadoEm).toBeInstanceOf(Date);
    });

    it("deve lançar InvarianteVioladaErro para método de observação inválido no CriterioVerificavel", () => {
      expect(() => {
        CriterioVerificavel.criar({
          codigo: "CRIT-002",
          resultadoSoftwareId: "res-uuid-1",
          origemNormativa: "Norma",
          descricaoComportamento: "Comportamento",
          metodoObservacao: "METODO_INEXISTENTE" as any,
          condicaoSatisfacao: "Sucesso",
        });
      }).toThrowError(InvarianteVioladaErro);
    });

    it("deve criar EvidenciaVerificacao imutável com carga estruturada de dados", () => {
      const evidencia = EvidenciaVerificacao.criar({
        criterioId: "crit-uuid-1",
        procedimentoExecutado: "npm test -- tests/it018-dominio-verificacao.test.ts",
        resultadoObservado: "15 testes executados, 15 aprovados",
        dadosDetalhados: { duracaoMs: 140, testesPassados: 15 },
        sucesso: true,
        coletadoPor: "Suíte Automatizada Vitest",
      });

      expect(evidencia.id).toBeDefined();
      expect(evidencia.criterioId).toBe("crit-uuid-1");
      expect(evidencia.sucesso).toBe(true);
      expect(evidencia.dadosDetalhados).toEqual({ duracaoMs: 140, testesPassados: 15 });

      // Verificação de imutabilidade de dadosDetalhados
      expect(Object.isFrozen(evidencia.dadosDetalhados)).toBe(true);
    });

    it("deve criar LaudoVerificacao imutável com conclusão explicável", () => {
      const laudo = LaudoVerificacao.criar({
        resultadoSoftwareId: "res-uuid-1",
        criterioId: "crit-uuid-1",
        conclusao: ConclusaoVerificacao.CRITERIO_DEMONSTRADO,
        fundamentacaoTecnica: "Evidência automatizada atesta 100% de sucesso nas asserções.",
        evidenciasUtilizadas: ["evi-uuid-1", "evi-uuid-2"],
        emitidoPor: "MotorVerificacaoSoftware",
      });

      expect(laudo.id).toBeDefined();
      expect(laudo.conclusao).toBe(ConclusaoVerificacao.CRITERIO_DEMONSTRADO);
      expect(laudo.evidenciasUtilizadas).toEqual(["evi-uuid-1", "evi-uuid-2"]);
      expect(Object.isFrozen(laudo.evidenciasUtilizadas)).toBe(true);
    });
  });

  describe("Critério 2: Invariante Estrito de Não Presunção de Conformidade", () => {
    const motor = new MotorVerificacaoSoftware();
    const resultado = ResultadoSoftware.criar({
      id: "res-001",
      codigoReferencia: "RS-001",
      moduloOrigem: "M-005",
      entregaValorCodigo: "EV-005",
      versaoArtefato: "v1.0.0",
      descricao: "Artefato de teste de não presunção",
      declaradoPor: "Testador",
    });

    const criterioSemEvidencia = CriterioVerificavel.criar({
      id: "crit-sem-ev",
      codigo: "CRIT-SEM-EV",
      resultadoSoftwareId: "res-001",
      origemNormativa: "N-001/Compromisso",
      descricaoComportamento: "O sistema deve processar o handoff sem erro",
      metodoObservacao: MetodoObservacao.OPERACIONAL,
      condicaoSatisfacao: "Nenhum erro de integridade disparado",
    });

    it("deve emitir rigorosamente EVIDENCIA_INSUFICIENTE quando não existirem evidências associadas ao critério", () => {
      const laudo = motor.avaliarCriterio(resultado, criterioSemEvidencia, [], "Auditor de Software");

      expect(laudo.conclusao).toBe(ConclusaoVerificacao.EVIDENCIA_INSUFICIENTE);
      expect(laudo.evidenciasUtilizadas).toHaveLength(0);
      expect(laudo.fundamentacaoTecnica).toContain("não presunção de conformidade");
      expect(laudo.fundamentacaoTecnica).toContain("ausência de teste impede atestar");
      expect(laudo.divergenciasApontadas).toContain("Nenhuma evidência registrada");
    });

    it("deve emitir EVIDENCIA_INSUFICIENTE na avaliação agregada quando critérios não possuírem evidências", () => {
      const avaliacao = motor.avaliarConformidadeAgregada(
        resultado,
        [criterioSemEvidencia],
        [],
        "Auditor Agregado"
      );

      expect(avaliacao.laudoAgregado.conclusaoGeral).toBe(ConclusaoVerificacao.EVIDENCIA_INSUFICIENTE);
      expect(avaliacao.laudoAgregado.insuficientes).toBe(1);
      expect(avaliacao.laudoAgregado.demonstrados).toBe(0);
      expect(avaliacao.laudoAgregado.fundamentacaoGeral).toContain("evidência insuficiente");
    });
  });

  describe("Critério 3: Detecção de Divergências, Falhas e Sucessos", () => {
    const motor = new MotorVerificacaoSoftware();
    const resultado = ResultadoSoftware.criar({
      id: "res-002",
      codigoReferencia: "RS-002",
      moduloOrigem: "M-005",
      entregaValorCodigo: "EV-005",
      versaoArtefato: "v2.0.0",
      descricao: "Artefato para teste de divergências e sucessos",
      declaradoPor: "Testador",
    });

    const criterio1 = CriterioVerificavel.criar({
      id: "crit-1",
      codigo: "CRIT-001",
      resultadoSoftwareId: "res-002",
      origemNormativa: "P-001/Direcao",
      descricaoComportamento: "Endpoint HTTP /health deve responder 200 OK",
      metodoObservacao: MetodoObservacao.INSPECAO_HTTP,
      condicaoSatisfacao: "Status 200 com JSON { status: 'OK' }",
    });

    const criterio2 = CriterioVerificavel.criar({
      id: "crit-2",
      codigo: "CRIT-002",
      resultadoSoftwareId: "res-002",
      origemNormativa: "M-005/Esquema",
      descricaoComportamento: "Esquema relacional deve impor constraints de unicidade",
      metodoObservacao: MetodoObservacao.CONFORMIDADE_ESQUEMA,
      condicaoSatisfacao: "Tabela possui chave única em codigo_referencia",
    });

    it("deve emitir CRITERIO_DEMONSTRADO quando todas as evidências forem bem-sucedidas", () => {
      const evidenciaSucesso = EvidenciaVerificacao.criar({
        id: "evi-suc-1",
        criterioId: "crit-1",
        procedimentoExecutado: "GET /health",
        resultadoObservado: "HTTP 200 { status: 'OK' }",
        sucesso: true,
        coletadoPor: "Supertest Agent",
      });

      const laudo = motor.avaliarCriterio(resultado, criterio1, [evidenciaSucesso], "Verificador Local");

      expect(laudo.conclusao).toBe(ConclusaoVerificacao.CRITERIO_DEMONSTRADO);
      expect(laudo.divergenciasApontadas).toBeNull();
      expect(laudo.fundamentacaoTecnica).toContain("Critério demonstrado com sucesso");
      expect(laudo.evidenciasUtilizadas).toContain("evi-suc-1");
    });

    it("deve emitir CRITERIO_NAO_DEMONSTRADO quando todas as evidências apontarem falha", () => {
      const evidenciaFalha = EvidenciaVerificacao.criar({
        id: "evi-falha-1",
        criterioId: "crit-1",
        procedimentoExecutado: "GET /health",
        resultadoObservado: "HTTP 500 Erro Interno",
        sucesso: false,
        coletadoPor: "Supertest Agent",
      });

      const laudo = motor.avaliarCriterio(resultado, criterio1, [evidenciaFalha], "Verificador Local");

      expect(laudo.conclusao).toBe(ConclusaoVerificacao.CRITERIO_NAO_DEMONSTRADO);
      expect(laudo.divergenciasApontadas).toContain("HTTP 500 Erro Interno");
      expect(laudo.fundamentacaoTecnica).toContain("não foi cumprida");
    });

    it("deve emitir DIVERGENCIA_ENCONTRADA quando houver evidências contraditórias (sucesso e falha simultâneos)", () => {
      const evidencia1 = EvidenciaVerificacao.criar({
        id: "evi-crit2-1",
        criterioId: "crit-2",
        procedimentoExecutado: "Checagem de constraint no PostgreSQL",
        resultadoObservado: "Constraint uq_res_software_codigo encontrada ativa",
        sucesso: true,
        coletadoPor: "Verificador de Banco",
      });

      const evidencia2 = EvidenciaVerificacao.criar({
        id: "evi-crit2-2",
        criterioId: "crit-2",
        procedimentoExecutado: "Inserção de registro duplicado",
        resultadoObservado: "Registro duplicado inserido sem erro (violação da unicidade esperada)",
        sucesso: false,
        coletadoPor: "Teste de Carga",
      });

      const laudo = motor.avaliarCriterio(
        resultado,
        criterio2,
        [evidencia1, evidencia2],
        "Verificador Local"
      );

      expect(laudo.conclusao).toBe(ConclusaoVerificacao.DIVERGENCIA_ENCONTRADA);
      expect(laudo.fundamentacaoTecnica).toContain("evidências contraditórias");
      expect(laudo.divergenciasApontadas).toContain("Conflito de evidências");
      expect(laudo.divergenciasApontadas).toContain("SUCESSO");
      expect(laudo.divergenciasApontadas).toContain("FALHA");
    });

    it("deve consolidar o LaudoVerificacaoAgregado com prioridade para DIVERGENCIA_ENCONTRADA", () => {
      // Critério 1 demonstrado com sucesso
      const evCrit1 = EvidenciaVerificacao.criar({
        criterioId: "crit-1",
        procedimentoExecutado: "GET /health",
        resultadoObservado: "HTTP 200 OK",
        sucesso: true,
        coletadoPor: "Testador HTTP",
      });

      // Critério 2 com divergência de evidências
      const evCrit2A = EvidenciaVerificacao.criar({
        criterioId: "crit-2",
        procedimentoExecutado: "Proc A",
        resultadoObservado: "OK",
        sucesso: true,
        coletadoPor: "Testador A",
      });
      const evCrit2B = EvidenciaVerificacao.criar({
        criterioId: "crit-2",
        procedimentoExecutado: "Proc B",
        resultadoObservado: "Falha",
        sucesso: false,
        coletadoPor: "Testador B",
      });

      const avaliacao = motor.avaliarConformidadeAgregada(
        resultado,
        [criterio1, criterio2],
        [evCrit1, evCrit2A, evCrit2B],
        "Verificador Agregado"
      );

      expect(avaliacao.laudoAgregado.totalCriterios).toBe(2);
      expect(avaliacao.laudoAgregado.demonstrados).toBe(1);
      expect(avaliacao.laudoAgregado.divergencias).toBe(1);
      expect(avaliacao.laudoAgregado.conclusaoGeral).toBe(ConclusaoVerificacao.DIVERGENCIA_ENCONTRADA);
      expect(avaliacao.laudoAgregado.laudosPorCriterio).toHaveLength(2);
      expect(avaliacao.laudosIndividuais).toHaveLength(2);
    });

    it("deve retornar laudo agregado com CRITERIO_DEMONSTRADO quando todos os critérios forem atendidos", () => {
      const evCrit1 = EvidenciaVerificacao.criar({
        criterioId: "crit-1",
        procedimentoExecutado: "GET /health",
        resultadoObservado: "HTTP 200 OK",
        sucesso: true,
        coletadoPor: "Testador HTTP",
      });

      const evCrit2 = EvidenciaVerificacao.criar({
        criterioId: "crit-2",
        procedimentoExecutado: "Check constraint",
        resultadoObservado: "Unique constraint ok",
        sucesso: true,
        coletadoPor: "Testador DB",
      });

      const avaliacao = motor.avaliarConformidadeAgregada(
        resultado,
        [criterio1, criterio2],
        [evCrit1, evCrit2],
        "Verificador Agregado"
      );

      expect(avaliacao.laudoAgregado.conclusaoGeral).toBe(ConclusaoVerificacao.CRITERIO_DEMONSTRADO);
      expect(avaliacao.laudoAgregado.demonstrados).toBe(2);
      expect(avaliacao.laudoAgregado.naoDemonstrados).toBe(0);
      expect(avaliacao.laudoAgregado.divergencias).toBe(0);
      expect(avaliacao.laudoAgregado.insuficientes).toBe(0);
      expect(avaliacao.laudoAgregado.fundamentacaoGeral).toContain("Todos os 2 critério(s) verificáveis");
    });

    it("deve lançar InvarianteVioladaErro ao tentar avaliar critério de outro Resultado de Software", () => {
      const outroResultado = ResultadoSoftware.criar({
        id: "res-outro-999",
        codigoReferencia: "RS-999",
        moduloOrigem: "M-001",
        entregaValorCodigo: "EV-001",
        versaoArtefato: "v1.0",
        descricao: "Outro",
        declaradoPor: "Dev",
      });

      expect(() => {
        motor.avaliarCriterio(outroResultado, criterio1, [], "Auditor");
      }).toThrowError(InvarianteVioladaErro);
    });
  });
});
