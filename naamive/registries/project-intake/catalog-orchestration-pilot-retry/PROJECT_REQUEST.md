---
request_id: catalog-orchestration-pilot-retry
proposed_project_id: catalog-pilot-retry
status: REGISTERED
title: Catálogo genérico reutilizável
business_owner: naamive-platform-team
submitted_by: naamive-platform-team
---

# Solicitação de Projeto

## Problema de negócio

Equipes que precisam apresentar itens, serviços ou outras ofertas em diferentes contextos não possuem uma capacidade simples e genérica para organizar e consultar um catálogo. A ausência dessa capacidade torna necessário recriar a estrutura de catálogo a cada nova situação, dificulta a consulta em dispositivos diferentes e reduz o reuso de uma mesma solução de negócio.

## Resultado desejado

Disponibilizar uma capacidade de catálogo genérica e descartável para validar a orquestração do NAAMIVE. A capacidade deve permitir cadastrar, organizar, listar, consultar e manter itens de catálogo de modo que possa ser adaptada posteriormente a diferentes cenários de negócio, sem assumir um segmento específico.

## Métricas de sucesso

- O fluxo de orquestração materializa o projeto somente após a aprovação humana da solicitação completa.
- O catálogo permite registrar e consultar itens com informações básicas de identificação, descrição, classificação e disponibilidade.
- A consulta do catálogo permanece utilizável em telas de tamanhos distintos.
- O piloto gera evidências de validação suficientes para confirmar a passagem pelo ciclo de projeto; não há meta de produção nesta rodada.

## Stakeholders

- Proprietário de negócio: naamive-platform-team
- Partes afetadas: equipe da plataforma NAAMIVE; pessoas que administram itens de catálogo; pessoas que consultam o catálogo em diferentes dispositivos.

## Restrições conhecidas

Este é um piloto simples e descartável para testar a orquestração. Não será usado em produção, não deve tratar dados pessoais reais e não exige conexão com sistemas externos nesta rodada. As decisões de implementação e entrega ficam fora desta solicitação e dependem das etapas apropriadas do projeto.

## Evidências e fontes

- Brainstorm conduzido para o teste da orquestração, em 28 de julho de 2026.
- Visão da plataforma: `naamive/vision/PROJECT_VISION.md`.
- Contrato de entrada: `naamive/contracts/PROJECT_INTAKE.md`.

## Premissas

- Um modelo de catálogo genérico pode servir como base para contextos distintos sem que o piloto precise escolher um domínio específico.
- O escopo reduzido é suficiente para exercitar o intake, o gate humano, a materialização do projeto e as etapas posteriores da orquestração.
- Usuários entendem os conceitos de item, classificação e disponibilidade sem treinamento especializado.

## Questões em aberto

- Quais atributos mínimos de um item atendem ao piloto sem induzir um domínio específico?
- Quais classificações e filtros devem fazer parte do primeiro recorte funcional?
- Quais critérios de aceitação definem que a consulta funciona adequadamente em diferentes tamanhos de tela?
- A capacidade deve começar como módulo próprio do piloto ou consumir um módulo de catálogo reutilizável já registrado?
