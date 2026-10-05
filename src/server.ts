import http from "node:http";
import { newDb } from "pg-mem";
import { carregarConfiguracao } from "./config/ambiente.js";
import { GerenciadorConexao } from "./infrastructure/database/conexao.js";
import { ExecutorMigracoes } from "./infrastructure/database/migrador.js";
import { RepositorioNecessidadePostgres } from "./infrastructure/database/repositorio-postgres.js";
import { RepositorioNecessidadeMemoria } from "./infrastructure/database/repositorio-memoria.js";
import { RepositorioNecessidade } from "./domain/repositorio-necessidade.js";
import { RepositorioProjetoPostgres } from "./infrastructure/database/repositorio-projeto-postgres.js";
import { RepositorioProjetoMemoria } from "./infrastructure/database/repositorio-projeto-memoria.js";
import { RepositorioProjeto } from "./domain/repositorio-projeto.js";
import { RepositorioCoordenacao } from "./domain/repositorio-coordenacao.js";
import { RepositorioCoordenacaoPostgres } from "./infrastructure/database/repositorio-coordenacao-postgres.js";
import { RepositorioCoordenacaoMemoria } from "./infrastructure/database/repositorio-coordenacao-memoria.js";
import { RepositorioContexto } from "./domain/repositorio-contexto.js";
import { RepositorioContextoPostgres } from "./infrastructure/database/repositorio-contexto-postgres.js";
import { RepositorioContextoMemoria } from "./infrastructure/database/repositorio-contexto-memoria.js";
import { RepositorioVerificacao } from "./domain/repositorio-verificacao.js";
import { RepositorioVerificacaoPostgres } from "./infrastructure/database/repositorio-verificacao-postgres.js";
import { RepositorioVerificacaoMemoria } from "./infrastructure/database/repositorio-verificacao-memoria.js";
import { ServicoAplicacaoProjeto } from "./application/servico-aplicacao-projeto.js";
import { ServicoAplicacaoCoordenacao } from "./application/servico-aplicacao-coordenacao.js";
import { ServicoContexto } from "./application/servico-contexto.js";
import { ServicoVerificacao } from "./application/servico-verificacao.js";
import { AdaptadorAutenticacaoOwner } from "./infrastructure/adapters/autenticacao-owner.js";
import {
  AdaptadorIntegracaoProjeto,
  AdaptadorIntegracaoContexto,
} from "./infrastructure/adapters/integracao-modulos.js";
import {
  FilaTarefas,
  FilaTarefasMemoria,
  FilaTarefasPostgres,
} from "./infrastructure/adapters/fila-tarefas.js";
import { WorkerSegundoPlano } from "./worker/worker-segundo-plano.js";
import { criarServidorWeb } from "./web/servidor-web.js";
import { Necessidade } from "./domain/necessidade.js";
import {
  TipoNecessidade,
  TipoResultadoProcesso,
  DecisaoMaterialOwner,
  AtorCompetenteNecessidade,
} from "./domain/tipos.js";
import { ServicoCompromissoNecessidade } from "./domain/servico-compromisso.js";

/**
 * Semeia a Necessidade canônica N-001 se o repositório estiver vazio.
 */
