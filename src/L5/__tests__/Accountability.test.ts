
import { AuditLedger, DeterministicTime, Principal } from '../../L0/Kernel';
import { MetricRegistry, MetricType, StateModel, EvidenceGenerator } from '../../L1/Truth';
import { AccountabilityEngine, SLA } from '../../L5/Accountability';
import { ChaosEngine } from '../../Chaos/Engine';
import { Action } from '../../L3/Simulation';

describe('L5 Accountability & Chaos', () => {
    let ledger: AuditLedger;
    let time: DeterministicTime;
    let registry: MetricRegistry;
    let state: StateModel;
    let accEngine: AccountabilityEngine;
    let chaosEngine: ChaosEngine;
    const admin: Principal = { id: 'admin', publicKey: 'key' };

    beforeEach(() => {
        ledger = new AuditLedger();
        time = new DeterministicTime();
        registry = new MetricRegistry();
        state = new StateModel(ledger, registry);

        registry.register({ id: 'uptime', description: 'Uptime %', type: MetricType.GAUGE });
        registry.register({ id: 'system.rewards', description: 'Tokens', type: MetricType.GAUGE });
        registry.register({ id: 'system.load', description: 'Load', type: MetricType.GAUGE });

        accEngine = new AccountabilityEngine(state);
        chaosEngine = new ChaosEngine(state, 50); // Budget 50
    });

    describe('Accountability', () => {
        test('should payout incentive when SLA met', () => {
            const sla: SLA = {
                id: 'sla-UP', metricId: 'uptime', min: 99,
                windowTicks: 1, incentiveAmount: 10, penaltyAmount: 5
            };
            accEngine.registerSLA(sla);

            // Set state checks out
            state.apply(EvidenceGenerator.create('uptime', 100, admin, time.getNow()));

            accEngine.evaluate(admin, time.getNow());

            expect(state.get('system.rewards')).toBe(10);
        });

        test('should penalize when SLA breached', () => {
            const sla: SLA = {
                id: 'sla-UP', metricId: 'uptime', min: 99,
                windowTicks: 1, incentiveAmount: 10, penaltyAmount: 5
            };
            accEngine.registerSLA(sla);

            // Set state fails
            state.apply(EvidenceGenerator.create('uptime', 90, admin, time.getNow()));

            accEngine.evaluate(admin, time.getNow());

            expect(state.get('system.rewards')).toBe(-5);
        });
    });

    describe('Chaos', () => {
        test('should execute chaos if within budget', () => {
            const action: Action = { id: 'lat', description: 'Latency', targetMetricId: 'system.load', valueMutation: 10 };
            // Use 90% load is unstable. Set 50.
            state.apply(EvidenceGenerator.create('system.load', 50, admin, time.getNow()));

            const ran = chaosEngine.scheduleInjection(action, 10, admin, time.getNow());

            expect(ran).toBe(true);
            expect(state.get('system.load')).toBe(60); // 50 + 10
        });

        test('should abort chaos if budget exceeded', () => {
            const action: Action = { id: 'lat', description: 'Latency', targetMetricId: 'system.load', valueMutation: 10 };
            state.apply(EvidenceGenerator.create('system.load', 50, admin, time.getNow()));

            // Budget is 50. Request 60.
            const ran = chaosEngine.scheduleInjection(action, 60, admin, time.getNow());

            expect(ran).toBe(false);
            expect(state.get('system.load')).toBe(50); // Unchanged
        });

        test('should abort chaos if system unstable', () => {
            const action: Action = { id: 'lat', description: 'Latency', targetMetricId: 'system.load', valueMutation: 10 };
            // Load 95 -> Unstable (>90)
            state.apply(EvidenceGenerator.create('system.load', 95, admin, time.getNow()));

            const ran = chaosEngine.scheduleInjection(action, 10, admin, time.getNow());

            expect(ran).toBe(false);
        });
    });
});
