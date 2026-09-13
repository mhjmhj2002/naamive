# DEC-009 — Candidata de contrato de autenticação da WI-003

**status:** CANDIDATE FOR HUMAN DECISION  
**normative_effect:** NONE UNTIL APPROVED  
**decision_authority:** Project Owner  
**object:** WI-003 — Username / Password Login  
**impact:** MATERIAL  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002  
**scope:** MOD-001 / VI-001  
**findings:** FND-WI003-RCP-001, FND-WI003-RCP-002, FND-WI003-RCP-003, FND-WI003-RCP-004  
**nature:** preparação consolidada de decisão; não é decisão exercida, authority, readiness, Development Cycle, Execution ou autorização de implementação

## 1. Problema e limites da candidata

Os quatro Findings são acoplados: o login só pode ter contrato HTTP e controle
de abuso verificáveis se a Credential, sua elegibilidade e o efeito de sucesso
também forem definidos. Esta candidata propõe um único pacote para o Project
Owner decidir sob `NB-0002` e `PBL-PRJ001-R1-v1.0`.

As restrições já vigentes que a proposta preserva são:

```text
username + password................ TB-84
Argon2id; nunca senha simples ou reversível
................................... TB-85 / TIR-017
erro genérico e rate limiting....... TB-92 / TIR-018
authentication != authorization..... security/01
sessão não é authority.............. security/01
sessão opaca server-side/cookie..... TB-86 / TIR-014..016
security state após restart......... TB-139
input de boundary não confiável...... security/02
```

`DEC-008` permanece a decisão vigente sobre Principal: `principal_id` é o UUID
estável; `username` atual, canônico e único localiza o Principal; somente
`ACTIVE` é elegível para autenticação bem-sucedida. Username não é Credential,
e autenticação não cria Grant nem authority.

Esta candidata não define autoridade administrativa para provisionar, trocar,
resetar ou revogar senha. Ela exige que a operação concreta seja autorizada e
auditável pela regra aplicável quando vier a ser implementada.

## 2. Pacote recomendado

Recomenda-se aprovar conjuntamente as seções 3 a 6: uma Credential humana
durável, uma resposta HTTP sem portador de sessão, controles de abuso duráveis e
atômicos e um resultado de autenticação apenas interno e efêmero para WI-004.
O pacote remove os quatro blockers sem antecipar sessão, cookie, token, Grant ou
authority.

## 3. Credential humana proposta

### 3.1 Conceitos e vínculo

| Conceito | Semântica proposta |
|---|---|
| `Principal` | Identidade canônica (`principal_id`) e status, conforme `DEC-008`. |
| `username` | Atributo de login atual do Principal; é lookup, não segredo, Credential nem authority. |
| `Credential` | Registro de segredo de senha que pertence a exatamente um `principal_id`. Não é sessão, Grant ou prova de authority. |
| `Session` | Contexto autenticado durável de WI-004, posterior à prova produzida por WI-003. |
| `Grant / authority` | Capability contextual, resolvida no servidor; não nasce de login. |

Propõe-se uma Credential de senha atual por Principal humano. Seu estado atual é
durável e contém conceitualmente `principal_id`, `credential_version`,
`hash_format_version`, algoritmo `argon2id`, parâmetros (`memory_kib`,
`iterations`, `parallelism`, `salt_bytes`, `hash_bytes`), `salt`, `hash`,
`created_at`, `updated_at` e `revoked_at` quando revogada. `salt` e `hash` são
segredos operacionais: não aparecem em resposta, erro, log ou audit payload
exposto. O estado e toda substituição/revogação necessária para auditabilidade
persistem após restart; nomes físicos de tabela e adapter ficam para a futura
implementação.

O formato inicial é exatamente TIR-017: Argon2id, 64 MiB, 3 iterações,
paralelismo 1, salt aleatório de 16 bytes e hash de 32 bytes. A verificação usa
o formato armazenado; a política atual determina se o formato exige rehash.

### 3.2 Provisionamento, mudança, reset, revogação e rehash

