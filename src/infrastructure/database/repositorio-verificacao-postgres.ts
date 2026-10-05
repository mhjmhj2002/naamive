import {
  ResultadoSoftware,
  CriterioVerificavel,
  EvidenciaVerificacao,
  LaudoVerificacao,
} from "../../domain/verificacao.js";
import { RepositorioVerificacao } from "../../domain/repositorio-verificacao.js";
import { MetodoObservacao, ConclusaoVerificacao } from "../../domain/tipos-verificacao.js";
import { GerenciadorConexao } from "./conexao.js";

interface LinhaResultadoSoftwareSql {
  id: string;
  codigo_referencia: string;
  modulo_origem: string;
  entrega_valor_codigo: string;
  versao_artefato: string;
  descricao: string;
  declarado_por: string;
  registrado_em: string | Date;
}

interface LinhaCriterioVerificavelSql {
  id: string;
  codigo: string;
  resultado_software_id: string;
  origem_normativa: string;
  descricao_comportamento: string;
  metodo_observacao: string;
  condicao_satisfacao: string;
  limites_ou_tolerancias: string | null;
  criado_em: string | Date;
}

interface LinhaEvidenciaVerificacaoSql {
  id: string;
  criterio_id: string;
  procedimento_executado: string;
  resultado_observado: string;
  dados_detalhados: any;
  sucesso: boolean;
  coletado_por: string;
  coletado_em: string | Date;
}

interface LinhaLaudoVerificacaoSql {
  id: string;
  resultado_software_id: string;
  criterio_id: string;
  conclusao: string;
  fundamentacao_tecnica: string;
  evidencias_utilizadas: any;
  divergencias_apontadas: string | null;
  emitido_por: string;
  emitido_em: string | Date;
}

/**
 * Adaptador de repositório concreto para Verificação do Resultado de Software em PostgreSQL.
 * Implementa persistência relacional transacional com integridade referencial,
 * campos JSONB e total conformidade com a migração 007 e suporte tanto a PostgreSQL quanto pg-mem.
 */
export class RepositorioVerificacaoPostgres implements RepositorioVerificacao {
  private conexao: GerenciadorConexao;

  constructor(conexao: GerenciadorConexao) {
    this.conexao = conexao;
  }

  // ==========================================
  // 1. Resultados de Software
  // ==========================================

  public async salvarResultado(resultado: ResultadoSoftware): Promise<void> {
    await this.conexao.transacao(async (cliente) => {
      const sql = `
        INSERT INTO resultados_software (
          id, codigo_referencia, modulo_origem, entrega_valor_codigo,
          versao_artefato, descricao, declarado_por, registrado_em
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        )
        ON CONFLICT (id) DO UPDATE SET
          codigo_referencia = EXCLUDED.codigo_referencia,
          modulo_origem = EXCLUDED.modulo_origem,
          entrega_valor_codigo = EXCLUDED.entrega_valor_codigo,
          versao_artefato = EXCLUDED.versao_artefato,
          descricao = EXCLUDED.descricao,
          declarado_por = EXCLUDED.declarado_por,
          registrado_em = EXCLUDED.registrado_em;
      `.trim();

      await cliente.query(sql, [
        resultado.id,
        resultado.codigoReferencia,
        resultado.moduloOrigem,
        resultado.entregaValorCodigo,
        resultado.versaoArtefato,
        resultado.descricao,
        resultado.declaradoPor,
        resultado.registradoEm,
      ]);
    });
  }

  public async obterResultadoPorId(id: string): Promise<ResultadoSoftware | null> {
    const sql = `
      SELECT id, codigo_referencia, modulo_origem, entrega_valor_codigo,
             versao_artefato, descricao, declarado_por, registrado_em
      FROM resultados_software
      WHERE id = $1;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaResultadoSoftwareSql>(sql, [id]);
    const linha = resultado.rows[0];
    if (!linha) return null;

    return this.converterLinhaParaResultado(linha);
  }

  public async obterResultadoPorCodigo(codigoReferencia: string): Promise<ResultadoSoftware | null> {
    const sql = `
      SELECT id, codigo_referencia, modulo_origem, entrega_valor_codigo,
             versao_artefato, descricao, declarado_por, registrado_em
      FROM resultados_software
      WHERE UPPER(codigo_referencia) = UPPER($1);
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaResultadoSoftwareSql>(sql, [
      codigoReferencia.trim(),
    ]);
    const linha = resultado.rows[0];
    if (!linha) return null;

    return this.converterLinhaParaResultado(linha);
  }

