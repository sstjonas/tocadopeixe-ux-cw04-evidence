# Dossiê de Evidências — UX-CW04 WI02: Calendário, Cenários e Adoção
**Projeto:** Toca do Peixe  
**Frente:** CW-04 — Decisão Gerencial / Gestão  
**Work Item:** CW04-WI02 — Calendário, cenários e adoção  
**Revisão:** R1 — Endurecer versionamento, efeito zero e evidence  
**Data:** 01/10/2026  
**Status do Executor:** DONE (Pronto para re-review independente do ChatGPT)  
**Governança:** DONE ≠ APPROVED (Operating Model v2.3)

---

## 1. Diretório, Repositório e Isolamento

- **DevFlow project_id:** tocadopeixe
- **Base ref:** `main`
- **Base commit esperado:** `fb7591e19d40a6c86f9a3030d73ed6848d2cb375`
- **Branch:** `ux-cw04-wi02`
- **Diretório isolado:** `prototypes/ux-cw04/wi02-calendar-scenarios/`
- **Repositório Público de Evidências (R1-F01):** `https://github.com/sstjonas/tocadopeixe-ux-cw04-evidence/tree/main/wi02`
- **Repositório de produção:** 100% intocado (`tocadopeixe/repo/tocadopeixe` e `tocadopeixe-repo` limpos).

---

## 2. Superfícies Normativas v1.0

1. **SCR-GES-004 — Calendário operacional e unidades** (janelas vigentes, propostas de alteração, dependências concorrentes, impact assessment stale e publicação por destino desacoplada).
2. **SCR-GES-005 — Cenários e adoção** (simulação financeira baseada exclusivamente em premissas com limitações contratuais explícitas; medição rigorosa de adoção com denominador elegível e restrição de generalização).

---

## 3. Matriz dos 12 Cenários Obrigatórios

| № | Cenário | Ação Executada | Invariante Verificada | Status | Screenshot Canônica |
|---|---|---|---|:---:|---|
| **1** | **Vigente vs Proposta** | Comparação de CAL-DEMO-061 vigente 18–23 com proposta 19–23. | Versão vigente preservada; 2 dependências ativas (RES-062 e PRO-062). | **PASS** | [calendario-vigente-proposta-impactos.png](screenshots/calendario-vigente-proposta-impactos.png) |
| **2** | **Salvar Proposta** | Salvar proposta como rascunho. | Proposal salva; versão vigente permanece 18:00–23:00 intacta. | **PASS** | [proposta-salva-sem-aplicacao.png](screenshots/proposta-salva-sem-aplicacao.png) |
| **3** | **Resolução Parcial** | Resolver apenas RES-DEMO-062 com PRO-DEMO-062 pendente. | Proposta continua não aplicável; bloqueio de aplicação prematura. | **PASS** | [resolucao-parcial-conflito.png](screenshots/resolucao-parcial-conflito.png) |
| **4** | **RES-063 Stale** | Surgimento da reserva concorrente RES-DEMO-063 às 18:45. | Assessment anterior invalidado (STALE) e dependências passam de 2 para 3. | **PASS** | [assessment-stale-nova-dependencia.png](screenshots/assessment-stale-nova-dependencia.png) |
| **5** | **Reservas Parciais** | Canal de reservas Reserve Partner offline/indisponível. | SourceCoverage parcial explícita; capacidade NÃO é declarada livre. | **PASS** | [coverage-reservas-parcial.png](screenshots/coverage-reservas-parcial.png) |
| **6** | **Publicação Destino** | Sincronização iFood confirmado, Google resultado_incerto (timeout) e Totem pendente. | Estados de destino desacoplados; ausência de "Publicado em todos"; resultado incerto ≠ falha comprovada. | **PASS** | [publicacao-por-destino-desacoplada.png](screenshots/publicacao-por-destino-desacoplada.png) |
| **7** | **CEN-061 Base** | Projeção hipotética 8.000 / 400 mês / 12 meses. | Benefício R$ 4.800 e diferença -R$ 3.200 rotulados como hipótese com limitações. | **PASS** | [cenario-cen061-base-limites.png](screenshots/cenario-cen061-base-limites.png) |
| **8** | **Premissa Unknown** | Premissa ASM-04 marcada como status unknown. | Projeção dependente bloqueada como Não Mensurável; zero evitado. | **PASS** | [premissa-unknown-nao-mensuravel.png](screenshots/premissa-unknown-nao-mensuravel.png) |
| **9** | **Cenário v1 → v2** | Revisão de cenário para R$ 550/mês preservando histórico. | v2.0 com premissa revista; snapshot de v1.0 completa (ASM-01..04 e projeção) preservado no histórico. | **PASS** | [cenario-v2-preservando-v1.png](screenshots/cenario-v2-preservando-v1.png) |
| **10** | **Salvar Cenário** | Salvar rascunho de cenário financeiro. | Zero mutação em compromissos operacionais, orçamentos reais, pagamentos ou calendário (deep-equal). | **PASS** | — |
| **11** | **Adoção 15/20** | Apuração de 20 tarefas elegíveis (15 fluxo, 3 assistidas, 2 gaps). | Taxa formal de 75% apurada com separação de assistidas e exclusões. | **PASS** | [adocao-15-20-breakdown.png](screenshots/adocao-15-20-breakdown.png) |
| **12** | **Adoção Parcial** | Instrumentação parcial de telemetria com terminais ausentes. | Generalização da taxa bloqueada; restrição explícita à amostra observada. | **PASS** | [adocao-cobertura-parcial.png](screenshots/adocao-cobertura-parcial.png) |