| Operação | Regra proposta |
|---|---|
| Provisionamento inicial | Fluxo server-side autorizado cria uma Credential ativa para um `principal_id` existente. A senha entra somente pela boundary protegida; não é persistida, logada ou retornada em claro. |
| Alteração de senha | Após satisfazer a futura regra de autorização/validação da alteração, substitui atomicamente a Credential ativa por novo hash/versionamento e torna a anterior revogada para uso. |
| Reset | Fluxo server-side autorizado, distinto de login, substitui atomicamente a Credential ativa por uma nova e revoga a anterior. Esta candidata não inventa canal, token de reset, prazo ou verificação de posse. |
| Revogação | Marca a Credential atual revogada. Uma Credential revogada nunca verifica com sucesso; novo acesso exige provisionamento, alteração ou reset autorizado posterior. |
| Rehash | Depois de uma verificação válida e antes de concluir sucesso, se `hash_format_version` ou parâmetros estiverem defasados, substitui atomicamente salt/hash/parâmetros por uma nova versão Argon2id. Falha de rehash não pode produzir sucesso parcial. |

Login só pode produzir sucesso se, numa leitura/decisão consistente, existirem:

```text
username atual → Principal existente e ACTIVE
             → Credential atual não revogada
             → password verifica o hash armazenado
```

Principal inexistente, `SUSPENDED`, Credential ausente/revogada ou password
inválida são causas internas distintas, mas têm a mesma falha externa genérica.

### 3.3 Alternativas materiais — Credential

| Alternativa | Trade-off, risco e recomendação |
|---|---|
| C-1 — Credential por `username` | Falha quando username muda e mistura atributo de login com segredo; incompatível com `DEC-008`. Rejeitada. |
| C-2 — Credential por `principal_id`, com hash/versão e revogação duráveis | Mantém identidade estável, permite troca, reset, rehash, restart e auditabilidade. Requer registro durável adicional. Recomendada. |
| C-3 — guardar somente hash sem versão ou revogação | Menos campos inicialmente, mas não permite rehash nem revogação/reset determinísticos. Rejeitada. |

## 4. Contrato HTTP proposto — `POST /api/session/login`

### 4.1 Request e validação

O endpoint recebe exclusivamente JSON:

```json
{"username":"[a-z][a-z0-9_-]{2,31}","password":"string não vazia"}
```

`username` deve corresponder exatamente à regra vigente de `DEC-008` (3 a 32
caracteres ASCII); não há trim, case-folding nem normalização silenciosa.
`password` é string com 1 a 1024 bytes UTF-8. Campos ausentes, tipos distintos
de string, campos adicionais, JSON inválido, username fora do padrão ou password
vazia/excedendo o limite são request inválido. Nenhuma regra de composição ou
tamanho mínimo de senha além desse limite de transporte é inferida por esta
candidata.

### 4.2 Resultados públicos

| Caso | Status | Corpo/headers propostos | Regra de exposição |
|---|---:|---|---|
| Request inválido | `400` | `{"code":"VALIDATION_ERROR"}`; erros podem identificar somente o campo estrutural inválido, nunca ecoar password | Não executa lookup de Principal/Credential nem conta tentativa de autenticação. |
| Authentication failure | `401` | `{"code":"AUTHENTICATION_FAILED","message":"Invalid username or password."}` | A mesma resposta para username inexistente, password inválida, Principal não `ACTIVE`, Credential ausente ou revogada. Nenhum `principal_id`, status ou motivo interno. |
| Rate limited | `429` | `{"code":"RATE_LIMITED"}` e `Retry-After` inteiro em segundos | Não informa qual contador (username+IP ou IP) atingiu o limite nem se username existe. |
| Authentication success em WI-003 isolada | `204` | Corpo vazio; nenhum `Set-Cookie`, token, Grant ou capability | Declara apenas que a prova foi obtida na invocação. Não entrega credencial reutilizável ao browser. |

O código `AUTHENTICATION_FAILED` é o código canônico proposto para falha de
credencial; `VALIDATION_ERROR` e `RATE_LIMITED` já pertencem ao vocabulário de
NB-0002. Respostas não incluem hash, salt, versão de Credential, detalhes de
rate-limit, estado do Principal ou diferença de causa. Logs aplicam redaction e
não registram password, hash, salt, token ou payload secreto.

### 4.3 Alternativas materiais — resultado HTTP

| Alternativa | Trade-off, risco e recomendação |
|---|---|
| H-1 — responder sucesso com cookie/token de sessão | Facilita o fluxo browser, mas antecipa diretamente WI-004 e viola sua fronteira. Rejeitada. |
| H-2 — `204` sem portador reutilizável; resultado interno efêmero | Separa prova de identidade de sessão e mantém o endpoint testável. Exige composição explícita quando WI-004 existir. Recomendada. |
| H-3 — devolver `principal_id` ou detalhe de conta | Não é necessário para login e amplia exposição/uso indevido pelo client. Rejeitada. |

