import { DeterministicTime } from '../../L0/Kernel.js';
import { IdentityManager } from '../../L1/Identity.js';
import type { Principal } from '../../L1/Identity.js';
import { MetricRegistry, MetricType, StateModel } from '../../L2/State.js';
import { AccountabilityEngine } from '../../L5/Accountability.js';
import type { SLA } from '../../L5/Accountability.js';
import { ChaosEngine } from '../../Chaos/Engine.js';
import type { Action } from '../../L3/Simulation.js';
import { AuditLog } from '../../L5/Audit.js';

describe('L5 Accountability & Chaos', () => {
    let time: DeterministicTime;
    let registry: MetricRegistry;
    let audit: AuditLog;
    let identity: IdentityManager;
    let state: StateModel;
    let accEngine: AccountabilityEngine;
    let chaosEngine: ChaosEngine;
    const admin: Principal = { id: 'admin', publicKey: 'key', type: 'INDIVIDUAL', validFrom: 0, validUntil: 999999 };

    beforeEach(() => {
        time = new DeterministicTime();
        registry = new MetricRegistry();
        audit = new AuditLog();
        identity = new IdentityManager();
        identity.register(admin);
        state = new StateModel(audit, registry, identity);

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
            state.applyTrusted({ metricId: 'uptime', value: 100 }, time.getNow().toString(), admin.id);

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
            state.applyTrusted({ metricId: 'uptime', value: 90 }, time.getNow().toString(), admin.id);

            accEngine.evaluate(admin, time.getNow());

            expect(state.get('system.rewards')).toBe(-5);
        });
    });

    describe('Chaos', () => {
        test('should execute chaos if within budget', () => {
            const action: Action = { id: 'lat', description: 'Latency', targetMetricId: 'system.load', valueMutation: 10 };

            state.applyTrusted({ metricId: 'system.load', value: 50 }, time.getNow().toString(), admin.id);

            const ran = chaosEngine.scheduleInjection(action, 10, admin, time.getNow());

            expect(ran).toBe(true);
            expect(state.get('system.load')).toBe(60); // 50 + 10
        });

        test('should abort chaos if budget exceeded', () => {
            const action: Action = { id: 'lat', description: 'Latency', targetMetricId: 'system.load', valueMutation: 10 };
            state.applyTrusted({ metricId: 'system.load', value: 50 }, time.getNow().toString(), admin.id);

            // Budget is 50. Request 60.
            const ran = chaosEngine.scheduleInjection(action, 60, admin, time.getNow());

            expect(ran).toBe(false);
            expect(state.get('system.load')).toBe(50); // Unchanged
        });

        test('should abort chaos if system unstable', () => {
            const action: Action = { id: 'lat', description: 'Latency', targetMetricId: 'system.load', valueMutation: 10 };
            // Load 95 -> Unstable (>90)
            state.applyTrusted({ metricId: 'system.load', value: 95 }, time.getNow().toString(), admin.id);

            const ran = chaosEngine.scheduleInjection(action, 10, admin, time.getNow());

            expect(ran).toBe(false);
        });
    });
});