async function semearDadosIniciais(repositorio: RepositorioNecessidade): Promise<void> {
  const existente = await repositorio.obterPorCodigo("N-001");
  if (existente) {
    return;
  }

  const n001 = new Necessidade({
    id: "nec-n001-naamive",
    codigo: "N-001",
    titulo: "Conduzir necessidades de negócio até software entregue sem depender de coordenação manual contínua",
    tipo: TipoNecessidade.NOVO_PRODUTO,
    problemaOuOportunidade:
      "O desenvolvimento de software apoiado por inteligência artificial ainda depende excessivamente de intervenção humana para preservar contexto, organizar trabalho, determinar o próximo passo, escolher quem deve executar uma atividade, identificar se o trabalho está realmente preparado, manter continuidade entre agentes e etapas, preservar decisões importantes e evitar a reconstrução manual do histórico.",
    quemEAfetado:
      "Pessoas que desenvolvem software com apoio de inteligência artificial, equipes com agentes, responsáveis por produto/negócio, desenvolvedores, revisores e homologadores.",
    resultadoPretendido:
      "Uma pessoa ou equipe deve conseguir apresentar uma necessidade de negócio e conduzi-la até um resultado de software verificável, com estado transparente e sem necessidade de reconstrução manual de contexto.",
    escopoInicial:
      "Registro, formação e avaliação da Necessidade; compromisso humano e criação de Projeto; decomposição e atribuição de trabalho executável; preservação de contexto; decisões humanas; acompanhamento; e rastreabilidade até resultado verificável.",
    foraDeEscopo:
      "Substituir todas as ferramentas de desenvolvimento, administrar todo trabalho corporativo, eliminar pessoas, automatizar decisões materiais, escala ilimitada, todas as integrações, todos os cenários de grandes organizações e funcionalidades futuras incorporadas automaticamente ao mesmo Projeto.",
    criterioDeAtendimento:
      "Dado um trabalho declarado pronto, deve ser possível delegá-lo por meio de uma instrução simples, sem que uma pessoa precise reconstruir manualmente todo o contexto necessário para sua execução.",
    porQueIssoImporta:
      "O NAAMIVE pretende permitir o crescimento do uso de inteligência artificial sem crescimento proporcional da coordenação manual.",
    restricoesOuDependencias:
      "Decisões materiais continuam exigindo autoridade adequada. Agentes devem atuar conforme suas competências. Estado e histórico separados.",
    origem:
      "Experiência prática com desenvolvimento apoiado por inteligência artificial e necessidade de coordenação autônoma.",
  });

  // Registra parecer de auditoria
  n001.registrarResultadoProcesso(
    AtorCompetenteNecessidade.AUDITOR_NECESSIDADE,
    TipoResultadoProcesso.QUALIFICAVEL,
    { origem: "Bootstrap Seed Inicial" }
  );

  // Avança para qualificação
  n001.avancarParaQualificacao(AtorCompetenteNecessidade.ESPECIALISTA_FORMACAO);

  // Registra recomendação de qualificação
  n001.registrarResultadoProcesso(
    AtorCompetenteNecessidade.ESPECIALISTA_QUALIFICACAO,
    TipoResultadoProcesso.ASSUMIR_COMPROMISSO,
    { origem: "Bootstrap Seed Inicial" }
  );

  // Submete para decisão do Owner
  n001.submeterParaDecisao(AtorCompetenteNecessidade.ESPECIALISTA_QUALIFICACAO);

  // Registra decisão material do Owner (usuário mhj)
  n001.registrarDecisaoOwner(
    DecisaoMaterialOwner.APROVADO,
    "mhj",
    "Aprovado conforme formação e qualificação com valor e prioridade altos."
  );

  // Consolida o Compromisso da Necessidade
  ServicoCompromissoNecessidade.compor(n001);

  // Materializa e vincula o Projeto 1:1 (P-001)
  n001.confirmarMaterializacaoProjeto("5575efa1-c68e-464f-8393-07be8c9bc93a");

  await repositorio.salvar(n001);
  console.log("[NAAMIVE Bootstrap] Necessidade canônica N-001 semeada com sucesso.");
}

/**
 * Inicializa os adaptadores de persistência e fila com fallback automático.
 */