  public async listarResultados(filtros?: {
    moduloOrigem?: string;
    entregaValorCodigo?: string;
  }): Promise<ResultadoSoftware[]> {
    const condicoes: string[] = [];
    const params: any[] = [];

    if (filtros?.moduloOrigem) {
      params.push(filtros.moduloOrigem.trim());
      condicoes.push(`UPPER(modulo_origem) = UPPER($${params.length})`);
    }

    if (filtros?.entregaValorCodigo) {
      params.push(filtros.entregaValorCodigo.trim());
      condicoes.push(`UPPER(entrega_valor_codigo) = UPPER($${params.length})`);
    }

    const where = condicoes.length > 0 ? `WHERE ${condicoes.join(" AND ")}` : "";
    const sql = `
      SELECT id, codigo_referencia, modulo_origem, entrega_valor_codigo,
             versao_artefato, descricao, declarado_por, registrado_em
      FROM resultados_software
      ${where}
      ORDER BY registrado_em DESC;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaResultadoSoftwareSql>(sql, params);
    return resultado.rows.map((l) => this.converterLinhaParaResultado(l));
  }

  // ==========================================
  // 2. Critérios Verificáveis
  // ==========================================

  public async salvarCriterio(criterio: CriterioVerificavel): Promise<void> {
    await this.conexao.transacao(async (cliente) => {
      // Validar existência da FK resultado_software_id
      const checkRes = await cliente.query("SELECT id FROM resultados_software WHERE id = $1", [
        criterio.resultadoSoftwareId,
      ]);
      if (checkRes.rowCount === 0) {
        throw new Error(
          `Não é possível salvar critério: Resultado de Software '${criterio.resultadoSoftwareId}' não existe.`
        );
      }

      const sql = `
        INSERT INTO criterios_verificaveis (
          id, codigo, resultado_software_id, origem_normativa, descricao_comportamento,
          metodo_observacao, condicao_satisfacao, limites_ou_tolerancias, criado_em
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
        ON CONFLICT (id) DO UPDATE SET
          codigo = EXCLUDED.codigo,
          resultado_software_id = EXCLUDED.resultado_software_id,
          origem_normativa = EXCLUDED.origem_normativa,
          descricao_comportamento = EXCLUDED.descricao_comportamento,
          metodo_observacao = EXCLUDED.metodo_observacao,
          condicao_satisfacao = EXCLUDED.condicao_satisfacao,
          limites_ou_tolerancias = EXCLUDED.limites_ou_tolerancias,
          criado_em = EXCLUDED.criado_em;
      `.trim();

      await cliente.query(sql, [
        criterio.id,
        criterio.codigo,
        criterio.resultadoSoftwareId,
        criterio.origemNormativa,
        criterio.descricaoComportamento,
        criterio.metodoObservacao,
        criterio.condicaoSatisfacao,
        criterio.limitesOuTolerancias,
        criterio.criadoEm,
      ]);
    });
  }

  public async obterCriterioPorId(id: string): Promise<CriterioVerificavel | null> {
    const sql = `
      SELECT id, codigo, resultado_software_id, origem_normativa, descricao_comportamento,
             metodo_observacao, condicao_satisfacao, limites_ou_tolerancias, criado_em
      FROM criterios_verificaveis
      WHERE id = $1;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaCriterioVerificavelSql>(sql, [id]);
    const linha = resultado.rows[0];
    if (!linha) return null;

    return this.converterLinhaParaCriterio(linha);
  }

  public async obterCriterioPorCodigo(codigo: string): Promise<CriterioVerificavel | null> {
    const sql = `
      SELECT id, codigo, resultado_software_id, origem_normativa, descricao_comportamento,
             metodo_observacao, condicao_satisfacao, limites_ou_tolerancias, criado_em
      FROM criterios_verificaveis
      WHERE UPPER(codigo) = UPPER($1);
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaCriterioVerificavelSql>(sql, [
      codigo.trim(),
    ]);
    const linha = resultado.rows[0];
    if (!linha) return null;

    return this.converterLinhaParaCriterio(linha);
  }

  public async listarCriteriosPorResultado(
    resultadoSoftwareId: string
  ): Promise<CriterioVerificavel[]> {
    const sql = `
      SELECT id, codigo, resultado_software_id, origem_normativa, descricao_comportamento,
             metodo_observacao, condicao_satisfacao, limites_ou_tolerancias, criado_em
      FROM criterios_verificaveis
      WHERE resultado_software_id = $1
      ORDER BY criado_em ASC;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaCriterioVerificavelSql>(sql, [
      resultadoSoftwareId,
    ]);
    return resultado.rows.map((l) => this.converterLinhaParaCriterio(l));
  }

  public async listarTodosCriterios(): Promise<CriterioVerificavel[]> {
    const sql = `
      SELECT id, codigo, resultado_software_id, origem_normativa, descricao_comportamento,
             metodo_observacao, condicao_satisfacao, limites_ou_tolerancias, criado_em
      FROM criterios_verificaveis
      ORDER BY criado_em ASC;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaCriterioVerificavelSql>(sql);
    return resultado.rows.map((l) => this.converterLinhaParaCriterio(l));
  }

  // ==========================================
  // 3. Evidências de Verificação
  // ==========================================

  public async salvarEvidencia(evidencia: EvidenciaVerificacao): Promise<void> {
    await this.conexao.transacao(async (cliente) => {
      // Validar existência da FK criterio_id
      const checkCrit = await cliente.query("SELECT id FROM criterios_verificaveis WHERE id = $1", [
        evidencia.criterioId,
      ]);
      if (checkCrit.rowCount === 0) {
        throw new Error(
          `Não é possível salvar evidência: Critério Verificável '${evidencia.criterioId}' não existe.`
        );
      }

      const sql = `
        INSERT INTO evidencias_verificacao (
          id, criterio_id, procedimento_executado, resultado_observado,
          dados_detalhados, sucesso, coletado_por, coletado_em
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        )
        ON CONFLICT (id) DO UPDATE SET
          criterio_id = EXCLUDED.criterio_id,
          procedimento_executado = EXCLUDED.procedimento_executado,
          resultado_observado = EXCLUDED.resultado_observado,
          dados_detalhados = EXCLUDED.dados_detalhados,
          sucesso = EXCLUDED.sucesso,
          coletado_por = EXCLUDED.coletado_por,
          coletado_em = EXCLUDED.coletado_em;
      `.trim();

      await cliente.query(sql, [
        evidencia.id,
        evidencia.criterioId,
        evidencia.procedimentoExecutado,
        evidencia.resultadoObservado,
        JSON.stringify(evidencia.dadosDetalhados),
        evidencia.sucesso,
        evidencia.coletadoPor,
        evidencia.coletadoEm,
      ]);
    });
  }

  public async obterEvidenciaPorId(id: string): Promise<EvidenciaVerificacao | null> {
    const sql = `
      SELECT id, criterio_id, procedimento_executado, resultado_observado,
             dados_detalhados, sucesso, coletado_por, coletado_em
      FROM evidencias_verificacao
      WHERE id = $1;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaEvidenciaVerificacaoSql>(sql, [id]);
    const linha = resultado.rows[0];
    if (!linha) return null;

    return this.converterLinhaParaEvidencia(linha);
  }

  public async listarEvidenciasPorCriterio(criterioId: string): Promise<EvidenciaVerificacao[]> {
    const sql = `
      SELECT id, criterio_id, procedimento_executado, resultado_observado,
             dados_detalhados, sucesso, coletado_por, coletado_em
      FROM evidencias_verificacao
      WHERE criterio_id = $1
      ORDER BY coletado_em ASC;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaEvidenciaVerificacaoSql>(sql, [
      criterioId,
    ]);
    return resultado.rows.map((l) => this.converterLinhaParaEvidencia(l));
  }

  public async listarEvidenciasPorResultado(
    resultadoSoftwareId: string
  ): Promise<EvidenciaVerificacao[]> {
    const sql = `
      SELECT ev.id, ev.criterio_id, ev.procedimento_executado, ev.resultado_observado,
             ev.dados_detalhados, ev.sucesso, ev.coletado_por, ev.coletado_em
      FROM evidencias_verificacao ev
      JOIN criterios_verificaveis cv ON cv.id = ev.criterio_id
      WHERE cv.resultado_software_id = $1
      ORDER BY ev.coletado_em ASC;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaEvidenciaVerificacaoSql>(sql, [
      resultadoSoftwareId,
    ]);
    return resultado.rows.map((l) => this.converterLinhaParaEvidencia(l));
  }

  // ==========================================
  // 4. Laudos Técnicos de Verificação
  // ==========================================

  public async salvarLaudo(laudo: LaudoVerificacao): Promise<void> {
    await this.conexao.transacao(async (cliente) => {
      // Validar existência da FK resultado_software_id
      const checkRes = await cliente.query("SELECT id FROM resultados_software WHERE id = $1", [
        laudo.resultadoSoftwareId,
      ]);
      if (checkRes.rowCount === 0) {
        throw new Error(
          `Não é possível salvar laudo: Resultado de Software '${laudo.resultadoSoftwareId}' não existe.`
        );
      }

      // Validar existência da FK criterio_id
      const checkCrit = await cliente.query("SELECT id FROM criterios_verificaveis WHERE id = $1", [
        laudo.criterioId,
      ]);
      if (checkCrit.rowCount === 0) {
        throw new Error(
          `Não é possível salvar laudo: Critério Verificável '${laudo.criterioId}' não existe.`
        );
      }

      const sql = `
        INSERT INTO laudos_verificacao (
          id, resultado_software_id, criterio_id, conclusao, fundamentacao_tecnica,
          evidencias_utilizadas, divergencias_apontadas, emitido_por, emitido_em
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
        ON CONFLICT (resultado_software_id, criterio_id) DO UPDATE SET
          conclusao = EXCLUDED.conclusao,
          fundamentacao_tecnica = EXCLUDED.fundamentacao_tecnica,
          evidencias_utilizadas = EXCLUDED.evidencias_utilizadas,
          divergencias_apontadas = EXCLUDED.divergencias_apontadas,
          emitido_por = EXCLUDED.emitido_por,
          emitido_em = EXCLUDED.emitido_em;
      `.trim();

      await cliente.query(sql, [
        laudo.id,
        laudo.resultadoSoftwareId,
        laudo.criterioId,
        laudo.conclusao,
        laudo.fundamentacaoTecnica,
        JSON.stringify(laudo.evidenciasUtilizadas),
        laudo.divergenciasApontadas,
        laudo.emitidoPor,
        laudo.emitidoEm,
      ]);
    });
  }

  public async obterLaudoPorId(id: string): Promise<LaudoVerificacao | null> {
    const sql = `
      SELECT id, resultado_software_id, criterio_id, conclusao, fundamentacao_tecnica,
             evidencias_utilizadas, divergencias_apontadas, emitido_por, emitido_em
      FROM laudos_verificacao
      WHERE id = $1;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaLaudoVerificacaoSql>(sql, [id]);
    const linha = resultado.rows[0];
    if (!linha) return null;

    return this.converterLinhaParaLaudo(linha);
  }

  public async obterLaudoPorResultadoECriterio(
    resultadoSoftwareId: string,
    criterioId: string
  ): Promise<LaudoVerificacao | null> {
    const sql = `
      SELECT id, resultado_software_id, criterio_id, conclusao, fundamentacao_tecnica,
             evidencias_utilizadas, divergencias_apontadas, emitido_por, emitido_em
      FROM laudos_verificacao
      WHERE resultado_software_id = $1 AND criterio_id = $2;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaLaudoVerificacaoSql>(sql, [
      resultadoSoftwareId,
      criterioId,
    ]);
    const linha = resultado.rows[0];
    if (!linha) return null;

    return this.converterLinhaParaLaudo(linha);
  }

  public async listarLaudosPorResultado(
    resultadoSoftwareId: string
  ): Promise<LaudoVerificacao[]> {
    const sql = `
      SELECT id, resultado_software_id, criterio_id, conclusao, fundamentacao_tecnica,
             evidencias_utilizadas, divergencias_apontadas, emitido_por, emitido_em
      FROM laudos_verificacao
      WHERE resultado_software_id = $1
      ORDER BY emitido_em ASC;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaLaudoVerificacaoSql>(sql, [
      resultadoSoftwareId,
    ]);
    return resultado.rows.map((l) => this.converterLinhaParaLaudo(l));
  }

  public async listarTodosLaudos(): Promise<LaudoVerificacao[]> {
    const sql = `
      SELECT id, resultado_software_id, criterio_id, conclusao, fundamentacao_tecnica,
             evidencias_utilizadas, divergencias_apontadas, emitido_por, emitido_em
      FROM laudos_verificacao
      ORDER BY emitido_em ASC;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaLaudoVerificacaoSql>(sql);
    return resultado.rows.map((l) => this.converterLinhaParaLaudo(l));
  }

  // ==========================================
  // Conversores privados
  // ==========================================

  private converterLinhaParaResultado(l: LinhaResultadoSoftwareSql): ResultadoSoftware {
    return new ResultadoSoftware({
      id: l.id,
      codigoReferencia: l.codigo_referencia,
      moduloOrigem: l.modulo_origem,
      entregaValorCodigo: l.entrega_valor_codigo,
      versaoArtefato: l.versao_artefato,
      descricao: l.descricao,
      declaradoPor: l.declarado_por,
      registradoEm: typeof l.registrado_em === "string" ? new Date(l.registrado_em) : l.registrado_em,
    });
  }

  private converterLinhaParaCriterio(l: LinhaCriterioVerificavelSql): CriterioVerificavel {
    return new CriterioVerificavel({
      id: l.id,
      codigo: l.codigo,
      resultadoSoftwareId: l.resultado_software_id,
      origemNormativa: l.origem_normativa,
      descricaoComportamento: l.descricao_comportamento,
      metodoObservacao: l.metodo_observacao as MetodoObservacao,
      condicaoSatisfacao: l.condicao_satisfacao,
      limitesOuTolerancias: l.limites_ou_tolerancias,
      criadoEm: typeof l.criado_em === "string" ? new Date(l.criado_em) : l.criado_em,
    });
  }

  private converterLinhaParaEvidencia(l: LinhaEvidenciaVerificacaoSql): EvidenciaVerificacao {
    let dadosDetalhadosObj: Record<string, unknown> = {};
    if (typeof l.dados_detalhados === "string") {
      try {
        dadosDetalhadosObj = JSON.parse(l.dados_detalhados);
      } catch {
        dadosDetalhadosObj = {};
      }
    } else if (typeof l.dados_detalhados === "object" && l.dados_detalhados !== null) {
      dadosDetalhadosObj = l.dados_detalhados;
    }

    return new EvidenciaVerificacao({
      id: l.id,
      criterioId: l.criterio_id,
      procedimentoExecutado: l.procedimento_executado,
      resultadoObservado: l.resultado_observado,
      dadosDetalhados: dadosDetalhadosObj,
      sucesso: Boolean(l.sucesso),
      coletadoPor: l.coletado_por,
      coletadoEm: typeof l.coletado_em === "string" ? new Date(l.coletado_em) : l.coletado_em,
    });
  }

  private converterLinhaParaLaudo(l: LinhaLaudoVerificacaoSql): LaudoVerificacao {
    let evidenciasArr: string[] = [];
    if (typeof l.evidencias_utilizadas === "string") {
      try {
        evidenciasArr = JSON.parse(l.evidencias_utilizadas);
      } catch {
        evidenciasArr = [];
      }
    } else if (Array.isArray(l.evidencias_utilizadas)) {
      evidenciasArr = l.evidencias_utilizadas;
    }

    return new LaudoVerificacao({
      id: l.id,
      resultadoSoftwareId: l.resultado_software_id,
      criterioId: l.criterio_id,
      conclusao: l.conclusao as ConclusaoVerificacao,
      fundamentacaoTecnica: l.fundamentacao_tecnica,
      evidenciasUtilizadas: evidenciasArr,
      divergenciasApontadas: l.divergencias_apontadas,
      emitidoPor: l.emitido_por,
      emitidoEm: typeof l.emitido_em === "string" ? new Date(l.emitido_em) : l.emitido_em,
    });
  }
}