---

## 4. Auditoria de Provas Especiais (v2.3)

### 4.1 Standalone Truthfulness Gate (v2.3)

- **A1–A6 (Adversariais Harness-Only):** Nascem estritamente como **`NOT_RUN`** em modo standalone (com badge neutro cinza, ícone `○` e tag de origem `harness`).
- **P1–P3 e N1–N8:** Avaliados dinamicamente em tempo real a partir do estado factual (`source: runtime`).
- **Screenshot Canônica:** [standalone-proof-panel-not-run.png](screenshots/standalone-proof-panel-not-run.png)

### 4.2 Positive Proofs (P1-P3)

| ID | Requisito / Claim | Fato Observado / Evidência | Esperado | Atual | Status |
|---|---|---|---|---|:---:|
| **P1** | CalendarProposal preserva CalendarVersion vigente e compromissos existentes | Vigente: 18:00–23:00, Proposta: 19:00–23:00, Deps ativas: RES-DEMO-062, PRO-DEMO-062 | Versão vigente 18-23 e compromissos intactos sob proposta 19-23 | Versão vigente e compromissos preservados com separação canônica | **PASS** |
| **P2** | ScenarioVersion é rastreável, com premissas declaradas e versionada | Cenário CEN-DEMO-061 v1.0.0: Benefício R$ 4800, Dif R$ -3200, Limitações: 5 | Cálculo derivado exclusivamente de premissas com limites explícitos | Projeção puramente hipotética rastreada com limitações completas | **PASS** |
| **P3** | AdoptionDefinition possui população elegível, denominador e exclusions explícitas | Denominador elegível: 20, Concluídas: 15 (75%), Assistidas: 3, Gaps: 2 | 15/20 = 75% apurado exclusivamente sobre população elegível com exclusões | Taxa apurada sob contrato explícito de medição | **PASS** |

### 4.3 Negative Proofs (N1-N8)

| ID | Requisito / Claim | Fato Observado / Evidência | Esperado | Atual | Status |
|---|---|---|---|---|:---:|
| **N1** | Salvar proposta não aplica calendário na versão vigente | Proposal status: salva_rascunho, Vigente: 18:00–23:00 | Vigente inalterada (18:00) ao salvar proposta | Vigente intacta em 18:00 | **PASS** |
| **N2** | Conflito material não resolvido impede aplicação do calendário proposto | Conflitos pendentes: true, Vigente ativa: 18:00 | Bloqueio de transição enquanto houver dependência pendente | Aplicação bloqueada com sucesso diante de pendência | **PASS** |
| **N3** | Nova dependência invalida assessment antigo e dependências passam de 2 para 3 | Status do Assessment: STALE, Dependências ativas: 3 | Assessment anterior marcado como STALE com 3 dependências | Assessment invalidado e 3 dependências reportadas | **PASS** |
| **N4** | Cobertura parcial de reservas não declara capacidade livre nem "0 conflitos" | SourceCoverage status: parcial, canais ausentes: Reserve Partner | Status parcial explícito sem declarar ausência de reservas | Cobertura parcial devidamente sinalizada | **PASS** |
| **N5** | Publicação é independente por destino (sucesso isolado não publica em todos) | iFood: confirmado, Google: resultado_incerto, Totem: pendente | Status individuais preservados por canal de publicação | Publicações desacopladas e reconciliação preservada | **PASS** |
| **N6** | Premissa necessária desconhecida (unknown) não vira zero | Premissa ASM-04: unknown, isCalculable: false, grossBenefit: null | Cálculo bloqueado como Não Mensurável sem injetar 0 | Cálculo bloqueado e zero evitado com sucesso | **PASS** |
| **N7** | Cenário salvo não altera orçamento real, assets, pagamentos nem calendário | Deep-equal protegido: true, Doc salvo: true, Horário vigente: 18:00 | Zero mutação em fatos protegidos (calendário, compromissos, budgetRef, assetRef, paymentRef) | Deep-equal comprovou zero efeito colateral fora do documento do cenário | **PASS** |
| **N8** | Adoção parcial não generaliza para o restaurante inteiro | Status instrumentação: parcial, Generalização permitida: false | Generalização bloqueada quando a cobertura de instrumentação for parcial | Interpretação restrita com sucesso à amostra observada | **PASS** |

