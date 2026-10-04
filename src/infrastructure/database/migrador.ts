import fs from "node:fs/promises";
import path from "node:path";
import type { GerenciadorConexao } from "./conexao.js";

export interface ResultadoMigracao {
  versao: string;
  nome: string;
  sucesso: boolean;
  erro?: string;
}

export class ExecutorMigracoes {
  private gerenciadorConexao: GerenciadorConexao;
  private diretorioMigracoes: string;

  constructor(gerenciadorConexao: GerenciadorConexao, diretorioMigracoes?: string) {
    this.gerenciadorConexao = gerenciadorConexao;
    this.diretorioMigracoes = diretorioMigracoes ?? path.resolve(process.cwd(), "migrations");
  }

  public async inicializarTabelaControle(): Promise<void> {
    const ddl = `
      CREATE TABLE IF NOT EXISTS migracoes_executadas (
        versao VARCHAR(64),
        nome VARCHAR(255),
        executada_em TIMESTAMPTZ
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_migracoes_versao ON migracoes_executadas(versao);
    `.trim();
    await this.gerenciadorConexao.executarConsulta(ddl);
  }

  public async obterMigracoesExecutadas(): Promise<string[]> {
    await this.inicializarTabelaControle();
    const res = await this.gerenciadorConexao.executarConsulta<{ versao: string }>(
      "SELECT versao FROM migracoes_executadas ORDER BY versao ASC"
    );
    return res.rows.map((r) => r.versao);
  }

  public async executarMigracoes(): Promise<ResultadoMigracao[]> {
    await this.inicializarTabelaControle();
    const executadas = await this.obterMigracoesExecutadas();
    const arquivos = await fs.readdir(this.diretorioMigracoes);
    const arquivosSql = arquivos
      .filter((arq) => arq.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b));

    const resultados: ResultadoMigracao[] = [];

    for (const arquivo of arquivosSql) {
      const versao = arquivo.split("_")[0] ?? arquivo;
      if (executadas.includes(versao)) {
        continue;
      }

      const caminhoArquivo = path.join(this.diretorioMigracoes, arquivo);
      const conteudoSql = await fs.readFile(caminhoArquivo, "utf-8");

      try {
        await this.gerenciadorConexao.transacao(async (cliente) => {
          await cliente.query(conteudoSql);
          await cliente.query(
            "INSERT INTO migracoes_executadas (versao, nome, executada_em) VALUES ($1, $2, now())",
            [versao, arquivo]
          );
        });

        resultados.push({
          versao,
          nome: arquivo,
          sucesso: true
        });
      } catch (erro) {
        const mensagemErro = erro instanceof Error ? erro.message : String(erro);
        resultados.push({
          versao,
          nome: arquivo,
          sucesso: false,
          erro: mensagemErro
        });
        throw new Error(
          `Falha ao executar migração ${arquivo} (versão ${versao}): ${mensagemErro}`
        );
      }
    }

    return resultados;
  }
}
