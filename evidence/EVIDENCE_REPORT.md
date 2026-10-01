# Dossiê de Evidências — UX-CW04 WI01: Leitura, Decisão e Plano (R1 Hardened)
**Projeto:** Toca do Peixe  
**Frente:** CW-04 — Decisão Gerencial / Gestão  
**Work Item:** CW04-WI01 — Leitura, decisão e plano (R1)  
**Data:** 01/10/2026  
**Status do Executor:** DONE (Pronto para re-review independente do ChatGPT)  
**Governança:** DONE ≠ APPROVED

---

## 1. Diretório, Repositório e Isolamento

- **DevFlow project_id:** tocadopeixe
- **Base commit esperado:** `fb7591e19d40a6c86f9a3030d73ed6848d2cb375`
- **Branch:** `ux-cw04-wi01`
- **Diretório isolado:** `prototypes/ux-cw04/wi01-management/`
- **Repositório de produção:** 100% intocado (`tocadopeixe/repo/tocadopeixe` e `tocadopeixe-repo` limpos).

---

## 2. Superfícies Normativas v1.0

1. **SCR-GES-001 — Gestão orientada a decisões**
2. **SCR-GES-002 — Metas, orçamento e resultados**
3. **SCR-GES-003 — Planos de ação e reuniões**

*Superfícies GES-004 e GES-005 pertencem a CW04-WI02 e não foram promovidas nesta task.*

---

## 3. Matriz dos 12 Cenários Obrigatórios

| № | Cenário | Ação Executada | Invariante Verificada | Status | Screenshot |
|---|---|---|---|:---:|---|
| **1** | **Leitura completa** | Métrica MET-19 apurada com cobertura 100% e abertura de causa. | Valor derivado, versão e período explícitos; AUD-DEMO-061 acessível via drawer sem mutação. | **PASS** | [ges-001-leitura-completa.png](screenshots/ges-001-leitura-completa.png) |
| **2** | **Cobertura parcial** | Remoção de Estoque Moema da cobertura das fontes. | Consolidado vira parcial; unidade ausente não entra como zero. | **PASS** | [ges-001-cobertura-parcial.png](screenshots/ges-001-cobertura-parcial.png) |
| **3** | **Denominador zero** | Métrica MET-20 com população elegível igual a 0. | Resultado = "Não aplicável"; nunca 0%; sem viés polarizado. | **PASS** | — |
| **4** | **Períodos incompatíveis** | Comparação de mês cheio (30 dias) vs quinzena (15 dias). | Delta comparativo bloqueado; aviso contratual V6 exibido. | **PASS** | — |
| **5** | **META-DEMO-061 disjunta** | Orçamento R$ 12.000 = 9.000 + 2.000 + 1.000 com bases disjuntas. | Composição calculada; diferença não chamada de saldo bancário nem caixa. | **PASS** | [ges-002-meta-demo-061-valida.png](screenshots/ges-002-meta-demo-061-valida.png) |
| **6** | **META-DEMO-061 overlap desconhecido** | Sobreposição entre realizado e compromissos desconhecida. | Residual NÃO é calculado; UI exibe "Conferir composição". | **PASS** | [ges-002-composicao-bloqueada-overlap.png](screenshots/ges-002-composicao-bloqueada-overlap.png) |
| **7** | **Meta v1 -> v2** | Proposta de revisão para R$ 14.500 com justificativa e autor. | v1.0 preservada no histórico; v2.0 com vigência sem reescrita retroativa. | **PASS** | — |
| **8** | **PA-DEMO-061 ação executada** | Execução de ACT-01 registrada pelo técnico. | Tarefa feita ≠ evidence; verificação e resultado continuam pendentes. | **PASS** | [ges-003-acao-feita-sem-resultado.png](screenshots/ges-003-acao-feita-sem-resultado.png) |
| **9** | **Evidence + Verificação** | Laudo técnico anexado e verificação aceita pela gestora. | AUD-DEMO-061 e OS-DEMO-061 permanecem abertos na origem; autoridade conservada. | **PASS** | [ges-003-evidence-verificacao.png](screenshots/ges-003-evidence-verificacao.png) |
| **10** | **Reunião encerrada** | Reunião de alinhamento encerrada. | Plano PA-DEMO-061 permanece ativo; pendências continuam abertas. | **PASS** | [ges-003-reuniao-encerrada-plano-aberto.png](screenshots/ges-003-reuniao-encerrada-plano-aberto.png) |
| **11** | **Responsável sem acesso** | Atribuição de ação a ator externo sem credencial no módulo. | Atribuição recusada; nenhum dado restrito vazado; responsável mantido. | **PASS** | — |
| **12** | **Outcome posterior** | Observação de resultado formal registrada após período de maturação. | OUT-DEMO-061-01 possui identidade própria; histórico preservado. | **PASS** | [ges-003-outcome-posterior.png](screenshots/ges-003-outcome-posterior.png) |