### 4.4 Adversarial Proofs Autorizados pelo Harness CDP (A1-A6)

| ID | Tentativa Adversarial / Claim | Injeção & Fato Observado | Comportamento Esperado | Resultado Real | Status |
|---|---|---|---|---|:---:|
| **A1** | Badge visual falso no DOM não mascara CalendarVersion factual | Spoof injetado: "Vigente 19:00-23:00", Factual: 18:00–23:00 | Evaluator factual rejeita claim visual e confirma vigência real de 18:00–23:00 | Claim visual rejeitado; veredicto factual preservou vigência de 18:00 | **PASS** |
| **A2** | Tentativa de fazer calendário caber apagando compromisso factual é detectada e bloqueada | Remoção deliberada de RES-DEMO-062 detectada contra snapshot canônico: true | Violação de integridade acusada quando compromisso de origem é suprimido | Tentativa destrutiva detectada como violação de proveniência | **PASS** |
| **A3** | Tentativa de usar impact assessment stale para aplicar proposta é bloqueada pelo gate | Gate allowed: false, Motivos: "Impact Assessment está desatualizado (STALE): Nova dependência concorrente RES-DEMO-063 detectada às 18:45 após avaliação inicial.", Applied: false | Gate formal de aplicabilidade bloqueia transição e mantém vigência em 18:00 | Gate de domínio rejeitou a proposta desatualizada e bloqueou a aplicação | **PASS** |
| **A4** | Cobertura parcial com claim visual "0 conflitos" não é aceita como capacidade livre | Factual coverage: parcial, Spoof DOM: "0 Conflitos" | Veredicto mantém estado de cobertura parcial e recusa alegação de capacidade livre | Avaliador ignorou o texto do DOM e preservou o status parcial | **PASS** |
| **A5** | Autodeclaração de economia realizada sobre cenário hipotético é estritamente rejeitada | Status factual do cenário: SIMULACAO_HIPOTESE, Claim injetado: "Economia realizada" | Status do cenário permanece SIMULACAO_HIPOTESE com rejeição de claim de realização | Claim de economia realizada rejeitado; mantido status de simulação hipotética | **PASS** |
| **A6** | Inflação de cliques/interações não altera a taxa formal de adoção (15/20 = 75%) | Cliques espúrios adicionados: 500, Taxa apurada: 15/20 (75%) | Taxa imutável calculada estritamente pelo número de tarefas concluídas no fluxo formal | Taxa permaneceu estritamente em 15/20 (75%) sem inflação por cliques | **PASS** |

### 4.5 Provas Adicionais de Rigor (ZD1 & T1 — Operating Model v2.3 / B01-D19)

| ID | Requisito / Claim | Fato Observado / Evidência | Esperado | Atual | Status |
|---|---|---|---|---|:---:|
| **ZD1** | Adoção com denominador zero resulta em "Não aplicável" e recusa 0% (Regra V6) | isNotApplicable: true, ratePct: null, DOM text: "Não aplicável" | Denominador zero tratado como Não aplicável, sem zero artificial no DOM | Estado Não aplicável comprovado e zero percentual estritamente omitido | **PASS** |
| **T1** | Janela transnoite preserva businessDate, duração positiva e fuso canônico (Regra B01-D19) | Civil: 2026-10-03 a 2026-10-04, businessDate: 2026-10-03, Duração: 240m, Timezone: America/Sao_Paulo | Duas datas civis explícitas, data de negócio inalterada, duração positiva (240m) e histórico imutável | Contrato temporal D19 comprovado com preservação de businessDate e imutabilidade de fatos pretéritos | **PASS** |

---

## 5. Harness Mutation Self-Check (Section 19)

- **Falso Claim Detectado:** PASS (Avaliador factual detectou corrupção proposital e retornou FAIL).
- **Mutation Test:** PASS (Restauração do fato material retornou PASS).
- **Exit-Code Gate:** Conectado a todos os gates (cenários, P, N, A, ZD1, T1, standalone audit, self-check, mobile e console).

---

## 6. Viewport e Execução Técnica
- **Desktop (1440 x 900):** Superfícies totalmente funcionais e auditadas.
- **Mobile (390 x 844):** Verificado em SCR-GES-004 e SCR-GES-005; **Zero overflow horizontal** (`scrollWidth <= innerWidth`); touch targets >= 44px.
  - [mobile-ges-004.png](screenshots/mobile-ges-004.png)
  - [mobile-ges-005.png](screenshots/mobile-ges-005.png)
- **Erros de Console/Runtime:** **Zero erros não tratados**.
