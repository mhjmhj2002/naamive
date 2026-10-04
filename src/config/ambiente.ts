import dotenv from "dotenv";

dotenv.config();

export interface ConfiguracaoBancoDados {
  url?: string | undefined;
  host?: string | undefined;
  port?: number | undefined;
  database?: string | undefined;
  user?: string | undefined;
  password?: string | undefined;
  maxConexoes?: number | undefined;
}

export interface ConfiguracaoAplicacao {
  ambiente: string;
  porta: number;
  bancoDados: ConfiguracaoBancoDados;
}

export function carregarConfiguracao(): ConfiguracaoAplicacao {
  const ambiente = process.env["NODE_ENV"] ?? "development";
  const porta = parseInt(process.env["PORT"] ?? "3001", 10);
  const databaseUrl = process.env["DATABASE_URL"];

  return {
    ambiente,
    porta: isNaN(porta) ? 3001 : porta,
    bancoDados: {
      url: databaseUrl,
      host: process.env["DB_HOST"] ?? "127.0.0.1",
      port: parseInt(process.env["DB_PORT"] ?? "5432", 10),
      database: process.env["DB_NAME"] ?? "naamive",
      user: process.env["DB_USER"] ?? "postgres",
      password: process.env["DB_PASSWORD"] ?? "",
      maxConexoes: parseInt(process.env["DB_MAX_CONNECTIONS"] ?? "10", 10)
    }
  };
}
