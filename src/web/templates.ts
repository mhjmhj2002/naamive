import { Necessidade } from "../domain/necessidade.js";
import { CompromissoNecessidade } from "../domain/valores.js";
import { StatusNecessidade } from "../domain/tipos.js";
import { Projeto } from "../domain/projeto.js";
import { VisaoProjeto } from "../application/servico-aplicacao-projeto.js";
import { StatusProjeto } from "../domain/tipos-projeto.js";
import { TrabalhoCoordenado, HandoffCoordenacao } from "../domain/coordenacao.js";
import { CondicaoOperacionalTrabalho } from "../domain/tipos-coordenacao.js";
import {
  VisaoTrabalhosCoordenacao,
  DetalheTrabalhoCoordenado,
} from "../application/servico-aplicacao-coordenacao.js";


/**
 * Escapa strings para evitar injeção em HTML.
 */
export function escaparHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Retorna classe badge do Bootstrap conforme status de Necessidade.
 */
function obterClasseBadgeStatus(status: StatusNecessidade): string {
  switch (status) {
    case StatusNecessidade.EM_FORMACAO:
      return "bg-info text-dark";
    case StatusNecessidade.EM_QUALIFICACAO:
      return "bg-primary";
    case StatusNecessidade.AGUARDANDO_DECISAO:
      return "bg-warning text-dark";
    case StatusNecessidade.EM_PROJETO:
      return "bg-success";
    case StatusNecessidade.ATENDIDA:
      return "bg-secondary";
    case StatusNecessidade.CANCELADA:
      return "bg-danger";
    default:
      return "bg-secondary";
  }
}

/**
 * Retorna classe badge do Bootstrap conforme status de Projeto.
 */
export function obterClasseBadgeStatusProjeto(status: StatusProjeto): string {
  switch (status) {
    case StatusProjeto.EM_FORMACAO:
      return "bg-info text-dark";
    case StatusProjeto.FORMADO:
      return "bg-success";
    case StatusProjeto.CONCLUIDO:
      return "bg-primary";
    case StatusProjeto.CANCELADO:
      return "bg-danger";
    default:
      return "bg-secondary";
  }
}

/**
 * Layout mestre HTML5 responsivo com Bootstrap 5 via CDN.
 */
export function layoutMestre(titulo: string, conteudo: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escaparHtml(titulo)} — NAAMIVE</title>
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
  <style>
    body {
      background-color: #f8f9fa;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .navbar-brand {
      font-weight: 700;
      letter-spacing: 0.05rem;
    }
    .badge-status {
      font-size: 0.9rem;
      padding: 0.4em 0.7em;
    }
    .card-resumo {
      border-radius: 0.5rem;
      box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
    }
    .historico-item {
      border-left: 3px solid #0d6efd;
      padding-left: 1rem;
      margin-bottom: 1rem;
    }
    .historico-item.owner {
      border-left-color: #198754;
    }
    .historico-item.auditoria {
      border-left-color: #ffc107;
    }
    .historico-item.qualificacao {
      border-left-color: #0dcaf0;
    }
    .historico-item.formacao {
      border-left-color: #0d6efd;
    }
    .card-direcao {
      background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
      border: 2px solid #198754;
    }
  </style>
</head>
<body>
  <!-- Barra de Navegação Superior Responsiva -->
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4 shadow-sm">
    <div class="container">
      <a class="navbar-brand" href="/">NAAMIVE</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menuPrincipal" aria-controls="menuPrincipal" aria-expanded="false" aria-label="Alternar navegação">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="menuPrincipal">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item">
            <a class="nav-link" href="/">Necessidades</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/projetos">Projetos</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/coordenacao">Coordenação</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/nova">Nova Necessidade</a>
          </li>
        </ul>
        <span class="navbar-text text-light small">
          EV-001, EV-002 & EV-003 — Condução Autônoma do NAAMIVE
        </span>
      </div>
    </div>
  </nav>

  <main class="container pb-5">
    ${conteudo}
  </main>

  <footer class="container text-center py-4 border-top text-muted small">
    NAAMIVE — Governança e Condução Autônoma de Necessidades de Negócio &copy; 2026
  </footer>

  <!-- Bootstrap 5 Bundle com Popper -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
</body>
</html>`;
}

/**
 * Renderiza a listagem de Necessidades.
 */
export function renderizarListaNecessidades(necessidades: Necessidade[]): string {
  const itensTabela = necessidades.map((n) => {
    const badge = `<span class="badge ${obterClasseBadgeStatus(n.status)} badge-status">${n.status}</span>`;
    return `
      <tr>
        <td><strong>${escaparHtml(n.codigo)}</strong></td>
        <td><a href="/necessidades/${escaparHtml(n.id)}" class="text-decoration-none fw-bold">${escaparHtml(n.titulo)}</a></td>
        <td><span class="badge bg-light text-dark border">${escaparHtml(n.tipo)}</span></td>
        <td>${badge}</td>
        <td><small class="text-muted">${n.criadoEm.toLocaleDateString("pt-BR")}</small></td>
        <td>
          <a href="/necessidades/${escaparHtml(n.id)}" class="btn btn-sm btn-outline-primary">Acompanhar</a>
        </td>
      </tr>
    `;
  }).join("");

  const conteudoVazio = `
    <div class="alert alert-info py-4 text-center">
      <h5>Nenhuma Necessidade cadastrada</h5>
      <p class="mb-3">Registre a primeira demanda para iniciar a jornada autônoma da EV-001.</p>
      <a href="/nova" class="btn btn-primary">Registrar Necessidade</a>
    </div>
  `;

  const conteudo = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="h3 mb-1">Necessidades de Negócio</h1>
        <p class="text-muted mb-0">Painel de condução e acompanhamento do ciclo de vida da demanda</p>
      </div>
      <div>
        <a href="/nova" class="btn btn-primary shadow-sm">+ Nova Necessidade</a>
      </div>
    </div>

    ${necessidades.length === 0 ? conteudoVazio : `
      <div class="card card-resumo border-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th scope="col" style="width: 100px;">Código</th>
                <th scope="col">Título</th>
                <th scope="col">Tipo</th>
                <th scope="col">Status Atual</th>
                <th scope="col">Criação</th>
                <th scope="col" style="width: 120px;">Ação</th>
              </tr>
            </thead>
            <tbody>
              ${itensTabela}
            </tbody>
          </table>
        </div>
      </div>
    `}
  `;

  return layoutMestre("Lista de Necessidades", conteudo);
}

/**
 * Renderiza o formulário de cadastro de nova Necessidade.
 */