async function inicializarInfraestrutura(config: ReturnType<typeof carregarConfiguracao>): Promise<{
  repositorio: RepositorioNecessidade;
  repositorioProjeto: RepositorioProjeto;
  repositorioCoordenacao: RepositorioCoordenacao;
  repositorioContexto: RepositorioContexto;
  repositorioVerificacao: RepositorioVerificacao;
  filaTarefas: FilaTarefas;
  tipoPersistencia: "postgres" | "pg-mem" | "memoria";
}> {
  // Tentativa 1: PostgreSQL Real (se DATABASE_URL ou configuração explícita estiver ativa)
  if (config.bancoDados.url || (config.bancoDados.host && config.bancoDados.host !== "127.0.0.1")) {
    try {
      const conexao = new GerenciadorConexao(config.bancoDados);
      // Testa consulta simples com timeout
      await Promise.race([
        conexao.executarConsulta("SELECT 1"),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout de conexão")), 2000)),
      ]);

      const executor = new ExecutorMigracoes(conexao);
      await executor.executarMigracoes();

      const repositorio = new RepositorioNecessidadePostgres(conexao);
      const repositorioProjeto = new RepositorioProjetoPostgres(conexao);
      const repositorioCoordenacao = new RepositorioCoordenacaoPostgres(conexao);
      const repositorioContexto = new RepositorioContextoPostgres(conexao);
      const repositorioVerificacao = new RepositorioVerificacaoPostgres(conexao);
      const filaTarefas = new FilaTarefasPostgres(conexao);
      return {
        repositorio,
        repositorioProjeto,
        repositorioCoordenacao,
        repositorioContexto,
        repositorioVerificacao,
        filaTarefas,
        tipoPersistencia: "postgres",
      };
    } catch (err: any) {
      console.warn(`[NAAMIVE Bootstrap] PostgreSQL externo indisponível (${err.message}). Utilizando emulador relacional pg-mem.`);
    }
  }

  // Tentativa 2: Emulador Relacional PostgreSQL completo via pg-mem
  try {
    const dbMem = newDb();
    let backup: any = null;
    const origQuery = dbMem.public.query.bind(dbMem.public);
    (dbMem.public as any).query = function (text: any) {
      if (typeof text === "string") {
        const trimmed = text.trim().toUpperCase();
        if (trimmed === "BEGIN") {
          backup = dbMem.backup();
          return { rows: [], rowCount: 0, command: "BEGIN", fields: [], location: null as any };
        }
        if (trimmed === "ROLLBACK") {
          if (backup) {
            backup.restore();
            backup = null;
          }
          return { rows: [], rowCount: 0, command: "ROLLBACK", fields: [], location: null as any };
        }
        if (trimmed === "COMMIT") {
          backup = null;
          return { rows: [], rowCount: 0, command: "COMMIT", fields: [], location: null as any };
        }
      }
      return origQuery(text);
    };

    const { Pool } = dbMem.adapters.createPg();
    const pgPool = new Pool();
    const conexaoMem = new GerenciadorConexao(undefined, pgPool);

    const executor = new ExecutorMigracoes(conexaoMem);
    await executor.executarMigracoes();

    const repositorio = new RepositorioNecessidadePostgres(conexaoMem);
    const repositorioProjeto = new RepositorioProjetoPostgres(conexaoMem);
    const repositorioCoordenacao = new RepositorioCoordenacaoPostgres(conexaoMem);
    const repositorioContexto = new RepositorioContextoPostgres(conexaoMem);
    const repositorioVerificacao = new RepositorioVerificacaoPostgres(conexaoMem);
    const filaTarefas = new FilaTarefasPostgres(conexaoMem);
    return {
      repositorio,
      repositorioProjeto,
      repositorioCoordenacao,
      repositorioContexto,
      repositorioVerificacao,
      filaTarefas,
      tipoPersistencia: "pg-mem",
    };
  } catch (err: any) {
    console.warn(`[NAAMIVE Bootstrap] Falha ao inicializar pg-mem (${err.message}). Utilizando repositório em memória nativo.`);
    const repositorio = new RepositorioNecessidadeMemoria();
    const repositorioProjeto = new RepositorioProjetoMemoria();
    const repositorioCoordenacao = new RepositorioCoordenacaoMemoria();
    const repositorioContexto = new RepositorioContextoMemoria();
    const repositorioVerificacao = new RepositorioVerificacaoMemoria();
    const filaTarefas = new FilaTarefasMemoria();
    return {
      repositorio,
      repositorioProjeto,
      repositorioCoordenacao,
      repositorioContexto,
      repositorioVerificacao,
      filaTarefas,
      tipoPersistencia: "memoria",
    };
  }
}

/**
 * Inicia o servidor HTTP tentando a porta solicitada e incrementando caso haja conflito (EADDRINUSE).
 */
function iniciarServidorComFallback(
  servidor: http.Server,
  portaInicial: number,
  maxTentativas: number = 10
): Promise<number> {
  return new Promise((resolve, reject) => {
    let portaAtual = portaInicial;
    let tentativas = 0;

    const tentarEscutar = () => {
      servidor.once("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          tentativas++;
          console.warn(`[NAAMIVE Bootstrap] Porta ${portaAtual} já está em uso.`);
          if (tentativas < maxTentativas) {
            portaAtual++;
            console.log(`[NAAMIVE Bootstrap] Tentando fallback para a porta ${portaAtual}...`);
            tentarEscutar();
          } else {
            reject(new Error(`Não foi possível alocar uma porta livre após ${maxTentativas} tentativas.`));
          }
        } else {
          reject(err);
        }
      });

      servidor.listen(portaAtual, "0.0.0.0", () => {
        resolve(portaAtual);
      });
    };

    tentarEscutar();
  });
}