---

## 4. Auditoria de Provas Especiais Endurecidas (R1)

### Positive Proofs (P1-P3)

| ID | Requisito / Claim | Fato Observado / Evidência | Esperado | Atual | Status |
|---|---|---|---|---|:---:|
| **P1** | Métrica completa e rastreável desde a definição até o fato de origem | MET-19 apurada: 14 horas, fonte AUD-DEMO-061, versão 1.0.0, fato presente no módulo de origem | Definição versionada, período explícito e origem factual AUD-DEMO-061 acessíveis | v1.0.0, período 2026-09-01 a 2026-09-30, origem AUD-DEMO-061 (fato AUD presente: true) | **PASS** |
| **P2** | Cadeia de governança completa: achado -> plano -> ação -> evidência -> verificação -> outcome | Plano PA-DEMO-061 ligado a AUD-DEMO-061,OS-DEMO-061, ação ACT-01 (executada), evidência EVD-ACT-01, verificação aceita, outcome OUT-DEMO-061-01 | Todos os 6 elos presentes com identidades canônicas e OutcomeObservation formal após verificação | Cadeia completa 6/6 elos verificada com OutcomeObservation formal | **PASS** |
| **P3** | Versionamento formal de meta preserva snapshot anterior sem reescrita de histórico | Versão vigente: v2.0.0 (R$ 14500); Histórico arquivado: v1.0.0 (R$ 12000) | v2.0 proposta com autor e justificativa, v1.0 preservada no array de histórico | v1.0 intacta e v2.0 vigente | **PASS** |

### Negative Proofs (N1-N7)

| ID | Requisito / Claim | Fato Observado / Evidência | Esperado | Atual | Status |
|---|---|---|---|---|:---:|
| **N1** | Cobertura parcial != zero: unidade ausente não entra como zero | Estoque Moema status: ausente, valor: null | Unidade ausente tratada como null/ausente, nunca computada como zero | Ausente declarada e valor null (não-zero) | **PASS** |
| **N2** | Denominador zero = Não aplicável (nunca 0%) | MET-20 com população 0 -> displayValue: "Não aplicável", isNotApplicable: true | Resultado explicitamente "Não aplicável", sem viés estatístico de 0% | displayValue = "Não aplicável" | **PASS** |
| **N3** | Períodos com grãos divergentes bloqueiam cálculo de delta comparativo | arePeriodsCompatible: false, motivo: "Grãos temporais divergentes: Mensal fechado (30 dias) vs Quinzena parcial (15 dias). Comparação percentual bloqueada por contrato V6." | Comparação bloqueada e motivo contratual exibido | Comparação bloqueada com justificativa | **PASS** |
| **N4** | Orçamento com overlap desconhecido não calcula residual nem chama de saldo bancário | residual: null, label: "Conferir composição", isCalculable: false | residual === null e aviso "Conferir composição" | Residual bloqueado e rotulado como Conferir composição | **PASS** |
| **N5** | Ação executada sem evidência técnica não transita para verificação nem outcome | ACT-02 transitada para executada com evidenceRef=null: verificação permaneceu inexistente/não aceita, outcome inexistente | Executada sem evidenceRef bloqueia verificação e outcome formal | Bloqueio respeitado: nenhuma verificação gerada para ação sem evidência | **PASS** |
| **N6** | Encerramento de reunião de alinhamento não encerra plano de ação nem tarefas pendentes | meeting: encerrada, plano: EM_ANDAMENTO, ACT-02: pendente | meeting.status === "encerrada" e plano.status === "EM_ANDAMENTO" | Reunião encerrada e plano mantido ativo com pendências | **PASS** |
| **N7** | Atribuição a ator sem credencial é recusada por segurança e alçada sem vazamento de dados | Ator recusado: "Prestador Sem Escopo", motivo: "Acesso negado: o usuário não possui permissão de acesso ao caso operacional e ao objeto do plano (Regra de Segurança e Escopo).", responsável mantido: "Engenheiro de Manutenção" | success === false, assignee inalterado ("Engenheiro de Manutenção"), zero dados restritos expostos | Atribuição recusada com sucesso, assignee inalterado e sem vazamento de dados | **PASS** |