## 5. Controle de abuso proposto

### 5.1 Sinais, janela e limiares

Para cada request sintaticamente válida, o servidor deriva dois sinais de falha:

```text
username+IP = username canônico recebido + IP confiável
IP          = IP confiável
```

Cada sinal mantém falhas numa janela deslizante de 15 minutos. Os limiares já
vigentes são preservados:

```text
username + IP....... no máximo 5 falhas na janela
IP.................. no máximo 25 falhas na janela
```

Antes de verificar a Credential, se um sinal já tiver atingido seu limite, o
request recebe `429 RATE_LIMITED`; `Retry-After` é o menor número inteiro de
segundos até a expiração da falha mais antiga necessária para voltar abaixo do
limite. Não há verificação de senha, sucesso ou reset em request rate limited.

Falha de autenticação conta em ambos os sinais, inclusive para username
inexistente, Principal inelegível, Credential ausente/revogada e password
inválida. Request estruturalmente inválido não conta, pois não fornece username
canônico confiável. Isto evita transformar inexistência de username em caminho
de proteção mais fraco.

### 5.2 Atraso progressivo, sucesso e retenção

Quando a falha aceita fizer o contador `username+IP` na janela ser `n`, aplica-se
o atraso antes de emitir a resposta `401`:

```text
n <= 2........ 0 segundos
n = 3......... 1 segundo
n = 4......... 2 segundos
n >= 5........ 4 segundos (teto)
delay(n)...... min(2^(n - 3), 4) segundos, para n >= 3
```

O atraso é medido em segundos inteiros pelo relógio do servidor e é aplicável
inclusive a username inexistente. O sexto request no mesmo sinal não chega ao
atraso: recebe `429` pela regra de limiar prévio. O contador de IP não introduz
atraso próprio; ele protege amplitude de ataque e, ao atingir 25, retorna `429`.

Em sucesso, o contador `username+IP` correspondente é removido atomicamente;
o contador agregado de IP não é apagado, para que um sucesso legítimo não possa
limpar a pressão causada por outras tentativas daquele IP. Falhas expiram da
janela após 15 minutos. Registros de contador sem falhas ativas podem ser
eliminados somente 30 minutos após a última falha; a limpeza não recria nem
prolonga bloqueio. Não existe lock global, permanente ou por username isolado.

### 5.3 Concorrência, restart e IP confiável

Os dois sinais e a decisão de permitir/contar/resetar são persistidos em
PostgreSQL e executados atomicamente. Toda operação que toca ambos adquire
sempre a chave `IP` antes da chave `username+IP`; a transação serializa a decisão
contra requests concorrentes. Assim, não podem ocorrer seis falhas aceitas num
limiar de cinco por corrida, e restart não perde janela, atraso ou `Retry-After`
aplicáveis. O atraso ocorre depois do commit da falha, fora de locks/transação;
isso preserva a decisão durável sem manter lock durante espera.

O IP confiável é derivado assim: se o endereço TCP par imediato não consta da
allowlist de proxies confiáveis da implantação, ele é o IP do client e headers
de encaminhamento são ignorados. Se consta, o servidor percorre
`X-Forwarded-For` da direita para a esquerda, descartando endereços que também
estejam na allowlist, e usa o primeiro endereço restante. Header ausente,
malformado ou composto somente por proxies confiáveis usa o endereço TCP par
imediato. A allowlist é configuração de infraestrutura controlada, não dado de
request. O valor bruto de username não precisa ser retido no contador: o
identificador `username+IP` pode usar HMAC do username com chave server-side;
essa escolha não muda os escopos lógicos acima.

### 5.4 Alternativas materiais — abuso

| Alternativa | Trade-off, risco e recomendação |
|---|---|
| A-1 — lock permanente/global por username | Pode reduzir tentativas, mas cria negação de serviço remota e contraria TIR-018. Rejeitada. |
| A-2 — somente contador em memória | É simples, mas perde semântica no restart e diverge entre instâncias. Rejeitada. |
| A-3 — janelas duráveis username+IP e IP, atraso limitado e decisão atômica | Torna limites, atraso, restart e concorrência determinísticos sem lock permanente. Exige persistência e transação. Recomendada. |

## 6. Fronteira WI-003 → WI-004

WI-003 é dona de provar Username/Password e de produzir, **somente dentro da
invocação server-side corrente**, o valor interno não serializável:

```text
AuthenticatedPrincipal {
  principal_id
  authenticated_at
  credential_version
  correlation_id
}
```