export function renderizarFormularioNovaNecessidade(erros?: string[]): string {
  const mensagensErro = erros && erros.length > 0 ? `
    <div class="alert alert-danger mb-4">
      <h6 class="alert-heading fw-bold mb-2">Foram encontrados os seguintes erros:</h6>
      <ul class="mb-0">
        ${erros.map(e => `<li>${escaparHtml(e)}</li>`).join("")}
      </ul>
    </div>
  ` : "";

  const conteudo = `
    <div class="row justify-content-center">
      <div class="col-lg-8">
        <div class="d-flex align-items-center justify-content-between mb-4">
          <h1 class="h3 mb-0">Registrar Nova Necessidade</h1>
          <a href="/" class="btn btn-outline-secondary btn-sm">&larr; Voltar</a>
        </div>

        ${mensagensErro}

        <div class="card card-resumo border-0 p-4">
          <form action="/necessidades" method="POST">
            <div class="row mb-3">
              <div class="col-md-4">
                <label for="codigo" class="form-label fw-bold">Código *</label>
                <input type="text" class="form-control" id="codigo" name="codigo" placeholder="ex: N-002" required>
              </div>
              <div class="col-md-8">
                <label for="titulo" class="form-label fw-bold">Título da Necessidade *</label>
                <input type="text" class="form-control" id="titulo" name="titulo" placeholder="ex: Automação do Ciclo Financeiro" required>
              </div>
            </div>

            <div class="row mb-3">
              <div class="col-md-6">
                <label for="tipo" class="form-label fw-bold">Tipo da Necessidade *</label>
                <select class="form-select" id="tipo" name="tipo" required>
                  <option value="NOVO_PRODUTO">Novo Produto</option>
                  <option value="EVOLUCAO_DE_PRODUTO" selected>Evolução de Produto</option>
                </select>
              </div>
              <div class="col-md-6">
                <label for="origem" class="form-label fw-bold">Origem da Demanda *</label>
                <input type="text" class="form-control" id="origem" name="origem" placeholder="ex: Solicitado pela Diretoria de Operações" required>
              </div>
            </div>

            <div class="mb-3">
              <label for="problemaOuOportunidade" class="form-label fw-bold">Problema ou Oportunidade *</label>
              <textarea class="form-control" id="problemaOuOportunidade" name="problemaOuOportunidade" rows="2" placeholder="Qual a dor ou oportunidade concreta a ser tratada?" required></textarea>
            </div>

            <div class="row mb-3">
              <div class="col-md-6">
                <label for="quemEAfetado" class="form-label fw-bold">Quem é Afetado *</label>
                <input type="text" class="form-control" id="quemEAfetado" name="quemEAfetado" placeholder="ex: Usuários da tesouraria e auditores" required>
              </div>
              <div class="col-md-6">
                <label for="resultadoPretendido" class="form-label fw-bold">Resultado Pretendido *</label>
                <input type="text" class="form-control" id="resultadoPretendido" name="resultadoPretendido" placeholder="ex: Conciliação em menos de 5 minutos" required>
              </div>
            </div>

            <div class="row mb-3">
              <div class="col-md-6">
                <label for="escopoInicial" class="form-label fw-bold">Escopo Inicial *</label>
                <textarea class="form-control" id="escopoInicial" name="escopoInicial" rows="2" placeholder="O que faz parte desta demanda?" required></textarea>
              </div>
              <div class="col-md-6">
                <label for="foraDeEscopo" class="form-label fw-bold">Fora de Escopo *</label>
                <textarea class="form-control" id="foraDeEscopo" name="foraDeEscopo" rows="2" placeholder="O que expressamente NÃO faz parte?" required></textarea>
              </div>
            </div>

            <div class="row mb-3">
              <div class="col-md-6">
                <label for="criterioDeAtendimento" class="form-label fw-bold">Critério de Atendimento *</label>
                <textarea class="form-control" id="criterioDeAtendimento" name="criterioDeAtendimento" rows="2" placeholder="Como comprovar que foi atendida?" required></textarea>
              </div>
              <div class="col-md-6">
                <label for="porQueIssoImporta" class="form-label fw-bold">Por que isso importa *</label>
                <textarea class="form-control" id="porQueIssoImporta" name="porQueIssoImporta" rows="2" placeholder="Valor de negócio esperado" required></textarea>
              </div>
            </div>

            <div class="mb-4">
              <label for="restricoesOuDependencias" class="form-label">Restrições ou Dependências</label>
              <input type="text" class="form-control" id="restricoesOuDependencias" name="restricoesOuDependencias" placeholder="Opcional. Ex: Conformidade LGPD">
            </div>

            <div class="d-flex justify-content-end gap-2">
              <a href="/" class="btn btn-light">Cancelar</a>
              <button type="submit" class="btn btn-primary px-4">Salvar e Iniciar Formação</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  return layoutMestre("Nova Necessidade", conteudo);
}

/**
 * Renderiza os detalhes de uma Necessidade, incluindo histórico, ações de atores e decisão do Owner.
 */
export function renderizarDetalhesNecessidade(
  necessidade: Necessidade,
  compromisso: CompromissoNecessidade | null,
  mensagemFeedback?: { tipo: "sucesso" | "erro"; texto: string }
): string {
  const badgeStatus = `<span class="badge ${obterClasseBadgeStatus(necessidade.status)} badge-status">${necessidade.status}</span>`;

  const alertaFeedback = mensagemFeedback ? `
    <div class="alert alert-${mensagemFeedback.tipo === "sucesso" ? "success" : "danger"} alert-dismissible fade show mb-4">
      ${escaparHtml(mensagemFeedback.texto)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    </div>
  ` : "";

  // Painel de Compromisso Consolidado (quando existente)
  const painelCompromisso = compromisso ? `
    <div class="card border-success shadow-sm mb-4">
      <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Compromisso da Necessidade (Consolidado)</h5>
        <span class="badge bg-light text-success fw-bold">Disponível para M-002</span>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <h6 class="text-muted small text-uppercase">Problema Assumido</h6>
            <p class="mb-0 fw-semibold">${escaparHtml(compromisso.problemaAssumido)}</p>
          </div>
          <div class="col-md-6">
            <h6 class="text-muted small text-uppercase">Resultado Pretendido</h6>
            <p class="mb-0 fw-semibold">${escaparHtml(compromisso.resultadoPretendido)}</p>
          </div>
          <div class="col-md-6">
            <h6 class="text-muted small text-uppercase">Escopo Assumido</h6>
            <p class="mb-0">${escaparHtml(compromisso.escopoAssumido)}</p>
          </div>
          <div class="col-md-6">
            <h6 class="text-muted small text-uppercase">Fora de Escopo</h6>
            <p class="mb-0">${escaparHtml(compromisso.foraDeEscopo)}</p>
          </div>
          <div class="col-md-12">
            <h6 class="text-muted small text-uppercase">Critério de Atendimento</h6>
            <p class="mb-0">${escaparHtml(compromisso.criterioDeAtendimento)}</p>
          </div>
          <div class="col-12 border-top pt-2 mt-2 d-flex justify-content-between text-muted small">
            <span>Aprovado formalmente por: <strong>${escaparHtml(compromisso.usuarioAprovador)}</strong> (Owner)</span>
            <span>Data de Consolidação: ${compromisso.consolidadoEm.toLocaleString("pt-BR")}</span>
          </div>
        </div>
      </div>
    </div>
  ` : "";

  // Painel de Ações de Governança e Transições Conforme o Status Atual
  let acoesGovernança = "";

  if (necessidade.status === StatusNecessidade.EM_FORMACAO) {
    acoesGovernança = `
      <div class="card card-resumo border-0 mb-4">
        <div class="card-header bg-light">
          <h5 class="card-title mb-0 h6 fw-bold">Ações da Vertical: Formação & Auditoria</h5>
        </div>
        <div class="card-body">
          <p class="small text-muted mb-3">
            Para avançar de <code>EM_FORMACAO</code> para <code>EM_QUALIFICACAO</code>, é obrigatório emitir parecer prévio <code>QUALIFICAVEL</code> pelo <strong>Auditor da Necessidade</strong>.
          </p>
          <div class="d-flex flex-wrap gap-2">
            <form action="/necessidades/${escaparHtml(necessidade.id)}/parecer-auditoria" method="POST" class="d-inline">
              <input type="hidden" name="tipoResultado" value="QUALIFICAVEL">
              <button type="submit" class="btn btn-outline-success btn-sm">Emitir Parecer QUALIFICAVEL (Auditor)</button>
            </form>
            <form action="/necessidades/${escaparHtml(necessidade.id)}/avancar-qualificacao" method="POST" class="d-inline">
              <button type="submit" class="btn btn-primary btn-sm">Concluir Formação &rarr; Avançar para Qualificação</button>
            </form>
          </div>
        </div>
      </div>
    `;
  } else if (necessidade.status === StatusNecessidade.EM_QUALIFICACAO) {
    acoesGovernança = `
      <div class="card card-resumo border-0 mb-4">
        <div class="card-header bg-light">
          <h5 class="card-title mb-0 h6 fw-bold">Ações da Vertical: Qualificação da Demanda</h5>
        </div>
        <div class="card-body">
          <p class="small text-muted mb-3">
            O <strong>Especialista em Qualificação</strong> deve recomendar <code>ASSUMIR_COMPROMISSO</code> ou <code>NAO_ASSUMIR_COMPROMISSO</code> antes da submissão à Decisão do Owner.
          </p>
          <div class="d-flex flex-wrap gap-2">
            <form action="/necessidades/${escaparHtml(necessidade.id)}/recomendacao-qualificacao" method="POST" class="d-inline">
              <input type="hidden" name="tipoResultado" value="ASSUMIR_COMPROMISSO">
              <button type="submit" class="btn btn-outline-primary btn-sm">Emitir Recomendação ASSUMIR (Especialista)</button>
            </form>
            <form action="/necessidades/${escaparHtml(necessidade.id)}/submeter-decisao" method="POST" class="d-inline">
              <button type="submit" class="btn btn-warning btn-sm text-dark">Submeter para Decisão do Owner</button>
            </form>
          </div>
        </div>
      </div>
    `;
  } else if (necessidade.status === StatusNecessidade.AGUARDANDO_DECISAO) {
    acoesGovernança = `
      <div class="card card-resumo border-warning mb-4">
        <div class="card-header bg-warning bg-opacity-25 d-flex justify-content-between align-items-center">
          <h5 class="card-title mb-0 h6 fw-bold text-dark">Decisão Humana Material do Owner</h5>
          <span class="badge bg-warning text-dark">Ação Exclusiva do Owner</span>
        </div>
        <div class="card-body">
          <p class="small text-muted mb-3">
            Apenas um <strong>Owner autenticado</strong> (ex: <code>mhj</code>) pode registrar a decisão material de aprovação para assumir o compromisso e disponibilizá-lo para M-002.
          </p>
          <form action="/necessidades/${escaparHtml(necessidade.id)}/decisao-owner" method="POST">
            <div class="row g-2 mb-3">
              <div class="col-md-4">
                <label for="usuarioOwner" class="form-label small fw-bold">Usuário do Owner *</label>
                <input type="text" class="form-control form-control-sm" id="usuarioOwner" name="usuario" value="mhj" required>
              </div>
              <div class="col-md-8">
                <label for="justificativa" class="form-label small fw-bold">Justificativa da Decisão</label>
                <input type="text" class="form-control form-control-sm" id="justificativa" name="justificativa" placeholder="Opcional. Ex: Alinhado aos objetivos estratégicos">
              </div>
            </div>
            <div class="d-flex gap-2">
              <button type="submit" name="decisao" value="APROVADO" class="btn btn-success btn-sm px-3 fw-bold">
                ✓ Aprovar Compromisso (APROVADO)
              </button>
              <button type="submit" name="decisao" value="CANCELAMENTO_APROVADO" class="btn btn-outline-danger btn-sm">
                ✕ Cancelar Demanda
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  } else if (necessidade.status === StatusNecessidade.EM_PROJETO) {
    acoesGovernança = `
      <div class="alert alert-success d-flex justify-content-between align-items-center mb-4">
        <div>
          <strong class="d-block">Compromisso Aprovado e Materializado no Projeto!</strong>
          <span class="small">Esta necessidade avançou para <code>EM_PROJETO</code> com confirmação de bootstrap no M-002.</span>
        </div>
        ${necessidade.projetoId ? `
          <a href="/projetos/${escaparHtml(necessidade.projetoId)}" class="btn btn-sm btn-success fw-bold text-nowrap ms-3">
            Ver Projeto no M-002 &rarr;
          </a>
        ` : ""}
      </div>
    `;
  }

  // Renderização do Histórico Imutável de Atividades
  const itensHistorico = necessidade.historico.map((act) => {
    let classeExtra = "";
    if (act.atorCompetente.toLowerCase().includes("owner")) classeExtra = "owner";
    else if (act.atorCompetente.toLowerCase().includes("auditor")) classeExtra = "auditoria";
    else if (act.atorCompetente.toLowerCase().includes("qualificacao")) classeExtra = "qualificacao";

    return `
      <div class="historico-item ${classeExtra}">
        <div class="d-flex justify-content-between align-items-start">
          <strong class="text-dark">${escaparHtml(act.atividade)}</strong>
          <small class="text-muted">${act.registradoEm.toLocaleString("pt-BR")}</small>
        </div>
        <div class="small text-muted">
          Ator: <span class="badge bg-light text-dark border">${escaparHtml(act.atorCompetente)}</span>
          ${act.statusAnterior && act.statusNovo ? ` | Transição: <code>${act.statusAnterior}</code> &rarr; <code>${act.statusNovo}</code>` : ""}
        </div>
      </div>
    `;
  }).join("");

  const conteudo = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <div class="d-flex align-items-center gap-2 mb-1">
          <span class="badge bg-secondary">${escaparHtml(necessidade.codigo)}</span>
          ${badgeStatus}
        </div>
        <h1 class="h3 mb-0">${escaparHtml(necessidade.titulo)}</h1>
      </div>
      <div>
        <a href="/" class="btn btn-outline-secondary btn-sm">&larr; Voltar à lista</a>
      </div>
    </div>

    ${alertaFeedback}
    ${painelCompromisso}
    ${acoesGovernança}

    <div class="row">
      <!-- Coluna Principal com Dados de Negócio -->
      <div class="col-lg-8 mb-4">
        <div class="card card-resumo border-0 mb-4 p-4">
          <h5 class="border-bottom pb-2 mb-3">Conteúdo de Negócio</h5>
          <div class="mb-3">
            <h6 class="text-muted small text-uppercase">Problema ou Oportunidade</h6>
            <p class="mb-0">${escaparHtml(necessidade.problemaOuOportunidade)}</p>
          </div>
          <div class="row mb-3">
            <div class="col-md-6">
              <h6 class="text-muted small text-uppercase">Quem é Afetado</h6>
              <p class="mb-0">${escaparHtml(necessidade.quemEAfetado)}</p>
            </div>
            <div class="col-md-6">
              <h6 class="text-muted small text-uppercase">Resultado Pretendido</h6>
              <p class="mb-0">${escaparHtml(necessidade.resultadoPretendido)}</p>
            </div>
          </div>
          <div class="row mb-3">
            <div class="col-md-6">
              <h6 class="text-muted small text-uppercase">Escopo Inicial</h6>
              <p class="mb-0">${escaparHtml(necessidade.escopoInicial)}</p>
            </div>
            <div class="col-md-6">
              <h6 class="text-muted small text-uppercase">Fora de Escopo</h6>
              <p class="mb-0">${escaparHtml(necessidade.foraDeEscopo)}</p>
            </div>
          </div>
          <div class="row mb-3">
            <div class="col-md-6">
              <h6 class="text-muted small text-uppercase">Critério de Atendimento</h6>
              <p class="mb-0">${escaparHtml(necessidade.criterioDeAtendimento)}</p>
            </div>
            <div class="col-md-6">
              <h6 class="text-muted small text-uppercase">Por que isso importa</h6>
              <p class="mb-0">${escaparHtml(necessidade.porQueIssoImporta)}</p>
            </div>
          </div>
          <div>
            <h6 class="text-muted small text-uppercase">Restrições ou Dependências</h6>
            <p class="mb-0">${escaparHtml(necessidade.restricoesOuDependencias)}</p>
          </div>
        </div>
      </div>

      <!-- Coluna Lateral com Histórico e Resultados do Processo -->
      <div class="col-lg-4 mb-4">
        <div class="card card-resumo border-0 mb-4 p-3">
          <h6 class="fw-bold mb-3">Histórico de Atividades</h6>
          <div style="max-height: 400px; overflow-y: auto;" class="pe-1">
            ${itensHistorico}
          </div>
        </div>

        <div class="card card-resumo border-0 p-3">
          <h6 class="fw-bold mb-3">Resultados do Processo</h6>
          ${necessidade.resultados.length === 0 ? `
            <p class="small text-muted mb-0">Nenhum resultado formal registrado até o momento.</p>
          ` : `
            <ul class="list-unstyled mb-0">
              ${necessidade.resultados.map(r => `
                <li class="mb-2 pb-2 border-bottom">
                  <span class="badge bg-light text-dark border small">${escaparHtml(r.tipoResultado)}</span>
                  <div class="small text-muted mt-1">Por: ${escaparHtml(r.atorCompetente)} em ${r.emitidoEm.toLocaleDateString("pt-BR")}</div>
                </li>
              `).join("")}
            </ul>
          `}
        </div>
      </div>
    </div>
  `;

  return layoutMestre(`Detalhes: ${necessidade.codigo}`, conteudo);
}

/**
 * Renderiza a listagem de Projetos.
 */
export function renderizarListaProjetos(projetos: (Projeto | VisaoProjeto)[]): string {
  const itensTabela = projetos.map((p) => {
    const badge = `<span class="badge ${obterClasseBadgeStatusProjeto(p.status)} badge-status">${p.status}</span>`;
    return `
      <tr>
        <td><strong>${escaparHtml(p.codigo)}</strong></td>
        <td><a href="/projetos/${escaparHtml(p.id)}" class="text-decoration-none fw-bold">${escaparHtml(p.titulo)}</a></td>
        <td>
          <a href="/necessidades/${escaparHtml(p.necessidadeId)}" class="badge bg-light text-primary border text-decoration-none">
            ${escaparHtml(p.necessidadeId)}
          </a>
        </td>
        <td>${badge}</td>
        <td>
          <span class="badge bg-light text-dark border">
            ${p.etapas ? p.etapas.length : 0} etapa(s)
          </span>
        </td>
        <td><small class="text-muted">${p.criadoEm.toLocaleDateString("pt-BR")}</small></td>
        <td>
          <a href="/projetos/${escaparHtml(p.id)}" class="btn btn-sm btn-outline-primary">Acompanhar</a>
        </td>
      </tr>
    `;
  }).join("");

  const conteudoVazio = `
    <div class="alert alert-info py-4 text-center">
      <h5>Nenhum Projeto materializado</h5>
      <p class="mb-3">Projetos são gerados automaticamente a partir de Necessidades aprovadas pelo Owner com Compromisso consolidado (relação 1:1).</p>
      <a href="/" class="btn btn-primary">Ver Necessidades</a>
    </div>
  `;

  const conteudo = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="h3 mb-1">Projetos de Software (M-002)</h1>
        <p class="text-muted mb-0">Painel de formação e acompanhamento da Direção da Solução (EV-002)</p>
      </div>
      <div>
        <a href="/" class="btn btn-outline-secondary btn-sm">&larr; Ver Necessidades</a>
      </div>
    </div>

    ${projetos.length === 0 ? conteudoVazio : `
      <div class="card card-resumo border-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th scope="col" style="width: 100px;">Código</th>
                <th scope="col">Título</th>
                <th scope="col">Necessidade (1:1)</th>
                <th scope="col">Status Atual</th>
                <th scope="col">Formação</th>
                <th scope="col">Criação</th>
                <th scope="col" style="width: 120px;">Ação</th>
              </tr>
            </thead>
            <tbody>
              ${itensTabela}
            </tbody>
          </table>
        </div>
      </div>
    `}
  `;

  return layoutMestre("Lista de Projetos", conteudo);
}

