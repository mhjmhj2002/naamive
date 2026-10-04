import http, { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { RepositorioNecessidade } from "../domain/repositorio-necessidade.js";
import { PortaAutenticacaoOwner } from "../infrastructure/adapters/autenticacao-owner.js";
import { PortaIntegracaoProjeto, AdaptadorIntegracaoProjeto } from "../infrastructure/adapters/integracao-modulos.js";
import { PortaIntegracaoContexto } from "../infrastructure/adapters/integracao-modulos.js";
import { FilaTarefas } from "../infrastructure/adapters/fila-tarefas.js";
import { Necessidade } from "../domain/necessidade.js";
import {
  TipoNecessidade,
  TipoResultadoProcesso,
  DecisaoMaterialOwner,
  AtorCompetenteNecessidade,
} from "../domain/tipos.js";
import { ServicoCompromissoNecessidade } from "../domain/servico-compromisso.js";
import { RepositorioProjeto } from "../domain/repositorio-projeto.js";
import { ServicoAplicacaoProjeto } from "../application/servico-aplicacao-projeto.js";
import { RepositorioCoordenacao } from "../domain/repositorio-coordenacao.js";
import { ServicoAplicacaoCoordenacao } from "../application/servico-aplicacao-coordenacao.js";
import { CondicaoOperacionalTrabalho } from "../domain/tipos-coordenacao.js";
import {
  EtapaFormacaoProjeto,
  TipoResultadoProcessoProjeto,
  AtorCompetenteProjeto,
} from "../domain/tipos-projeto.js";
import { RepositorioContexto } from "../domain/repositorio-contexto.js";
import { ServicoContexto } from "../application/servico-contexto.js";
import {
  FinalidadeContexto,
} from "../domain/tipos-contexto.js";
import {
  escaparHtml,
  renderizarListaNecessidades,
  renderizarFormularioNovaNecessidade,
  renderizarDetalhesNecessidade,
  renderizarListaProjetos,
  renderizarDetalhesProjeto,
  renderizarPainelCoordenacao,
  renderizarDetalhesTrabalhoCoordenado,
  renderizarDetalheHandoff,
  renderizarPainelRastreabilidade,
  renderizarDetalhesRastreabilidade,
} from "./templates.js";

export interface DependenciasServidorWeb {
  repositorio: RepositorioNecessidade;
  autenticacaoOwner: PortaAutenticacaoOwner;
  portaProjeto: PortaIntegracaoProjeto;
  portaContexto: PortaIntegracaoContexto;
  filaTarefas?: FilaTarefas;
  servicoProjeto?: ServicoAplicacaoProjeto;
  repositorioProjeto?: RepositorioProjeto;
  servicoCoordenacao?: ServicoAplicacaoCoordenacao;
  repositorioCoordenacao?: RepositorioCoordenacao;
  servicoContexto?: ServicoContexto;
  repositorioContexto?: RepositorioContexto;
}

/**
 * Lê e decodifica o corpo da requisição HTTP (suporta application/x-www-form-urlencoded e application/json).
 */
async function extrairCorpoRequisicao(req: IncomingMessage): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    let dados = "";
    req.on("data", (chunk) => {
      dados += chunk.toString("utf-8");
    });
    req.on("end", () => {
      if (!dados) {
        return resolve({});
      }

      const contentType = req.headers["content-type"] || "";
      if (contentType.includes("application/json")) {
        try {
          resolve(JSON.parse(dados));
        } catch (e) {
          reject(new Error("JSON inválido no corpo da requisição."));
        }
      } else {
        // Assume form urlencoded
        const params = new URLSearchParams(dados);
        const obj: Record<string, any> = {};
        for (const [chave, valor] of params.entries()) {
          obj[chave] = valor;
        }
        resolve(obj);
      }
    });
    req.on("error", (err) => reject(err));
  });
}

/**
 * Envia resposta HTML.
 */
function responderHtml(res: ServerResponse, codigo: number, html: string): void {
  res.writeHead(codigo, {
    "Content-Type": "text/html; charset=utf-8",
  });
  res.end(html);
}

/**
 * Envia resposta JSON.
 */
function responderJson(res: ServerResponse, codigo: number, dados: any): void {
  res.writeHead(codigo, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(dados));
}

/**
 * Envia redirecionamento HTTP 302.
 */
function redirecionar(res: ServerResponse, urlDestino: string): void {
  res.writeHead(302, {
    Location: urlDestino,
  });
  res.end();
}

/**
 * Cria a aplicação/servidor HTTP responsivo do NAAMIVE.
 */