### Adversarial Proofs (A1-A6)

| ID | Tentativa Adversarial / Claim | Injeção & Fato Observado | Comportamento Esperado | Resultado Real | Status |
|---|---|---|---|---|:---:|
| **A1** | PASS autodeclarado não vale: o evaluator factual rejeita claim falso quando o fato é corrompido | Claim autodeclarado: "PASS"; Veredicto factual com fato corrompido: false; Veredicto factual com fato íntegro: true | claim = "PASS", fato corrompido -> factual verdict = FAIL (false) | Claim autodeclarado PASS rejeitado com veredicto factual FAIL (false); restaurado para true | **PASS** |
| **A2** | Badge visual falso no DOM não mascara cobertura factual parcial | Claim visual injetado: "● Cobertura Completa (3/3 unidades)"; Factual coverage no State: "parcial"; Veredicto factual derivado: false | claim visual = completa, factual coverage = parcial, veredicto factual = FAIL (false) | Veredicto permaneceu parcial/FAIL a despeito do texto enganoso injetado no DOM | **PASS** |
| **A3** | Valor sem provenance recalcula: leitura gerencial reflete fatos de observação dinâmicos | Numerador alterado de 14 para 25 -> valor recalculado: 0.0347 (25/720) | numericValue recalculado == 25 / 720 | numericValue = 0.0347 | **PASS** |
| **A4** | Ação com status "executada" injetada no fluxo real sem evidência não gera verificação nem resultado | Ação TEST-99 renderizada no DOM: true, evidência: false, verificação: false, outcome: false, plano concluído: false | Ação no state real renderizada sem verificação e sem conclusão indevida | Ação inserida permaneceu sem evidência, sem verificação e sem outcome no fluxo real | **PASS** |
| **A5** | Fatos operacionais são estritamente imutáveis pelo módulo gerencial | Snapshot inicial e atual de AUD-DEMO-061, OS-DEMO-061, ORD-DEMO-201 e WI-DEMO-101 são estritamente idênticos: true | Snapshot deep-equal true | current === initial: true | **PASS** |
| **A6** | Unidade sem fonte (Estoque Moema) nunca fabrica zero no consolidado, no state nem no DOM | Estoque Moema em expectedUnits: true; em reportedUnits: false; valor: null; status leitura: "parcial"; DOM exibe ausência: true | coverage=parcial, Estoque Moema ausente com valor null (não 0), consolidado não soma 0 | Ausência comprovada no cálculo, no state e no DOM sem zero fabricado | **PASS** |

---

## 5. Harness Mutation Self-Check (Section 13)

- **Falso Claim Detectado:** PASS (Claim declarativo 'PASS' rejeitado quando fato de origem foi corrompido).
- **Mutation Test:** PASS (Avaliador factual retornou false sob injeção de fato inválido e true após restauração).
- **Exit-Code Gate:** Conectado a todos os gates (cenários, P, N, A, self-check, mobile e console).

---

## 6. Viewport e Execução Técnica
- **Desktop (1440 x 900):** Superfícies totalmente funcionais e auditadas.
- **Mobile (390 x 844):** Verificado em SCR-GES-001 e SCR-GES-003; **Zero overflow horizontal** (`scrollWidth <= innerWidth`); touch targets >= 44px.
- **Erros de Console/Runtime:** **Zero erros não tratados**.