Esse valor só existe após as verificações de Credential, `ACTIVE` e abuso; não é
persistido, não é serializado no HTTP, não é aceito de volta do browser, não tem
token opaco e expira ao término da invocação. Ele é uma passagem interna de
controle, não sessão, Grant, authority ou capability.

WI-004 é a única dona de consumir `AuthenticatedPrincipal`, na mesma invocação
server-side, para materializar a Durable Server-side Session conforme TB-86,
TB-139 e TIR-014..016. Somente WI-004 pode persistir `security.human_session`,
emitir `Set-Cookie` ou criar token opaco reutilizável. O caller de composição
futura deve chamar WI-003 e, apenas se receber o valor interno, chamar WI-004;
não há endpoint intermediário, artefato durável ou prova client-side para
atravessar essa fronteira.

Enquanto WI-004 não estiver integrada, o sucesso público de WI-003 permanece
`204` sem cookie. A aprovação desta candidata não cria a sessão nem altera o
contrato runtime; ela apenas fixa o handoff que WI-004 deverá usar.

## 7. Mapa dos Findings

| Finding | Seções que propõem a resolução | Classificação atual |
|---|---|---|
| FND-WI003-RCP-001 — Credential e vínculo com Principal | 3.1, 3.2, 3.3 | PROPOSED RESOLUTION |
| FND-WI003-RCP-002 — Contrato HTTP e resultado | 4.1, 4.2, 4.3 | PROPOSED RESOLUTION |
| FND-WI003-RCP-003 — Semântica do controle de abuso | 5.1, 5.2, 5.3, 5.4 | PROPOSED RESOLUTION |
| FND-WI003-RCP-004 — Fronteira WI-003 ↔ WI-004 | 4.2, 4.3, 6 | PROPOSED RESOLUTION |

Nenhum Finding é `RESOLVED` por esta candidata. Só uma decisão humana exercida
poderá materializar a resolução e permitir nova preparação de readiness.

## 8. Não efeitos e continuidade

Esta candidata não altera `NB-0002`, Technology Baseline, TIR ou PEC; não muda
API/runtime, schema, migration, código ou testes. Também não promove lifecycle,
não concede readiness authority, não cria Development Cycle/Execution e não
autoriza implementação.

Portanto, permanecem fatos correntes:

```text
PRJ-001........ PLANNING
MOD-001........ PLANNED
VI-001......... PLANNED
WI-003.......... PROPOSED / BLOCKED
readiness....... NOT GRANTED
Development Cycle NOT CREATED
Execution....... NONE
implementation.. NOT AUTHORIZED
```

Depois de uma aprovação humana, a continuidade correta é materializar a decisão
governada, classificar os Findings de acordo com ela e preparar novamente a
readiness; não é iniciar implementação automaticamente.

## DECISÃO SOLICITADA AO PROJECT OWNER

**O que será decidido.** O pacote único das seções 3–6: Credential por
`principal_id` com Argon2id versionado e revogável; contrato `POST
/api/session/login`; rate limiting/atraso duráveis e determinísticos; e handoff
interno efêmero para WI-004.

**Principais efeitos.** Os quatro Findings passam a ter uma resolução
determinística possível, com oráculos claros para integração, segurança,
concorrência e restart. A aprovação não implementa nada nem cria sessão.

**Principais riscos.** O pacote exige persistência/transação para abuso e
configuração correta de proxy confiável; erro nessa configuração pode reduzir a
qualidade do sinal de IP. A ausência deliberada de cookie/token nesta WI exige a
composição explícita de WI-004.

**Fora de escopo.** Autoridade administrativa de senha, canal/token de reset,
política de composição de senha, implementação física, Durable Server-side
Session, cookies, CSRF, Grants e authorization.

**Consequência da aprovação.** Uma decisão humana governada poderá substituir
esta candidata e tratar os Findings; WI-003 continuará `PROPOSED` até nova
readiness e todos os gates aplicáveis.

```text
APPROVE CANDIDATE AS PROPOSED
REWORK REQUIRED
REJECT
```

## Registro histórico de decisão

A decisão humana final foi materializada em
[`DEC-009_AUTHENTICATION_CONTRACT.md`](DEC-009_AUTHENTICATION_CONTRACT.md) como
`APPROVED`, com aprovação integral das seções 3–6 desta candidata. Esta
candidata permanece evidência histórica de preparação e não é retroeditada;
somente a decisão materializada possui efeito governado.