/**
 * Função principal de bootstrap do NAAMIVE.
 */
export async function iniciarSistema(): Promise<{
  servidor: http.Server;
  worker: WorkerSegundoPlano;
  portaAlocada: number;
}> {
  console.log("=================================================");
  console.log("   NAAMIVE — Bootstrap Operacional do Sistema    ");
  console.log("=================================================");

  const config = carregarConfiguracao();
  const portaPretendida = config.porta;

  // 1. Inicializa persistência e fila
  const {
    repositorio,
    repositorioProjeto,
    repositorioCoordenacao,
    repositorioContexto,
    repositorioVerificacao,
    filaTarefas,
    tipoPersistencia,
  } = await inicializarInfraestrutura(config);
  console.log(`[NAAMIVE Bootstrap] Persistência ativa: [${tipoPersistencia.toUpperCase()}]`);

  // 2. Semeia Necessidade N-001 canônica
  await semearDadosIniciais(repositorio);

  // 3. Inicializa serviços de aplicação de projeto, coordenação, contexto e verificação, adaptadores e integrações
  const servicoProjeto = new ServicoAplicacaoProjeto(repositorioProjeto, repositorio);
  const servicoCoordenacao = new ServicoAplicacaoCoordenacao(
    repositorioCoordenacao,
    repositorioProjeto,
    filaTarefas
  );
  const servicoContexto = new ServicoContexto(repositorioContexto, undefined, filaTarefas);
  const autenticacaoOwner = new AdaptadorAutenticacaoOwner(["mhj", "owner"]);
  const portaProjeto = new AdaptadorIntegracaoProjeto(servicoProjeto);
  const portaContexto = new AdaptadorIntegracaoContexto();
  const servicoVerificacao = new ServicoVerificacao(
    repositorioVerificacao,
    undefined,
    portaContexto,
    filaTarefas
  );

  // 4. Inicializa o Worker de background desacoplado
  const worker = new WorkerSegundoPlano(
    filaTarefas,
    repositorio,
    portaProjeto,
    portaContexto,
    { intervaloPollingMs: 250 },
    servicoCoordenacao,
    servicoContexto,
    servicoVerificacao
  );
  worker.iniciar();
  console.log("[NAAMIVE Bootstrap] Worker em background iniciado com sucesso.");

  // 5. Instancia a aplicação HTTP responsiva
  const servidor = criarServidorWeb({
    repositorio,
    autenticacaoOwner,
    portaProjeto,
    portaContexto,
    filaTarefas,
    servicoProjeto,
    repositorioProjeto,
    servicoCoordenacao,
    repositorioCoordenacao,
    servicoContexto,
    repositorioContexto,
  });

  // 6. Inicia o servidor HTTP com resiliência a conflitos de portas
  const portaAlocada = await iniciarServidorComFallback(servidor, portaPretendida);
  console.log(`[NAAMIVE Bootstrap] Servidor web escutando em: http://localhost:${portaAlocada}`);
  console.log(`[NAAMIVE Bootstrap] Condução pronta. Pressione Ctrl+C para encerrar.`);
  console.log("=================================================");

  // Encerramento gracioso
  const desligamento = async () => {
    console.log("\n[NAAMIVE Bootstrap] Encerrando graciosamente o sistema...");
    await worker.parar();
    await new Promise<void>((resolve) => servidor.close(() => resolve()));
    console.log("[NAAMIVE Bootstrap] Sistema encerrado com sucesso.");
    process.exit(0);
  };

  process.on("SIGINT", desligamento);
  process.on("SIGTERM", desligamento);

  return { servidor, worker, portaAlocada };
}

// Execução direta via Node CLI
if (process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  iniciarSistema().catch((err) => {
    console.error("[NAAMIVE Bootstrap] Erro fatal durante a inicialização:", err);
    process.exit(1);
  });
}
