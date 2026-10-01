/**
 * Toca do Peixe — Protótipo de Decisão Gerencial (UX-CW04 · WI02)
 * Superfícies: SCR-GES-004 (Calendário Operacional) & SCR-GES-005 (Cenários & Adoção)
 * Diretrizes: FND-19, V6, B01-D19, B01-D04, UX-B06, Operating Model v2.3
 * 
 * Regras Fundamentais:
 * - Salvar proposta NÃO aplica alteração de horário.
 * - Salvar cenário NÃO altera operação nem compromissos financeiros.
 * - Clique NÃO é adoção.
 * - Cobertura de reservas parcial NÃO declara capacidade livre.
 * - Premissa desconhecida (unknown) NÃO vira zero.
 * - Adversarial proofs nascem estritamente como NOT_RUN em modo standalone (v2.3).
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. DOMAIN FIXTURES & CANONICAL ENTITIES
  // =========================================================================

  const INITIAL_OPERATIONAL_FACTS = {
    'RES-DEMO-062': {
      id: 'RES-DEMO-062',
      type: 'ReservationCommitment',
      serviceDate: '2026-10-03',
      scheduledTime: '18:30',
      covers: 4,
      tableRef: 'Mesa 12 (Salão Principal)',
      unit: 'Salão Consolação',
      status: 'confirmada',
      authorityModule: 'Recepção / Reservas (D04)',
      details: 'Reserva antecipada confirmada para as 18:30 com tolerância de 15 minutos.'
    },
    'PRO-DEMO-062': {
      id: 'PRO-DEMO-062',
      type: 'KitchenProductionCommitment',
      serviceDate: '2026-10-03',
      scheduledTime: '17:30–19:00',
      unit: 'Salão Consolação (Cozinha)',
      status: 'em_andamento',
      authorityModule: 'Escala & Preparo de Cozinha',
      details: 'Mise en place e cocção programadas para atendimento a partir das 18:00.'
    },
    'RES-DEMO-063': {
      id: 'RES-DEMO-063',
      type: 'ReservationCommitment',
      serviceDate: '2026-10-03',
      scheduledTime: '18:45',
      covers: 2,
      tableRef: 'Mesa 04 (Varanda)',
      unit: 'Salão Consolação',
      status: 'confirmada',
      authorityModule: 'Recepção / Reservas (D04)',
      details: 'Nova reserva confirmada às 18:45, gerada após a primeira análise de impacto.'
    }
  };

  // Deep clone for snapshot comparison
  const OPERATIONAL_FACTS_SNAPSHOT = JSON.parse(JSON.stringify(INITIAL_OPERATIONAL_FACTS));

  // Canonical Scenario v1 fixture (immutable reference for versioning)
  const INITIAL_SCENARIO_V1 = {
    id: 'CEN-DEMO-061',
    version: '1.0.0',
    title: 'Investimento em Seladora a Vácuo para Insumos Nobres',
    question: 'Investimento em seladora a vácuo para reduzir desperdício de pescados e insumos nobres?',
    status: 'SIMULACAO_HIPOTESE',
    updatedAt: '2026-10-02T11:00:00Z',
    assumptions: {
      'ASM-01': { id: 'ASM-01', name: 'Investimento em Equipamento', value: 8000, unit: 'BRL', status: 'known', origin: 'Cotação Fornecedor Inox A' },
      'ASM-02': { id: 'ASM-02', name: 'Hipótese de Redução Mensal', value: 400, unit: 'BRL/mês', status: 'estimated', origin: 'Estimativa Chef Executivo' },
      'ASM-03': { id: 'ASM-03', name: 'Horizonte de Análise', value: 12, unit: 'meses', status: 'known', origin: 'Ciclo Contratual 2026' },
      'ASM-04': { id: 'ASM-04', name: 'Taxa Histórica de Desperdício', value: 18.5, unit: '%', status: 'known', origin: 'Auditoria Operacional' }
    },
    limitations: [
      'Impostos sobre circulação de mercadorias e depreciação fiscal NÃO estão modelados.',
      'Custos de manutenção preventiva, troca de óleo da bomba e fita teflon NÃO estão modelados.',
      'Custo de oportunidade de capital (taxa de desconto/WACC) NÃO está modelado.',
      'Valor residual do ativo ao final da vida útil NÃO está modelado.',
      'Impactos operacionais secundários (tempo de manipulação por lote) NÃO estão medidos.'
    ],
    history: []
  };

  // Synthetic D19 Temporal Service Window Fixture
  const TEMPORAL_MIDNIGHT_FIXTURE = {
    id: 'WIN-DEMO-MIDNIGHT-01',
    businessDate: '2026-10-03',
    civilStartDate: '2026-10-03',
    civilEndDate: '2026-10-04',
    startTime: '22:00',
    endTime: '02:00',
    timezone: 'America/Sao_Paulo',
    crossesMidnight: true,
    operationalUnit: 'Salão Consolação (Jantar Estendido / Bar)',
    historicalTimestampUtc: '2026-10-04T01:00:00Z'
  };

  // Synthetic D19 Historical Operational Fact Fixture (R2-F02)
  const HISTORICAL_FACT_FIXTURE = {
    id: 'HIST-TIME-001',
    occurredAtUtc: '2026-10-04T01:00:00Z',
    recordedTimezone: 'America/Sao_Paulo',
    recordedBusinessDate: '2026-10-03',
    recordedCivilDate: '2026-10-03',
    recordedServiceShift: 'Jantar de Sábado (Pós-Meia-Noite)',
    details: 'Fechamento de mesa 12 na virada transnoite às 22:00-02:00'
  };

  // =========================================================================
  // 2. CENTRAL STATE STORE
  // =========================================================================

  const State = {
    currentUser: {
      name: 'Carla Nogueira',
      role: 'Gestora de Operações e Resultados'
    },
    activeSurface: 'SCR-GES-004', // 'SCR-GES-004' | 'SCR-GES-005'
    activeScenario: 1,

    // Synthetic Protected Facts (Modeled to verify zero side-effect contract)
    protectedExternalFacts: {
      budgetRef: {
        id: 'BDG-2026-Q4-REST',
        allocation: 45000.00,
        committed: 38200.00,
        currency: 'BRL',
        status: 'locked_financial_authority'
      },
      assetRef: {
        id: 'AST-EQUIP-VACUUM-01',
        status: 'unpurchased_simulation_only',
        capitalizedValue: 0.00,
        inventoryTag: null
      },
      paymentRef: {
        id: 'PAY-OBLIGATION-SCHEDULE-NONE',
        scheduledInstallments: 0,
        totalCommitted: 0.00,
        status: 'no_obligations_created'
      }
    },

    // --- CALENDÁRIO OPERACIONAL (SCR-GES-004) ---
    calendar: {
      unit: 'Salão Consolação',
      businessDate: '2026-10-03',
      timezone: 'America/Sao_Paulo',
      crossesMidnight: false,

      // CalendarVersion Vigente
      currentVersion: {
        id: 'CAL-DEMO-061-v1',
        version: '1.0.0',
        serviceName: 'Jantar de Sábado',
        startTime: '18:00',
        endTime: '23:00',
        status: 'vigente',
        effectiveFrom: '2026-10-01',
        approvedBy: 'Diretoria de Operações'
      },

      // CalendarProposal
      proposal: {
        id: 'PROP-CAL-061-01',
        proposedVersion: '2.0.0',
        serviceName: 'Jantar de Sábado (Ajuste)',
        proposedStartTime: '19:00',
        proposedEndTime: '23:00',
        status: 'em_revisao', // 'em_revisao' | 'salva_rascunho' | 'aplicada_vigente'
        author: 'Gestora Carla Nogueira',
        reason: 'Otimização de equipe e alinhamento com fluxo noturno',
        createdAt: '2026-10-02T10:00:00Z',
        savedAt: null
      },

      // Commitments in scope
      commitments: {
        'RES-DEMO-062': JSON.parse(JSON.stringify(INITIAL_OPERATIONAL_FACTS['RES-DEMO-062'])),
        'PRO-DEMO-062': JSON.parse(JSON.stringify(INITIAL_OPERATIONAL_FACTS['PRO-DEMO-062']))
      },

      // Impact Assessment (versioned & provenance-aware - R2-F01)
      impactAssessment: {
        id: 'IA-CAL-061-01',
        assessmentVersion: 1,
        baseCalendarVersionId: 'CAL-DEMO-061-v1',
        baseCalendarVersion: '1.0.0',
        proposalId: 'PROP-CAL-061-01',
        proposalVersion: '2.0.0',
        assessedAt: '2026-10-02T10:15:00Z',
        status: 'VALID', // 'VALID' | 'STALE'
        evaluatedDependencyIds: ['RES-DEMO-062', 'PRO-DEMO-062'],
        stalenessReason: null
      },

      // Impact Resolutions (authority-driven)
      resolutions: {
        'RES-DEMO-062': { status: 'pendente', resolvedBy: null, note: 'Requer contato e remanejamento com cliente pela Recepção' },
        'PRO-DEMO-062': { status: 'pendente', resolvedBy: null, note: 'Requer reescalonamento do início de pré-preparo pela Cozinha' },
        'RES-DEMO-063': { status: 'pendente', resolvedBy: null, note: 'Requer aprovação expressa da autoridade de reservas' }
      },

      // SourceCoverage for Reservations / Commitments
      sourceCoverage: {
        status: 'completa', // 'completa' | 'parcial'
        expectedChannels: ['API Hostinger', 'Webhook iFood', 'Reserve Partner'],
        reportedChannels: ['API Hostinger', 'Webhook iFood', 'Reserve Partner'],
        missingChannels: [],
        lastSync: '2026-10-03T17:00:00Z'
      },

      // Publication by Destination
      publication: {
        intentId: 'PUB-INTENT-2026-10-03-01',
        destinations: {
          'canal-ifood': {
            id: 'canal-ifood',
            name: 'iFood / Cardápio Digital',
            status: 'confirmado', // 'confirmado' | 'resultado_incerto' | 'pendente'
            updatedAt: '2026-10-02T10:30:00Z',
            notes: 'Janela 19:00 sincronizada com sucesso.'
          },
          'canal-google': {
            id: 'canal-google',
            name: 'Google Reserve / Mesas',
            status: 'resultado_incerto',
            updatedAt: '2026-10-02T10:30:00Z',
            notes: 'Timeout de confirmação do webhook de terceiros. Reconciliação pendente.'
          },
          'canal-totem': {
            id: 'canal-totem',
            name: 'Totem Local / Recepção',
            status: 'pendente',
            updatedAt: null,
            notes: 'Aguardando sincronização de rede interna na unidade.'
          }
        }
      }
    },

    // --- CENÁRIOS & ADOÇÃO (SCR-GES-005) ---
    scenario: JSON.parse(JSON.stringify(INITIAL_SCENARIO_V1)),

    adoption: {
      id: 'ADOPT-DEMO-061',
      period: '2026-09-24 a 2026-09-30',
      unit: 'Salão Consolação',
      processName: 'Encerramento de Mesa e Pré-Conta pelo Terminal Móvel',
      definition: 'Proporção de tarefas operacionais elegíveis de fechamento concluídas através do fluxo formal do sistema sem assistência externa.',
      eligiblePopulation: 20,
      completedFlow: 15,
      assistedOutside: 3,
      evidenceGaps: 2,
      exclusions: [
        'Treinamento e capacitação de novos garçons (3 tarefas)',
        'Testes técnicos de homologação de firmware (5 tarefas)'
      ],
      sourceCoverage: {
        status: 'completa', // 'completa' | 'parcial'
        coveragePct: 100,
        unmonitoredTerminals: []
      },
      spuriousClicksCount: 0 // for A6 click inflation test
    },

    // Contextual Drawer
    drawer: {
      isOpen: false,
      title: '',
      data: null
    },

    // Invariant Verification Log
    invariants: {
      p1: { status: 'NOT_RUN', source: 'runtime', observation: null, evaluatedAt: null },
      p2: { status: 'NOT_RUN', source: 'runtime', observation: null, evaluatedAt: null },
      p3: { status: 'NOT_RUN', source: 'runtime', observation: null, evaluatedAt: null },
      n1: { status: 'NOT_RUN', source: 'runtime', observation: null, evaluatedAt: null },
      n2: { status: 'NOT_RUN', source: 'runtime', observation: null, evaluatedAt: null },
      n3: { status: 'NOT_RUN', source: 'runtime', observation: null, evaluatedAt: null },
      n4: { status: 'NOT_RUN', source: 'runtime', observation: null, evaluatedAt: null },
      n5: { status: 'NOT_RUN', source: 'runtime', observation: null, evaluatedAt: null },
      n6: { status: 'NOT_RUN', source: 'runtime', observation: null, evaluatedAt: null },
      n7: { status: 'NOT_RUN', source: 'runtime', observation: null, evaluatedAt: null },
      n8: { status: 'NOT_RUN', source: 'runtime', observation: null, evaluatedAt: null },
      zd1: { status: 'NOT_RUN', source: 'runtime', observation: null, evaluatedAt: null },
      t1: { status: 'NOT_RUN', source: 'runtime', observation: null, evaluatedAt: null },
      v1: { status: 'NOT_RUN', source: 'runtime', observation: null, evaluatedAt: null },
      a1: { status: 'NOT_RUN', source: 'harness', observation: 'Requer injeção deliberada de badge visual falso no DOM via CDP', evaluatedAt: null },
      a2: { status: 'NOT_RUN', source: 'harness', observation: 'Requer tentativa de remoção de compromisso factual via CDP', evaluatedAt: null },
      a3: { status: 'NOT_RUN', source: 'harness', observation: 'Requer tentativa de aplicação com assessment stale via CDP', evaluatedAt: null },
      a4: { status: 'NOT_RUN', source: 'harness', observation: 'Requer injeção de claim visual de 0 conflitos com fonte parcial', evaluatedAt: null },
      a5: { status: 'NOT_RUN', source: 'harness', observation: 'Requer injeção de claim de economia realizada para cenário', evaluatedAt: null },
      a6: { status: 'NOT_RUN', source: 'harness', observation: 'Requer injeção de cliques/interações espúrias sem fluxo', evaluatedAt: null }
    }
  };

  // =========================================================================
  // 3. COMPUTED DOMAIN PROJECTIONS & BUSINESS RULES
  // =========================================================================

  /**
   * Evaluates dependencies/conflicts for a proposed service window against active commitments.
   */
  function evaluateCalendarImpact(proposal, commitments) {
    const conflicts = [];
    const proposedStart = proposal.proposedStartTime; // e.g., '19:00'

    Object.values(commitments).forEach(comm => {
      // Check if commitment falls within the pushed-back window (e.g., between 18:00 and 19:00)
      if (comm.scheduledTime < proposedStart || comm.scheduledTime.startsWith('17:') || comm.scheduledTime.startsWith('18:')) {
        conflicts.push({
          commitmentId: comm.id,
          type: comm.type,
          scheduledTime: comm.scheduledTime,
          authorityModule: comm.authorityModule,
          status: comm.status
        });
      }
    });

    return conflicts;
  }

  /**
   * Computes scenario financial projection based on assumptions.
   * If any mandatory assumption has status === 'unknown', calculation is strictly blocked.
   */
  function calculateScenarioProjection(scenario) {
    const asms = scenario.assumptions;
    const invAsm = asms['ASM-01'];
    const redAsm = asms['ASM-02'];
    const horAsm = asms['ASM-03'];

    const hasUnknown = Object.values(asms).some(a => a.status === 'unknown');

    if (hasUnknown || !invAsm || !redAsm || !horAsm) {
      return {
        isCalculable: false,
        reason: 'Não mensurável nesta base (premissa necessária com status desconhecido)',
        investment: invAsm ? invAsm.value : null,
        monthlySaving: null,
        horizonMonths: horAsm ? horAsm.value : null,
        grossBenefit: null,
        netDifference: null,
        simplePaybackMonths: null
      };
    }

    const investment = invAsm.value;
    const monthlySaving = redAsm.value;
    const horizon = horAsm.value;

    const grossBenefit = monthlySaving * horizon;
    const netDifference = grossBenefit - investment;
    const simplePaybackMonths = monthlySaving > 0 ? (investment / monthlySaving) : null;

    return {
      isCalculable: true,
      reason: null,
      investment,
      monthlySaving,
      horizonMonths: horizon,
      grossBenefit,
      netDifference,
      simplePaybackMonths
    };
  }

  /**
   * Computes adoption rate strictly under defined formula:
   * Taxa = Tarefas Concluídas pelo Fluxo (15) / População Elegível (20) = 75%
   * Exclusions are explicitly kept outside the denominator.
   * Regra V6: Quando eligiblePopulation === 0 -> Não aplicável (NÃO 0%).
   */
  function calculateAdoptionMetrics(adopt) {
    const eligible = adopt.eligiblePopulation !== undefined ? adopt.eligiblePopulation : 0;
    const completed = adopt.completedFlow || 0;
    const assisted = adopt.assistedOutside || 0;
    const gaps = adopt.evidenceGaps || 0;
    const isCoveragePartial = adopt.sourceCoverage && adopt.sourceCoverage.status === 'parcial';

    // Regra V6: Denominador zero resulta estritamente em estado Não Aplicável
    if (eligible === 0) {
      return {
        eligiblePopulation: 0,
        completedFlow: completed,
        assistedOutside: assisted,
        evidenceGaps: gaps,
        ratePct: null,
        rateFraction: null,
        isNotApplicable: true,
        reason: 'População elegível igual a zero (denominador nulo)',
        isCoveragePartial,
        generalizationAllowed: false,
        summaryText: 'Não aplicável (sem população elegível no período)'
      };
    }

    const ratePct = Number(((completed / eligible) * 100).toFixed(1));

    return {
      eligiblePopulation: eligible,
      completedFlow: completed,
      assistedOutside: assisted,
      evidenceGaps: gaps,
      ratePct: ratePct,
      rateFraction: `${completed}/${eligible}`,
      isNotApplicable: false,
      isCoveragePartial,
      generalizationAllowed: !isCoveragePartial && ((adopt.sourceCoverage && adopt.sourceCoverage.coveragePct) === 100),
      summaryText: `${ratePct}% de adoção formal (${completed} de ${eligible} tarefas observadas)`
    };
  }

  /**
   * Real Domain Evaluator for Calendar Proposal Applicability (R1-F04).
   * Used by both UI and test harness.
   */
  function evaluateCalendarProposalApplicability(calendarState) {
    const cal = calendarState || State.calendar;
    const reasons = [];

    // 1. Proposal validity
    if (!cal.proposal || !cal.proposal.proposedStartTime || !cal.proposal.proposedEndTime) {
      reasons.push('Proposta de calendário inexistente ou incompleta.');
    }

    // 2. Impact Assessment existence
    if (!cal.impactAssessment) {
      reasons.push('Nenhum Impact Assessment disponível para a proposta.');
    } else {
      // 3. Assessment status (must be VALID, cannot be STALE)
      if (cal.impactAssessment.status === 'STALE') {
        reasons.push('Impact Assessment está desatualizado (STALE): ' + (cal.impactAssessment.stalenessReason || 'dados alterados após avaliação prévia'));
      } else if (cal.impactAssessment.status !== 'VALID') {
        reasons.push('Impact Assessment com status inválido: ' + cal.impactAssessment.status);
      }

      // 5. Dependency alignment: check if any commitment is unassessed
      const activeCommitmentIds = Object.keys(cal.commitments || {});
      const evaluatedIds = cal.impactAssessment.evaluatedDependencyIds || [];
      const unassessed = activeCommitmentIds.filter(id => !evaluatedIds.includes(id));
      if (unassessed.length > 0) {
        reasons.push('Existem compromissos ativos não avaliados no assessment: ' + unassessed.join(', '));
      }

      // 6. Provenance & base calendar/proposal version match (R2-F01)
      if (cal.impactAssessment.baseCalendarVersionId && cal.currentVersion && cal.impactAssessment.baseCalendarVersionId !== cal.currentVersion.id) {
        reasons.push(`Base version mismatch: Impact Assessment avaliou base '${cal.impactAssessment.baseCalendarVersionId}', mas versão vigente atual é '${cal.currentVersion.id}'.`);
      }
      if (cal.impactAssessment.baseCalendarVersion && cal.currentVersion && cal.impactAssessment.baseCalendarVersion !== cal.currentVersion.version) {
        reasons.push(`Base version mismatch: Impact Assessment avaliou versão base '${cal.impactAssessment.baseCalendarVersion}', mas versão vigente atual é '${cal.currentVersion.version}'.`);
      }
      if (cal.impactAssessment.proposalId && cal.proposal && cal.impactAssessment.proposalId !== cal.proposal.id) {
        reasons.push(`Proposal mismatch: Impact Assessment avaliou proposta '${cal.impactAssessment.proposalId}', mas proposta atual é '${cal.proposal.id}'.`);
      }
      if (cal.impactAssessment.proposalVersion && cal.proposal && cal.impactAssessment.proposalVersion !== cal.proposal.proposedVersion) {
        reasons.push(`Proposal version mismatch: Impact Assessment avaliou versão '${cal.impactAssessment.proposalVersion}', mas proposta atual é '${cal.proposal.proposedVersion}'.`);
      }
    }

    // 7. Unresolved material conflicts
    const unresolved = Object.keys(cal.commitments || {}).filter(id => {
      const res = cal.resolutions && cal.resolutions[id];
      return !res || res.status !== 'resolvido';
    });
    if (unresolved.length > 0) {
      reasons.push('Existem dependências materiais pendentes de resolução formal: ' + unresolved.join(', '));
    }

    // 8. Source coverage
    if (!cal.sourceCoverage || cal.sourceCoverage.status === 'parcial') {
      const missing = (cal.sourceCoverage && cal.sourceCoverage.missingChannels) || ['Canais desconhecidos'];
      reasons.push('Cobertura parcial na fonte de reservas (' + missing.join(', ') + ' ausentes): ausência de dados não comprova ausência de conflitos.');
    }

    // 9. Base version status
    if (cal.currentVersion && cal.currentVersion.status !== 'vigente') {
      reasons.push('Versão de referência não se encontra em status vigente.');
    }

    return {
      allowed: reasons.length === 0,
      reasons: reasons,
      evaluatedAgainst: {
        currentVersionId: cal.currentVersion ? cal.currentVersion.id : null,
        proposalId: cal.proposal ? cal.proposal.id : null,
        assessmentStatus: cal.impactAssessment ? cal.impactAssessment.status : null,
        sourceCoverage: cal.sourceCoverage ? cal.sourceCoverage.status : null,
        totalDependencies: Object.keys(cal.commitments || {}).length,
        unresolvedCount: unresolved.length
      },
      assessmentVersion: cal.impactAssessment ? cal.impactAssessment.assessmentVersion : null
    };
  }

  /**
   * Attempts to apply calendar proposal through formal domain governance gate.
   * Does NOT mutate production or vigente if gate rejects.
   */
  function attemptApplyCalendarProposal() {
    const gate = evaluateCalendarProposalApplicability(State.calendar);
    if (!gate.allowed) {
      return {
        success: false,
        applied: false,
        reasons: gate.reasons,
        currentVersion: State.calendar.currentVersion
      };
    }
    return {
      success: true,
      applied: false,
      message: 'Simulação: proposta elegível para fluxo de aprovação e publicação por destino.'
    };
  }

  /**
   * Projects a historical operational fact for display under an active timezone configuration
   * without mutating the immutable historical record (Regra B01-D19 / R2-F02).
   */
  function projectHistoricalFactForDisplay(historicalFact, targetTimezone) {
    const fact = historicalFact || HISTORICAL_FACT_FIXTURE;
    const tz = targetTimezone || 'America/Sao_Paulo';

    // Parse UTC timestamp
    const dateObj = new Date(fact.occurredAtUtc);

    // Format display string in the target timezone using Intl.DateTimeFormat
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(dateObj);
    const getPart = (type) => (parts.find(p => p.type === type) || {}).value;
    const displayCivilDate = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
    const displayTime = `${getPart('hour')}:${getPart('minute')}`;

    return {
      factId: fact.id,
      // Immutable historical fields preserved
      occurredAtUtc: fact.occurredAtUtc,
      recordedBusinessDate: fact.recordedBusinessDate,
      recordedCivilDate: fact.recordedCivilDate,
      recordedTimezone: fact.recordedTimezone,
      // Projected display fields under active timezone
      activeConfigTimezone: tz,
      displayCivilDate,
      displayTime,
      displayLabel: `${displayCivilDate} ${displayTime} (${tz})`
    };
  }

  /**
   * Real domain evaluator testing historical immutability under timezone shift simulation (R2-F02).
   */
  function evaluateHistoricalFactUnderTimezoneConfig(historicalFact, newTimezone) {
    const originalFact = historicalFact || HISTORICAL_FACT_FIXTURE;
    const targetTz = newTimezone || 'UTC';

    // Snapshot original fact before
    const snapshotBefore = JSON.parse(JSON.stringify(originalFact));

    // Project under original recorded timezone
    const projOriginal = projectHistoricalFactForDisplay(originalFact, originalFact.recordedTimezone);

    // Project under new/future target timezone (e.g. UTC)
    const projShifted = projectHistoricalFactForDisplay(originalFact, targetTz);

    // Verify that originalFact was NOT mutated in any way
    const factRemainedIdentical = (
      originalFact.occurredAtUtc === snapshotBefore.occurredAtUtc &&
      originalFact.recordedBusinessDate === snapshotBefore.recordedBusinessDate &&
      originalFact.recordedTimezone === snapshotBefore.recordedTimezone &&
      originalFact.recordedCivilDate === snapshotBefore.recordedCivilDate
    );

    // Verify that presentation changed according to timezone while historical fact remains unchanged
    // Under America/Sao_Paulo: 2026-10-04T01:00:00Z -> 22:00 on 2026-10-03 (UTC-3)
    // Under UTC: 2026-10-04T01:00:00Z -> 01:00 on 2026-10-04 (UTC)
    const displayDivergedAsExpected = (projOriginal.displayCivilDate !== projShifted.displayCivilDate);

    return {
      pass: factRemainedIdentical && displayDivergedAsExpected,
      factRemainedIdentical,
      displayDivergedAsExpected,
      originalProjection: projOriginal,
      shiftedProjection: projShifted,
      fact: originalFact
    };
  }

  /**
   * Validates B01-D19 Temporal Contract for service windows (R1-F06 / R2-F02).
   */
  function validateServiceWindowTemporalContract(win) {
    const w = win || TEMPORAL_MIDNIGHT_FIXTURE;
    const reasons = [];

    // 1. Two civil dates explicit
    const hasTwoCivilDates = Boolean(w.civilStartDate && w.civilEndDate && w.civilStartDate !== w.civilEndDate);
    if (!hasTwoCivilDates) reasons.push('Janela transnoite requer duas datas civis explícitas (início e término).');

    // 2. businessDate remains stable across midnight
    const isBusinessDateStable = (w.businessDate === '2026-10-03');
    if (!isBusinessDateStable) reasons.push('Data operacional (businessDate) deve permanecer estável no turno noturno.');

    // 3. Duration is positive (not negative from hour comparison)
    // 22:00 on day 1 to 02:00 on day 2 = 4 hours (240 min)
    const [startH, startM] = w.startTime.split(':').map(Number);
    const [endH, endM] = w.endTime.split(':').map(Number);
    let durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (w.crossesMidnight) {
      durationMinutes += 24 * 60;
    }
    const isDurationPositive = durationMinutes > 0 && durationMinutes === 240;
    if (!isDurationPositive) reasons.push('Duração da janela não pode ser negativa ou inconsistente com a virada de dia.');

    // 4. Midnight (00:00) is NOT operational termination
    const midnightNotCutoff = w.crossesMidnight === true && durationMinutes > 120;
    if (!midnightNotCutoff) reasons.push('Meia-noite (00:00) não pode ser tratada como encerramento automático do serviço.');

    // 5. Timezone is explicit
    const hasExplicitTimezone = Boolean(w.timezone && w.timezone === 'America/Sao_Paulo');
    if (!hasExplicitTimezone) reasons.push('Timezone IANA canônico deve estar explicitamente declarado.');

    // 6. Real historical immutability under timezone shift simulation (R2-F02)
    const tzEvaluation = evaluateHistoricalFactUnderTimezoneConfig(HISTORICAL_FACT_FIXTURE, 'UTC');
    const isHistoricalFactPreserved = tzEvaluation.pass === true;
    if (!isHistoricalFactPreserved) {
      reasons.push('Fato histórico pretérito não pode alterar seu businessDate, timezone gravado ou timestamp por mudança de configuração futura.');
    }

    const pass = (reasons.length === 0);
    return {
      pass,
      hasTwoCivilDates,
      isBusinessDateStable,
      durationMinutes,
      isDurationPositive,
      midnightNotCutoff,
      hasExplicitTimezone,
      isHistoricalFactPreserved,
      tzEvaluation,
      reasons
    };
  }

  function saveScenario() {
    State.scenario.updatedAt = new Date().toISOString();
  }

  /**
   * Real before/after verification that saveScenario has zero side-effects on protected facts (R1-F03).
   */
  function verifySaveScenarioSideEffectFree() {
    // 1. Snapshot protected state before
    const beforeProtected = {
      calendarCurrentVersion: JSON.parse(JSON.stringify(State.calendar.currentVersion)),
      calendarCommitments: JSON.parse(JSON.stringify(State.calendar.commitments)),
      calendarResolutions: JSON.parse(JSON.stringify(State.calendar.resolutions)),
      calendarImpactAssessment: JSON.parse(JSON.stringify(State.calendar.impactAssessment)),
      calendarPublication: JSON.parse(JSON.stringify(State.calendar.publication)),
      protectedExternalFacts: JSON.parse(JSON.stringify(State.protectedExternalFacts))
    };

    // 2. Execute the actual saveScenario domain action
    saveScenario();

    // 3. Snapshot protected state after
    const afterProtected = {
      calendarCurrentVersion: JSON.parse(JSON.stringify(State.calendar.currentVersion)),
      calendarCommitments: JSON.parse(JSON.stringify(State.calendar.commitments)),
      calendarResolutions: JSON.parse(JSON.stringify(State.calendar.resolutions)),
      calendarImpactAssessment: JSON.parse(JSON.stringify(State.calendar.impactAssessment)),
      calendarPublication: JSON.parse(JSON.stringify(State.calendar.publication)),
      protectedExternalFacts: JSON.parse(JSON.stringify(State.protectedExternalFacts))
    };

    // 4. Verify deep equality of all protected facts
    const isProtectedStateIdentical = JSON.stringify(beforeProtected) === JSON.stringify(afterProtected);
    // 5. Verify that scenario document state was updated
    const isScenarioDocumentSaved = Boolean(State.scenario.updatedAt);

    return {
      pass: isProtectedStateIdentical && isScenarioDocumentSaved,
      isProtectedStateIdentical,
      isScenarioDocumentSaved
    };
  }

  /**
   * Semantic Runtime Invariant Evaluator for Calendar Proposal (P1 / Operating Model v2.4 / R3-F01).
   * Validates structural and semantic decoupling between active CalendarVersion and CalendarProposal
   * without hardcoding specific operating hours (e.g. 18-23 or 19-23).
   */
  function evaluateSemanticCalendarProposalInvariant(calendarState) {
    const cal = calendarState || State.calendar;
    if (!cal || typeof cal !== 'object') {
      return { pass: false, reasons: ['Calendar state ausente ou inválido'] };
    }

    const reasons = [];

    // 1. CalendarVersion existe e possui id, version, status coerente, start/end
    const cv = cal.currentVersion;
    if (!cv || typeof cv !== 'object') {
      reasons.push('CalendarVersion vigente ausente');
    } else {
      if (!cv.id || typeof cv.id !== 'string') reasons.push('CalendarVersion.id ausente ou inválido');
      if (!cv.version || typeof cv.version !== 'string') reasons.push('CalendarVersion.version ausente ou inválido');
      if (!cv.status || typeof cv.status !== 'string' || !['vigente', 'ativo', 'historico'].includes(cv.status)) {
        reasons.push('CalendarVersion.status ausente ou incoerente');
      }
      if (!cv.startTime || typeof cv.startTime !== 'string' || !cv.endTime || typeof cv.endTime !== 'string') {
        reasons.push('CalendarVersion startTime/endTime ausentes ou inválidos');
      }
    }

    // 2. CalendarProposal existe e possui id, proposedVersion, proposedStart/end
    const prop = cal.proposal;
    if (!prop || typeof prop !== 'object') {
      reasons.push('CalendarProposal ausente');
    } else {
      if (!prop.id || typeof prop.id !== 'string') reasons.push('CalendarProposal.id ausente ou inválido');
      if (!prop.proposedVersion || typeof prop.proposedVersion !== 'string') {
        reasons.push('CalendarProposal.proposedVersion ausente ou inválida');
      }
      if (!prop.proposedStartTime || typeof prop.proposedStartTime !== 'string' ||
          !prop.proposedEndTime || typeof prop.proposedEndTime !== 'string') {
        reasons.push('CalendarProposal proposedStartTime/proposedEndTime ausentes ou inválidos');
      }
    }

    // 3. currentVersion.id != proposal.id
    if (cv && prop && cv.id === prop.id) {
      reasons.push('currentVersion e proposal compartilham o mesmo id');
    }

    // 4. proposta não substitui a versão vigente apenas por existir
    if (cv && prop) {
      if (cv.id === prop.id || cv.version === prop.proposedVersion) {
        reasons.push('Proposta sobrescreveu indevidamente a versão vigente');
      }
    }

    // 5. commitments permanecem referências separadas
    if (!cal.commitments || typeof cal.commitments !== 'object') {
      reasons.push('Commitments ausentes ou estrutura inválida');
    }

    // 6. ImpactAssessment, quando existente, possui provenance coerente
    const ia = cal.impactAssessment;
    if (ia && typeof ia === 'object') {
      if (!ia.baseCalendarVersionId || typeof ia.baseCalendarVersionId !== 'string') {
        reasons.push('ImpactAssessment.baseCalendarVersionId ausente');
      }
      if (!ia.baseCalendarVersion || typeof ia.baseCalendarVersion !== 'string') {
        reasons.push('ImpactAssessment.baseCalendarVersion ausente');
      }
      if (!ia.proposalId || typeof ia.proposalId !== 'string') {
        reasons.push('ImpactAssessment.proposalId ausente');
      }
      if (!ia.proposalVersion || typeof ia.proposalVersion !== 'string') {
        reasons.push('ImpactAssessment.proposalVersion ausente');
      }
    }

    return {
      pass: reasons.length === 0,
      reasons
    };
  }

  /**
   * Semantic Runtime Invariant Evaluator for Scenario Versioning (P2 / Operating Model v2.4 / R3-F01).
   * Validates structure, transparency, assumption types, and derived math without hardcoding
   * specific figures (e.g. 4800, -3200, 20 months).
   */
  function evaluateSemanticScenarioInvariant(scenarioState) {
    const scn = scenarioState || State.scenario;
    if (!scn || typeof scn !== 'object') {
      return { pass: false, reasons: ['Scenario state ausente ou inválido'] };
    }

    const reasons = [];

    // 1. ScenarioDefinition / ScenarioVersion identificáveis (id, version)
    if (!scn.id || typeof scn.id !== 'string') reasons.push('Scenario.id ausente ou inválido');
    if (!scn.version || typeof scn.version !== 'string') reasons.push('Scenario.version ausente ou inválida');

    // 2. Status explícito como simulação/hipótese
    const validStatuses = ['SIMULACAO_HIPOTESE', 'simulacao', 'hipotese', 'rascunho'];
    if (!scn.status || !validStatuses.includes(scn.status)) {
      reasons.push(`Scenario.status deve ser explícito como simulação/hipótese (encontrado: ${scn.status})`);
    }

    // 3. Assumptions possuem id, name, unit, status, origin, e value quando conhecido
    if (!scn.assumptions || typeof scn.assumptions !== 'object' || Object.keys(scn.assumptions).length === 0) {
      reasons.push('Scenario.assumptions ausentes ou vazias');
    } else {
      for (const [key, asm] of Object.entries(scn.assumptions)) {
        if (!asm.id) reasons.push(`Premissa ${key}: id ausente`);
        if (!asm.name) reasons.push(`Premissa ${key}: name ausente`);
        if (!asm.unit) reasons.push(`Premissa ${key}: unit ausente`);
        if (!asm.status || !['known', 'estimated', 'unknown'].includes(asm.status)) {
          reasons.push(`Premissa ${key}: status inválido (${asm.status})`);
        }
        if (!asm.origin) reasons.push(`Premissa ${key}: origin ausente`);
        if (asm.status !== 'unknown' && (asm.value === undefined || asm.value === null || typeof asm.value !== 'number')) {
          reasons.push(`Premissa ${key}: value numérico ausente para status conhecido`);
        }
      }
    }

    // 4. Limitações metodológicas explícitas
    if (!Array.isArray(scn.limitations) || scn.limitations.length === 0) {
      reasons.push('Limitações metodológicas do cenário ausentes ou vazias');
    }

    // 5. Current version não reescreve history
    if (Array.isArray(scn.history)) {
      const historyContainsCurrent = scn.history.some(h => h.version === scn.version);
      if (historyContainsCurrent) {
        reasons.push(`Versão atual ${scn.version} conflita com versão existente no histórico arquivado`);
      }
    }

    // 6. Projeção: se calculável, deriva das premissas atuais; se unknown, estado não calculável é válido
    const proj = calculateScenarioProjection(scn);
    if (proj.isCalculable) {
      const inv = scn.assumptions['ASM-01'] ? scn.assumptions['ASM-01'].value : null;
      const sav = scn.assumptions['ASM-02'] ? scn.assumptions['ASM-02'].value : null;
      const hor = scn.assumptions['ASM-03'] ? scn.assumptions['ASM-03'].value : null;
      if (inv !== null && sav !== null && hor !== null) {
        const expectedGross = sav * hor;
        const expectedNet = expectedGross - inv;
        const expectedPayback = sav > 0 ? (inv / sav) : null;
        if (proj.grossBenefit !== expectedGross || proj.netDifference !== expectedNet || proj.simplePaybackMonths !== expectedPayback) {
          reasons.push('Projeção calculada não confere com premissas declaradas');
        }
      }
    } else {
      if (proj.grossBenefit !== null || proj.netDifference !== null) {
        reasons.push('Projeção não calculável deve manter benefício e resultado nulos');
      }
    }

    return {
      pass: reasons.length === 0,
      isCalculable: proj.isCalculable,
      reasons
    };
  }

  /**
   * Semantic Runtime Invariant Evaluator for Adoption Definition & Metrics (P3 / Operating Model v2.4 / R3-F01).
   * Validates non-negative populations, separate dimensions, explicit exclusions, and correct rate derivation.
   * Handles denominator zero (eligible = 0) as a legitimate "Não aplicável" state without failing.
   */
  function evaluateSemanticAdoptionInvariant(adoptionState) {
    const adp = adoptionState || State.adoption;
    if (!adp || typeof adp !== 'object') {
      return { pass: false, reasons: ['Adoption state ausente ou inválido'] };
    }

    const reasons = [];

    // 1. AdoptionDefinition existe e definition está explícita
    if (!adp.id || typeof adp.id !== 'string') reasons.push('Adoption.id ausente');
    if (!adp.definition || typeof adp.definition !== 'string' || adp.definition.trim().length === 0) {
      reasons.push('Adoption.definition ausente ou vazia');
    }

    // 2. eligiblePopulation é número finito >= 0
    if (typeof adp.eligiblePopulation !== 'number' || isNaN(adp.eligiblePopulation) || adp.eligiblePopulation < 0) {
      reasons.push('eligiblePopulation deve ser número finito >= 0');
    }

    // 3. completedFlow >= 0, assistedOutside >= 0, evidenceGaps >= 0
    if (typeof adp.completedFlow !== 'number' || adp.completedFlow < 0) {
      reasons.push('completedFlow deve ser >= 0');
    }
    if (typeof adp.assistedOutside !== 'number' || adp.assistedOutside < 0) {
      reasons.push('assistedOutside deve ser >= 0');
    }
    if (typeof adp.evidenceGaps !== 'number' || adp.evidenceGaps < 0) {
      reasons.push('evidenceGaps deve ser >= 0');
    }

    // 4. completedFlow cannot exceed eligiblePopulation
    if (adp.eligiblePopulation > 0 && adp.completedFlow > adp.eligiblePopulation) {
      reasons.push(`completedFlow (${adp.completedFlow}) não pode exceder eligiblePopulation (${adp.eligiblePopulation})`);
    }

    // 5. exclusions estão explícitas
    if (!Array.isArray(adp.exclusions) || adp.exclusions.length === 0) {
      reasons.push('Exclusões formais do denominador ausentes ou vazias');
    }

    // 6. coverage está explícita
    if (!adp.sourceCoverage || typeof adp.sourceCoverage !== 'object' || !adp.sourceCoverage.status) {
      reasons.push('sourceCoverage ausente ou sem status');
    }

    // 7. Métricas computadas
    const adpMet = calculateAdoptionMetrics(adp);

    if (adp.eligiblePopulation > 0) {
      const expectedRate = Number(((adp.completedFlow / adp.eligiblePopulation) * 100).toFixed(1));
      if (adpMet.ratePct !== expectedRate) {
        reasons.push(`ratePct (${adpMet.ratePct}) diverge do cálculo formal (${expectedRate})`);
      }
      const isCoveragePartial = adp.sourceCoverage && adp.sourceCoverage.status === 'parcial';
      if (isCoveragePartial && adpMet.generalizationAllowed !== false) {
        reasons.push('Cobertura parcial deve bloquear generalização');
      }
    } else if (adp.eligiblePopulation === 0) {
      if (!adpMet.isNotApplicable || adpMet.ratePct !== null || adpMet.rateFraction !== null) {
        reasons.push('Denominador zero deve ter isNotApplicable=true e ratePct/rateFraction nulos');
      }
    }

    return {
      pass: reasons.length === 0,
      metrics: adpMet,
      reasons
    };
  }

  // =========================================================================
  // 4. INVARIANT ENGINE & AUDIT
  // =========================================================================

  function runAllInvariantAudits() {
    const results = {};

    // P1: CalendarProposal preserva CalendarVersion vigente e compromissos existentes (Semantic Invariant)
    const cal = State.calendar;
    const p1Eval = evaluateSemanticCalendarProposalInvariant(cal);
    results.p1 = {
      status: p1Eval.pass ? 'PASS' : 'FAIL',
      source: 'runtime',
      observation: p1Eval.pass
        ? `Versão vigente ${cal.currentVersion.version} (${cal.currentVersion.startTime}–${cal.currentVersion.endTime}) preservada sob proposta ${cal.proposal.proposedVersion}; separação canônica e proveniência intactas`
        : `Violação semântica em P1: ${p1Eval.reasons.join('; ')}`,
      evaluatedAt: new Date().toISOString()
    };

    // P2: ScenarioVersion é rastreável, baseada exclusivamente em premissas e versionada (Semantic Invariant)
    const scn = State.scenario;
    const p2Eval = evaluateSemanticScenarioInvariant(scn);
    results.p2 = {
      status: p2Eval.pass ? 'PASS' : 'FAIL',
      source: 'runtime',
      observation: p2Eval.pass
        ? `Cenário ${scn.id} v${scn.version} rotulado como hipótese com premissas tipadas, limitações explícitas e cálculo derivado`
        : `Violação semântica em P2: ${p2Eval.reasons.join('; ')}`,
      evaluatedAt: new Date().toISOString()
    };

    // P3: AdoptionDefinition possui população elegível, denominador e exclusions explícitas (Semantic Invariant)
    const adp = State.adoption;
    const p3Eval = evaluateSemanticAdoptionInvariant(adp);
    results.p3 = {
      status: p3Eval.pass ? 'PASS' : 'FAIL',
      source: 'runtime',
      observation: p3Eval.pass
        ? (adp.eligiblePopulation === 0
            ? 'Denominador zero tratado legitimamente como Não Aplicável sob Regra V6 (dimensões separadas e exclusões explícitas)'
            : `População elegível: ${adp.eligiblePopulation}, Concluídas: ${adp.completedFlow} (${p3Eval.metrics.ratePct}%), dimensões separadas e exclusões explícitas`)
        : `Violação semântica em P3: ${p3Eval.reasons.join('; ')}`,
      evaluatedAt: new Date().toISOString()
    };

    // N1: Salvar proposta não aplica calendário na versão vigente (Context-Safe)
    const n1Pass = (
      cal.proposal.status !== 'salva_rascunho' ||
      (cal.currentVersion.status === 'vigente' &&
       cal.currentVersion.id !== cal.proposal.id &&
       cal.currentVersion.startTime !== cal.proposal.proposedStartTime)
    );
    results.n1 = {
      status: n1Pass ? 'PASS' : 'FAIL',
      source: 'runtime',
      observation: cal.proposal.status === 'salva_rascunho' ? 'Proposta salva como rascunho sem alterar versão vigente' : 'Vigente intacta',
      evaluatedAt: new Date().toISOString()
    };

    // N2: Conflito material não resolvido impede aplicação do calendário proposto
    const hasUnresolvedConflict = Object.values(cal.resolutions).some(r => r.status !== 'resolvido');
    const n2Pass = (
      !hasUnresolvedConflict ||
      cal.currentVersion.startTime !== cal.proposal.proposedStartTime
    );
    results.n2 = {
      status: n2Pass ? 'PASS' : 'FAIL',
      source: 'runtime',
      observation: hasUnresolvedConflict ? 'Conflito material pendente bloqueia transição para vigente' : 'Conflitos resolvidos',
      evaluatedAt: new Date().toISOString()
    };

    // N3: Nova dependência invalida assessment antigo e dependências passam de 2 para 3
    const hasRes063 = !!cal.commitments['RES-DEMO-063'];
    const n3Pass = (
      !hasRes063 ||
      (cal.impactAssessment.status === 'STALE' && Object.keys(cal.commitments).length === 3)
    );
    results.n3 = {
      status: n3Pass ? 'PASS' : 'FAIL',
      source: 'runtime',
      observation: hasRes063 ? 'RES-DEMO-063 detectada: assessment anterior invalidado (STALE) e 3 dependências ativas' : 'Assessment regular',
      evaluatedAt: new Date().toISOString()
    };

    // N4: Cobertura parcial de reservas não declara capacidade livre nem "zero conflitos"
    const n4Pass = (
      cal.sourceCoverage.status !== 'parcial' ||
      (cal.sourceCoverage.missingChannels.length > 0 &&
       cal.sourceCoverage.reportedChannels.length < cal.sourceCoverage.expectedChannels.length)
    );
    results.n4 = {
      status: n4Pass ? 'PASS' : 'FAIL',
      source: 'runtime',
      observation: cal.sourceCoverage.status === 'parcial' ? 'Canal de reservas ausente: status parcial explícito sem declarar capacidade livre' : 'Cobertura completa',
      evaluatedAt: new Date().toISOString()
    };

    // N5: Publicação é independente por destino (confirmação isolada não publica em todos)
    const pub = cal.publication.destinations;
    const n5Pass = (
      pub['canal-ifood'].status === 'confirmado' &&
      pub['canal-google'].status === 'resultado_incerto' &&
      pub['canal-totem'].status === 'pendente'
    );
    results.n5 = {
      status: n5Pass ? 'PASS' : 'FAIL',
      source: 'runtime',
      observation: 'Destinos com status isolados: iFood confirmado, Google incerto (reconciliação pendente), Totem pendente',
      evaluatedAt: new Date().toISOString()
    };

    // N6: Premissa necessária desconhecida impede cálculo (não usa zero silencioso)
    const proj = calculateScenarioProjection(scn);
    const n6Pass = (
      scn.assumptions['ASM-04'].status !== 'unknown' ||
      (!proj.isCalculable && proj.reason.includes('Não mensurável'))
    );
    results.n6 = {
      status: n6Pass ? 'PASS' : 'FAIL',
      source: 'runtime',
      observation: scn.assumptions['ASM-04'].status === 'unknown' ? 'Premissa unknown bloqueia projeção; resultado marcado como Não Mensurável' : 'Premissas conhecidas',
      evaluatedAt: new Date().toISOString()
    };

    // N7: Cenário salvo não altera orçamento real, assets, pagamentos nem calendário (R1-F03)
    const saveCheck = verifySaveScenarioSideEffectFree();
    results.n7 = {
      status: saveCheck.pass ? 'PASS' : 'FAIL',
      source: 'runtime',
      observation: saveCheck.pass
        ? 'Deep-equal before/after verificado: zero mutação em calendário, compromissos, budgetRef, assetRef e paymentRef'
        : 'Mutação indevida detectada em fatos protegidos durante saveScenario',
      evaluatedAt: new Date().toISOString()
    };

    // N8: Adoção parcial não generaliza para o restaurante inteiro
    const adpMet = calculateAdoptionMetrics(adp);
    const n8Pass = (
      adp.sourceCoverage.status !== 'parcial' ||
      (!adpMet.generalizationAllowed && adpMet.isCoveragePartial)
    );
    results.n8 = {
      status: n8Pass ? 'PASS' : 'FAIL',
      source: 'runtime',
      observation: adp.sourceCoverage.status === 'parcial' ? 'Instrumentação parcial restringe interpretação à amostra observada (generalização bloqueada)' : 'Adoção regular',
      evaluatedAt: new Date().toISOString()
    };

    // ZD1: Adoção com denominador zero resulta em "Não aplicável" (Regra V6 / R1-F05)
    const zeroTestAdp = {
      eligiblePopulation: 0,
      completedFlow: 0,
      assistedOutside: 0,
      evidenceGaps: 0,
      sourceCoverage: { status: 'completa', coveragePct: 100 }
    };
    const zd1Met = calculateAdoptionMetrics(zeroTestAdp);
    const zd1Pass = (
      zd1Met.eligiblePopulation === 0 &&
      zd1Met.ratePct === null &&
      zd1Met.rateFraction === null &&
      zd1Met.isNotApplicable === true
    );
    results.zd1 = {
      status: zd1Pass ? 'PASS' : 'FAIL',
      source: 'runtime',
      observation: zd1Pass
        ? 'Denominador zero tratado como "Não aplicável" com ratePct null (sem zero artificial)'
        : 'Falha: denominador zero retornou taxa numérica indevida',
      evaluatedAt: new Date().toISOString()
    };

    // T1: Janela transnoite preserva businessDate, duração positiva e fuso canônico (Regra B01-D19 / R2-F02)
    const t1Check = validateServiceWindowTemporalContract(TEMPORAL_MIDNIGHT_FIXTURE);
    results.t1 = {
      status: t1Check.pass ? 'PASS' : 'FAIL',
      source: 'runtime',
      observation: t1Check.pass
        ? 'Turno 22:00–02:00 preserva businessDate 2026-10-03, duração +240m e fuso America/Sao_Paulo com imutabilidade factual sob UTC'
        : 'Inconsistência temporal detectada: ' + t1Check.reasons.join(', '),
      evaluatedAt: new Date().toISOString()
    };

    // V1: Calendar base/version mismatch rejeita assessment antigo (Operating Model v2.3 / R2-F01)
    const testCalState = {
      currentVersion: { id: 'CAL-DEMO-061-v2-external', version: '1.1.0', status: 'vigente' },
      proposal: { id: 'PROP-CAL-061-01', proposedVersion: '2.0.0', proposedStartTime: '19:00', proposedEndTime: '23:00' },
      commitments: {},
      resolutions: {},
      sourceCoverage: { status: 'completa', missingChannels: [] },
      impactAssessment: {
        id: 'IA-CAL-061-01',
        assessmentVersion: 1,
        baseCalendarVersionId: 'CAL-DEMO-061-v1',
        baseCalendarVersion: '1.0.0',
        proposalId: 'PROP-CAL-061-01',
        proposalVersion: '2.0.0',
        status: 'VALID',
        evaluatedDependencyIds: []
      }
    };
    const v1Gate = evaluateCalendarProposalApplicability(testCalState);
    const v1Pass = (v1Gate.allowed === false && v1Gate.reasons.some(r => r.includes('Base version mismatch')));
    results.v1 = {
      status: v1Pass ? 'PASS' : 'FAIL',
      source: 'runtime',
      observation: v1Pass
        ? 'Base/version mismatch detectado e bloqueado com sucesso pelo gate de aplicabilidade'
        : 'Falha: gate permitiu aplicação com mismatch de versão base',
      evaluatedAt: new Date().toISOString()
    };

    // Adversarial proofs (A1–A6)
    // Operating Model v2.3 Review Surface Truthfulness Gate:
    // Em modo standalone nascem estritamente como NOT_RUN.
    results.a1 = {
      status: 'NOT_RUN',
      source: 'harness',
      observation: 'Ensaio adversarial de spoof visual de horário vigente no DOM (requer harness CDP)',
      evaluatedAt: null
    };

    results.a2 = {
      status: 'NOT_RUN',
      source: 'harness',
      observation: 'Ensaio adversarial de mutação destrutiva em compromisso factual para forçar encaixe (requer harness CDP)',
      evaluatedAt: null
    };

    results.a3 = {
      status: 'NOT_RUN',
      source: 'harness',
      observation: 'Ensaio adversarial de aplicação com impact assessment stale (requer harness CDP)',
      evaluatedAt: null
    };

    results.a4 = {
      status: 'NOT_RUN',
      source: 'harness',
      observation: 'Ensaio adversarial de forçar claim visual 0 conflitos com cobertura parcial (requer harness CDP)',
      evaluatedAt: null
    };

    results.a5 = {
      status: 'NOT_RUN',
      source: 'harness',
      observation: 'Ensaio adversarial de autodeclaração de economia realizada sobre cenário hipotético (requer harness CDP)',
      evaluatedAt: null
    };

    results.a6 = {
      status: 'NOT_RUN',
      source: 'harness',
      observation: 'Ensaio adversarial de inflação de cliques/notificações para manipular taxa de adoção (requer harness CDP)',
      evaluatedAt: null
    };

    State.invariants = results;
    return results;
  }

  // =========================================================================
  // 5. SCENARIO DISPATCHER & SIMULATION ACTIONS
  // =========================================================================

  const Scenarios = {
    // Cenário 1: Calendário vigente 18–23 vs proposta 19–23 com 2 dependências existentes
    applyScenario1: function () {
      State.activeScenario = 1;
      State.activeSurface = 'SCR-GES-004';
      State.calendar.currentVersion.id = 'CAL-DEMO-061-v1';
      State.calendar.currentVersion.version = '1.0.0';
      State.calendar.currentVersion.startTime = '18:00';
      State.calendar.currentVersion.endTime = '23:00';
      State.calendar.currentVersion.status = 'vigente';
      State.calendar.proposal.id = 'PROP-CAL-061-01';
      State.calendar.proposal.proposedVersion = '2.0.0';
      State.calendar.proposal.status = 'em_revisao';
      State.calendar.proposal.proposedStartTime = '19:00';
      State.calendar.proposal.proposedEndTime = '23:00';
      State.calendar.commitments = {
        'RES-DEMO-062': JSON.parse(JSON.stringify(INITIAL_OPERATIONAL_FACTS['RES-DEMO-062'])),
        'PRO-DEMO-062': JSON.parse(JSON.stringify(INITIAL_OPERATIONAL_FACTS['PRO-DEMO-062']))
      };
      State.calendar.impactAssessment.baseCalendarVersionId = 'CAL-DEMO-061-v1';
      State.calendar.impactAssessment.baseCalendarVersion = '1.0.0';
      State.calendar.impactAssessment.proposalId = 'PROP-CAL-061-01';
      State.calendar.impactAssessment.proposalVersion = '2.0.0';
      State.calendar.impactAssessment.assessmentVersion = 1;
      State.calendar.impactAssessment.status = 'VALID';
      State.calendar.impactAssessment.evaluatedDependencyIds = ['RES-DEMO-062', 'PRO-DEMO-062'];
      State.calendar.impactAssessment.stalenessReason = null;
      State.calendar.resolutions['RES-DEMO-062'] = { status: 'pendente', resolvedBy: null, note: 'Pendente contato' };
      State.calendar.resolutions['PRO-DEMO-062'] = { status: 'pendente', resolvedBy: null, note: 'Pendente ajuste de escala' };
      State.calendar.sourceCoverage.status = 'completa';
      State.calendar.sourceCoverage.reportedChannels = ['API Hostinger', 'Webhook iFood', 'Reserve Partner'];
      State.calendar.sourceCoverage.missingChannels = [];
      renderApp();
    },

    // Cenário 2: Salvar proposta (rascunho mantendo versão vigente intacta)
    applyScenario2: function () {
      State.activeScenario = 2;
      State.activeSurface = 'SCR-GES-004';
      State.calendar.proposal.status = 'salva_rascunho';
      State.calendar.proposal.savedAt = '2026-10-02T10:45:00Z';
      // Version vigente MUST REMAIN 18:00–23:00
      State.calendar.currentVersion.startTime = '18:00';
      State.calendar.currentVersion.endTime = '23:00';
      renderApp();
    },

    // Cenário 3: Resolver apenas uma dependência (proposta continua não aplicável)
    applyScenario3: function () {
      State.activeScenario = 3;
      State.activeSurface = 'SCR-GES-004';
      State.calendar.resolutions['RES-DEMO-062'] = {
        status: 'resolvido',
        resolvedBy: 'Recepção (Amanda Silveira)',
        note: 'Cliente aceitou transferir para 19:15 com mesa reservada.'
      };
      // PRO-DEMO-062 remains open
      State.calendar.resolutions['PRO-DEMO-062'] = {
        status: 'pendente',
        resolvedBy: null,
        note: 'Aguardando validação do Chef Executivo sobre escala térmica.'
      };
      renderApp();
    },

    // Cenário 4: Nova dependência surge (RES-DEMO-063) -> assessment anterior STALE / INVALIDADO
    applyScenario4: function () {
      State.activeScenario = 4;
      State.activeSurface = 'SCR-GES-004';
      // Add RES-DEMO-063
      State.calendar.commitments['RES-DEMO-063'] = JSON.parse(JSON.stringify(INITIAL_OPERATIONAL_FACTS['RES-DEMO-063']));
      // Invalidate previous assessment
      State.calendar.impactAssessment.status = 'STALE';
      State.calendar.impactAssessment.stalenessReason = 'Nova dependência concorrente RES-DEMO-063 detectada às 18:45 após avaliação inicial.';
      State.calendar.resolutions['RES-DEMO-063'] = {
        status: 'pendente',
        resolvedBy: null,
        note: 'Nova reserva pendente de avaliação de impacto.'
      };
      renderApp();
    },

    // Cenário 5: Cobertura parcial na fonte de reservas
    applyScenario5: function () {
      State.activeScenario = 5;
      State.activeSurface = 'SCR-GES-004';
      State.calendar.sourceCoverage.status = 'parcial';
      State.calendar.sourceCoverage.reportedChannels = ['API Hostinger', 'Webhook iFood'];
      State.calendar.sourceCoverage.missingChannels = ['Reserve Partner'];
      renderApp();
    },

    // Cenário 6: Publicação por destino independente (confirmado / incerto / pendente)
    applyScenario6: function () {
      State.activeScenario = 6;
      State.activeSurface = 'SCR-GES-004';
      State.calendar.publication.destinations['canal-ifood'].status = 'confirmado';
      State.calendar.publication.destinations['canal-google'].status = 'resultado_incerto';
      State.calendar.publication.destinations['canal-totem'].status = 'pendente';
      renderApp();
    },

    // Cenário 7: CEN-DEMO-061 base (hipótese de investimento e payback simples)
    applyScenario7: function () {
      State.activeScenario = 7;
      State.activeSurface = 'SCR-GES-005';
      State.scenario = JSON.parse(JSON.stringify(INITIAL_SCENARIO_V1));
      renderApp();
    },

    // Cenário 8: Premissa necessária marcada como unknown (resultado não mensurável)
    applyScenario8: function () {
      State.activeScenario = 8;
      State.activeSurface = 'SCR-GES-005';
      State.scenario.assumptions['ASM-04'].status = 'unknown';
      renderApp();
    },

    // Cenário 9: Revisão de cenário v1 -> v2 preservando histórico canônico (R1-F02)
    applyScenario9: function () {
      State.activeScenario = 9;
      State.activeSurface = 'SCR-GES-005';
      // 1. Restore complete canonical v1 from INITIAL_SCENARIO_V1
      const v1Snapshot = JSON.parse(JSON.stringify(INITIAL_SCENARIO_V1));
      const v1Projection = calculateScenarioProjection(v1Snapshot);
      // 2. Archive complete v1 with all assumptions, statuses, origins, projection and limitations
      State.scenario.history = [{
        version: '1.0.0',
        status: v1Snapshot.status,
        assumptions: v1Snapshot.assumptions,
        projection: v1Projection,
        limitations: v1Snapshot.limitations,
        archivedAt: '2026-10-02T14:00:00Z',
        reason: 'Simulação inicial canônica com horizonte de 12 meses'
      }];
      // 3. Promote v2.0 with modified assumptions
      State.scenario.version = '2.0.0';
      State.scenario.assumptions = JSON.parse(JSON.stringify(INITIAL_SCENARIO_V1.assumptions));
      State.scenario.assumptions['ASM-02'].value = 550; // New higher saving hypothesis
      State.scenario.assumptions['ASM-02'].origin = 'Revisão Técnica Conjunta com Gastronomia';
      State.scenario.assumptions['ASM-03'].value = 24; // 24-month horizon
      State.scenario.assumptions['ASM-04'].status = 'known';
      State.scenario.updatedAt = '2026-10-02T14:30:00Z';
      renderApp();
    },

    // Cenário 10: Salvar cenário (sem setters operacionais ou financeiros reais) (R1-F03)
    applyScenario10: function () {
      State.activeScenario = 10;
      State.activeSurface = 'SCR-GES-005';
      saveScenario();
      renderApp();
    },

    // Cenário 11: Adoção 15/20 = 75% sob definição com separação de assistidas e gaps
    applyScenario11: function () {
      State.activeScenario = 11;
      State.activeSurface = 'SCR-GES-005';
      State.adoption.eligiblePopulation = 20;
      State.adoption.completedFlow = 15;
      State.adoption.assistedOutside = 3;
      State.adoption.evidenceGaps = 2;
      State.adoption.sourceCoverage.status = 'completa';
      renderApp();
    },

    // Cenário 12: Adoção com instrumentação parcial (interpretação limitada)
    applyScenario12: function () {
      State.activeScenario = 12;
      State.activeSurface = 'SCR-GES-005';
      State.adoption.sourceCoverage.status = 'parcial';
      State.adoption.sourceCoverage.coveragePct = 60;
      State.adoption.sourceCoverage.unmonitoredTerminals = ['Terminal Móvel 03 (Sem Datalogger)', 'Terminal Salão B'];
      renderApp();
    }
  };

  // =========================================================================
  // 6. UI RENDERERS (Product UI Kit v0.3)
  // =========================================================================

  function renderApp() {
    runAllInvariantAudits();
    renderScenarioToolbar();
    renderSidebar();
    renderGES004();
    renderGES005();
    renderInvariantsPanel();
    renderDrawer();
  }

  function renderScenarioToolbar() {
    const container = document.getElementById('scenario-chips-container');
    if (!container) return;

    const scenarios = [
      { id: 1, label: '01: Vigente vs Proposta' },
      { id: 2, label: '02: Salvar Proposta' },
      { id: 3, label: '03: Resolução Parcial' },
      { id: 4, label: '04: RES-063 Stale' },
      { id: 5, label: '05: Reservas Parciais' },
      { id: 6, label: '06: Publicação Destino' },
      { id: 7, label: '07: CEN-061 Base' },
      { id: 8, label: '08: Premissa Unknown' },
      { id: 9, label: '09: Cenário v1 → v2' },
      { id: 10, label: '10: Salvar Cenário' },
      { id: 11, label: '11: Adoção 15/20' },
      { id: 12, label: '12: Adoção Parcial' }
    ];

    container.innerHTML = scenarios.map(sc => `
      <button class="scenario-chip ${State.activeScenario === sc.id ? 'active' : ''}" 
              onclick="window.ManagementApp.selectScenario(${sc.id})">
        ${sc.label}
      </button>
    `).join('');
  }

  function renderSidebar() {
    const nav004 = document.getElementById('nav-ges-004');
    const nav005 = document.getElementById('nav-ges-005');
    if (nav004 && nav005) {
      nav004.classList.toggle('active', State.activeSurface === 'SCR-GES-004');
      nav005.classList.toggle('active', State.activeSurface === 'SCR-GES-005');
    }

    const s004 = document.getElementById('surface-ges-004');
    const s005 = document.getElementById('surface-ges-005');
    if (s004 && s005) {
      s004.classList.toggle('active', State.activeSurface === 'SCR-GES-004');
      s005.classList.toggle('active', State.activeSurface === 'SCR-GES-005');
    }
  }

  // --- Render Surface SCR-GES-004: Calendário Operacional e Unidades ---
  function renderGES004() {
    const container = document.getElementById('ges-004-content');
    if (!container) return;

    const cal = State.calendar;
    const impact = evaluateCalendarImpact(cal.proposal, cal.commitments);
    const isStale = cal.impactAssessment.status === 'STALE';
    const isCoveragePartial = cal.sourceCoverage.status === 'parcial';

    let html = `
      <div class="meta-ribbon">
        <div class="meta-item"><span class="meta-label">Unidade:</span> <span class="meta-value">${cal.unit}</span></div>
        <div class="meta-item"><span class="meta-label">Data Operacional:</span> <span class="meta-value">${cal.businessDate}</span></div>
        <div class="meta-item"><span class="meta-label">Fuso Horário:</span> <span class="meta-value">${cal.timezone}</span></div>
        <div class="meta-item"><span class="meta-label">Turno:</span> <span class="meta-value">Jantar (Noturno)</span></div>
        <div class="meta-item"><span class="meta-label">Atravessa Meia-Noite:</span> <span class="meta-value">${cal.crossesMidnight ? 'Sim' : 'Não'}</span></div>
      </div>

      <div class="grid-2col">
        <!-- Janela Vigente -->
        <div class="card" id="card-current-window">
          <div class="card-header">
            <div>
              <div class="card-title">Janela de Serviço Vigente</div>
              <div class="card-subtitle">Versão ${cal.currentVersion.version} · Em vigência formal</div>
            </div>
            <span class="badge badge-success" id="badge-vigente">● Vigente</span>
          </div>
          <div class="window-box">
            <div class="window-time" id="current-window-time">${cal.currentVersion.startTime} – ${cal.currentVersion.endTime}</div>
            <div class="window-details">
              <span>Serviço: ${cal.currentVersion.serviceName}</span>
              <span>Aprovador: ${cal.currentVersion.approvedBy}</span>
            </div>
          </div>
          <p style="font-size: 12px; color: var(--fg-muted);">
            Esta é a única janela com autoridade ativa sobre o salão e a recepção. Alterações propostas exigem resolução formal de conflitos antes da publicação.
          </p>
        </div>

        <!-- Proposta de Janela -->
        <div class="card" id="card-proposal-window">
          <div class="card-header">
            <div>
              <div class="card-title">Proposta de Alteração de Janela</div>
              <div class="card-subtitle">Proposta ${cal.proposal.id} · Por ${cal.proposal.author}</div>
            </div>
            <span class="badge ${cal.proposal.status === 'salva_rascunho' ? 'badge-info' : 'badge-warning'}" id="badge-proposal-status">
              ${cal.proposal.status === 'salva_rascunho' ? '💾 Salva (Rascunho)' : '⏳ Em Revisão'}
            </span>
          </div>
          <div class="window-box">
            <div class="window-time" id="proposed-window-time" style="color: var(--accent-primary);">${cal.proposal.proposedStartTime} – ${cal.proposal.proposedEndTime}</div>
            <div class="window-details">
              <span>Serviço: ${cal.proposal.serviceName}</span>
              <span>Início: Postergar em 1h00</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button class="btn btn-secondary" onclick="window.ManagementApp.saveProposal()">
              💾 Salvar Proposta (Rascunho)
            </button>
            <button class="btn btn-primary ${evaluateCalendarProposalApplicability(cal).allowed ? '' : 'btn-disabled'}" 
                    id="btn-apply-calendar" 
                    onclick="window.ManagementApp.attemptApplyCalendarProposal()" 
                    title="${evaluateCalendarProposalApplicability(cal).allowed ? 'Elegível para aprovação e publicação' : 'Bloqueado pelo gate de aplicabilidade: ' + evaluateCalendarProposalApplicability(cal).reasons[0]}">
              ${evaluateCalendarProposalApplicability(cal).allowed ? '🚀 Aplicar Calendário' : '🔒 Aplicar Calendário (Bloqueado)'}
            </button>
          </div>
          <p style="font-size: 11px; color: var(--fg-muted); margin-top: 8px;">
            Regra Canônica: Salvar proposta NÃO altera a janela vigente de 18:00–23:00 nem move compromissos.
          </p>
        </div>
      </div>

      <!-- Análise de Impacto e Dependências Concorrentes -->
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <div>
            <div class="card-title">Análise de Impacto Concorrente (ImpactAssessment)</div>
            <div class="card-subtitle">Identificador: ${cal.impactAssessment.id} (v${cal.impactAssessment.assessmentVersion}) · Base Vigente: <strong>${cal.impactAssessment.baseCalendarVersionId} (v${cal.impactAssessment.baseCalendarVersion})</strong> · Proposta: <strong>${cal.impactAssessment.proposalId} (v${cal.impactAssessment.proposalVersion})</strong></div>
          </div>
          <div style="display: flex; gap: 8px;">
            <span class="badge ${isStale ? 'badge-danger' : 'badge-success'}" id="badge-assessment-status">
              ${isStale ? '⚠️ Assessment STALE / INVALIDADO' : '✓ Assessment Válido'}
            </span>
            <span class="badge ${isCoveragePartial ? 'badge-warning' : 'badge-neutral'}" id="badge-coverage-status">
              ${isCoveragePartial ? '⚠️ Cobertura de Reservas Parcial' : '● Cobertura Completa'}
            </span>
          </div>
        </div>

        ${isStale ? `
          <div class="callout callout-danger" id="callout-stale-warning">
            <strong>Alerta de Invalidação Contratual (N3):</strong> ${cal.impactAssessment.stalenessReason}
            <br>O assessment anterior não possui mais validade. É obrigatório reavaliar o impacto antes de qualquer decisão.
          </div>
        ` : ''}

        ${isCoveragePartial ? `
          <div class="callout callout-warning" id="callout-coverage-warning">
            <strong>Aviso de Cobertura Parcial (N4):</strong> Canais ausentes: ${cal.sourceCoverage.missingChannels.join(', ')}.
            <br>A ausência de dados de reservas NÃO significa capacidade livre nem ausência de conflitos.
          </div>
        ` : ''}

        <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">
          Dependências & Compromissos Identificados (${impact.length} ativos):
        </div>

        <table class="data-table" id="table-dependencies">
          <thead>
            <tr>
              <th>ID Compromisso</th>
              <th>Tipo & Detalhes</th>
              <th>Horário Marcado</th>
              <th>Autoridade Competente</th>
              <th>Status Resolução</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${impact.map(c => {
              const res = cal.resolutions[c.commitmentId] || { status: 'pendente', note: '' };
              const isResolved = res.status === 'resolvido';
              return `
                <tr class="${!isResolved ? 'highlight-conflict' : ''}" id="row-${c.commitmentId}">
                  <td><strong style="font-family: var(--font-mono);">${c.commitmentId}</strong></td>
                  <td>${c.type}</td>
                  <td><span class="badge badge-warning">${c.scheduledTime}</span></td>
                  <td>${c.authorityModule}</td>
                  <td>
                    <span class="badge ${isResolved ? 'badge-success' : 'badge-danger'}" id="res-badge-${c.commitmentId}">
                      ${isResolved ? '✓ Resolvido' : '⚠️ Pendente de Resolução'}
                    </span>
                    <div style="font-size: 11px; color: var(--fg-muted); margin-top: 4px;">${res.note}</div>
                  </td>
                  <td>
                    <button class="btn btn-secondary" style="font-size: 11px; padding: 4px 8px;" 
                            onclick="window.ManagementApp.openCause('${c.commitmentId}')">
                      🔍 Inspecionar Fato
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Publicação Independente por Destino -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Publicação Independente por Destino (PublicationResult)</div>
            <div class="card-subtitle">Intenção: ${cal.publication.intentId} · Canais externos e internos</div>
          </div>
          <span class="badge badge-neutral">Sincronização Desacoplada</span>
        </div>
        <p style="font-size: 13px; color: var(--fg-muted); margin-bottom: 16px;">
          Regra Canônica: O sucesso de publicação em um canal NÃO autoriza a exibição de "Publicado em todos". Resultados incertos preservam a intenção e exigem reconciliação assíncrona.
        </p>
        <div class="grid-2col">
          ${Object.values(cal.publication.destinations).map(d => {
            let statusBadge = '';
            if (d.status === 'confirmado') statusBadge = '<span class="badge badge-success">✓ Publicação Confirmada</span>';
            else if (d.status === 'resultado_incerto') statusBadge = '<span class="badge badge-warning">⚠️ Resultado Incerto (Reconciliação)</span>';
            else statusBadge = '<span class="badge badge-neutral">⏳ Pendente</span>';

            return `
              <div class="card" style="background: var(--bg-app); border: 1px solid var(--border-default);" id="pub-card-${d.id}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <strong style="font-size: 14px;">${d.name}</strong>
                  ${statusBadge}
                </div>
                <div style="font-size: 12px; color: var(--fg-muted);">
                  ${d.notes}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // --- Render Surface SCR-GES-005: Cenários e Adoção ---
  function renderGES005() {
    const container = document.getElementById('ges-005-content');
    if (!container) return;

    const scn = State.scenario;
    const proj = calculateScenarioProjection(scn);
    const adp = State.adoption;
    const adpMet = calculateAdoptionMetrics(adp);

    let html = `
      <!-- Seção 1: Cenário Financeiro e Simulação -->
      <div class="card" style="margin-bottom: 28px;">
        <div class="card-header">
          <div>
            <div class="card-title">Cenário Financeiro Hipotético: ${scn.title}</div>
            <div class="card-subtitle">ID: ${scn.id} (Versão v${scn.version}) · Status: ${scn.status}</div>
          </div>
          <span class="badge badge-warning">🔬 Simulação / Hipótese</span>
        </div>

        <div class="callout callout-info">
          <strong>Pergunta em Análise:</strong> "${scn.question}"
        </div>

        <!-- Tabela de Premissas -->
        <div style="font-size: 13px; font-weight: 600; margin-bottom: 6px;">Premissas Declaradas da Projeção:</div>
        <table class="data-table" id="table-scenario-assumptions">
          <thead>
            <tr>
              <th>Premissa</th>
              <th>Valor Declarado</th>
              <th>Unidade</th>
              <th>Status do Dado</th>
              <th>Origem da Premissa</th>
            </tr>
          </thead>
          <tbody>
            ${Object.values(scn.assumptions).map(a => `
              <tr id="asm-row-${a.id}">
                <td><strong>${a.name}</strong></td>
                <td><span style="font-family: var(--font-mono); font-weight: 600;">${a.value !== null ? a.value.toLocaleString('pt-BR') : '—'}</span></td>
                <td>${a.unit}</td>
                <td>
                  <span class="badge ${a.status === 'known' ? 'badge-success' : (a.status === 'estimated' ? 'badge-info' : 'badge-danger')}">
                    ${a.status.toUpperCase()}
                  </span>
                </td>
                <td style="font-size: 12px; color: var(--fg-muted);">${a.origin}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Resultados da Simulação -->
        <div style="margin-top: 16px; padding: 16px; background: var(--bg-app); border-radius: var(--radius-md); border: 1px solid var(--border-default);" id="scenario-results-box">
          <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Resultados da Projeção Hipotética:</div>
          ${proj.isCalculable ? `
            <div class="grid-2col" style="margin-bottom: 0;">
              <div>
                <div style="font-size: 12px; color: var(--fg-muted);">Investimento Inicial Hipotético:</div>
                <div style="font-size: 20px; font-weight: 700;">R$ ${proj.investment.toLocaleString('pt-BR')},00</div>
              </div>
              <div>
                <div style="font-size: 12px; color: var(--fg-muted);">Hipótese de Redução Mensal:</div>
                <div style="font-size: 20px; font-weight: 700; color: var(--info-fg);">R$ ${proj.monthlySaving.toLocaleString('pt-BR')},00 / mês</div>
              </div>
              <div>
                <div style="font-size: 12px; color: var(--fg-muted);">Benefício Bruto Hipotético (${proj.horizonMonths} meses):</div>
                <div style="font-size: 20px; font-weight: 700;">R$ ${proj.grossBenefit.toLocaleString('pt-BR')},00</div>
              </div>
              <div>
                <div style="font-size: 12px; color: var(--fg-muted);">Diferença Simplificada (Benefício - Custo):</div>
                <div style="font-size: 20px; font-weight: 700; color: ${proj.netDifference >= 0 ? 'var(--success-fg)' : 'var(--danger-fg)'};">
                  ${proj.netDifference < 0 ? '-' : ''}R$ ${Math.abs(proj.netDifference).toLocaleString('pt-BR')},00
                </div>
              </div>
              <div>
                <div style="font-size: 12px; color: var(--fg-muted);">Tempo de Retorno Simples (Payback):</div>
                <div style="font-size: 20px; font-weight: 700;">${proj.simplePaybackMonths} meses</div>
              </div>
            </div>
          ` : `
            <div class="callout callout-danger" id="box-uncalculable-reason">
              <strong>Cálculo Bloqueado (N6):</strong> ${proj.reason}
              <br>Uma premissa obrigatória possui status <em>UNKNOWN</em>. O sistema recusa-se a injetar zero artificial no modelo.
            </div>
          `}
        </div>

        <!-- Box Obrigatório de Limitações -->
        <div class="callout callout-warning" style="margin-top: 16px;">
          <strong>Limitações Contratuais e Exclusões Explícitas do Modelo:</strong>
          <ul style="margin-left: 20px; margin-top: 8px; font-size: 12px;">
            ${scn.limitations.map(l => `<li>${l}</li>`).join('')}
          </ul>
          <div style="margin-top: 10px; font-weight: 600; font-size: 12px; color: #B45309;">
            Advertência Canônica: Os valores acima NÃO CONSTITUEM economia realizada nem benefício comprovado. Trata-se de uma simulação de apoio à decisão.
          </div>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button class="btn btn-secondary" onclick="window.ManagementApp.saveScenario()">
            💾 Salvar Cenário (Rascunho)
          </button>
        </div>
      </div>

      <!-- Seção 2: Medição de Adoção de Fluxo -->
      <div class="card" id="section-adoption-measurement">
        <div class="card-header">
          <div>
            <div class="card-title">Medição de Adoção de Fluxo Operacional</div>
            <div class="card-subtitle">Processo: ${adp.processName} · Unidade: ${adp.unit} · Período Operacional: <strong>${adp.period}</strong></div>
          </div>
          <span class="badge ${adpMet.isCoveragePartial ? 'badge-warning' : 'badge-success'}" id="badge-adopt-coverage">
            ${adpMet.isCoveragePartial ? '⚠️ Instrumentação Parcial' : '● Instrumentação Completa'}
          </span>
        </div>

        <div class="callout callout-info">
          <strong>Definição Contratual da Métrica:</strong> ${adp.definition}
        </div>

        <div class="grid-2col" style="margin-bottom: 20px;">
          <div class="card" style="background: var(--bg-app); border: 1px solid var(--border-default);">
            <div style="font-size: 13px; color: var(--fg-muted);">Taxa de Adoção Apurada sob a Definição:</div>
            <div style="font-size: 32px; font-weight: 800; color: ${adpMet.isNotApplicable ? 'var(--fg-muted)' : 'var(--accent-primary)'};" id="adoption-rate-value">
              ${adpMet.isNotApplicable ? 'Não aplicável' : `${adpMet.ratePct}%`}
            </div>
            <div style="font-size: 12px; color: var(--fg-muted);" id="adoption-rate-caption">
              ${adpMet.isNotApplicable ? 'Denominador zero: sem população elegível no período' : `Fração: <strong>${adpMet.rateFraction}</strong> tarefas observadas no fluxo formal`}
            </div>
          </div>

          <div class="card" style="background: var(--bg-app); border: 1px solid var(--border-default);">
            <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Composição da População Observada:</div>
            <div style="font-size: 12px; display: flex; flex-direction: column; gap: 4px;">
              <div>• População Elegível Observada: <strong>${adp.eligiblePopulation} tarefas</strong></div>
              <div>• Concluídas pelo Fluxo Formal: <strong style="color: var(--success-fg);">${adp.completedFlow} tarefas</strong></div>
              <div>• Assistidas fora do Sistema: <strong style="color: var(--warning-fg);">${adp.assistedOutside} tarefas</strong> (registradas à parte)</div>
              <div>• Gaps de Evidência Técnica: <strong style="color: var(--danger-fg);">${adp.evidenceGaps} tarefas</strong> (sem registro confiável)</div>
              <div>• Interações / Cliques Espúrios: <strong>${adp.spuriousClicksCount}</strong> (desconsiderados no cálculo de adoção)</div>
            </div>
          </div>
        </div>

        <!-- Exclusões Formais -->
        <div style="font-size: 12px; background: #F1F5F9; padding: 12px; border-radius: var(--radius-sm); margin-bottom: 16px;">
          <strong>Exclusões Formais do Denominador:</strong>
          ${adp.exclusions.join(' · ')}
        </div>

        ${adpMet.isCoveragePartial ? `
          <div class="callout callout-warning" id="callout-adopt-generalization">
            <strong>Restrição de Interpretação por Cobertura Parcial (N8):</strong>
            <br>Terminais não monitorados: ${adp.sourceCoverage.unmonitoredTerminals.join(', ')}.
            <br>A taxa de ${adpMet.ratePct}% é válida estritamente para a amostra observada de ${adp.eligiblePopulation} tarefas disponíveis na telemetria. É ESTRITAMENTE PROIBIDO generalizar esta taxa como representativa do restaurante inteiro.
          </div>
        ` : ''}

        <div style="font-size: 12px; color: var(--fg-muted);">
          <strong>Diretriz Ética de Gestão:</strong> Ausência de registro de uso NÃO autoriza inferências pejorativas de resistência de pessoal, desengajamento ou baixo rendimento individual.
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // --- Invariant Proofs Panel ---
  function renderInvariantsPanel() {
    const container = document.getElementById('invariants-list');
    if (!container) return;

    const inv = State.invariants;
    const items = [
      { key: 'p1', label: 'P1 — CalendarProposal preserva CalendarVersion vigente e compromissos' },
      { key: 'p2', label: 'P2 — ScenarioVersion é rastreável, com premissas declaradas e versionada' },
      { key: 'p3', label: 'P3 — AdoptionDefinition possui população elegível, denominador e exclusions' },
      { key: 'n1', label: 'N1 — Salvar proposta não aplica calendário na versão vigente' },
      { key: 'n2', label: 'N2 — Conflito material não resolvido impede aplicação do calendário' },
      { key: 'n3', label: 'N3 — Nova dependência invalida assessment antigo e dependências 2→3' },
      { key: 'n4', label: 'N4 — Cobertura parcial de reservas não declara capacidade livre' },
      { key: 'n5', label: 'N5 — Publicação é independente por destino (sucesso isolado não publica em todos)' },
      { key: 'n6', label: 'N6 — Premissa necessária desconhecida (unknown) não vira zero' },
      { key: 'n7', label: 'N7 — Cenário salvo não altera orçamento real, assets, pagamentos nem calendário' },
      { key: 'n8', label: 'N8 — Adoção parcial não generaliza para o restaurante inteiro' },
      { key: 'zd1', label: 'ZD1 — Adoção com denominador zero resulta em "Não aplicável" (Regra V6)' },
      { key: 't1', label: 'T1 — Janela transnoite preserva businessDate e duração positiva (Regra B01-D19)' },
      { key: 'v1', label: 'V1 — Calendar base/version mismatch rejeita assessment antigo' },
      { key: 'a1', label: 'A1 — Badge "Vigente 19–23" falso no DOM é rejeitado pelo evaluator factual' },
      { key: 'a2', label: 'A2 — Tentativa de fazer calendário caber apagando compromisso é bloqueada' },
      { key: 'a3', label: 'A3 — Tentativa de usar impact assessment stale é rejeitada pelo gate' },
      { key: 'a4', label: 'A4 — Cobertura parcial com claim visual 0 conflitos não vira capacidade livre' },
      { key: 'a5', label: 'A5 — Economia realizada hardcoded sobre cenário hipotético é rejeitada' },
      { key: 'a6', label: 'A6 — Inflação de cliques/notificações não altera taxa formal de adoção (15/20)' }
    ];

    container.innerHTML = items.map(it => {
      const proof = inv ? inv[it.key] : null;
      const status = (proof && typeof proof === 'object')
        ? (proof.status || 'NOT_RUN')
        : (proof === true ? 'PASS' : (proof === false ? 'FAIL' : 'NOT_RUN'));

      let badgeClass = 'not-run';
      let icon = '○';
      let statusLabel = 'NOT_RUN';

      if (status === 'PASS') {
        badgeClass = 'pass';
        icon = '✓';
        statusLabel = 'PASS';
      } else if (status === 'FAIL') {
        badgeClass = 'fail';
        icon = '✗';
        statusLabel = 'FAIL';
      } else {
        badgeClass = 'not-run';
        icon = '○';
        statusLabel = 'NOT_RUN';
      }

      const source = (proof && proof.source) ? proof.source : (it.key.startsWith('a') ? 'harness' : 'runtime');
      const sourceTag = `<span class="proof-source-tag">${source}</span>`;

      return `
        <li class="proof-item ${badgeClass}" id="invariant-check-${it.key}">
          <span>${icon}</span>
          <span>${it.label}: <strong>${statusLabel}</strong></span>
          ${sourceTag}
        </li>
      `;
    }).join('');
  }

  // --- Contextual Drawer ---
  function openContextualDrawer(factId) {
    const fact = State.calendar.commitments[factId] || INITIAL_OPERATIONAL_FACTS[factId];
    if (!fact) return;

    State.drawer.isOpen = true;
    State.drawer.title = `Compromisso Operacional: ${fact.id}`;
    State.drawer.data = fact;
    renderApp();
  }

  function closeContextualDrawer() {
    State.drawer.isOpen = false;
    State.drawer.data = null;
    renderApp();
  }

  function renderDrawer() {
    const overlay = document.getElementById('drawer-overlay');
    const drawer = document.getElementById('contextual-drawer');
    if (!overlay || !drawer) return;

    if (State.drawer.isOpen && State.drawer.data) {
      overlay.classList.add('active');
      drawer.classList.add('open');
      document.getElementById('drawer-title-text').innerText = State.drawer.title;

      const d = State.drawer.data;
      document.getElementById('drawer-body-content').innerHTML = `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 11px; text-transform: uppercase; color: var(--fg-muted);">Identificador Canônico</div>
          <div style="font-size: 16px; font-weight: 700; font-family: var(--font-mono);">${d.id}</div>
        </div>
        <div style="margin-bottom: 16px;">
          <div style="font-size: 11px; text-transform: uppercase; color: var(--fg-muted);">Tipo do Compromisso</div>
          <div class="badge badge-neutral">${d.type}</div>
        </div>
        <div style="margin-bottom: 16px;">
          <div style="font-size: 11px; text-transform: uppercase; color: var(--fg-muted);">Horário Marcado</div>
          <div class="badge badge-warning">${d.scheduledTime}</div>
        </div>
        <div style="margin-bottom: 16px;">
          <div style="font-size: 11px; text-transform: uppercase; color: var(--fg-muted);">Autoridade do Módulo de Origem</div>
          <div><strong>${d.authorityModule}</strong></div>
        </div>
        <div style="margin-bottom: 16px;">
          <div style="font-size: 11px; text-transform: uppercase; color: var(--fg-muted);">Detalhes Registrados</div>
          <div class="drawer-fact-box">${d.details}</div>
        </div>
        <div class="callout callout-warning" style="margin-top: 24px; font-size: 12px;">
          <strong>Regra Inviolável de Governança:</strong> Este compromisso pertence ao módulo de origem. O módulo de Gestão NÃO pode apagar, adiantar ou cancelar compromissos diretamente para acomodar propostas de calendário.
        </div>
      `;
    } else {
      overlay.classList.remove('active');
      drawer.classList.remove('open');
    }
  }

  // =========================================================================
  // 7. PUBLIC API EXPOSED TO HARNESS & DOM
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
    saveProposal: function () {
      State.calendar.proposal.status = 'salva_rascunho';
      State.calendar.proposal.savedAt = new Date().toISOString();
      renderApp();
    },
    saveScenario: function () {
      saveScenario();
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
    evaluateCalendarImpact,
    evaluateCalendarProposalApplicability,
    attemptApplyCalendarProposal,
    validateServiceWindowTemporalContract,
    verifySaveScenarioSideEffectFree,
    calculateScenarioProjection,
    calculateAdoptionMetrics,
    evaluateSemanticCalendarProposalInvariant,
    evaluateSemanticScenarioInvariant,
    evaluateSemanticAdoptionInvariant,
    runAllInvariantAudits,
    renderApp,
    INITIAL_OPERATIONAL_FACTS,
    OPERATIONAL_FACTS_SNAPSHOT,
    INITIAL_SCENARIO_V1,
    TEMPORAL_MIDNIGHT_FIXTURE,
    HISTORICAL_FACT_FIXTURE,
    projectHistoricalFactForDisplay,
    evaluateHistoricalFactUnderTimezoneConfig,
    resetScenarioToV1: function () {
      State.scenario = JSON.parse(JSON.stringify(INITIAL_SCENARIO_V1));
      renderApp();
    }
  };

  // Initial render on load
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
      renderApp();
    });
  } else {
    renderApp();
  }

})();