export function criarServidorWeb(deps: DependenciasServidorWeb): http.Server {
  const {
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
  } = deps;

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const metodo = (req.method || "GET").toUpperCase();
      const pathname = url.pathname;

      // 1. GET / — Listagem de Necessidades
      if (metodo === "GET" && pathname === "/") {
        const lista = await repositorio.listarTodas();
        const html = renderizarListaNecessidades(lista);
        return responderHtml(res, 200, html);
      }

      // 2. GET /nova — Formulário para cadastro de nova Necessidade
      if (metodo === "GET" && pathname === "/nova") {
        const html = renderizarFormularioNovaNecessidade();
        return responderHtml(res, 200, html);
      }

      // 3. POST /necessidades — Criação de Necessidade
      if (metodo === "POST" && pathname === "/necessidades") {
        const body = await extrairCorpoRequisicao(req);

        // Validação básica dos campos
        const erros: string[] = [];
        if (!body.codigo || String(body.codigo).trim() === "") erros.push("O código da necessidade é obrigatório.");
        if (!body.titulo || String(body.titulo).trim() === "") erros.push("O título da necessidade é obrigatório.");
        if (!body.problemaOuOportunidade) erros.push("O problema ou oportunidade é obrigatório.");
        if (!body.quemEAfetado) erros.push("A indicação de quem é afetado é obrigatória.");
        if (!body.resultadoPretendido) erros.push("O resultado pretendido é obrigatório.");
        if (!body.escopoInicial) erros.push("O escopo inicial é obrigatório.");
        if (!body.foraDeEscopo) erros.push("A definição de fora de escopo é obrigatória.");
        if (!body.criterioDeAtendimento) erros.push("O critério de atendimento é obrigatório.");
        if (!body.porQueIssoImporta) erros.push("A justificativa de valor é obrigatória.");
        if (!body.origem) erros.push("A origem da demanda é obrigatória.");

        if (erros.length > 0) {
          const html = renderizarFormularioNovaNecessidade(erros);
          return responderHtml(res, 400, html);
        }

        const id = body.id || `nec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const tipoValido = Object.values(TipoNecessidade).includes(body.tipo)
          ? body.tipo
          : TipoNecessidade.EVOLUCAO_DE_PRODUTO;

        const novaNecessidade = new Necessidade({
          id,
          codigo: body.codigo.trim(),
          titulo: body.titulo.trim(),
          tipo: tipoValido,
          problemaOuOportunidade: body.problemaOuOportunidade.trim(),
          quemEAfetado: body.quemEAfetado.trim(),
          resultadoPretendido: body.resultadoPretendido.trim(),
          escopoInicial: body.escopoInicial.trim(),
          foraDeEscopo: body.foraDeEscopo.trim(),
          criterioDeAtendimento: body.criterioDeAtendimento.trim(),
          porQueIssoImporta: body.porQueIssoImporta.trim(),
          restricoesOuDependencias: body.restricoesOuDependencias?.trim() || undefined,
          origem: body.origem.trim(),
        });

        await repositorio.salvar(novaNecessidade);

        // Se for requisição aceitando JSON, responde com JSON
        if (req.headers.accept?.includes("application/json")) {
          return responderJson(res, 201, {
            id: novaNecessidade.id,
            codigo: novaNecessidade.codigo,
            status: novaNecessidade.status,
          });
        }

        return redirecionar(res, `/necessidades/${novaNecessidade.id}`);
      }

      // 4. GET /necessidades/:id — Detalhes da Necessidade e histórico
      const matchDetalhes = pathname.match(/^\/necessidades\/([a-zA-Z0-9_-]+)$/);
      if (metodo === "GET" && matchDetalhes) {
        const id = matchDetalhes[1];
        const necessidade = await repositorio.obterPorId(id);
        if (!necessidade) {
          return responderHtml(res, 404, "<h1>404 — Necessidade não encontrada</h1>");
        }

        const compromisso = await repositorio.obterCompromisso(id);

        let feedback: { tipo: "sucesso" | "erro"; texto: string } | undefined;
        if (url.searchParams.get("feedback")) {
          feedback = {
            tipo: url.searchParams.get("tipo") === "erro" ? "erro" : "sucesso",
            texto: url.searchParams.get("feedback") || "",
          };
        }

        if (req.headers.accept?.includes("application/json")) {
          return responderJson(res, 200, {
            id: necessidade.id,
            codigo: necessidade.codigo,
            titulo: necessidade.titulo,
            status: necessidade.status,
            compromisso,
            historico: necessidade.historico,
            resultados: necessidade.resultados,
            decisoes: necessidade.decisoes,
          });
        }

        const html = renderizarDetalhesNecessidade(necessidade, compromisso, feedback);
        return responderHtml(res, 200, html);
      }

      // 5. POST /necessidades/:id/parecer-auditoria — Emissão de parecer por Auditor
      const matchParecer = pathname.match(/^\/necessidades\/([a-zA-Z0-9_-]+)\/parecer-auditoria$/);
      if (metodo === "POST" && matchParecer) {
        const id = matchParecer[1];
        const necessidade = await repositorio.obterPorId(id);
        if (!necessidade) {
          return responderHtml(res, 404, "<h1>404 — Necessidade não encontrada</h1>");
        }

        const body = await extrairCorpoRequisicao(req);
        const tipoResultado = body.tipoResultado as TipoResultadoProcesso || TipoResultadoProcesso.QUALIFICAVEL;

        necessidade.registrarResultadoProcesso(
          AtorCompetenteNecessidade.AUDITOR_NECESSIDADE,
          tipoResultado,
          { emitidoVia: "Web/HTTP" }
        );

        await repositorio.salvar(necessidade);

        if (req.headers.accept?.includes("application/json")) {
          return responderJson(res, 200, { ok: true, status: necessidade.status });
        }

        return redirecionar(res, `/necessidades/${id}?tipo=sucesso&feedback=Parecer+do+Auditor+registrado+com+sucesso.`);
      }

      // 6. POST /necessidades/:id/avancar-qualificacao — Avanço para EM_QUALIFICACAO
      const matchAvancarQualificacao = pathname.match(/^\/necessidades\/([a-zA-Z0-9_-]+)\/avancar-qualificacao$/);
      if (metodo === "POST" && matchAvancarQualificacao) {
        const id = matchAvancarQualificacao[1];
        const necessidade = await repositorio.obterPorId(id);
        if (!necessidade) {
          return responderHtml(res, 404, "<h1>404 — Necessidade não encontrada</h1>");
        }

        try {
          necessidade.avancarParaQualificacao(AtorCompetenteNecessidade.ESPECIALISTA_FORMACAO);
          await repositorio.salvar(necessidade);

          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 200, { ok: true, status: necessidade.status });
          }

          return redirecionar(res, `/necessidades/${id}?tipo=sucesso&feedback=Formação+concluída+e+transição+para+EM_QUALIFICACAO.`);
        } catch (err: any) {
          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 400, { erro: err.message });
          }
          return redirecionar(res, `/necessidades/${id}?tipo=erro&feedback=${encodeURIComponent(err.message)}`);
        }
      }

      // 7. POST /necessidades/:id/recomendacao-qualificacao — Recomendação do Especialista em Qualificação
      const matchRecomendacao = pathname.match(/^\/necessidades\/([a-zA-Z0-9_-]+)\/recomendacao-qualificacao$/);
      if (metodo === "POST" && matchRecomendacao) {
        const id = matchRecomendacao[1];
        const necessidade = await repositorio.obterPorId(id);
        if (!necessidade) {
          return responderHtml(res, 404, "<h1>404 — Necessidade não encontrada</h1>");
        }

        const body = await extrairCorpoRequisicao(req);
        const tipoResultado = body.tipoResultado as TipoResultadoProcesso || TipoResultadoProcesso.ASSUMIR_COMPROMISSO;

        necessidade.registrarResultadoProcesso(
          AtorCompetenteNecessidade.ESPECIALISTA_QUALIFICACAO,
          tipoResultado,
          { emitidoVia: "Web/HTTP" }
        );

        await repositorio.salvar(necessidade);

        if (req.headers.accept?.includes("application/json")) {
          return responderJson(res, 200, { ok: true, status: necessidade.status });
        }

        return redirecionar(res, `/necessidades/${id}?tipo=sucesso&feedback=Recomendação+do+Especialista+registrada.`);
      }

      // 8. POST /necessidades/:id/submeter-decisao — Submissão para AGUARDANDO_DECISAO
      const matchSubmeterDecisao = pathname.match(/^\/necessidades\/([a-zA-Z0-9_-]+)\/submeter-decisao$/);
      if (metodo === "POST" && matchSubmeterDecisao) {
        const id = matchSubmeterDecisao[1];
        const necessidade = await repositorio.obterPorId(id);
        if (!necessidade) {
          return responderHtml(res, 404, "<h1>404 — Necessidade não encontrada</h1>");
        }

        try {
          necessidade.submeterParaDecisao(AtorCompetenteNecessidade.ESPECIALISTA_QUALIFICACAO);
          await repositorio.salvar(necessidade);

          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 200, { ok: true, status: necessidade.status });
          }

          return redirecionar(res, `/necessidades/${id}?tipo=sucesso&feedback=Necessidade+submetida+à+Decisão+do+Owner.`);
        } catch (err: any) {
          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 400, { erro: err.message });
          }
          return redirecionar(res, `/necessidades/${id}?tipo=erro&feedback=${encodeURIComponent(err.message)}`);
        }
      }

      // 9. POST /necessidades/:id/decisao-owner — Registro de Decisão Material do Owner com autenticação estrita
      const matchDecisao = pathname.match(/^\/necessidades\/([a-zA-Z0-9_-]+)\/decisao-owner$/);
      if (metodo === "POST" && matchDecisao) {
        const id = matchDecisao[1];
        const necessidade = await repositorio.obterPorId(id);
        if (!necessidade) {
          return responderHtml(res, 404, "<h1>404 — Necessidade não encontrada</h1>");
        }

        const body = await extrairCorpoRequisicao(req);
        const usuarioInformado = body.usuario;
        const decisao = body.decisao as DecisaoMaterialOwner || DecisaoMaterialOwner.APROVADO;
        const justificativa = body.justificativa;

        try {
          // Validação estrita de identidade pela porta de autenticação do Owner
          const usuarioOwnerValido = await autenticacaoOwner.exigirIdentidadeOwner(usuarioInformado);

          // Registra decisão no domínio
          necessidade.registrarDecisaoOwner(decisao, usuarioOwnerValido, justificativa);

          // Se for APROVADO, consolida imediatamente o Compromisso da Necessidade
          if (decisao === DecisaoMaterialOwner.APROVADO) {
            ServicoCompromissoNecessidade.compor(necessidade);

            // Se o worker assíncrono ou fila estiverem configurados, enfileira o job de bootstrap
            if (filaTarefas) {
              await filaTarefas.enfileirar("BOOTSTRAP_PROJETO_M002", { necessidadeId: necessidade.id });
            } else {
              // Execução direta através da porta de integração do M-002
              const solicitacao = AdaptadorIntegracaoProjeto.criarSolicitacaoDeCompromisso(
                necessidade.codigo,
                necessidade.titulo,
                necessidade.compromisso!
              );
              const confirmacao = await portaProjeto.solicitarBootstrapProjeto(solicitacao);
              necessidade.confirmarMaterializacaoProjeto(confirmacao.projetoId);
            }

            // Registra evento de rastreabilidade
            await portaContexto.registrarEventoRastreabilidade({
              entidadeOrigem: "Necessidade",
              idOrigem: necessidade.id,
              tipoEvento: "DECISAO_OWNER_APROVADO",
              dados: {
                usuarioOwner: usuarioOwnerValido,
                decisao,
              },
              timestamp: new Date(),
            });
          }

          await repositorio.salvar(necessidade);

          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 200, {
              ok: true,
              status: necessidade.status,
              compromisso: necessidade.compromisso,
            });
          }

          return redirecionar(res, `/necessidades/${id}?tipo=sucesso&feedback=Decisão+do+Owner+registrada+e+Compromisso+disponibilizado.`);
        } catch (err: any) {
          const statusHttp = err.name === "AutoridadeInvalidaErro" || err.name === "AutenticacaoRequeridaErro"
            ? 403
            : 400;

          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, statusHttp, { erro: err.message });
          }

          return redirecionar(res, `/necessidades/${id}?tipo=erro&feedback=${encodeURIComponent(err.message)}`);
        }
      }

      // 10. GET /api/compromissos/:necessidadeId — Endpoint REST do Compromisso
      const matchCompromissoApi = pathname.match(/^\/api\/compromissos\/([a-zA-Z0-9_-]+)$/);
      if (metodo === "GET" && matchCompromissoApi) {
        const id = matchCompromissoApi[1];
        const compromisso = await repositorio.obterCompromisso(id);
        if (!compromisso) {
          return responderJson(res, 404, { erro: "Compromisso não encontrado ou ainda não aprovado." });
        }
        return responderJson(res, 200, compromisso);
      }

      // ==========================================
      // ROTAS DA VERTICAL PROJETO (EV-002 / M-002)
      // ==========================================

      // 11. GET /projetos — Listagem de Projetos
      if (metodo === "GET" && pathname === "/projetos") {
        let listaProjetos: any[] = [];
        if (servicoProjeto) {
          listaProjetos = await servicoProjeto.listarProjetos();
        } else if (repositorioProjeto) {
          listaProjetos = await repositorioProjeto.listarTodos();
        }
        const html = renderizarListaProjetos(listaProjetos);
        return responderHtml(res, 200, html);
      }

      // 12. GET /projetos/:id — Detalhes do Projeto, formação, auditorias e Direção
      const matchDetalhesProjeto = pathname.match(/^\/projetos\/([a-zA-Z0-9_-]+)$/);
      if (metodo === "GET" && matchDetalhesProjeto) {
        const id = matchDetalhesProjeto[1];
        let projeto: any = null;
        if (servicoProjeto) {
          projeto = await servicoProjeto.obterProjetoPorId(id);
        } else if (repositorioProjeto) {
          projeto = await repositorioProjeto.obterPorId(id);
        }

        if (!projeto) {
          return responderHtml(res, 404, "<h1>404 — Projeto não encontrado</h1>");
        }

        let necessidadeOrigem: Necessidade | null = null;
        if (projeto.necessidadeId) {
          necessidadeOrigem = await repositorio.obterPorId(projeto.necessidadeId);
        }

        let feedback: { tipo: "sucesso" | "erro"; texto: string } | undefined;
        if (url.searchParams.get("feedback")) {
          feedback = {
            tipo: url.searchParams.get("tipo") === "erro" ? "erro" : "sucesso",
            texto: url.searchParams.get("feedback") || "",
          };
        }

        if (req.headers.accept?.includes("application/json")) {
          return responderJson(res, 200, {
            id: projeto.id,
            codigo: projeto.codigo,
            titulo: projeto.titulo,
            status: projeto.status,
            necessidadeId: projeto.necessidadeId,
            etapas: projeto.etapas,
            auditorias: projeto.auditorias,
            direcao: projeto.direcao,
          });
        }

        const html = renderizarDetalhesProjeto(projeto, necessidadeOrigem, feedback);
        return responderHtml(res, 200, html);
      }

      // 13. POST /projetos/:id/etapas — Registro de Etapa de Formação
      const matchEtapaProjeto = pathname.match(/^\/projetos\/([a-zA-Z0-9_-]+)\/etapas$/);
      if (metodo === "POST" && matchEtapaProjeto) {
        const id = matchEtapaProjeto[1];
        const body = await extrairCorpoRequisicao(req);
        const etapa = body.etapa as EtapaFormacaoProjeto || EtapaFormacaoProjeto.ENQUADRAMENTO;
        const detalhe = body.detalhe ? String(body.detalhe).trim() : "";

        if (!detalhe) {
          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 400, { erro: "O detalhe do conteúdo da etapa é obrigatório." });
          }
          return redirecionar(res, `/projetos/${id}?tipo=erro&feedback=O+conteúdo+da+etapa+é+obrigatório.`);
        }

        try {
          if (servicoProjeto) {
            await servicoProjeto.registrarEtapaFormacao(
              id,
              etapa,
              { detalhe, registradoVia: "Web/HTTP" },
              AtorCompetenteProjeto.ESPECIALISTA_FORMACAO_PROJETO
            );
          } else if (repositorioProjeto) {
            const proj = await repositorioProjeto.obterPorId(id);
            if (!proj) {
              return responderHtml(res, 404, "<h1>404 — Projeto não encontrado</h1>");
            }
            proj.registrarEtapaFormacao(
              AtorCompetenteProjeto.ESPECIALISTA_FORMACAO_PROJETO,
              etapa,
              { detalhe, registradoVia: "Web/HTTP" }
            );
            await repositorioProjeto.salvar(proj);
          }

          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 200, { ok: true, etapa });
          }

          return redirecionar(res, `/projetos/${id}?tipo=sucesso&feedback=Etapa+de+formação+registrada+com+sucesso.`);
        } catch (err: any) {
          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 400, { erro: err.message });
          }
          return redirecionar(res, `/projetos/${id}?tipo=erro&feedback=${encodeURIComponent(err.message)}`);
        }
      }

      // 14. POST /projetos/:id/parecer-auditoria — Emissão de parecer de auditoria e conclusão de formação
      const matchAuditoriaProjeto = pathname.match(/^\/projetos\/([a-zA-Z0-9_-]+)\/parecer-auditoria$/);
      if (metodo === "POST" && matchAuditoriaProjeto) {
        const id = matchAuditoriaProjeto[1];
        const body = await extrairCorpoRequisicao(req);
        const resultado = body.resultado as TipoResultadoProcessoProjeto || TipoResultadoProcessoProjeto.FORMACAO_SUFICIENTE;
        const parecer = body.parecer ? String(body.parecer).trim() : "";
        const objetivoProjeto = body.objetivoProjeto ? String(body.objetivoProjeto).trim() : "Objetivo do Projeto validado pela Auditoria da EV-002";

        if (!parecer) {
          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 400, { erro: "O parecer descritivo de auditoria é obrigatório." });
          }
          return redirecionar(res, `/projetos/${id}?tipo=erro&feedback=O+parecer+do+auditor+é+obrigatório.`);
        }

        try {
          if (servicoProjeto) {
            await servicoProjeto.registrarParecerAuditoria(
              id,
              resultado,
              parecer,
              AtorCompetenteProjeto.AUDITOR_PROJETO,
              resultado === TipoResultadoProcessoProjeto.FORMACAO_SUFICIENTE ? {
                compromissoOrigem: `Compromisso da Necessidade`,
                objetivoProjeto,
                fronteiras: "M-002 / EV-002 delimitado",
                contextoRelevante: "Formação auditada e aprovada com Direção do Projeto consolidada.",
              } : undefined
            );
          } else if (repositorioProjeto) {
            const proj = await repositorioProjeto.obterPorId(id);
            if (!proj) {
              return responderHtml(res, 404, "<h1>404 — Projeto não encontrado</h1>");
            }
            proj.registrarAuditoria(AtorCompetenteProjeto.AUDITOR_PROJETO, resultado, parecer);
            if (resultado === TipoResultadoProcessoProjeto.FORMACAO_SUFICIENTE) {
              proj.concluirFormacao(AtorCompetenteProjeto.AUDITOR_PROJETO, {
                compromissoOrigem: `Compromisso da Necessidade`,
                objetivoProjeto,
                fronteiras: "M-002 / EV-002 delimitado",
                contextoRelevante: "Formação auditada e aprovada com Direção do Projeto consolidada.",
              });
            }
            await repositorioProjeto.salvar(proj);
          }

          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 200, { ok: true, resultado });
          }

          return redirecionar(res, `/projetos/${id}?tipo=sucesso&feedback=Auditoria+registrada+com+sucesso.`);
        } catch (err: any) {
          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 400, { erro: err.message });
          }
          return redirecionar(res, `/projetos/${id}?tipo=erro&feedback=${encodeURIComponent(err.message)}`);
        }
      }

      // 15. POST /projetos/:id/cancelar — Decisão material humana de cancelamento exclusivo do Owner
      const matchCancelarProjeto = pathname.match(/^\/projetos\/([a-zA-Z0-9_-]+)\/cancelar$/);
      if (metodo === "POST" && matchCancelarProjeto) {
        const id = matchCancelarProjeto[1];
        const body = await extrairCorpoRequisicao(req);
        const usuarioInformado = body.usuario;
        const justificativa = body.justificativa;

        try {
          const usuarioOwnerValido = await autenticacaoOwner.exigirIdentidadeOwner(usuarioInformado);

          // Obter Projeto e executar cancelamento
          let proj: any = null;
          if (repositorioProjeto) {
            proj = await repositorioProjeto.obterPorId(id);
          } else if (servicoProjeto) {
            // Caso servico não exponha repositório diretamente, busca via get
            proj = await (servicoProjeto as any).repositorioProjeto?.obterPorId(id);
          }

          if (!proj) {
            return responderHtml(res, 404, "<h1>404 — Projeto não encontrado</h1>");
          }

          proj.cancelarPorDecisaoOwner(usuarioOwnerValido, justificativa);

          if (repositorioProjeto) {
            await repositorioProjeto.salvar(proj);
          } else if (servicoProjeto) {
            await (servicoProjeto as any).repositorioProjeto?.salvar(proj);
          }

          // Registrar evento de rastreabilidade
          await portaContexto.registrarEventoRastreabilidade({
            entidadeOrigem: "Projeto",
            idOrigem: id,
            tipoEvento: "DECISAO_OWNER_PROJETO_CANCELADO",
            dados: { usuarioOwner: usuarioOwnerValido, justificativa },
            timestamp: new Date(),
          });

          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 200, { ok: true, status: proj.status });
          }

          return redirecionar(res, `/projetos/${id}?tipo=sucesso&feedback=Cancelamento+do+Projeto+aprovado+pelo+Owner.`);
        } catch (err: any) {
          const statusHttp = err.name === "AutoridadeInvalidaErro" || err.name === "AutenticacaoRequeridaErro"
            ? 403
            : 400;

          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, statusHttp, { erro: err.message });
          }

          return redirecionar(res, `/projetos/${id}?tipo=erro&feedback=${encodeURIComponent(err.message)}`);
        }
      }

      // 16. GET /api/projetos/:id/direcao — Endpoint REST da Direção do Projeto
      const matchDirecaoApi = pathname.match(/^\/api\/projetos\/([a-zA-Z0-9_-]+)\/direcao$/);
      if (metodo === "GET" && matchDirecaoApi) {
        const id = matchDirecaoApi[1];
        let direcao = null;
        if (servicoProjeto) {
          direcao = await servicoProjeto.obterDirecaoProjeto(id);
        } else if (repositorioProjeto) {
          const proj = await repositorioProjeto.obterPorId(id);
          direcao = proj?.direcao || null;
        }

        if (!direcao) {
          return responderJson(res, 404, { erro: "Direção do Projeto não encontrada ou ainda não aprovada." });
        }
        return responderJson(res, 200, direcao);
      }

      // =========================================================================
      // ROTAS DE COORDENAÇÃO DO TRABALHO (M-003 / EV-003 / IT-012)
      // =========================================================================

      // 17. GET /coordenacao — Painel principal de Coordenação do Trabalho
      if (metodo === "GET" && pathname === "/coordenacao") {
        if (!servicoCoordenacao && !repositorioCoordenacao) {
          return responderHtml(res, 500, "<h1>500 — Módulo de Coordenação não configurado no servidor.</h1>");
        }

        // Obtém projetos disponíveis para seleção
        const projetos = repositorioProjeto ? await repositorioProjeto.listarTodos() : [];
        let projetoId = url.searchParams.get("projetoId");

        if (!projetoId && projetos.length > 0) {
          projetoId = projetos[0]!.id;
        }

        if (!projetoId) {
          return responderHtml(
            res,
            200,
            renderizarPainelCoordenacao(
              {
                projetoId: "",
                totalTrabalhos: 0,
                possiveis: [],
                preparados: [],
                emExecucao: [],
                bloqueados: [],
                aguardandoDecisao: [],
                encerrados: [],
                proximoAvancoValido: null,
                avaliacao: {
                  projetoId: "",
                  totalTrabalhos: 0,
                  trabalhosPossiveis: [],
                  trabalhosPreparados: [],
                  trabalhosEmExecucao: [],
                  trabalhosBloqueados: [],
                  trabalhosAguardandoDecisao: [],
                  trabalhosEncerrados: [],
                  proximoAvancoValido: null,
                  diagnosticos: [],
                },
              },
              projetos,
              null
            )
          );
        }

        const projetoSelecionado = projetos.find((p) => p.id === projetoId) || null;
        let visao: any;
        if (servicoCoordenacao) {
          visao = await servicoCoordenacao.listarTrabalhosCoordenados(projetoId);
        } else {
          const trabalhos = await repositorioCoordenacao!.listarPorProjetoId(projetoId);
          visao = {
            projetoId,
            totalTrabalhos: trabalhos.length,
            possiveis: trabalhos.filter((t) => t.condicaoOperacional === CondicaoOperacionalTrabalho.POSSIVEL),
            preparados: trabalhos.filter((t) => t.condicaoOperacional === CondicaoOperacionalTrabalho.PREPARADO),
            emExecucao: trabalhos.filter((t) => t.condicaoOperacional === CondicaoOperacionalTrabalho.EM_EXECUCAO),
            bloqueados: trabalhos.filter((t) => t.condicaoOperacional === CondicaoOperacionalTrabalho.BLOQUEADO),
            aguardandoDecisao: trabalhos.filter((t) => t.condicaoOperacional === CondicaoOperacionalTrabalho.AGUARDANDO_DECISAO_HUMANA),
            encerrados: trabalhos.filter((t) => t.condicaoOperacional === CondicaoOperacionalTrabalho.ENCERRADO),
            proximoAvancoValido: trabalhos.find((t) => t.condicaoOperacional === CondicaoOperacionalTrabalho.PREPARADO) || null,
            avaliacao: {} as any,
          };
        }

        const feedbackMsg = url.searchParams.get("feedback");
        const feedbackTipo = url.searchParams.get("tipo") as "sucesso" | "erro" | null;
        const feedback = feedbackMsg && feedbackTipo ? { tipo: feedbackTipo, mensagem: feedbackMsg } : undefined;

        if (req.headers.accept?.includes("application/json")) {
          return responderJson(res, 200, visao);
        }

        const html = renderizarPainelCoordenacao(visao, projetos, projetoSelecionado, feedback);
        return responderHtml(res, 200, html);
      }

      // 18. GET /coordenacao/trabalhos/:id — Detalhes completos do Trabalho Coordenado
      const matchDetalhesTrabalho = pathname.match(/^\/coordenacao\/trabalhos\/([a-zA-Z0-9_-]+)$/);
      if (metodo === "GET" && matchDetalhesTrabalho) {
        const trabalhoId = matchDetalhesTrabalho[1];

        try {
          let detalhe: any;
          if (servicoCoordenacao) {
            detalhe = await servicoCoordenacao.obterDetalhesTrabalho(trabalhoId);
          } else if (repositorioCoordenacao) {
            const trabalho = await repositorioCoordenacao.obterPorId(trabalhoId);
            if (!trabalho) {
              return responderHtml(res, 404, "<h1>404 — Trabalho Coordenado não encontrado</h1>");
            }
            detalhe = {
              trabalho,
              dependenciasDetalhadas: [],
              handoffAtivo: trabalho.handoffs.length > 0 ? trabalho.handoffs[trabalho.handoffs.length - 1] : null,
            };
          } else {
            return responderHtml(res, 500, "<h1>500 — Repositório de Coordenação indisponível</h1>");
          }

          let projeto = null;
          if (repositorioProjeto) {
            projeto = await repositorioProjeto.obterPorId(detalhe.trabalho.projetoId);
          }

          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 200, detalhe);
          }

          const feedbackMsg = url.searchParams.get("feedback");
          const feedbackTipo = url.searchParams.get("tipo") as "sucesso" | "erro" | null;
          const feedback = feedbackMsg && feedbackTipo ? { tipo: feedbackTipo, mensagem: feedbackMsg } : undefined;

          const html = renderizarDetalhesTrabalhoCoordenado(detalhe, projeto, feedback);
          return responderHtml(res, 200, html);
        } catch (err: any) {
          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 404, { erro: err.message });
          }
          return responderHtml(res, 404, `<h1>404 — ${escaparHtml(err.message)}</h1>`);
        }
      }

      // 19. POST /coordenacao/trabalhos/:id/despachar — Despacho com Um Clique ("Delegar Próximo Avanço")
      const matchDespacharTrabalho = pathname.match(/^\/coordenacao\/trabalhos\/([a-zA-Z0-9_-]+)\/despachar$/);
      if (metodo === "POST" && matchDespacharTrabalho) {
        const trabalhoId = matchDespacharTrabalho[1];
        const body = await extrairCorpoRequisicao(req);
        const executorDesignado = body.executorDesignado ? String(body.executorDesignado).trim() : null;
        const tokenFornecido = body.tokenCorrelacao ? String(body.tokenCorrelacao).trim() : null;

        try {
          if (!servicoCoordenacao && !repositorioCoordenacao) {
            throw new Error("Serviço de Coordenação não disponível.");
          }

          let handoffEmitido: any;
          if (servicoCoordenacao) {
            handoffEmitido = await servicoCoordenacao.despacharProximoAvanco(
              trabalhoId,
              {
                projeto: body.projetoId || "P-001",
                necessidade: "N-001",
                modulo: "M-003",
                entregaDeValor: "EV-003",
                documentosNormativos: [
                  "documentacao/entrega-de-valor/02_MODELO_DE_ENTREGA_DE_VALOR.md",
                  "dados/entregas-de-valor/EV-003/entrega-de-valor.md",
                ],
              },
              executorDesignado,
              tokenFornecido
            );
          } else {
            const trab = await repositorioCoordenacao!.obterPorId(trabalhoId);
            if (!trab) throw new Error("Trabalho não encontrado.");
            const token = tokenFornecido || `hdof-${trab.codigo.toLowerCase()}-${Date.now()}`;
            const hd = trab.despacharHandoff(
              token,
              {
                projeto: trab.projetoId,
                necessidade: "N-001",
                modulo: "M-003",
                entregaDeValor: "EV-003",
              },
              executorDesignado
            );
            await repositorioCoordenacao!.salvar(trab);
            handoffEmitido = {
              handoffId: hd.id,
              trabalhoId: trab.id,
              codigoTrabalho: trab.codigo,
              tokenCorrelacao: hd.tokenCorrelacao,
            };
          }

          // Notifica contexto de rastreabilidade M-004
          await portaContexto.registrarEventoRastreabilidade({
            entidadeOrigem: "TrabalhoCoordenado",
            idOrigem: trabalhoId,
            tipoEvento: "HANDOFF_DESPACHADO",
            dados: {
              codigoTrabalho: handoffEmitido.codigoTrabalho,
              tokenCorrelacao: handoffEmitido.tokenCorrelacao,
              atorDestinatario: handoffEmitido.atorDestinatario,
            },
            timestamp: new Date(),
          });

          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 200, handoffEmitido);
          }

          return redirecionar(
            res,
            `/coordenacao/trabalhos/${trabalhoId}?tipo=sucesso&feedback=Handoff+despachado+com+sucesso!+Token:+${encodeURIComponent(handoffEmitido.tokenCorrelacao)}`
          );
        } catch (err: any) {
          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 400, { erro: err.message });
          }
          return redirecionar(
            res,
            `/coordenacao/trabalhos/${trabalhoId}?tipo=erro&feedback=${encodeURIComponent(err.message)}`
          );
        }
      }

      // 20. GET /coordenacao/handoffs/:id — Inspeção detalhada do Handoff e pacote estruturado
      const matchDetalhesHandoff = pathname.match(/^\/coordenacao\/handoffs\/([a-zA-Z0-9_-]+)$/);
      if (metodo === "GET" && matchDetalhesHandoff) {
        const handoffId = matchDetalhesHandoff[1];

        if (!repositorioCoordenacao) {
          return responderHtml(res, 500, "<h1>500 — Repositório de Coordenação indisponível</h1>");
        }

        const par = await repositorioCoordenacao.obterHandoffPorId(handoffId);
        if (!par) {
          return responderHtml(res, 404, "<h1>404 — Handoff não encontrado</h1>");
        }

        if (req.headers.accept?.includes("application/json")) {
          return responderJson(res, 200, {
            handoff: par.handoff,
            trabalho: {
              id: par.trabalho.id,
              codigo: par.trabalho.codigo,
              titulo: par.trabalho.titulo,
              condicaoOperacional: par.trabalho.condicaoOperacional,
            },
          });
        }

        const html = renderizarDetalheHandoff(par.handoff, par.trabalho);
        return responderHtml(res, 200, html);
      }

      // 21. POST /coordenacao/retornos — Registro de retorno de execução (via formulário ou API REST)
      if (metodo === "POST" && pathname === "/coordenacao/retornos") {
        const body = await extrairCorpoRequisicao(req);
        const tokenCorrelacao = body.tokenCorrelacao ? String(body.tokenCorrelacao).trim() : "";
        const sucesso = body.sucesso === true || body.sucesso === "true" || body.sucesso === "1";
        const resultadoObservavel = body.resultadoObservavel ? String(body.resultadoObservavel).trim() : "";
        const pendenciasOuBloqueios = body.pendenciasOuBloqueios ? String(body.pendenciasOuBloqueios).trim() : null;
        const trabalhoIdRetorno = body.trabalhoId ? String(body.trabalhoId).trim() : "";

        if (!tokenCorrelacao) {
          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 400, { erro: "O token de correlação é obrigatório." });
          }
          return redirecionar(res, `/coordenacao?tipo=erro&feedback=Token+de+correlação+é+obrigatório.`);
        }

        try {
          if (!servicoCoordenacao && !repositorioCoordenacao) {
            throw new Error("Serviço de Coordenação não disponível.");
          }

          let resultadoRetorno: any;
          if (servicoCoordenacao) {
            resultadoRetorno = await servicoCoordenacao.registrarRetornoExecucao(tokenCorrelacao, {
              sucesso,
              resultadoObservavel,
              pendenciasOuBloqueios,
            });
          } else {
            const par = await repositorioCoordenacao!.obterHandoffPorToken(tokenCorrelacao);
            if (!par) throw new Error("Handoff não encontrado com token fornecido.");
            const ret = par.trabalho.registrarRetorno(tokenCorrelacao, sucesso, resultadoObservavel, pendenciasOuBloqueios);
            await repositorioCoordenacao!.salvar(par.trabalho);
            resultadoRetorno = {
              trabalhoId: par.trabalho.id,
              codigoTrabalho: par.trabalho.codigo,
              condicaoOperacionalResultante: par.trabalho.condicaoOperacional,
              retornoId: ret.id,
              sucesso,
            };
          }

          // Notifica contexto de rastreabilidade M-004
          await portaContexto.registrarEventoRastreabilidade({
            entidadeOrigem: "HandoffCoordenacao",
            idOrigem: tokenCorrelacao,
            tipoEvento: "RETORNO_RECEBIDO",
            dados: {
              sucesso,
              resultadoObservavel,
              trabalhoId: resultadoRetorno.trabalhoId,
            },
            timestamp: new Date(),
          });

          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 200, resultadoRetorno);
          }

          const targetId = trabalhoIdRetorno || resultadoRetorno.trabalhoId;
          return redirecionar(
            res,
            `/coordenacao/trabalhos/${targetId}?tipo=sucesso&feedback=Retorno+de+execução+registrado+com+sucesso!`
          );
        } catch (err: any) {
          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 400, { erro: err.message });
          }
          const targetId = trabalhoIdRetorno ? `/coordenacao/trabalhos/${trabalhoIdRetorno}` : "/coordenacao";
          return redirecionar(res, `${targetId}?tipo=erro&feedback=${encodeURIComponent(err.message)}`);
        }
      }

      // 22. POST /coordenacao/trabalhos/:id/decisao-owner — Decisão soberana do Owner para liberar trabalho
      const matchDecisaoOwner = pathname.match(/^\/coordenacao\/trabalhos\/([a-zA-Z0-9_-]+)\/decisao-owner$/);
      if (metodo === "POST" && matchDecisaoOwner) {
        const trabalhoId = matchDecisaoOwner[1];
        const body = await extrairCorpoRequisicao(req);
        const usuarioInformado = body.usuario;
        const diretriz = body.diretriz ? String(body.diretriz).trim() : "";

        try {
          const usuarioOwnerValido = await autenticacaoOwner.exigirIdentidadeOwner(usuarioInformado);

          if (!diretriz) {
            throw new Error("A diretriz ou decisão humana do Owner é obrigatória.");
          }

          let trabalhoAtualizado: any;
          if (servicoCoordenacao) {
            trabalhoAtualizado = await servicoCoordenacao.liberarDecisaoHumanaOwner(
              trabalhoId,
              usuarioOwnerValido,
              diretriz,
              CondicaoOperacionalTrabalho.PREPARADO
            );
          } else if (repositorioCoordenacao) {
            const trab = await repositorioCoordenacao.obterPorId(trabalhoId);
            if (!trab) throw new Error("Trabalho não encontrado.");
            trab.registrarDecisaoHumanaLiberacao(usuarioOwnerValido, diretriz, CondicaoOperacionalTrabalho.PREPARADO);
            await repositorioCoordenacao.salvar(trab);
            trabalhoAtualizado = trab;
          }

          // Notifica contexto de rastreabilidade M-004
          await portaContexto.registrarEventoRastreabilidade({
            entidadeOrigem: "TrabalhoCoordenado",
            idOrigem: trabalhoId,
            tipoEvento: "DECISAO_SOBERANA_OWNER_LIBERACAO",
            dados: {
              usuarioOwner: usuarioOwnerValido,
              diretriz,
              novaCondicao: CondicaoOperacionalTrabalho.PREPARADO,
            },
            timestamp: new Date(),
          });

          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 200, {
              ok: true,
              trabalhoId,
              condicaoOperacional: trabalhoAtualizado.condicaoOperacional,
            });
          }

          return redirecionar(
            res,
            `/coordenacao/trabalhos/${trabalhoId}?tipo=sucesso&feedback=Decisão+soberana+do+Owner+registrada+com+sucesso!+Trabalho+liberado+para+PREPARADO.`
          );
        } catch (err: any) {
          const statusHttp = err.name === "AutoridadeInvalidaErro" || err.name === "AutenticacaoRequeridaErro"
            ? 403
            : 400;

          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, statusHttp, { erro: err.message });
          }

          return redirecionar(
            res,
            `/coordenacao/trabalhos/${trabalhoId}?tipo=erro&feedback=${encodeURIComponent(err.message)}`
          );
        }
      }

      // 23. GET /rastreabilidade — Painel geral de governança e rastreabilidade contextual
      if (metodo === "GET" && pathname === "/rastreabilidade") {
        const feedbackParam = url.searchParams.get("feedback");
        const tipoFeedback = url.searchParams.get("tipo") as "sucesso" | "erro" | null;

        let relatorio: any;
        let registrosRecentes: any[] = [];
        let vinculosRecentes: any[] = [];

        if (servicoContexto) {
          relatorio = await servicoContexto.auditarConsistenciaContexto();
          if (repositorioContexto) {
            registrosRecentes = await repositorioContexto.listarTodosRegistros();
            vinculosRecentes = await repositorioContexto.listarTodosVinculos();
          }
        } else if (repositorioContexto) {
          registrosRecentes = await repositorioContexto.listarTodosRegistros();
          vinculosRecentes = await repositorioContexto.listarTodosVinculos();
          relatorio = {
            totalRegistrosAuditados: registrosRecentes.length,
            totalVinculosAuditados: vinculosRecentes.length,
            registrosVigentes: registrosRecentes.filter((r) => r.vigente).length,
            registrosSuperados: registrosRecentes.filter((r) => !r.vigente).length,
            lacunasDetectadas: [],
            contradicoesDetectadas: [],
            diagnosticoGeral: "CONSISTENTE",
            auditadoEm: new Date(),
          };
        } else {
          relatorio = {
            totalRegistrosAuditados: 0,
            totalVinculosAuditados: 0,
            registrosVigentes: 0,
            registrosSuperados: 0,
            lacunasDetectadas: [],
            contradicoesDetectadas: [],
            diagnosticoGeral: "CONSISTENTE",
            auditadoEm: new Date(),
          };
        }

        if (req.headers.accept?.includes("application/json")) {
          return responderJson(res, 200, {
            relatorio,
            registrosRecentes,
            vinculosRecentes,
          });
        }

        const html = renderizarPainelRastreabilidade({
          relatorio,
          registrosRecentes: registrosRecentes.slice(-20).reverse(),
          vinculosRecentes: vinculosRecentes.slice(-20).reverse(),
          feedback: feedbackParam && tipoFeedback ? { tipo: tipoFeedback, mensagem: feedbackParam } : undefined,
        });

        return responderHtml(res, 200, html);
      }

      // 24. POST /rastreabilidade/auditar — Dispara auditoria de integridade ou agenda em background
      if (metodo === "POST" && pathname === "/rastreabilidade/auditar") {
        try {
          if (servicoContexto) {
            await servicoContexto.agendarAuditoriaBackground();
          }

          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 200, { ok: true, mensagem: "Auditoria agendada com sucesso." });
          }

          return redirecionar(
            res,
            "/rastreabilidade?tipo=sucesso&feedback=Auditoria+de+consistência+e+proveniência+executada+com+sucesso!"
          );
        } catch (err: any) {
          if (req.headers.accept?.includes("application/json")) {
            return responderJson(res, 500, { erro: err.message });
          }
          return redirecionar(res, `/rastreabilidade?tipo=erro&feedback=${encodeURIComponent(err.message)}`);
        }
      }

      // 25. GET /rastreabilidade/consulta — Redirecionador por código de entidade
      if (metodo === "GET" && pathname === "/rastreabilidade/consulta") {
        const codigo = url.searchParams.get("codigo")?.trim().toUpperCase();
        const finalidade = url.searchParams.get("finalidade") || "INSPECAO_GERAL";

        if (!codigo) {
          return redirecionar(res, "/rastreabilidade?tipo=erro&feedback=Código+da+entidade+é+obrigatório.");
        }

        // Tenta inferir o tipo pelo prefixo do código
        let prefixo = "entidade";
        if (codigo.startsWith("N-")) prefixo = "necessidade";
        else if (codigo.startsWith("P-")) prefixo = "projeto";
        else if (codigo.startsWith("M-")) prefixo = "modulo";
        else if (codigo.startsWith("EV-")) prefixo = "entrega_de_valor";
        else if (codigo.startsWith("IT-")) prefixo = "item_de_trabalho";

        return redirecionar(
          res,
          `/rastreabilidade/${prefixo}/${encodeURIComponent(codigo)}?finalidade=${encodeURIComponent(finalidade)}`
        );
      }

      // 26. GET /rastreabilidade/:entidade/:codigo — Detalhe da linhagem causal e pacote proporcional
      const matchRastreabilidade = pathname.match(/^\/rastreabilidade\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)$/);
      if (metodo === "GET" && matchRastreabilidade) {
        const [, , codigoRef] = matchRastreabilidade;
        const codigo = codigoRef.trim().toUpperCase();
        const finalidadeParam = (url.searchParams.get("finalidade") as FinalidadeContexto) || FinalidadeContexto.INSPECAO_GERAL;
        const feedbackParam = url.searchParams.get("feedback");
        const tipoFeedback = url.searchParams.get("tipo") as "sucesso" | "erro" | null;

        let trilha: any;
        let pacoteProporcional: any = null;

        if (servicoContexto) {
          trilha = await servicoContexto.obterTrilhaRastreabilidade(codigo);
          pacoteProporcional = await servicoContexto.recuperarContextoPorFinalidade({
            finalidade: finalidadeParam,
            codigoReferencia: codigo,
            incluirHistoricoSuperado: true,
          });
        } else {
          trilha = {
            codigoEntidade: codigo,
            alvo: null,
            registrosRelacionados: [],
            elosAscendencia: [],
            elosDerivacao: [],
            alertas: [],
            diagnostico: "CONSISTENTE",
            recuperadoEm: new Date(),
          };
        }

        if (req.headers.accept?.includes("application/json")) {
          return responderJson(res, 200, {
            trilha,
            pacoteProporcional,
            finalidadeEscolhida: finalidadeParam,
          });
        }

        const html = renderizarDetalhesRastreabilidade({
          trilha,
          pacoteProporcional,
          finalidadeEscolhida: finalidadeParam,
          feedback: feedbackParam && tipoFeedback ? { tipo: tipoFeedback, mensagem: feedbackParam } : undefined,
        });

        return responderHtml(res, 200, html);
      }

      // Rota não encontrada
      return responderHtml(res, 404, "<h1>404 — Página não encontrada</h1>");
    } catch (err: any) {
      console.error("Erro interno no servidor web:", err);
      return responderHtml(res, 500, `<h1>500 — Erro interno</h1><pre>${err.message}</pre>`);
    }
  });

  return server;
}