/**
 * Renderiza os detalhes de um Projeto, histórico de formação, pareceres de auditoria,
 * visualização da Direção aprovada e ações de governança (auditoria, avanço e cancelamento pelo Owner).
 */
export function renderizarDetalhesProjeto(
  projeto: Projeto | VisaoProjeto,
  necessidadeOrigem?: Necessidade | null,
  mensagemFeedback?: { tipo: "sucesso" | "erro"; texto: string }
): string {
  const badgeStatus = `<span class="badge ${obterClasseBadgeStatusProjeto(projeto.status)} badge-status">${projeto.status}</span>`;

  const alertaFeedback = mensagemFeedback ? `
    <div class="alert alert-${mensagemFeedback.tipo === "sucesso" ? "success" : "danger"} alert-dismissible fade show mb-4">
      ${escaparHtml(mensagemFeedback.texto)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    </div>
  ` : "";

  // Painel de Direção do Projeto Aprovada (Destaque quando FORMADO)
  const painelDirecao = projeto.direcao ? `
    <div class="card card-direcao shadow-sm mb-4">
      <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Direção do Projeto (Consolidada e Aprovada)</h5>
        <span class="badge bg-light text-success fw-bold">Disponível para Módulos</span>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-12">
            <h6 class="text-muted small text-uppercase fw-bold">Objetivo do Projeto</h6>
            <p class="mb-0 fs-6 fw-semibold text-dark">${escaparHtml(projeto.direcao.objetivoProjeto)}</p>
          </div>
          <div class="col-md-6">
            <h6 class="text-muted small text-uppercase fw-bold">Compromisso de Origem (N-001)</h6>
            <p class="mb-0">${escaparHtml(projeto.direcao.compromissoOrigem)}</p>
          </div>
          <div class="col-md-6">
            <h6 class="text-muted small text-uppercase fw-bold">Fronteiras Delimitadas</h6>
            <p class="mb-0">${escaparHtml(projeto.direcao.fronteiras)}</p>
          </div>
          <div class="col-md-12">
            <h6 class="text-muted small text-uppercase fw-bold">Contexto Técnico Relevante</h6>
            <p class="mb-0 bg-white p-3 rounded border text-secondary">${escaparHtml(projeto.direcao.contextoRelevante)}</p>
          </div>
          <div class="col-12 border-top pt-2 mt-2 d-flex justify-content-between text-muted small">
            <span>Consolidado pela Formação e Auditoria da EV-002</span>
            <span>Aprovado em: ${new Date(projeto.direcao.aprovadoEm).toLocaleString("pt-BR")}</span>
          </div>
        </div>
      </div>
    </div>
  ` : "";

  // Ações de Governança Conforme o Status
  let acoesGovernança = "";

  if (projeto.status === StatusProjeto.EM_FORMACAO) {
    acoesGovernança = `
      <div class="card card-resumo border-0 mb-4">
        <div class="card-header bg-light d-flex justify-content-between align-items-center">
          <h5 class="card-title mb-0 h6 fw-bold">Ações da Vertical: Formação & Auditoria do Projeto (EV-002)</h5>
          <span class="badge bg-info text-dark">EM_FORMACAO</span>
        </div>
        <div class="card-body">
          <p class="small text-muted mb-3">
            O <strong>Especialista em Formação do Projeto</strong> pode registrar etapas (Enquadramento, Descoberta e Direção da Solução). O <strong>Auditor do Projeto</strong> emite o parecer independente <code>FORMACAO_SUFICIENTE</code> para concluir a formação e disponibilizar a Direção.
          </p>
          
          <div class="row g-3">
            <!-- Formulário de Registro de Etapa -->
            <div class="col-lg-6">
              <div class="p-3 border rounded bg-white h-100">
                <h6 class="fw-bold mb-2 small text-uppercase text-primary">Registrar Etapa de Formação</h6>
                <form action="/projetos/${escaparHtml(projeto.id)}/etapas" method="POST">
                  <div class="mb-2">
                    <label for="etapaNome" class="form-label small">Etapa</label>
                    <select class="form-select form-select-sm" id="etapaNome" name="etapa" required>
                      <option value="ENQUADRAMENTO">ENQUADRAMENTO</option>
                      <option value="DESCOBERTA">DESCOBERTA</option>
                      <option value="DIREÇÃO DA SOLUÇÃO">DIREÇÃO DA SOLUÇÃO</option>
                    </select>
                  </div>
                  <div class="mb-2">
                    <label for="detalheEtapa" class="form-label small">Descrição / Conteúdo Técnico</label>
                    <textarea class="form-control form-control-sm" id="detalheEtapa" name="detalhe" rows="2" placeholder="Resumo do avanço da etapa..." required></textarea>
                  </div>
                  <button type="submit" class="btn btn-outline-primary btn-sm w-100">Salvar Etapa de Formação</button>
                </form>
              </div>
            </div>

            <!-- Formulário de Emissão de Parecer / Conclusão -->
            <div class="col-lg-6">
              <div class="p-3 border rounded bg-white h-100">
                <h6 class="fw-bold mb-2 small text-uppercase text-success">Auditoria e Conclusão de Formação</h6>
                <form action="/projetos/${escaparHtml(projeto.id)}/parecer-auditoria" method="POST">
                  <div class="mb-2">
                    <label for="resultadoAuditoria" class="form-label small">Resultado do Processo</label>
                    <select class="form-select form-select-sm" id="resultadoAuditoria" name="resultado" required>
                      <option value="FORMACAO_SUFICIENTE">FORMACAO_SUFICIENTE (Aprovar e Gerar Direção)</option>
                      <option value="FORMACAO_INSUFICIENTE">FORMACAO_INSUFICIENTE (Manter em Formação)</option>
                    </select>
                  </div>
                  <div class="mb-2">
                    <label for="parecerTexto" class="form-label small">Parecer do Auditor</label>
                    <input type="text" class="form-control form-control-sm" id="parecerTexto" name="parecer" placeholder="Parecer circunstanciado..." required>
                  </div>
                  <div class="mb-2">
                    <label for="objetivoDirecao" class="form-label small">Objetivo da Direção (se SUFICIENTE)</label>
                    <input type="text" class="form-control form-control-sm" id="objetivoDirecao" name="objetivoProjeto" placeholder="Objetivo técnico principal..." value="Construir arquitetura e módulos da solução">
                  </div>
                  <button type="submit" class="btn btn-success btn-sm w-100 fw-bold">Emitir Parecer e Concluir Formação</button>
                </form>
              </div>
            </div>
          </div>

          <!-- Ação Excepcional de Cancelamento pelo Owner -->
          <div class="border-top pt-3 mt-3">
            <h6 class="fw-bold mb-2 small text-uppercase text-danger">Cancelamento Excepcional (Decisão Material do Owner)</h6>
            <form action="/projetos/${escaparHtml(projeto.id)}/cancelar" method="POST" class="row g-2 align-items-center">
              <div class="col-md-3">
                <input type="text" class="form-control form-control-sm" name="usuario" placeholder="Usuário Owner (ex: mhj)" required>
              </div>
              <div class="col-md-6">
                <input type="text" class="form-control form-control-sm" name="justificativa" placeholder="Justificativa formal de cancelamento..." required>
              </div>
              <div class="col-md-3">
                <button type="submit" class="btn btn-outline-danger btn-sm w-100">✕ Cancelar Projeto</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  } else if (projeto.status === StatusProjeto.FORMADO) {
    acoesGovernança = `
      <div class="alert alert-success d-flex justify-content-between align-items-center mb-4">
        <div>
          <strong class="d-block">Projeto Formado com Sucesso!</strong>
          <span class="small">A Direção do Projeto está consolidada e aprovada pela Auditoria da EV-002, pronta para consumo pelos Módulos e Entregas de Valor.</span>
        </div>
        <div class="d-flex gap-2">
          <!-- Ação de cancelamento excepcional pelo Owner disponível até status terminal -->
          <button class="btn btn-sm btn-outline-danger" type="button" data-bs-toggle="collapse" data-bs-target="#boxCancelamento" aria-expanded="false">
            Cancelamento do Owner...
          </button>
        </div>
      </div>

      <div class="collapse mb-4" id="boxCancelamento">
        <div class="card card-body border-danger p-3 bg-light">
          <h6 class="fw-bold text-danger mb-2 small text-uppercase">Cancelamento Excepcional pelo Owner (mhj)</h6>
          <form action="/projetos/${escaparHtml(projeto.id)}/cancelar" method="POST" class="row g-2 align-items-center">
            <div class="col-md-3">
              <input type="text" class="form-control form-control-sm" name="usuario" placeholder="Usuário Owner (ex: mhj)" required>
            </div>
            <div class="col-md-6">
              <input type="text" class="form-control form-control-sm" name="justificativa" placeholder="Justificativa formal do cancelamento..." required>
            </div>
            <div class="col-md-3">
              <button type="submit" class="btn btn-danger btn-sm w-100">Confirmar Cancelamento</button>
            </div>
          </form>
        </div>
      </div>
    `;
  } else if (projeto.status === StatusProjeto.CANCELADO) {
    acoesGovernança = `
      <div class="alert alert-danger mb-4">
        <strong>Projeto Cancelado por Decisão Material do Owner</strong>
        <p class="mb-0 small">Este projeto foi encerrado em status terminal e não admite novas modificações ou transições.</p>
      </div>
    `;
  }

  // Renderização das Etapas de Formação
  const etapasLista = projeto.etapas && projeto.etapas.length > 0 ? projeto.etapas.map((et) => `
    <div class="historico-item formacao mb-3">
      <div class="d-flex justify-content-between align-items-start">
        <strong class="text-dark">${escaparHtml(et.etapa)}</strong>
        <small class="text-muted">${new Date(et.registradoEm).toLocaleString("pt-BR")}</small>
      </div>
      <div class="small text-muted mb-1">
        Registrado por: <span class="badge bg-light text-dark border">${escaparHtml(et.registradoPor)}</span>
      </div>
      <pre class="bg-light p-2 rounded small mb-0 font-monospace">${escaparHtml(JSON.stringify(et.conteudo, null, 2))}</pre>
    </div>
  `).join("") : `<p class="small text-muted mb-0">Nenhuma etapa de formação registrada ainda.</p>`;

  // Renderização das Auditorias
  const auditoriasLista = projeto.auditorias && projeto.auditorias.length > 0 ? projeto.auditorias.map((aud) => `
    <div class="historico-item auditoria mb-3">
      <div class="d-flex justify-content-between align-items-start">
        <strong class="${aud.resultado.includes("SUFICIENTE") ? "text-success" : "text-warning"}">${escaparHtml(aud.resultado)}</strong>
        <small class="text-muted">${new Date(aud.auditadoEm).toLocaleString("pt-BR")}</small>
      </div>
      <div class="small text-muted mb-1">
        Auditor: <span class="badge bg-light text-dark border">${escaparHtml(aud.auditor)}</span>
      </div>
      <p class="small mb-0 text-dark">${escaparHtml(aud.parecer)}</p>
    </div>
  `).join("") : `<p class="small text-muted mb-0">Nenhum parecer de auditoria registrado ainda.</p>`;

  const conteudo = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <div class="d-flex align-items-center gap-2 mb-1">
          <span class="badge bg-dark">${escaparHtml(projeto.codigo)}</span>
          ${badgeStatus}
          <a href="/necessidades/${escaparHtml(projeto.necessidadeId)}" class="badge bg-info text-dark text-decoration-none">
            Origem: ${escaparHtml(necessidadeOrigem ? necessidadeOrigem.codigo : projeto.necessidadeId)}
          </a>
        </div>
        <h1 class="h3 mb-0">${escaparHtml(projeto.titulo)}</h1>
      </div>
      <div>
        <a href="/projetos" class="btn btn-outline-secondary btn-sm">&larr; Voltar aos Projetos</a>
      </div>
    </div>

    ${alertaFeedback}
    ${painelDirecao}
    ${acoesGovernança}

    <div class="row">
      <!-- Coluna Principal com Etapas e Pareceres -->
      <div class="col-lg-7 mb-4">
        <div class="card card-resumo border-0 mb-4 p-4">
          <h5 class="border-bottom pb-2 mb-3">Etapas de Formação Técnica (M-002)</h5>
          <div>
            ${etapasLista}
          </div>
        </div>

        <div class="card card-resumo border-0 p-4">
          <h5 class="border-bottom pb-2 mb-3">Auditoria Independente do Projeto</h5>
          <div>
            ${auditoriasLista}
          </div>
        </div>
      </div>

      <!-- Coluna Lateral com Contexto da Necessidade e Metadados -->
      <div class="col-lg-5 mb-4">
        <div class="card card-resumo border-0 mb-4 p-4">
          <h5 class="border-bottom pb-2 mb-3">Vínculo com Necessidade de Origem (1:1)</h5>
          ${necessidadeOrigem ? `
            <div class="mb-3">
              <h6 class="text-muted small text-uppercase">Título da Demanda</h6>
              <p class="fw-bold mb-1">${escaparHtml(necessidadeOrigem.titulo)}</p>
              <span class="badge bg-light text-dark border">${escaparHtml(necessidadeOrigem.codigo)}</span>
              <span class="badge bg-success ms-1">${escaparHtml(necessidadeOrigem.status)}</span>
            </div>
            <div class="mb-3">
              <h6 class="text-muted small text-uppercase">Problema Assumido</h6>
              <p class="small mb-0">${escaparHtml(necessidadeOrigem.problemaOuOportunidade)}</p>
            </div>
            <div class="mb-3">
              <h6 class="text-muted small text-uppercase">Resultado Pretendido</h6>
              <p class="small mb-0">${escaparHtml(necessidadeOrigem.resultadoPretendido)}</p>
            </div>
            <a href="/necessidades/${escaparHtml(necessidadeOrigem.id)}" class="btn btn-sm btn-outline-primary w-100">
              Ver Detalhes da Necessidade &rarr;
            </a>
          ` : `
            <p class="small text-muted mb-2">ID da Necessidade: <code>${escaparHtml(projeto.necessidadeId)}</code></p>
            <a href="/necessidades/${escaparHtml(projeto.necessidadeId)}" class="btn btn-sm btn-outline-primary w-100">
              Ver Necessidade de Origem &rarr;
            </a>
          `}
        </div>

        <div class="card card-resumo border-0 p-4">
          <h5 class="border-bottom pb-2 mb-3">Metadados de Rastreabilidade</h5>
          <dl class="row mb-0 small">
            <dt class="col-sm-5 text-muted">ID Técnico:</dt>
            <dd class="col-sm-7 font-monospace text-break">${escaparHtml(projeto.id)}</dd>

            <dt class="col-sm-5 text-muted">Data de Criação:</dt>
            <dd class="col-sm-7">${new Date(projeto.criadoEm).toLocaleString("pt-BR")}</dd>

            <dt class="col-sm-5 text-muted">Última Atualização:</dt>
            <dd class="col-sm-7">${new Date(projeto.atualizadoEm).toLocaleString("pt-BR")}</dd>
          </dl>
        </div>
      </div>
    </div>
  `;

  return layoutMestre(`Projeto: ${projeto.codigo}`, conteudo);
}

/**
 * Retorna classe badge do Bootstrap conforme Condição Operacional de Trabalho.
 */
export function obterClasseBadgeCondicaoOperacional(condicao: CondicaoOperacionalTrabalho): string {
  switch (condicao) {
    case CondicaoOperacionalTrabalho.POSSIVEL:
      return "bg-secondary";
    case CondicaoOperacionalTrabalho.PREPARADO:
      return "bg-primary";
    case CondicaoOperacionalTrabalho.EM_EXECUCAO:
      return "bg-info text-dark";
    case CondicaoOperacionalTrabalho.BLOQUEADO:
      return "bg-danger";
    case CondicaoOperacionalTrabalho.AGUARDANDO_DECISAO_HUMANA:
      return "bg-warning text-dark";
    case CondicaoOperacionalTrabalho.ENCERRADO:
      return "bg-success";
    default:
      return "bg-secondary";
  }
}

/**
 * Renderiza o painel principal de Coordenação do Trabalho (M-003 / EV-003).
 */
export function renderizarPainelCoordenacao(
  visao: VisaoTrabalhosCoordenacao,
  projetos: Projeto[],
  projetoSelecionado?: Projeto | null,
  feedback?: { tipo: "sucesso" | "erro"; mensagem: string }
): string {
  let alertaFeedback = "";
  if (feedback) {
    const alertClass = feedback.tipo === "sucesso" ? "alert-success" : "alert-danger";
    alertaFeedback = `
      <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
        ${escaparHtml(feedback.mensagem)}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
      </div>
    `;
  }

  // Seletor de Projetos
  const opcoesProjetos = projetos
    .map(
      (p) =>
        `<option value="${escaparHtml(p.id)}" ${
          projetoSelecionado?.id === p.id ? "selected" : ""
        }>${escaparHtml(p.codigo)} — ${escaparHtml(p.titulo)}</option>`
    )
    .join("\n");

  // Cartão de Próximo Avanço Válido em Destaque
  let cardProximoAvanco = "";
  if (visao.proximoAvancoValido) {
    const pav = visao.proximoAvancoValido;
    cardProximoAvanco = `
      <div class="card card-resumo border-primary mb-4 shadow-sm" style="border-width: 2px;">
        <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <span class="fw-bold">🚀 Próximo Avanço Válido Identificado Deterministicamente</span>
          <span class="badge bg-light text-primary">PREPARADO PARA EXECUÇÃO</span>
        </div>
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-8">
              <h4 class="card-title text-primary mb-1">
                <span class="badge bg-dark me-2">${escaparHtml(pav.codigo)}</span>
                ${escaparHtml(pav.titulo)}
              </h4>
              <p class="card-text text-muted mb-2">${escaparHtml(pav.objetivo)}</p>
              <div class="small">
                <strong>Ator Competente:</strong> <span class="badge bg-info text-dark">${escaparHtml(pav.atorRequerido)}</span>
                ${pav.skillRequerida ? `<span class="badge bg-light text-dark border ms-1">Skill: ${escaparHtml(pav.skillRequerida)}</span>` : ""}
                <br>
                <strong>Critério de Término:</strong> ${escaparHtml(pav.criterioTermino)}
              </div>
            </div>
            <div class="col-md-4 text-md-end mt-3 mt-md-0">
              <form method="POST" action="/coordenacao/trabalhos/${escaparHtml(pav.id)}/despachar" class="d-inline">
                <input type="hidden" name="projetoId" value="${escaparHtml(visao.projetoId)}">
                <button type="submit" class="btn btn-success btn-lg shadow-sm" id="btn-delegar-avanco">
                  ⚡ Delegar Próximo Avanço
                </button>
              </form>
              <div class="mt-1">
                <a href="/coordenacao/trabalhos/${escaparHtml(pav.id)}" class="btn btn-link btn-sm text-decoration-none">
                  Inspecionar Trabalho Completo &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    cardProximoAvanco = `
      <div class="alert alert-secondary mb-4 p-4 shadow-sm">
        <h5 class="alert-heading mb-2">Nenhum próximo avanço imediatamente elegível</h5>
        <p class="mb-0 text-muted">
          Todos os trabalhos disponíveis estão em execução, bloqueados, encerrados ou aguardando decisão humana/satisfação de dependências.
        </p>
      </div>
    `;
  }

  // Tabela de Todos os Trabalhos do Projeto
  const todosTrabalhos = [
    ...(visao.possiveis || []),
    ...visao.preparados,
    ...visao.emExecucao,
    ...visao.bloqueados,
    ...visao.aguardandoDecisao,
    ...visao.encerrados,
  ];

  // Ordena por código para estabilidade visual
  todosTrabalhos.sort((a, b) => a.codigo.localeCompare(b.codigo));

  const linhasTabela = todosTrabalhos.map((t) => {
    const badge = `<span class="badge ${obterClasseBadgeCondicaoOperacional(t.condicaoOperacional)} badge-status">${t.condicaoOperacional}</span>`;
    const deps = t.dependencias.length > 0
      ? t.dependencias.map((d) => `<span class="badge bg-light text-dark border">${escaparHtml(d)}</span>`).join(" ")
      : '<span class="text-muted small">Nenhuma</span>';

    let acaoHtml = `<a href="/coordenacao/trabalhos/${escaparHtml(t.id)}" class="btn btn-sm btn-outline-primary">Detalhes</a>`;
    if (t.condicaoOperacional === CondicaoOperacionalTrabalho.PREPARADO) {
      acaoHtml += `
        <form method="POST" action="/coordenacao/trabalhos/${escaparHtml(t.id)}/despachar" class="d-inline ms-1">
          <input type="hidden" name="projetoId" value="${escaparHtml(visao.projetoId)}">
          <button type="submit" class="btn btn-sm btn-success">Despachar</button>
        </form>
      `;
    }

    return `
      <tr>
        <td class="fw-bold">${escaparHtml(t.codigo)}</td>
        <td>
          <a href="/coordenacao/trabalhos/${escaparHtml(t.id)}" class="text-decoration-none fw-semibold">
            ${escaparHtml(t.titulo)}
          </a>
          <br>
          <small class="text-muted">${escaparHtml(t.competenciaRequerida)} &bull; ${escaparHtml(t.atorRequerido)}</small>
        </td>
        <td>${badge}</td>
        <td>${deps}</td>
        <td class="text-end">${acaoHtml}</td>
      </tr>
    `;
  }).join("\n");

  const conteudo = `
    <div class="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
      <div>
        <h1 class="h3 mb-0">Coordenação do Trabalho Preparado</h1>
        <p class="text-muted small mb-0">M-003 &bull; EV-003 &bull; Orquestração autônoma de trabalhos executáveis, despacho de handoffs e avaliação de elegibilidade</p>
      </div>
      <div>
        <a href="/projetos" class="btn btn-outline-secondary btn-sm">&larr; Ver Projetos</a>
      </div>
    </div>

    ${alertaFeedback}

    <!-- Seletor de Projeto e Resumo das Condições Operacionais -->
    <div class="card card-resumo border-0 mb-4 p-3 bg-white">
      <div class="row align-items-center">
        <div class="col-md-5 mb-3 mb-md-0">
          <label class="form-label small fw-bold text-uppercase text-muted">Projeto em Coordenação</label>
          <form method="GET" action="/coordenacao">
            <select name="projetoId" class="form-select" onchange="this.form.submit()">
              ${opcoesProjetos}
            </select>
          </form>
        </div>
        <div class="col-md-7">
          <div class="d-flex flex-wrap gap-2 justify-content-md-end text-center">
            <div class="p-2 border rounded bg-light min-w-80">
              <div class="small text-muted">Total</div>
              <strong class="fs-5">${visao.totalTrabalhos}</strong>
            </div>
            <div class="p-2 border rounded bg-light min-w-80">
              <div class="small text-primary">Preparados</div>
              <strong class="fs-5 text-primary">${visao.preparados.length}</strong>
            </div>
            <div class="p-2 border rounded bg-light min-w-80">
              <div class="small text-info">Em Execução</div>
              <strong class="fs-5 text-info">${visao.emExecucao.length}</strong>
            </div>
            <div class="p-2 border rounded bg-light min-w-80">
              <div class="small text-warning">Aguard. Decisão</div>
              <strong class="fs-5 text-warning">${visao.aguardandoDecisao.length}</strong>
            </div>
            <div class="p-2 border rounded bg-light min-w-80">
              <div class="small text-danger">Bloqueados</div>
              <strong class="fs-5 text-danger">${visao.bloqueados.length}</strong>
            </div>
            <div class="p-2 border rounded bg-light min-w-80">
              <div class="small text-success">Encerrados</div>
              <strong class="fs-5 text-success">${visao.encerrados.length}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Destaque: Próximo Avanço Válido -->
    ${cardProximoAvanco}

    <!-- Tabela Geral de Trabalhos Coordenados -->
    <div class="card card-resumo border-0 p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">Trabalhos Coordenados do Projeto</h5>
        <span class="badge bg-secondary">${todosTrabalhos.length} cadastrados</span>
      </div>
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th style="width: 10%;">Código</th>
              <th style="width: 40%;">Título e Competência</th>
              <th style="width: 18%;">Condição Operacional</th>
              <th style="width: 17%;">Dependências</th>
              <th style="width: 15%;" class="text-end">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${linhasTabela.length > 0 ? linhasTabela : '<tr><td colspan="5" class="text-center text-muted py-4">Nenhum trabalho cadastrado neste projeto.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  return layoutMestre("Coordenação do Trabalho", conteudo);
}

/**
 * Renderiza os detalhes de um Trabalho Coordenado específico com dependências, handoffs e ações do Owner.
 */
export function renderizarDetalhesTrabalhoCoordenado(
  detalhe: DetalheTrabalhoCoordenado,
  projeto?: Projeto | null,
  feedback?: { tipo: "sucesso" | "erro"; mensagem: string }
): string {
  const { trabalho, dependenciasDetalhadas, handoffAtivo } = detalhe;

  let alertaFeedback = "";
  if (feedback) {
    const alertClass = feedback.tipo === "sucesso" ? "alert-success" : "alert-danger";
    alertaFeedback = `
      <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
        ${escaparHtml(feedback.mensagem)}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
      </div>
    `;
  }

  // Painel especial se aguardar decisão do Owner ou estiver bloqueado
  let painelDecisaoOwner = "";
  if (
    trabalho.condicaoOperacional === CondicaoOperacionalTrabalho.AGUARDANDO_DECISAO_HUMANA ||
    trabalho.condicaoOperacional === CondicaoOperacionalTrabalho.BLOQUEADO
  ) {
    painelDecisaoOwner = `
      <div class="card border-warning mb-4 shadow-sm" style="border-width: 2px;">
        <div class="card-header bg-warning text-dark fw-bold">
          ⚠️ Decisão Soberana do Owner Requerida para Continuidade
        </div>
        <div class="card-body">
          <p class="card-text mb-3">
            <strong>Motivo do Bloqueio ou Dilema Humano:</strong><br>
            <span class="text-danger fw-semibold">${escaparHtml(trabalho.motivoBloqueio || "Não especificado")}</span>
          </p>
          <form method="POST" action="/coordenacao/trabalhos/${escaparHtml(trabalho.id)}/decisao-owner" class="row g-3">
            <div class="col-md-4">
              <label class="form-label small fw-bold">Identidade Autenticada do Owner</label>
              <input type="text" name="usuario" class="form-control" value="mhj" required>
              <div class="form-text">Apenas o usuário autorizado 'mhj' possui poder vinculante.</div>
            </div>
            <div class="col-md-8">
              <label class="form-label small fw-bold">Diretriz ou Resolução Soberana</label>
              <input type="text" name="diretriz" class="form-control" placeholder="Descreva a diretriz ou decisão que autoriza o avanço..." required>
            </div>
            <div class="col-12 text-end">
              <button type="submit" class="btn btn-warning shadow-sm">
                Emitir Decisão Soberana e Liberar para PREPARADO &rarr;
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  // Painel de Handoff Ativo ou Formulário de Despacho
  let painelHandoff = "";
  if (trabalho.condicaoOperacional === CondicaoOperacionalTrabalho.EM_EXECUCAO && handoffAtivo) {
    painelHandoff = `
      <div class="card border-info mb-4 shadow-sm">
        <div class="card-header bg-info text-dark d-flex justify-content-between align-items-center">
          <span class="fw-bold">📡 Handoff Despachado em Execução</span>
          <span class="badge bg-dark">${escaparHtml(handoffAtivo.tokenCorrelacao)}</span>
        </div>
        <div class="card-body">
          <dl class="row small mb-2">
            <dt class="col-sm-3 text-muted">Ator Destinatário:</dt>
            <dd class="col-sm-9 fw-bold">${escaparHtml(handoffAtivo.atorDestinatario)}</dd>
            <dt class="col-sm-3 text-muted">Skill Requerida:</dt>
            <dd class="col-sm-9"><code>${escaparHtml(handoffAtivo.skillDestinataria || "N/A")}</code></dd>
            <dt class="col-sm-3 text-muted">Despachado em:</dt>
            <dd class="col-sm-9">${new Date(handoffAtivo.despachadoEm).toLocaleString("pt-BR")}</dd>
          </dl>
          <div class="d-flex gap-2 mt-3">
            <a href="/coordenacao/handoffs/${escaparHtml(handoffAtivo.id)}" class="btn btn-sm btn-outline-info">
              Ver Pacote Completo do Handoff (JSON/Contexto) &rarr;
            </a>
          </div>

          <!-- Formulário para Registro de Retorno de Execução -->
          <div class="border-top pt-3 mt-3">
            <h6 class="fw-bold">Registrar Retorno de Execução</h6>
            <form method="POST" action="/coordenacao/retornos" class="row g-2 align-items-end">
              <input type="hidden" name="tokenCorrelacao" value="${escaparHtml(handoffAtivo.tokenCorrelacao)}">
              <input type="hidden" name="trabalhoId" value="${escaparHtml(trabalho.id)}">
              <div class="col-md-3">
                <label class="form-label small text-muted">Resultado</label>
                <select name="sucesso" class="form-select form-select-sm">
                  <option value="true" selected>Sucesso (Concluído)</option>
                  <option value="false">Impedimento / Bloqueio</option>
                </select>
              </div>
              <div class="col-md-7">
                <label class="form-label small text-muted">Resultado Observável / Evidência</label>
                <input type="text" name="resultadoObservavel" class="form-control form-select-sm" placeholder="Ex: Código compilado e 100% dos testes aprovados." required>
              </div>
              <div class="col-md-2">
                <button type="submit" class="btn btn-sm btn-primary w-100">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  } else if (trabalho.condicaoOperacional === CondicaoOperacionalTrabalho.PREPARADO) {
    painelHandoff = `
      <div class="card border-success mb-4 p-3 bg-light d-flex flex-row justify-content-between align-items-center">
        <div>
          <h6 class="text-success fw-bold mb-1">Trabalho Preparado e Elegível para Despacho</h6>
          <p class="small text-muted mb-0">Todas as dependências foram satisfeitas e o invariante de especialização está cumprido.</p>
        </div>
        <form method="POST" action="/coordenacao/trabalhos/${escaparHtml(trabalho.id)}/despachar">
          <input type="hidden" name="projetoId" value="${escaparHtml(trabalho.projetoId)}">
          <button type="submit" class="btn btn-success shadow-sm">
            ⚡ Despachar Handoff Agora
          </button>
        </form>
      </div>
    `;
  }

  // Lista de Dependências Detalhadas
  const dependenciasHtml = dependenciasDetalhadas.map((d) => `
    <li class="list-group-item d-flex justify-content-between align-items-center">
      <div>
        <span class="badge bg-dark me-2">${escaparHtml(d.codigo)}</span>
        <span>${escaparHtml(d.titulo)}</span>
      </div>
      <div>
        <span class="badge ${obterClasseBadgeCondicaoOperacional(d.condicaoOperacional)} me-2">${d.condicaoOperacional}</span>
        ${d.satisfeita ? '<span class="badge bg-success">Satisfeita</span>' : '<span class="badge bg-secondary">Pendente</span>'}
      </div>
    </li>
  `).join("\n");

  // Histórico de Coordenação
  const historicoHtml = trabalho.historico.map((h) => `
    <div class="historico-item small mb-2 border-start border-3 ps-2">
      <div class="text-muted">${new Date(h.registradoEm).toLocaleString("pt-BR")} &bull; <strong>${escaparHtml(h.ator)}</strong></div>
      <div class="fw-semibold">${escaparHtml(h.atividade)}</div>
      ${h.condicaoNova ? `<span class="badge ${obterClasseBadgeCondicaoOperacional(h.condicaoNova)} font-monospace">${h.condicaoNova}</span>` : ""}
    </div>
  `).join("\n");

  const conteudo = `
    <div class="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
      <div>
        <div class="d-flex align-items-center gap-2 mb-1">
          <span class="badge bg-dark">${escaparHtml(trabalho.codigo)}</span>
          <span class="badge ${obterClasseBadgeCondicaoOperacional(trabalho.condicaoOperacional)} badge-status">${trabalho.condicaoOperacional}</span>
          ${projeto ? `<span class="badge bg-light text-dark border">Projeto: ${escaparHtml(projeto.codigo)}</span>` : ""}
        </div>
        <h1 class="h3 mb-0">${escaparHtml(trabalho.titulo)}</h1>
      </div>
      <div>
        <a href="/coordenacao?projetoId=${escaparHtml(trabalho.projetoId)}" class="btn btn-outline-secondary btn-sm">&larr; Voltar à Coordenação</a>
      </div>
    </div>

    ${alertaFeedback}
    ${painelDecisaoOwner}
    ${painelHandoff}

    <div class="row">
      <!-- Coluna Principal com Dados e Dependências -->
      <div class="col-lg-7 mb-4">
        <div class="card card-resumo border-0 mb-4 p-4">
          <h5 class="border-bottom pb-2 mb-3">Definição do Trabalho</h5>
          <div class="mb-3">
            <h6 class="text-muted small text-uppercase">Objetivo Técnico</h6>
            <p class="mb-0">${escaparHtml(trabalho.objetivo)}</p>
          </div>
          <div class="mb-3">
            <h6 class="text-muted small text-uppercase">Critério de Término</h6>
            <p class="mb-0">${escaparHtml(trabalho.criterioTermino)}</p>
          </div>
          <div class="row g-2">
            <div class="col-md-6">
              <h6 class="text-muted small text-uppercase">Competência Requerida</h6>
              <p class="mb-0 fw-semibold">${escaparHtml(trabalho.competenciaRequerida)}</p>
            </div>
            <div class="col-md-6">
              <h6 class="text-muted small text-uppercase">Ator e Skill</h6>
              <p class="mb-0">
                <span class="badge bg-info text-dark">${escaparHtml(trabalho.atorRequerido)}</span>
                ${trabalho.skillRequerida ? `<br><code class="small">${escaparHtml(trabalho.skillRequerida)}</code>` : ""}
              </p>
            </div>
          </div>
        </div>

        <div class="card card-resumo border-0 p-4">
          <h5 class="border-bottom pb-2 mb-3">Grafo de Dependências</h5>
          ${dependenciasDetalhadas.length > 0 ? `
            <ul class="list-group list-group-flush mb-0">
              ${dependenciasHtml}
            </ul>
          ` : '<p class="text-muted small mb-0">Este trabalho não possui dependências declaradas (elegível para avanço imediato).</p>'}
        </div>
      </div>

      <!-- Coluna Lateral com Handoffs Emitidos e Histórico -->
      <div class="col-lg-5 mb-4">
        <div class="card card-resumo border-0 mb-4 p-4">
          <h5 class="border-bottom pb-2 mb-3">Handoffs Emitidos (${trabalho.handoffs.length})</h5>
          ${trabalho.handoffs.length > 0 ? `
            <div class="list-group list-group-flush small">
              ${trabalho.handoffs.map((h) => `
                <a href="/coordenacao/handoffs/${escaparHtml(h.id)}" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                  <div>
                    <span class="font-monospace text-primary">${escaparHtml(h.tokenCorrelacao)}</span><br>
                    <span class="text-muted">${new Date(h.despachadoEm).toLocaleDateString("pt-BR")} &bull; ${escaparHtml(h.atorDestinatario)}</span>
                  </div>
                  <div>
                    ${h.retorno ? (h.retorno.sucesso ? '<span class="badge bg-success">Concluído</span>' : '<span class="badge bg-danger">Falha</span>') : '<span class="badge bg-warning text-dark">Em curso</span>'}
                  </div>
                </a>
              `).join("\n")}
            </div>
          ` : '<p class="text-muted small mb-0">Nenhum handoff emitido ainda.</p>'}
        </div>

        <div class="card card-resumo border-0 p-4">
          <h5 class="border-bottom pb-2 mb-3">Histórico de Transições</h5>
          <div>
            ${historicoHtml}
          </div>
        </div>
      </div>
    </div>
  `;

  return layoutMestre(`Trabalho: ${trabalho.codigo}`, conteudo);
}

/**
 * Renderiza a inspeção detalhada de um Handoff estruturado com contexto recuperável.
 */
export function renderizarDetalheHandoff(
  handoff: HandoffCoordenacao,
  trabalho: TrabalhoCoordenado
): string {
  const retorno = handoff.retorno;

  const conteudo = `
    <div class="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
      <div>
        <div class="d-flex align-items-center gap-2 mb-1">
          <span class="badge bg-dark">${escaparHtml(trabalho.codigo)}</span>
          <span class="badge bg-info text-dark font-monospace">${escaparHtml(handoff.tokenCorrelacao)}</span>
        </div>
        <h1 class="h3 mb-0">Pacote Estruturado do Handoff</h1>
      </div>
      <div>
        <a href="/coordenacao/trabalhos/${escaparHtml(trabalho.id)}" class="btn btn-outline-secondary btn-sm">&larr; Voltar ao Trabalho</a>
      </div>
    </div>

    <div class="row">
      <div class="col-lg-7 mb-4">
        <div class="card card-resumo border-0 mb-4 p-4">
          <h5 class="border-bottom pb-2 mb-3">Contexto Recuperável do Handoff</h5>
          <pre class="bg-dark text-light p-3 rounded small font-monospace" style="max-height: 400px; overflow-y: auto;">${escaparHtml(JSON.stringify(handoff.conteudoHandoff, null, 2))}</pre>
        </div>
      </div>

      <div class="col-lg-5 mb-4">
        <div class="card card-resumo border-0 mb-4 p-4">
          <h5 class="border-bottom pb-2 mb-3">Retorno de Execução Associado</h5>
          ${retorno ? `
            <div class="mb-3">
              <span class="badge ${retorno.sucesso ? "bg-success" : "bg-danger"} mb-2">${retorno.sucesso ? "SUCESSO" : "IMPEDIMENTO / FALHA"}</span>
              <p class="small mb-1"><strong>Resultado Observável:</strong> ${escaparHtml(retorno.resultadoObservavel)}</p>
              ${retorno.pendenciasOuBloqueios ? `<p class="small text-danger mb-1"><strong>Pendências / Bloqueios:</strong> ${escaparHtml(retorno.pendenciasOuBloqueios)}</p>` : ""}
              <div class="small text-muted mt-2">Recebido em: ${new Date(retorno.recebidoEm).toLocaleString("pt-BR")}</div>
            </div>
          ` : `
            <div class="alert alert-warning mb-0 small">
              Ainda não há retorno registrado para este Handoff. O trabalho permanece sob responsabilidade do executor designado.
            </div>
          `}
        </div>

        <div class="card card-resumo border-0 p-4">
          <h5 class="border-bottom pb-2 mb-3">Metadados de Rastreabilidade</h5>
          <dl class="row small mb-0">
            <dt class="col-sm-4 text-muted">ID do Handoff:</dt>
            <dd class="col-sm-8 font-monospace text-break">${escaparHtml(handoff.id)}</dd>
            <dt class="col-sm-4 text-muted">Token:</dt>
            <dd class="col-sm-8 font-monospace">${escaparHtml(handoff.tokenCorrelacao)}</dd>
            <dt class="col-sm-4 text-muted">Destinatário:</dt>
            <dd class="col-sm-8">${escaparHtml(handoff.atorDestinatario)}</dd>
            <dt class="col-sm-4 text-muted">Despachado em:</dt>
            <dd class="col-sm-8">${new Date(handoff.despachadoEm).toLocaleString("pt-BR")}</dd>
          </dl>
        </div>
      </div>
    </div>
  `;

  return layoutMestre(`Handoff: ${handoff.tokenCorrelacao}`, conteudo);
}

