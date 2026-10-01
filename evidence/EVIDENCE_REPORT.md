# Dossiê de Evidências — UX-CW04 WI01: Leitura, Decisão e Plano
**Projeto:** Toca do Peixe  
**Frente:** CW-04 — Decisão Gerencial / Gestão  
**Work Item:** CW04-WI01 — Leitura, decisão e plano  
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

## 4. Auditoria de Provas Especiais (Positive, Negative, Adversarial)

### Positive Proofs
- **P1 — Métrica completa e rastreável:** **PASS** (fonte -> observation -> cálculo -> leitura -> origem AUD-DEMO-061).
- **P2 — Cadeia de plano completa:** **PASS** (achado -> plano -> ação -> evidence -> verificação -> outcome com identidades únicas).
- **P3 — Meta versionada:** **PASS** (v1.0 preservada no histórico, v2.0 proposta sem retroatividade).

### Negative Proofs
- **N1 — Cobertura parcial ≠ zero:** **PASS** (unidade ausente não é computada como 0).
- **N2 — Denominador zero = Não aplicável:** **PASS** (nunca 0%).
- **N3 — Períodos incompatíveis bloqueiam comparação:** **PASS** (delta não calculado).
- **N4 — Orçamento com overlap desconhecido:** **PASS** (exibe "Conferir composição", sem residual).
- **N5 — Ação feita sem evidence não verifica resultado:** **PASS**.
- **N6 — Reunião encerrada não fecha plano:** **PASS**.
- **N7 — Responsável sem acesso não recebe atribuição:** **PASS**.

### Adversarial Proofs
- **A1 — PASS autodeclarado não vale:** **PASS** (runner valida invariantes factuais independentes de flags claim).
- **A2 — Badge hardcoded ignorado:** **PASS** (estado real de SourceCoverage rege o veredicto).
- **A3 — Valor sem provenance recalcula:** **PASS** (mutação em fato de observação atualiza a leitura).
- **A4 — Status done não prova resultado:** **PASS** (tarefa executada isolada não conclui outcome).
- **A5 — Setters gerenciais proibidos sobre fatos operacionais:** **PASS** (snapshot inicial e final de AUD-DEMO-061, OS-DEMO-061, ORD-DEMO-201 e WI-DEMO-101 são estritamente IDÊNTICOS).
- **A6 — Unidade sem fonte nunca fabrica zero no consolidado:** **PASS**.

---

## 5. Viewport e Execução Técnica
- **Desktop (1440 x 900):** Superfícies totalmente funcionais e auditadas.
- **Mobile (390 x 844):** Verificado em SCR-GES-001 e SCR-GES-003; **Zero overflow horizontal** (`scrollWidth <= innerWidth`); touch targets >= 44px.
- **Erros de Console/Runtime:** **Zero erros não tratados**.
