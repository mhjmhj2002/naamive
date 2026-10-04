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
import {
  EtapaFormacaoProjeto,
  TipoResultadoProcessoProjeto,
  AtorCompetenteProjeto,
} from "../domain/tipos-projeto.js";
import {
  renderizarListaNecessidades,
  renderizarFormularioNovaNecessidade,
  renderizarDetalhesNecessidade,
  renderizarListaProjetos,
  renderizarDetalhesProjeto,
} from "./templates.js";

export interface DependenciasServidorWeb {
  repositorio: RepositorioNecessidade;
  autenticacaoOwner: PortaAutenticacaoOwner;
  portaProjeto: PortaIntegracaoProjeto;
  portaContexto: PortaIntegracaoContexto;
  filaTarefas?: FilaTarefas;
  servicoProjeto?: ServicoAplicacaoProjeto;
  repositorioProjeto?: RepositorioProjeto;
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

      // Rota não encontrada
      return responderHtml(res, 404, "<h1>404 — Página não encontrada</h1>");
    } catch (err: any) {
      console.error("Erro interno no servidor web:", err);
      return responderHtml(res, 500, `<h1>500 — Erro interno</h1><pre>${err.message}</pre>`);
    }
  });

  return server;
}
