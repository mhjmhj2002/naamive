import { Necessidade } from "../domain/necessidade.js";
import { CompromissoNecessidade } from "../domain/valores.js";
import { StatusNecessidade } from "../domain/tipos.js";

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
 * Retorna classe badge do Bootstrap conforme status.
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
            <a class="nav-link" href="/nova">Nova Necessidade</a>
          </li>
        </ul>
        <span class="navbar-text text-light small">
          EV-001 — Condução da Necessidade
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
      <div class="alert alert-success d-flex align-items-center mb-4">
        <div>
          <strong>Compromisso Aprovado e Materializado no Projeto!</strong>
          <p class="mb-0 small">Esta necessidade avançou para <code>EM_PROJETO</code> com confirmação de bootstrap no M-002.</p>
        </div>
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
