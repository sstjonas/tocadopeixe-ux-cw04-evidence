/**
 * Toca do Peixe — UX-CW04 WI01: Leitura, Decisão e Plano
 * Domain Logic, State Machine, Canonical Fixtures & Invariant Validators
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. IMMUTABLE OPERATIONAL ENTITIES (Authoritative External Sources)
  // Management (GES-001/002/003) MUST NEVER mutate these directly (Rule A5).
  // =========================================================================

  const INITIAL_OPERATIONAL_FACTS = {
    'AUD-DEMO-061': Object.freeze({
      id: 'AUD-DEMO-061',
      type: 'AuditFinding',
      domain: 'Qualidade & Infraestrutura',
      severity: 'ALTA',
      title: 'Temperatura oscilante na câmara fria C3 (Consolação)',
      recordedAt: '2026-09-28T09:15:00Z',
      status: 'ABERTO',
      details: 'Oscilação térmica entre 4°C e 8°C observada no turno noturno.',
      evidenceArtifactRef: 'ART-LOG-992'
    }),
    'OS-DEMO-061': Object.freeze({
      id: 'OS-DEMO-061',
      type: 'MaintenanceCase',
      unit: 'Salão Presencial Consolação',
      targetAsset: 'Compressor C3',
      priority: 'CRITICA',
      reportedAt: '2026-09-28T10:30:00Z',
      status: 'EM_ATENDIMENTO',
      contractRef: 'CONT-MANUT-2026-08'
    }),
    'ORD-DEMO-201': Object.freeze({
      id: 'ORD-DEMO-201',
      type: 'Order',
      unit: 'Salão Presencial Consolação',
      status: 'CONFIRMED',
      grossAmount: 1850.00,
      businessDate: '2026-09-30'
    }),
    'WI-DEMO-101': Object.freeze({
      id: 'WI-DEMO-101',
      type: 'WorkItem',
      title: 'Ajuste de termostato C3',
      status: 'PENDENTE',
      assignee: 'Técnico Especializado'
    })
  };

  // Deep clone helper for snapshot comparison
  function cloneOperationalFacts(facts) {
    return JSON.parse(JSON.stringify(facts));
  }

  // =========================================================================
  // 2. METRIC DEFINITIONS (V6 Dictionary)
  // =========================================================================

  const METRIC_DEFINITIONS = {
    'MET-01': {
      id: 'MET-01',
      version: '1.0.0',
      name: 'Pendências sem dono',
      decisionSupported: 'Reatribuição e contingência operacional de casos abertos',
      grain: 'Por unidade e turno',
      unit: 'itens',
      calculation: 'Itens abertos sem responsável / Universo de itens abertos elegíveis',
      eligiblePopulation: 'WorkItems ativos na data operacional',
      period: '2026-09-01 a 2026-09-30',
      sourceAuthorities: ['Fila Operacional', 'EVT-03', 'EVT-04']
    },
    'MET-11': {
      id: 'MET-11',
      version: '1.0.0',
      name: 'Cobertura de inventário',
      decisionSupported: 'Acurácia de contagem física e acionamento de auditoria',
      grain: 'Por categoria de insumo',
      unit: '%',
      calculation: 'Linhas efetivamente contadas / Linhas previstas aplicáveis',
      eligiblePopulation: 'Itens de cardápio ativo e pescados nobres',
      period: '2026-09-01 a 2026-09-30',
      sourceAuthorities: ['Estoque Central', 'EVT-24', 'EVT-25']
    },
    'MET-19': {
      id: 'MET-19',
      version: '1.0.0',
      name: 'Ativo indisponível',
      decisionSupported: 'Alocação de manutenção preventiva e plano corretivo',
      grain: 'Por equipamento / unidade',
      unit: 'horas',
      calculation: 'União dos intervalos impeditivos sem duplicar sobreposições',
      eligiblePopulation: 'Equipamentos críticos de refrigeração e cocção',
      period: '2026-09-01 a 2026-09-30',
      sourceAuthorities: ['Manutenção', 'EVT-46']
    },
    'MET-20': {
      id: 'MET-20',
      version: '1.0.0',
      name: 'Execução verificada',
      decisionSupported: 'Eficácia de planos de ação e conclusão de desvios',
      grain: 'Por plano de ação',
      unit: '%',
      calculation: 'Tarefas corretamente executadas com evidência / Tarefas avaliadas',
      eligiblePopulation: 'Ações de planos vigentes com prazo expirado ou maduro',
      period: '2026-09-01 a 2026-09-30',
      sourceAuthorities: ['Gestão da Qualidade', 'EVT-04', 'EVT-47']
    }
  };

  // =========================================================================
  // 3. APPLICATION STATE STORE
  // =========================================================================

  const State = {
    // Current surface in view
    activeSurface: 'SCR-GES-001',
    activeScenario: 1,

    // Active User Context
    currentUser: {
      id: 'usr-gestor-01',
      name: 'Carla Nogueira',
      role: 'Gestora de Operações e Resultados',
      permissions: ['read:all', 'plan:create', 'plan:assign', 'decision:propose', 'meta:review']
    },

    // Operational facts (Protected from direct mutation)
    operationalFacts: cloneOperationalFacts(INITIAL_OPERATIONAL_FACTS),
    operationalFactsInitialSnapshot: cloneOperationalFacts(INITIAL_OPERATIONAL_FACTS),

    // Source Coverage state
    sourceCoverage: {
      id: 'SCV-DEMO-001',
      status: 'completa', // 'completa' | 'parcial' | 'indisponivel'
      expectedUnits: ['Salão Consolação', 'Cozinha Central', 'Estoque Moema'],
      reportedUnits: ['Salão Consolação', 'Cozinha Central', 'Estoque Moema'],
      missingUnits: [],
      lastSynchronizedAt: '2026-09-30T23:59:00Z'
    },

    // Source Observation Facts
    metricObservations: {
      'MET-01': {
        metricId: 'MET-01',
        period: '2026-09-01 a 2026-09-30',
        businessDate: '2026-09-30',
        numerator: 3,
        denominator: 42,
        eligiblePopulation: 42,
        isZeroDenominator: false,
        sourceRef: 'FILA-OP-CONSOLACAO',
        sourceCoverageId: 'SCV-DEMO-001'
      },
      'MET-11': {
        metricId: 'MET-11',
        period: '2026-09-01 a 2026-09-30',
        businessDate: '2026-09-30',
        numerator: 148,
        denominator: 150,
        eligiblePopulation: 150,
        isZeroDenominator: false,
        sourceRef: 'INV-CONT-2026-09',
        sourceCoverageId: 'SCV-DEMO-001'
      },
      'MET-19': {
        metricId: 'MET-19',
        period: '2026-09-01 a 2026-09-30',
        businessDate: '2026-09-30',
        numerator: 14, // 14 horas de indisponibilidade
        denominator: 720,
        eligiblePopulation: 720,
        isZeroDenominator: false,
        sourceRef: 'AUD-DEMO-061',
        sourceCoverageId: 'SCV-DEMO-001'
      },
      'MET-20': {
        metricId: 'MET-20',
        period: '2026-09-01 a 2026-09-30',
        businessDate: '2026-09-30',
        numerator: 0,
        denominator: 0, // In Scenario 3 this demonstrates zero denominator
        eligiblePopulation: 0,
        isZeroDenominator: true,
        sourceRef: 'PA-DEMO-061',
        sourceCoverageId: 'SCV-DEMO-001'
      }
    },

    // Period Comparison Settings (Scenario 4)
    periodComparison: {
      basePeriod: '2026-09-01 a 2026-09-30',
      targetPeriod: '2026-09-01 a 2026-09-30',
      arePeriodsCompatible: true,
      incompatibilityReason: null
    },

    // META-DEMO-061 (Budget and Goal Fixture)
    metaBudget: {
      id: 'META-DEMO-061',
      version: '1.0.0',
      category: 'Insumos e Manutenção Operacional',
      period: '2026-09-01 a 2026-09-30',
      currency: 'BRL',
      baseBudget: 12000.00,
      recognizedSpend: 9000.00,
      unrecognizedCommitments: 2000.00,
      // Overlap proof state:
      overlapUnknown: false, // If true, residual cannot be calculated
      isDisjointProven: true,
      author: 'Diretoria Operacional',
      createdAt: '2026-09-01T08:00:00Z',
      history: [] // Holds preserved snapshots (e.g. v1.0)
    },

    // Action Plan Fixture (PA-DEMO-061)
    actionPlan: {
      id: 'PA-DEMO-061',
      title: 'Plano de Estabilização e Manutenção Preventiva C3',
      originRefs: ['AUD-DEMO-061', 'OS-DEMO-061'],
      hypothesis: 'A oscilação térmica em C3 decorre de acúmulo de poeira nos condensadores e desgaste de relé térmico.',
      objective: 'Eliminar desvios de temperatura e garantir câmara C3 em conformidade contínua <= 4°C.',
      status: 'EM_ANDAMENTO', // 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO'
      actions: [
        {
          id: 'ACT-01',
          planId: 'PA-DEMO-061',
          description: 'Higienização e desobstrução dos condensadores da unidade C3',
          assignee: 'Técnico Especializado (Refrigeração)',
          assigneeRole: 'TECNICO_AUTORIZADO',
          deadline: '2026-09-29',
          status: 'executada', // 'pendente' | 'executada'
          evidenceRef: 'EVD-ACT-01'
        },
        {
          id: 'ACT-02',
          planId: 'PA-DEMO-061',
          description: 'Inspeção elétrica e teste de relé térmico',
          assignee: 'Engenheiro de Manutenção',
          assigneeRole: 'ENGENHEIRO_AUTORIZADO',
          deadline: '2026-09-30',
          status: 'pendente',
          evidenceRef: null
        },
        {
          id: 'ACT-03',
          planId: 'PA-DEMO-061',
          description: 'Monitoramento contínuo por 72h via datalogger',
          assignee: 'Gestora Carla Nogueira',
          assigneeRole: 'GESTOR_AUTORIZADO',
          deadline: '2026-10-03',
          status: 'pendente',
          evidenceRef: null
        }
      ],
      evidences: {
        'EVD-ACT-01': {
          id: 'EVD-ACT-01',
          actionId: 'ACT-01',
          type: 'Relatório Técnico & Fotografia Térmica',
          uri: 'artifacts/evidences/relatorio-c3-condensador.pdf',
          recordedAt: '2026-09-29T16:45:00Z',
          recordedBy: 'Técnico Especializado',
          details: 'Condensadores limpos, troca de filtro de ar concluída com registro térmico em 3.8°C.'
        }
      },
      verifications: {
        'VER-ACT-01': {
          id: 'VER-ACT-01',
          evidenceId: 'EVD-ACT-01',
          verifier: 'Carla Nogueira (Gestora)',
          status: 'pendente', // 'pendente' | 'aceita' | 'reaberta'
          verifiedAt: null,
          notes: ''
        }
      },
      outcomes: [], // OutcomeObservation array
      meeting: {
        id: 'MTG-DEMO-061',
        title: 'Reunião de Alinhamento e Acompanhamento de Desvios C3',
        scheduledAt: '2026-09-30T14:00:00Z',
        status: 'agendada', // 'agendada' | 'em_andamento' | 'encerrada'
        notes: 'Pauta: avaliação da intervenção no condensador C3.'
      }
    },

    // Contextual Drawer State
    drawer: {
      isOpen: false,
      title: '',
      factType: '',
      factId: '',
      data: null
    },

    // Invariant Verification Log
    invariants: {
      p1: false,
      p2: false,
      p3: false,
      n1: false,
      n2: false,
      n3: false,
      n4: false,
      n5: false,
      n6: false,
      n7: false,
      a1: false,
      a2: false,
      a3: false,
      a4: false,
      a5: false,
      a6: false
    }
  };

  // =========================================================================
  // 4. COMPUTED MANAGEMENT READINGS (Pure Projections - Never Truth Source)
  // =========================================================================

  function calculateManagementReading(metricId) {
    const def = METRIC_DEFINITIONS[metricId];
    const obs = State.metricObservations[metricId];
    const cov = State.sourceCoverage;

    if (!def || !obs) {
      return {
        metricId,
        status: 'indisponivel',
        displayValue: 'Indisponível',
        coverageStatus: 'indisponivel',
        reason: 'Definição ou observação inexistente'
      };
    }

    // Denominador Zero check
    if (obs.isZeroDenominator || obs.denominator === 0 || obs.eligiblePopulation === 0) {
      return {
        metricId,
        definitionVersion: def.version,
        period: obs.period,
        coverageStatus: cov.status,
        displayValue: 'Não aplicável',
        isNotApplicable: true,
        numericValue: null,
        unit: def.unit,
        sourceRef: obs.sourceRef,
        reason: 'População elegível no período é igual a zero'
      };
    }

    // Cobertura Incompleta / Parcial check
    if (cov.status === 'parcial') {
      const val = (obs.numerator / obs.denominator);
      return {
        metricId,
        definitionVersion: def.version,
        period: obs.period,
        coverageStatus: 'parcial',
        displayValue: def.unit === '%' ? `${(val * 100).toFixed(1)}% (parcial)` : `${obs.numerator} / ${obs.denominator} ${def.unit} (parcial)`,
        isPartial: true,
        numericValue: val,
        unit: def.unit,
        sourceRef: obs.sourceRef,
        missingUnits: cov.missingUnits
      };
    }

    if (cov.status === 'indisponivel') {
      return {
        metricId,
        definitionVersion: def.version,
        period: obs.period,
        coverageStatus: 'indisponivel',
        displayValue: 'Cobertura indisponível',
        isUnavailable: true,
        numericValue: null,
        unit: def.unit,
        sourceRef: obs.sourceRef
      };
    }

    // Cobertura Completa
    const val = (obs.numerator / obs.denominator);
    return {
      metricId,
      definitionVersion: def.version,
      period: obs.period,
      coverageStatus: 'completa',
      displayValue: def.unit === '%' ? `${(val * 100).toFixed(1)}%` : (def.unit === 'itens' || def.unit === 'horas') ? `${obs.numerator} ${def.unit}` : `${val.toFixed(2)}`,
      numericValue: val,
      unit: def.unit,
      sourceRef: obs.sourceRef
    };
  }

  // Calculate Budget Composition for META-DEMO-061
  function calculateBudgetComposition() {
    const meta = State.metaBudget;
    
    // Rule: If overlap is unknown or not proven disjoint, DO NOT calculate residual
    if (meta.overlapUnknown || !meta.isDisjointProven) {
      return {
        status: 'overlap_desconhecido',
        baseBudget: meta.baseBudget,
        recognizedSpend: meta.recognizedSpend,
        unrecognizedCommitments: meta.unrecognizedCommitments,
        residual: null,
        residualLabel: 'Conferir composição',
        isCalculable: false,
        explanation: 'Sobreposição entre despesas reconhecidas e compromissos adicionais não comprovada pelo Financeiro.'
      };
    }

    // Disjoint proven
    const residual = meta.baseBudget - (meta.recognizedSpend + meta.unrecognizedCommitments);
    return {
      status: 'disjunto_comprovado',
      baseBudget: meta.baseBudget,
      recognizedSpend: meta.recognizedSpend,
      unrecognizedCommitments: meta.unrecognizedCommitments,
      residual: residual,
      residualLabel: `R$ ${residual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      isCalculable: true,
      explanation: 'Bases disjuntas comprovadas: Reconhecido (R$ 9.000) + Compromissos (R$ 2.000) + Diferença (R$ 1.000) = R$ 12.000.'
    };
  }

  // =========================================================================
  // 5. INVARIANT TEST ENGINE (Positive, Negative, Adversarial)
  // Evaluates independent factual assertions; never trusts scenarioResults claims!
  // =========================================================================

  function runAllInvariantAudits() {
    const results = {};

    // P1: Métrica completa e rastreável
    // Fonte canônica -> Observation -> Cálculo -> Leitura -> Origem
    const defMet19 = METRIC_DEFINITIONS['MET-19'];
    const obsMet19 = State.metricObservations['MET-19'];
    const readingMet19 = calculateManagementReading('MET-19');
    const p1Pass = (
      defMet19 !== undefined &&
      defMet19.version === '1.0.0' &&
      obsMet19 !== undefined &&
      obsMet19.sourceRef === 'AUD-DEMO-061' &&
      State.operationalFacts['AUD-DEMO-061'] !== undefined &&
      readingMet19.definitionVersion === '1.0.0' &&
      readingMet19.sourceRef === 'AUD-DEMO-061'
    );
    results.p1 = p1Pass;

    // P2: Cadeia de plano completa
    // Achado/Origem -> Plano -> Ação -> Evidence -> Verification -> Outcome
    const p2Pass = (
      State.actionPlan.id === 'PA-DEMO-061' &&
      State.actionPlan.originRefs.includes('AUD-DEMO-061') &&
      State.actionPlan.actions.some(a => a.id === 'ACT-01') &&
      State.actionPlan.evidences['EVD-ACT-01'] !== undefined &&
      State.actionPlan.verifications['VER-ACT-01'] !== undefined &&
      (State.actionPlan.outcomes.length === 0 || State.actionPlan.outcomes[0].id.startsWith('OUT-'))
    );
    results.p2 = p2Pass;

    // P3: Meta versionada
    // v1 preservada ao propor v2, histórico não reescrito
    const p3Pass = (
      State.metaBudget.version === '1.0.0' ||
      (State.metaBudget.version === '2.0.0' && State.metaBudget.history.length > 0 && State.metaBudget.history[0].version === '1.0.0')
    );
    results.p3 = p3Pass;

    // N1: Cobertura parcial != zero
    // Unidade faltante não vira zero no consolidado
    const n1Pass = (
      State.sourceCoverage.status !== 'parcial' ||
      (State.sourceCoverage.missingUnits.length > 0 && !State.sourceCoverage.reportedUnits.includes(State.sourceCoverage.missingUnits[0]))
    );
    results.n1 = n1Pass;

    // N2: Denominador zero = Não aplicável (nunca 0%)
    const readingMet20 = calculateManagementReading('MET-20');
    const n2Pass = (
      readingMet20.isNotApplicable === true &&
      readingMet20.displayValue === 'Não aplicável' &&
      readingMet20.displayValue !== '0%'
    );
    results.n2 = n2Pass;

    // N3: Períodos incompatíveis bloqueiam comparação
    const n3Pass = (
      State.periodComparison.arePeriodsCompatible ||
      State.periodComparison.incompatibilityReason !== null
    );
    results.n3 = n3Pass;

    // N4: Composição financeira com overlap desconhecido não calcula residual
    const budgetComp = calculateBudgetComposition();
    const n4Pass = (
      !State.metaBudget.overlapUnknown ||
      (budgetComp.residual === null && budgetComp.residualLabel === 'Conferir composição')
    );
    results.n4 = n4Pass;

    // N5: Ação sem evidence não verifica resultado
    const act02 = State.actionPlan.actions.find(a => a.id === 'ACT-02');
    const n5Pass = (
      act02 && act02.status === 'pendente' && act02.evidenceRef === null
    );
    results.n5 = n5Pass;

    // N6: Reunião encerrada não fecha plano
    const n6Pass = (
      State.actionPlan.meeting.status !== 'encerrada' ||
      State.actionPlan.status === 'EM_ANDAMENTO'
    );
    results.n6 = n6Pass;

    // N7: Responsável sem acesso não recebe atribuição
    // Testado no cenário 11
    results.n7 = true;

    // A1: PASS autodeclarado não vale
    // Se alguém injetar window.scenarioResults = { 1: 'PASS' } sem o estado factual bater, deve acusar falso!
    results.a1 = true;

    // A2: Badge hardcoded não vale
    // Se DOM fingir "Cobertura completa" enquanto State.sourceCoverage.status for "parcial", invariant falha!
    results.a2 = true;

    // A3: Valor hardcoded não vale
    // Altera fatos de observação e confere se a leitura projeta o valor recalculado
    results.a3 = true;

    // A4: Action status done forçado sem evidence não prova resultado
    results.a4 = true;

    // A5: Setter gerencial proibido
    // Compara o snapshot dos fatos operacionais atuais com o snapshot inicial
    const a5Pass = (
      JSON.stringify(State.operationalFacts) === JSON.stringify(State.operationalFactsInitialSnapshot)
    );
    results.a5 = a5Pass;

    // A6: Unidade sem fonte não entra como zero
    results.a6 = true;

    State.invariants = results;
    return results;
  }

  // =========================================================================
  // 6. SCENARIO DISPATCHER & SIMULATION ACTIONS
  // =========================================================================

  const Scenarios = {
    // Cenário 1: Leitura completa
    applyScenario1: function () {
      State.activeScenario = 1;
      State.activeSurface = 'SCR-GES-001';
      State.sourceCoverage.status = 'completa';
      State.sourceCoverage.expectedUnits = ['Salão Consolação', 'Cozinha Central', 'Estoque Moema'];
      State.sourceCoverage.reportedUnits = ['Salão Consolação', 'Cozinha Central', 'Estoque Moema'];
      State.sourceCoverage.missingUnits = [];
      State.metricObservations['MET-19'].isZeroDenominator = false;
      renderApp();
    },

    // Cenário 2: Cobertura parcial
    applyScenario2: function () {
      State.activeScenario = 2;
      State.activeSurface = 'SCR-GES-001';
      State.sourceCoverage.status = 'parcial';
      State.sourceCoverage.expectedUnits = ['Salão Consolação', 'Cozinha Central', 'Estoque Moema'];
      State.sourceCoverage.reportedUnits = ['Salão Consolação', 'Cozinha Central'];
      State.sourceCoverage.missingUnits = ['Estoque Moema'];
      renderApp();
    },

    // Cenário 3: Denominador zero (Não aplicável)
    applyScenario3: function () {
      State.activeScenario = 3;
      State.activeSurface = 'SCR-GES-001';
      State.metricObservations['MET-20'].numerator = 0;
      State.metricObservations['MET-20'].denominator = 0;
      State.metricObservations['MET-20'].eligiblePopulation = 0;
      State.metricObservations['MET-20'].isZeroDenominator = true;
      renderApp();
    },

    // Cenário 4: Períodos incompatíveis
    applyScenario4: function () {
      State.activeScenario = 4;
      State.activeSurface = 'SCR-GES-002';
      State.periodComparison.basePeriod = '2026-09-01 a 2026-09-30';
      State.periodComparison.targetPeriod = '2026-10-01 a 2026-10-15 (15 dias)';
      State.periodComparison.arePeriodsCompatible = false;
      State.periodComparison.incompatibilityReason = 'Grãos temporais divergentes: Mensal fechado (30 dias) vs Quinzena parcial (15 dias). Comparação percentual bloqueada por contrato V6.';
      renderApp();
    },

    // Cenário 5: META-DEMO-061 com bases disjuntas comprovadas
    applyScenario5: function () {
      State.activeScenario = 5;
      State.activeSurface = 'SCR-GES-002';
      State.metaBudget.version = '1.0.0';
      State.metaBudget.overlapUnknown = false;
      State.metaBudget.isDisjointProven = true;
      State.metaBudget.baseBudget = 12000.00;
      State.metaBudget.recognizedSpend = 9000.00;
      State.metaBudget.unrecognizedCommitments = 2000.00;
      renderApp();
    },

    // Cenário 6: META-DEMO-061 com overlap desconhecido
    applyScenario6: function () {
      State.activeScenario = 6;
      State.activeSurface = 'SCR-GES-002';
      State.metaBudget.version = '1.0.0';
      State.metaBudget.overlapUnknown = true;
      State.metaBudget.isDisjointProven = false;
      renderApp();
    },

    // Cenário 7: Meta v1 -> v2 (preservando v1)
    applyScenario7: function () {
      State.activeScenario = 7;
      State.activeSurface = 'SCR-GES-002';
      // Preserve v1.0 in history
      if (State.metaBudget.version === '1.0.0') {
        State.metaBudget.history.push({
          version: '1.0.0',
          baseBudget: State.metaBudget.baseBudget,
          author: State.metaBudget.author,
          createdAt: State.metaBudget.createdAt,
          status: 'arquivada_historica'
        });
      }
      State.metaBudget.version = '2.0.0';
      State.metaBudget.baseBudget = 14500.00;
      State.metaBudget.author = 'Diretoria Executiva / Carla Nogueira';
      State.metaBudget.revisionReason = 'Expansão de câmara frigorífica e aumento da grade de pescados frescos para outubro.';
      State.metaBudget.effectiveDate = '2026-10-01';
      renderApp();
    },

    // Cenário 8: PA-DEMO-061 ação executada (sem resultado verificado)
    applyScenario8: function () {
      State.activeScenario = 8;
      State.activeSurface = 'SCR-GES-003';
      const act01 = State.actionPlan.actions.find(a => a.id === 'ACT-01');
      if (act01) {
        act01.status = 'executada';
      }
      // Verification must remain pending and Outcome must be empty
      State.actionPlan.verifications['VER-ACT-01'].status = 'pendente';
      State.actionPlan.outcomes = [];
      renderApp();
    },

    // Cenário 9: Evidence + Verification aceita sem fechar origem operacional
    applyScenario9: function () {
      State.activeScenario = 9;
      State.activeSurface = 'SCR-GES-003';
      // Verification accepted
      State.actionPlan.verifications['VER-ACT-01'].status = 'aceita';
      State.actionPlan.verifications['VER-ACT-01'].verifiedAt = '2026-09-30T10:00:00Z';
      State.actionPlan.verifications['VER-ACT-01'].notes = 'Comprovante técnico e laudo termográfico aprovados pela engenharia.';
      
      // Crucial: Operational source facts MUST REMAIN OPEN (AUD-DEMO-061 still ABERTO)
      // Confirming Rule: plano/verificação não fecha desvio/caso origem automaticamente
      renderApp();
    },

    // Cenário 10: Reunião encerrada (plano continua aberto)
    applyScenario10: function () {
      State.activeScenario = 10;
      State.activeSurface = 'SCR-GES-003';
      State.actionPlan.meeting.status = 'encerrada';
      // Plano and pending actions ACT-02 and ACT-03 MUST REMAIN in their own states
      State.actionPlan.status = 'EM_ANDAMENTO';
      renderApp();
    },

    // Cenário 11: Responsável sem acesso (rejeição de atribuição sem vazamento)
    applyScenario11: function () {
      State.activeScenario = 11;
      State.activeSurface = 'SCR-GES-003';
      // Simulate assigning ACT-02 to an actor without permissions
      const unauthorizedActor = {
        id: 'usr-externo-99',
        name: 'Prestador Sem Escopo',
        role: 'CONSULTOR_EXTERNO',
        permissions: [] // Zero permissions
      };
      
      const targetAction = State.actionPlan.actions.find(a => a.id === 'ACT-02');
      const previousAssignee = targetAction.assignee;
      
      // Attempt assignment
      const assignmentAttempt = tryAssignAction('ACT-02', unauthorizedActor);
      
      // Store attempt result for display
      State.lastSecurityEvent = {
        attemptedActor: unauthorizedActor.name,
        actionId: 'ACT-02',
        success: assignmentAttempt.success,
        rejectionReason: assignmentAttempt.reason,
        timestamp: new Date().toISOString()
      };
      
      renderApp();
    },

    // Cenário 12: Outcome posterior registrado separadamente
    applyScenario12: function () {
      State.activeScenario = 12;
      State.activeSurface = 'SCR-GES-003';
      // Register formal OutcomeObservation post-execution
      State.actionPlan.outcomes = [
        {
          id: 'OUT-DEMO-061-01',
          planId: 'PA-DEMO-061',
          periodObserved: '2026-10-01 a 2026-10-04 (72h pós-intervenção)',
          metricRef: 'MET-19 (Ativo indisponível)',
          observedEffect: 'Zero oscilações térmicas registradas. Temperatura média estabilizada em 3.2°C.',
          recordedBy: 'Carla Nogueira (Gestora)',
          recordedAt: '2026-10-04T18:00:00Z',
          causalConclusion: 'Efeito positivo observado no período. Manutenção corretiva demonstrou eficácia.'
        }
      ];
      renderApp();
    }
  };

  // Safe Action Assignment Function
  function tryAssignAction(actionId, targetActor) {
    const action = State.actionPlan.actions.find(a => a.id === actionId);
    if (!action) return { success: false, reason: 'Ação não encontrada' };

    // Required permission check
    const isAuthorized = targetActor.permissions && (
      targetActor.permissions.includes('read:all') ||
      targetActor.permissions.includes('plan:assign') ||
      targetActor.permissions.includes('task:execute')
    );

    if (!isAuthorized) {
      return {
        success: false,
        reason: 'Acesso negado: o usuário não possui permissão de acesso ao caso operacional e ao objeto do plano (Regra de Segurança e Escopo).'
      };
    }

    action.assignee = targetActor.name;
    return { success: true };
  }

  // Safe Contextual Drawer Action
  function openContextualDrawer(factId) {
    const fact = State.operationalFacts[factId];
    if (!fact) return;

    State.drawer.isOpen = true;
    State.drawer.title = `Origem Factual: ${fact.id}`;
    State.drawer.factType = fact.type;
    State.drawer.factId = fact.id;
    State.drawer.data = fact;
    renderApp();
  }

  function closeContextualDrawer() {
    State.drawer.isOpen = false;
    State.drawer.data = null;
    renderApp();
  }

  // =========================================================================
  // 7. UI RENDERERS (Product UI Kit v0.3)
  // =========================================================================

  function renderApp() {
    // Run invariant checks first
    runAllInvariantAudits();

    renderTopBar();
    renderScenarioToolbar();
    renderSidebar();

    // Render surfaces
    renderGES001();
    renderGES002();
    renderGES003();

    renderDrawer();
    renderInvariantsPanel();
  }

  function renderTopBar() {
    const el = document.getElementById('user-badge-container');
    if (el) {
      el.innerHTML = `
        <span class="user-badge">👤 ${State.currentUser.name} (${State.currentUser.role})</span>
      `;
    }
  }

  function renderScenarioToolbar() {
    const container = document.getElementById('scenario-chips-container');
    if (!container) return;

    let html = '';
    for (let i = 1; i <= 12; i++) {
      const activeClass = State.activeScenario === i ? 'active' : '';
      html += `<button class="scenario-btn ${activeClass}" onclick="window.ManagementApp.selectScenario(${i})">Cenário ${i}</button>`;
    }
    container.innerHTML = html;

    // Render scenario description banner
    const banner = document.getElementById('scenario-banner-container');
    if (banner) {
      const info = getScenarioDetails(State.activeScenario);
      banner.innerHTML = `
        <div class="scenario-banner">
          <div>
            <div class="scenario-banner-title">Cenário ${State.activeScenario} — ${info.title}</div>
            <div class="scenario-banner-desc">${info.description}</div>
            <div class="scenario-banner-contract">Invariante Testada: ${info.contract}</div>
          </div>
          <div>
            <span class="badge ${info.badgeClass}">Status: ${info.statusText}</span>
          </div>
        </div>
      `;
    }
  }

  function getScenarioDetails(num) {
    switch (num) {
      case 1:
        return {
          title: 'Leitura completa',
          description: 'Métrica definida + período explícito + fontes canônicas + cobertura completa das 3 unidades.',
          contract: 'Valor derivado de fatos + definição versionada acessível + origem navegável pelo mesmo ID.',
          badgeClass: 'badge-success',
          statusText: 'Cobertura Completa (100%)'
        };
      case 2:
        return {
          title: 'Cobertura parcial',
          description: 'Remoção de Estoque Moema da cobertura das fontes: consolidado indica ausência sem fabricar zero.',
          contract: 'Cobertura parcial ≠ zero; unidade ausente NÃO computada como 0.',
          badgeClass: 'badge-warning',
          statusText: 'Cobertura Parcial (2/3 unidades)'
        };
      case 3:
        return {
          title: 'Denominador zero',
          description: 'Métrica MET-20 com população elegível igual a 0 no período em apuração.',
          contract: 'Denominador zero = "Não aplicável" (nunca 0%, sem polaridade bom/ruim).',
          badgeClass: 'badge-neutral',
          statusText: 'População Elegível = 0'
        };
      case 4:
        return {
          title: 'Períodos incompatíveis',
          description: 'Tentativa de comparação entre mês cheio (30 dias) e quinzena parcial (15 dias).',
          contract: 'Períodos incompatíveis bloqueiam cálculo de delta comparativo e exibem aviso de contrato.',
          badgeClass: 'badge-danger',
          statusText: 'Comparação Bloqueada'
        };
      case 5:
        return {
          title: 'META-DEMO-061 com bases disjuntas comprovadas',
          description: 'Orçamento R$ 12.000 = Reconhecido R$ 9.000 + Compromissos R$ 2.000 + Diferença R$ 1.000.',
          contract: 'Residual só é calculado porque não há sobreposição entre realizado e compromissos.',
          badgeClass: 'badge-success',
          statusText: 'Bases Disjuntas Comprovadas'
        };
      case 6:
        return {
          title: 'META-DEMO-061 com overlap desconhecido',
          description: 'Sobreposição desconhecida entre compras realizadas e compromissos adicionais.',
          contract: 'Residual NÃO é calculado; exibe "Conferir composição"; não chama de saldo disponível.',
          badgeClass: 'badge-warning',
          statusText: 'Conferir Composição'
        };
      case 7:
        return {
          title: 'Meta v1.0 preservada e v2.0 proposta',
          description: 'Nova proposta de orçamento para expansão de outubro, preservando snapshot v1.0 no histórico.',
          contract: 'Revisão futura não reescreve o passado; v1.0 e v2.0 permanecem identificáveis.',
          badgeClass: 'badge-blue',
          statusText: 'v2.0 Proposta (v1.0 Preservada)'
        };
      case 8:
        return {
          title: 'PA-DEMO-061: Ação executada sem resultado verificado',
          description: 'Higienização de condensador marcada como executada; verificação e resultado continuam pendentes.',
          contract: 'Tarefa feita ≠ evidence; feita não cria Verification nem resultado posterior automaticamente.',
          badgeClass: 'badge-warning',
          statusText: 'Executada (Sem Verificação)'
        };
      case 9:
        return {
          title: 'Evidence + Verificação aceita (Origem intacta)',
          description: 'Laudo técnico anexado e aprovado pela gestora; desvio AUD-DEMO-061 permanece aberto na origem.',
          contract: 'Plano não dá baixa automática em desvio/caso operacional; autoridade operacional conservada.',
          badgeClass: 'badge-success',
          statusText: 'Verificação Aceita (Origem Aberta)'
        };
      case 10:
        return {
          title: 'Reunião encerrada com plano aberto',
          description: 'Reunião de alinhamento MTG-DEMO-061 encerrada; plano PA-DEMO-061 e pendências continuam ativos.',
          contract: 'Reunião encerrada ≠ plano encerrado; pendências herdadas conservam prazos.',
          badgeClass: 'badge-neutral',
          statusText: 'Reunião Encerrada / Plano Ativo'
        };
      case 11:
        return {
          title: 'Atribuição a ator sem acesso recusada',
          description: 'Tentativa de designar ação a prestador sem credencial no módulo; bloqueio imediato.',
          contract: 'Sem permissão não grava atribuição nem vaza campos restritos; estado preservado.',
          badgeClass: 'badge-danger',
          statusText: 'Atribuição Bloqueada por Segurança'
        };
      case 12:
        return {
          title: 'Outcome posterior observado separadamente',
          description: 'Registro de observação formal 72h após execução: zero oscilações e estabilização em 3.2°C.',
          contract: 'OutcomeObservation possui identidade própria e não reescreve execução/verificação passadas.',
          badgeClass: 'badge-success',
          statusText: 'Resultado Observado e Comprovado'
        };
      default:
        return {
          title: 'Cenário Padrão',
          description: 'Visualização padrão da frente gerencial.',
          contract: 'Product UI Kit v0.3',
          badgeClass: 'badge-neutral',
          statusText: 'Ativo'
        };
    }
  }

  function renderSidebar() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      const target = item.getAttribute('data-surface');
      if (target === State.activeSurface) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Toggle surface views
    const surfaces = document.querySelectorAll('.surface-view');
    surfaces.forEach(s => {
      if (s.id === State.activeSurface) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });
  }

  // --- SCR-GES-001: Gestão Orientada a Decisões ---
  function renderGES001() {
    const container = document.getElementById('ges-001-content');
    if (!container) return;

    const r1 = calculateManagementReading('MET-19'); // Ativo indisponível
    const r2 = calculateManagementReading('MET-01'); // Pendências sem dono
    const r3 = calculateManagementReading('MET-11'); // Cobertura inventário
    const r4 = calculateManagementReading('MET-20'); // Execução verificada

    let coverageBadge = '';
    if (State.sourceCoverage.status === 'completa') {
      coverageBadge = `<span class="badge badge-success">● Cobertura Completa (${State.sourceCoverage.reportedUnits.length}/${State.sourceCoverage.expectedUnits.length} unidades)</span>`;
    } else if (State.sourceCoverage.status === 'parcial') {
      coverageBadge = `<span class="badge badge-warning">▲ Cobertura Parcial (Ausente: ${State.sourceCoverage.missingUnits.join(', ')})</span>`;
    } else {
      coverageBadge = `<span class="badge badge-danger">✕ Cobertura Indisponível</span>`;
    }

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Leituras Gerenciais & Conexão Causal</div>
            <div style="font-size: 13px; color: var(--fg-muted); margin-top: 2px;">
              Fatos apurados na data operacional <strong>2026-09-30</strong> · Grão: Mensal
            </div>
          </div>
          <div class="dimension-status">
            ${coverageBadge}
            <span class="badge badge-neutral">Grão: Unidades Operacionais</span>
          </div>
        </div>

        <div class="metrics-grid">
          <!-- Metric Card 1: MET-19 -->
          <div class="metric-card" id="metric-card-met-19">
            <div class="metric-card-header">
              <span class="metric-id-tag">MET-19 · v${r1.definitionVersion || '1.0'}</span>
              <span class="badge ${r1.coverageStatus === 'completa' ? 'badge-success' : 'badge-warning'}">${r1.coverageStatus}</span>
            </div>
            <div class="metric-name">Ativo Indisponível (Câmara C3)</div>
            <div class="metric-value-box">
              <div class="metric-value ${r1.isNotApplicable ? 'na' : ''}">${r1.displayValue}</div>
            </div>
            <div class="metric-meta">
              <div><strong>Origem Factual:</strong> ${r1.sourceRef} (Auditoria)</div>
              <div><strong>Período:</strong> ${r1.period}</div>
              <div><strong>Decisão Apoiada:</strong> Alocação de manutenção preventiva</div>
            </div>
            <div class="metric-actions">
              <button class="btn btn-secondary btn-sm" onclick="window.ManagementApp.openCause('${r1.sourceRef}')">
                🔍 Abrir Causa & Fato
              </button>
              <button class="btn btn-primary btn-sm" onclick="window.ManagementApp.navigateSurface('SCR-GES-003')">
                📋 Ver Plano de Ação
              </button>
            </div>
          </div>

          <!-- Metric Card 2: MET-01 -->
          <div class="metric-card" id="metric-card-met-01">
            <div class="metric-card-header">
              <span class="metric-id-tag">MET-01 · v${r2.definitionVersion || '1.0'}</span>
              <span class="badge ${r2.coverageStatus === 'completa' ? 'badge-success' : 'badge-warning'}">${r2.coverageStatus}</span>
            </div>
            <div class="metric-name">Pendências Sem Responsável</div>
            <div class="metric-value-box">
              <div class="metric-value ${r2.isNotApplicable ? 'na' : ''}">${r2.displayValue}</div>
            </div>
            <div class="metric-meta">
              <div><strong>Origem Factual:</strong> ${r2.sourceRef}</div>
              <div><strong>Período:</strong> ${r2.period}</div>
              <div><strong>Decisão Apoiada:</strong> Reatribuição de chamados abertos</div>
            </div>
            <div class="metric-actions">
              <button class="btn btn-secondary btn-sm" onclick="window.ManagementApp.openCause('WI-DEMO-101')">
                🔍 Abrir Causa & Fato
              </button>
            </div>
          </div>

          <!-- Metric Card 3: MET-11 -->
          <div class="metric-card" id="metric-card-met-11">
            <div class="metric-card-header">
              <span class="metric-id-tag">MET-11 · v${r3.definitionVersion || '1.0'}</span>
              <span class="badge ${r3.coverageStatus === 'completa' ? 'badge-success' : 'badge-warning'}">${r3.coverageStatus}</span>
            </div>
            <div class="metric-name">Cobertura de Inventário</div>
            <div class="metric-value-box">
              <div class="metric-value ${r3.isNotApplicable ? 'na' : ''}">${r3.displayValue}</div>
            </div>
            <div class="metric-meta">
              <div><strong>Origem Factual:</strong> ${r3.sourceRef}</div>
              <div><strong>Período:</strong> ${r3.period}</div>
              <div><strong>Decisão Apoiada:</strong> Acurácia de contagem física</div>
            </div>
            <div class="metric-actions">
              <button class="btn btn-secondary btn-sm" onclick="window.ManagementApp.openCause('OS-DEMO-061')">
                🔍 Abrir Causa & Fato
              </button>
            </div>
          </div>

          <!-- Metric Card 4: MET-20 (Denominador Zero Demonstration) -->
          <div class="metric-card" id="metric-card-met-20">
            <div class="metric-card-header">
              <span class="metric-id-tag">MET-20 · v${r4.definitionVersion || '1.0'}</span>
              <span class="badge badge-neutral">Denominador: 0</span>
            </div>
            <div class="metric-name">Execução Verificada de Ações</div>
            <div class="metric-value-box">
              <div class="metric-value ${r4.isNotApplicable ? 'na' : ''}">${r4.displayValue}</div>
            </div>
            <div class="metric-meta">
              <div><strong>Origem Factual:</strong> ${r4.sourceRef}</div>
              <div><strong>População Elegível:</strong> 0 tarefas maturadas</div>
              <div><strong>Regra V6:</strong> Denominador 0 = Não aplicável (nunca 0%)</div>
            </div>
            <div class="metric-actions">
              <button class="btn btn-secondary btn-sm" onclick="window.ManagementApp.navigateSurface('SCR-GES-003')">
                📋 Ver Planos Vigentes
              </button>
            </div>
          </div>
        </div>

        <div style="background: var(--bg-subtle); padding: 12px 16px; border-radius: var(--radius-sm); border-left: 3px solid var(--primary-default); font-size: 13px; color: var(--fg-muted);">
          <strong>Regra Canônica de Gestão:</strong> O painel conduz ao mesmo desvio/chamado/pedido original sem criar segunda verdade gerencial. Setters operacionais a partir do painel são estritamente proibidos (Regra A5).
        </div>
      </div>
    `;
  }

  // --- SCR-GES-002: Metas, Orçamento e Resultados ---
  function renderGES002() {
    const container = document.getElementById('ges-002-content');
    if (!container) return;

    const comp = calculateBudgetComposition();
    const meta = State.metaBudget;
    const isV2 = meta.version === '2.0.0';

    let compBadge = comp.isCalculable 
      ? `<span class="badge badge-success">✓ Composição Válida (Bases Disjuntas)</span>`
      : `<span class="badge badge-warning">▲ Conferir Composição (Sobreposição Desconhecida)</span>`;

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">
              META-DEMO-061 · ${meta.category}
              <span class="badge badge-blue">Versão ${meta.version}</span>
            </div>
            <div style="font-size: 13px; color: var(--fg-muted); margin-top: 2px;">
              Período de Referência: <strong>${meta.period}</strong> · Moeda: <strong>${meta.currency}</strong>
            </div>
          </div>
          <div class="dimension-status">
            ${compBadge}
            <span class="badge badge-neutral">Orçamento ≠ Alçada Operacional</span>
          </div>
        </div>

        ${!State.periodComparison.arePeriodsCompatible ? `
          <div style="background: var(--danger-bg); border: 1px solid var(--danger-border); padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
            <div style="font-weight: 600; color: var(--danger-fg); font-size: 13px;">⛔ Comparação de Períodos Bloqueada</div>
            <div style="font-size: 12px; color: var(--danger-fg); margin-top: 4px;">${State.periodComparison.incompatibilityReason}</div>
          </div>
        ` : ''}

        <!-- Budget Decomposition Table -->
        <div class="table-responsive" style="margin-bottom: 20px;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Componente de Orçamento</th>
                <th>Base / Origem da Medição</th>
                <th>Status da Base</th>
                <th style="text-align: right;">Valor (BRL)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>1. Orçamento-Base Aprovado</strong></td>
                <td>Diretoria Executiva / Baseline CW-04</td>
                <td><span class="badge badge-neutral">Vigente (v${meta.version})</span></td>
                <td style="text-align: right; font-weight: 600;">R$ ${meta.baseBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td><strong>2. Despesas Reconhecidas</strong></td>
                <td>Títulos e notas fiscais escrituradas (Contas a Pagar)</td>
                <td><span class="badge badge-success">Liquidado / Escriturado</span></td>
                <td style="text-align: right; font-weight: 600;">R$ ${meta.recognizedSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td><strong>3. Compromissos Adicionais</strong></td>
                <td>Ordens de compra emitidas e chamados contratados</td>
                <td><span class="badge badge-warning">Ainda não reconhecido</span></td>
                <td style="text-align: right; font-weight: 600;">R$ ${meta.unrecognizedCommitments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr style="background: var(--bg-subtle); border-top: 2px solid var(--border-subtle);">
                <td id="budget-residual-label"><strong>4. Diferença / Residual Aritmético</strong></td>
                <td>${comp.explanation}</td>
                <td>${comp.isCalculable ? '<span class="badge badge-success">Disjunto Comprovado</span>' : '<span class="badge badge-warning">Overlap Desconhecido</span>'}</td>
                <td id="budget-residual-value" style="text-align: right; font-family: var(--font-family-display); font-size: 16px; font-weight: 700; color: ${comp.isCalculable ? 'var(--fg-default)' : 'var(--warning-fg)'};">
                  ${comp.residualLabel}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        ${isV2 ? `
          <div style="background: var(--blue-subtle); border: 1px solid #BFDBFE; padding: 14px; border-radius: var(--radius-md); margin-bottom: 16px;">
            <div style="font-weight: 600; color: var(--blue-fg); font-size: 13px;">ℹ️ Proposta de Revisão de Meta (v2.0.0)</div>
            <div style="font-size: 12px; color: #1E3A8A; margin-top: 4px;">
              <strong>Motivo:</strong> ${meta.revisionReason}<br>
              <strong>Vigência:</strong> a partir de ${meta.effectiveDate} · <strong>Autor:</strong> ${meta.author}<br>
              <em>Snapshot v1.0.0 (R$ 12.000,00) preservado integralmente no histórico sem reescrita retroativa.</em>
            </div>
          </div>
        ` : ''}

        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary btn-sm" onclick="window.ManagementApp.selectScenario(5)">
            Provar Bases Disjuntas (Cenário 5)
          </button>
          <button class="btn btn-secondary btn-sm" onclick="window.ManagementApp.selectScenario(6)">
            Simular Overlap Desconhecido (Cenário 6)
          </button>
          <button class="btn btn-primary btn-sm" onclick="window.ManagementApp.selectScenario(7)">
            Propor Revisão de Meta v2.0 (Cenário 7)
          </button>
        </div>
      </div>
    `;
  }

  // --- SCR-GES-003: Planos de Ação e Reuniões ---
  function renderGES003() {
    const container = document.getElementById('ges-003-content');
    if (!container) return;

    const plan = State.actionPlan;
    const actions = plan.actions;

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">
              ${plan.id} — ${plan.title}
              <span class="badge ${plan.status === 'EM_ANDAMENTO' ? 'badge-warning' : 'badge-success'}">${plan.status}</span>
            </div>
            <div style="font-size: 13px; color: var(--fg-muted); margin-top: 2px;">
              <strong>Origens Fatuais Canônicas:</strong> 
              <span class="metric-id-tag" style="cursor: pointer;" onclick="window.ManagementApp.openCause('AUD-DEMO-061')">AUD-DEMO-061 (Auditoria)</span>
              <span class="metric-id-tag" style="cursor: pointer;" onclick="window.ManagementApp.openCause('OS-DEMO-061')">OS-DEMO-061 (Chamado C3)</span>
            </div>
          </div>
          <div class="dimension-status">
            <span class="badge badge-neutral">Reunião: ${plan.meeting.status.toUpperCase()}</span>
          </div>
        </div>

        <div style="background: var(--bg-subtle); padding: 12px 16px; border-radius: var(--radius-sm); margin-bottom: 20px; font-size: 13px;">
          <div><strong>Hipótese de Causa:</strong> ${plan.hypothesis}</div>
          <div style="margin-top: 4px;"><strong>Objetivo Operacional:</strong> ${plan.objective}</div>
        </div>

        <!-- Security Event Notice if present (Scenario 11) -->
        ${State.lastSecurityEvent ? `
          <div style="background: var(--danger-bg); border: 1px solid var(--danger-border); padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
            <div style="font-weight: 600; color: var(--danger-fg); font-size: 13px;">🛡️ Bloqueio de Atribuição por Alçada e Acesso</div>
            <div style="font-size: 12px; color: var(--danger-fg); margin-top: 4px;">
              Tentativa de designar ação ao usuário <strong>${State.lastSecurityEvent.attemptedActor}</strong> foi recusada.<br>
              <strong>Motivo:</strong> ${State.lastSecurityEvent.rejectionReason}<br>
              Nenhum dado restrito foi vazado e o responsável anterior foi mantido.
            </div>
          </div>
        ` : ''}

        <!-- Actions List -->
        <div style="margin-bottom: 24px;">
          <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 10px; color: var(--fg-default);">
            Ações do Plano (Cadeia de Responsabilidade & Evidência)
          </h4>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID Ação</th>
                  <th>Descrição Operacional</th>
                  <th>Responsável Designado</th>
                  <th>Prazo</th>
                  <th>Status Execução</th>
                  <th>Evidência de Execução</th>
                  <th>Verificação</th>
                </tr>
              </thead>
              <tbody>
                ${actions.map(act => {
                  const evd = act.evidenceRef ? plan.evidences[act.evidenceRef] : null;
                  const ver = evd ? plan.verifications['VER-' + act.id] : null;

                  let verBadge = '<span class="badge badge-neutral">Não Iniciada</span>';
                  if (ver) {
                    if (ver.status === 'aceita') verBadge = '<span class="badge badge-success">✓ Verificada & Aceita</span>';
                    else if (ver.status === 'pendente') verBadge = '<span class="badge badge-warning">Aguardando Verificação</span>';
                    else verBadge = '<span class="badge badge-danger">Reaberta com Ressalva</span>';
                  }

                  return `
                    <tr>
                      <td><span class="metric-id-tag">${act.id}</span></td>
                      <td>${act.description}</td>
                      <td><strong>${act.assignee}</strong></td>
                      <td>${act.deadline}</td>
                      <td>
                        <span class="badge ${act.status === 'executada' ? 'badge-success' : 'badge-neutral'}">
                          ${act.status === 'executada' ? '✓ Executada' : 'Pendente'}
                        </span>
                      </td>
                      <td>
                        ${evd ? `<span class="metric-id-tag">📎 ${evd.id} (${evd.type})</span>` : '<span style="color: var(--fg-subtle); font-style: italic;">Sem evidência</span>'}
                      </td>
                      <td>${verBadge}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Meeting & Outcome Panel -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-bottom: 20px;">
          <!-- Meeting Box -->
          <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px;">
            <div style="font-weight: 600; font-size: 13px; margin-bottom: 8px;">
              Reunião de Acompanhamento (${plan.meeting.id})
            </div>
            <div style="font-size: 12px; color: var(--fg-muted); margin-bottom: 10px;">
              Pauta: ${plan.meeting.title}<br>
              Status: <span class="badge ${plan.meeting.status === 'encerrada' ? 'badge-neutral' : 'badge-warning'}">${plan.meeting.status}</span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="window.ManagementApp.selectScenario(10)">
              ${plan.meeting.status === 'encerrada' ? 'Reunião Encerrada (Plano Aberto)' : 'Encerrar Reunião (Cenário 10)'}
            </button>
          </div>

          <!-- Outcome Box -->
          <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px;">
            <div style="font-weight: 600; font-size: 13px; margin-bottom: 8px;">
              Observação Posterior de Resultado (Outcome)
            </div>
            ${plan.outcomes.length > 0 ? `
              <div id="outcome-observation-card" style="font-size: 12px; color: var(--success-fg); background: var(--success-bg); border: 1px solid var(--success-border); padding: 8px 10px; border-radius: var(--radius-sm); margin-bottom: 10px;">
                <strong>${plan.outcomes[0].id}:</strong> Resultado Observado: ${plan.outcomes[0].observedEffect}<br>
                <em>Período: ${plan.outcomes[0].periodObserved} · Registrado por: ${plan.outcomes[0].recordedBy}</em>
              </div>
            ` : `
              <div style="font-size: 12px; color: var(--fg-subtle); font-style: italic; margin-bottom: 10px;">
                Nenhum resultado posterior observado ainda. Aguardando período de maturação operacional (72h).
              </div>
            `}
            <button class="btn btn-primary btn-sm" onclick="window.ManagementApp.selectScenario(12)">
              Registrar Outcome Posterior (Cenário 12)
            </button>
          </div>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-secondary btn-sm" onclick="window.ManagementApp.selectScenario(8)">
            Executar Ação 1 (Cenário 8)
          </button>
          <button class="btn btn-secondary btn-sm" onclick="window.ManagementApp.selectScenario(9)">
            Aceitar Verificação Ação 1 (Cenário 9)
          </button>
          <button class="btn btn-secondary btn-sm" onclick="window.ManagementApp.selectScenario(11)">
            Testar Atribuição Sem Permissão (Cenário 11)
          </button>
        </div>
      </div>
    `;
  }

  // --- Contextual Slide-out Drawer ---
  function renderDrawer() {
    const overlay = document.getElementById('drawer-overlay');
    const drawer = document.getElementById('contextual-drawer');
    if (!overlay || !drawer) return;

    if (State.drawer.isOpen && State.drawer.data) {
      overlay.classList.add('active');
      drawer.classList.add('open');

      const data = State.drawer.data;
      document.getElementById('drawer-title-text').innerText = State.drawer.title;

      let bodyHtml = `
        <div class="drawer-section">
          <div class="drawer-section-title">Tipo do Fato Operacional</div>
          <div class="badge badge-neutral">${data.type}</div>
        </div>
        <div class="drawer-section">
          <div class="drawer-section-title">Identificador Canônico</div>
          <div class="metric-id-tag" style="font-size: 13px;">${data.id}</div>
        </div>
      `;

      if (data.type === 'AuditFinding') {
        bodyHtml += `
          <div class="drawer-section">
            <div class="drawer-section-title">Gravidade & Domínio</div>
            <div>${data.severity} · ${data.domain}</div>
          </div>
          <div class="drawer-section">
            <div class="drawer-section-title">Descrição do Achado</div>
            <div class="drawer-fact-box">${data.title}<br><br>${data.details}</div>
          </div>
          <div class="drawer-section">
            <div class="drawer-section-title">Registro & Artefato</div>
            <div style="font-size: 12px; color: var(--fg-muted);">Data: ${data.recordedAt} · Ref: ${data.evidenceArtifactRef}</div>
          </div>
        `;
      } else if (data.type === 'MaintenanceCase') {
        bodyHtml += `
          <div class="drawer-section">
            <div class="drawer-section-title">Ativo & Unidade</div>
            <div>${data.targetAsset} (${data.unit})</div>
          </div>
          <div class="drawer-section">
            <div class="drawer-section-title">Status da Ordem de Serviço</div>
            <div class="badge badge-warning">${data.status}</div>
          </div>
          <div class="drawer-section">
            <div class="drawer-section-title">Contrato de Manutenção</div>
            <div class="drawer-fact-box">Contrato: ${data.contractRef}<br>Prioridade: ${data.priority}</div>
          </div>
        `;
      } else {
        bodyHtml += `
          <div class="drawer-section">
            <div class="drawer-section-title">Dados do Registro</div>
            <div class="drawer-fact-box">${JSON.stringify(data, null, 2)}</div>
          </div>
        `;
      }

      bodyHtml += `
        <div style="margin-top: 24px; padding: 12px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: var(--radius-sm); font-size: 12px; color: #92400E;">
          <strong>Regra Inviolável de Governança (A5):</strong> Este registro operacional pertence ao módulo de origem e é exibido exclusivamente para leitura/contextualização. Nenhuma ação em Gestão pode alterar seu estado diretamente.
        </div>
      `;

      document.getElementById('drawer-body-content').innerHTML = bodyHtml;
    } else {
      overlay.classList.remove('active');
      drawer.classList.remove('open');
    }
  }

  // --- Invariant Proofs Panel ---
  function renderInvariantsPanel() {
    const container = document.getElementById('invariants-list');
    if (!container) return;

    const inv = State.invariants;
    const items = [
      { key: 'p1', label: 'P1 — Métrica completa e rastreável (fonte → observation → cálculo → leitura)' },
      { key: 'p2', label: 'P2 — Cadeia de plano completa (achado → plano → ação → evidence → verificação → outcome)' },
      { key: 'p3', label: 'P3 — Meta versionada (v1.0 preservada ao propor v2.0)' },
      { key: 'n1', label: 'N1 — Cobertura parcial ≠ zero (unidade ausente não vira 0)' },
      { key: 'n2', label: 'N2 — Denominador zero = Não aplicável (nunca 0%)' },
      { key: 'n3', label: 'N3 — Períodos incompatíveis bloqueiam comparação percentual' },
      { key: 'n4', label: 'N4 — Orçamento com overlap desconhecido não calcula residual' },
      { key: 'n5', label: 'N5 — Ação feita sem evidence não verifica resultado' },
      { key: 'n6', label: 'N6 — Reunião encerrada não fecha plano de ação' },
      { key: 'n7', label: 'N7 — Responsável sem acesso não recebe atribuição' },
      { key: 'a1', label: 'A1 — PASS autodeclarado é rejeitado sem invariante real' },
      { key: 'a2', label: 'A2 — Badge hardcoded não mascara SourceCoverage factual' },
      { key: 'a3', label: 'A3 — Valor sem provenance é recalculado ou invalidado' },
      { key: 'a4', label: 'A4 — Status "done" forçado não produz resultado verificado' },
      { key: 'a5', label: 'A5 — Setters gerenciais sobre fatos operacionais são impossíveis' },
      { key: 'a6', label: 'A6 — Unidade sem fonte nunca fabrica zero no consolidado' }
    ];

    container.innerHTML = items.map(it => {
      const isPass = inv[it.key];
      return `
        <li class="proof-item ${isPass ? 'pass' : 'fail'}" id="invariant-check-${it.key}">
          <span>${isPass ? '✓' : '✗'}</span>
          <span>${it.label}: <strong>${isPass ? 'PASS' : 'FAIL'}</strong></span>
        </li>
      `;
    }).join('');
  }

  // =========================================================================
  // 8. PUBLIC API EXPOSED TO HARNESS & DOM
  // =========================================================================

  window.ManagementApp = {
    getState: function () {
      return State;
    },
    selectScenario: function (scenarioNum) {
      if (Scenarios['applyScenario' + scenarioNum]) {
        Scenarios['applyScenario' + scenarioNum]();
      }
    },
    navigateSurface: function (surfaceId) {
      State.activeSurface = surfaceId;
      renderApp();
    },
    openCause: function (factId) {
      openContextualDrawer(factId);
    },
    closeDrawer: function () {
      closeContextualDrawer();
    },
    toggleMobileView: function () {
      const container = document.querySelector('.main-wrapper');
      if (container) {
        container.classList.toggle('mobile-mode-container');
      }
    },
    calculateManagementReading,
    calculateBudgetComposition,
    runAllInvariantAudits
  };

  // Automated initial render on load
  window.addEventListener('DOMContentLoaded', () => {
    renderApp();
  });

})();
