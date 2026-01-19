import { DeterministicTime } from '../../L0/Kernel.js';
import { IdentityManager } from '../../L1/Identity.js';
import type { Principal } from '../../L1/Identity.js';
import { MetricRegistry, MetricType, StateModel } from '../../L2/State.js';
import { SimulationEngine, HybridStrategyEngine } from '../../L3/Simulation.js';
import type { Action } from '../../L3/Simulation.js';
import { AuditLog } from '../../L5/Audit.js';
import { ProtocolEngine } from '../../L4/Protocol.js';

describe('L3 Action & Simulation', () => {
    let audit: AuditLog;
    let time: DeterministicTime;
    let registry: MetricRegistry;
    let identity: IdentityManager;
    let state: StateModel;
    let protocols: ProtocolEngine;
    let simEngine: SimulationEngine;
    const admin: Principal = { id: 'admin', publicKey: 'key', type: 'INDIVIDUAL', validFrom: 0, validUntil: 999999999 };

    beforeEach(() => {
        audit = new AuditLog();
        time = new DeterministicTime();
        registry = new MetricRegistry();
        identity = new IdentityManager();
        identity.register(admin);
        state = new StateModel(audit, registry, identity);
        protocols = new ProtocolEngine(state);

        registry.register({
            id: 'system.load',
            description: 'System Load Average',
            type: MetricType.GAUGE
        });

        simEngine = new SimulationEngine(registry, protocols);
    });

    test('Simulation Equivalence: No action should match baseline', () => {
        // Seed state
        state.applyTrusted({ metricId: 'system.load', value: 10 }, time.getNow().toString(), admin.id);
        state.applyTrusted({ metricId: 'system.load', value: 20 }, time.getNow().toString(), admin.id);

        // Run Sim with null action
        const forecast = simEngine.run(state, null, 1);

        // Manual forecast (same as L2 test) -> 30
        expect(forecast?.predictedValue).toBeCloseTo(30);
    });

    test('Impact Proving: Action should alter forecast', () => {
        // Seed state: 10, 20. Trend is +10/tick. Next is 30.
        state.applyTrusted({ metricId: 'system.load', value: 10 }, time.getNow().toString(), admin.id);
        state.applyTrusted({ metricId: 'system.load', value: 20 }, time.getNow().toString(), admin.id);

        // Action: Reduce load by 5 (immediately)
        // Effectively, the simulation sees: 10, 20, (20-5=15).
        // New History: 10, 20, 15.
        // Points: (0,10), (1,20), (2,15).
        // Regression on these 3 points.
        // x: 0, 1, 2
        // y: 10, 20, 15
        // Trend will be flattened significantly.

        const action: Action = {
            id: 'cool-down',
            description: 'Reduce load',
            targetMetricId: 'system.load',
            valueMutation: -5
        };

        const forecast = simEngine.run(state, action, 1);

        // Without action, next is 30.
        // With action (15 at t=2), next (t=3) will be...
        // 10->20 is +10. 20->15 is -5.
        // Avg slope is smaller.
        // Visual: 10...20...15. Downward hook.
        // Prediction should be < 30.

        expect(forecast?.predictedValue).toBeLessThan(30);
    });

    test('Hybrid Strategy: Compare Baseline vs Sim', () => {
        state.applyTrusted({ metricId: 'system.load', value: 10 }, time.getNow().toString(), admin.id);
        state.applyTrusted({ metricId: 'system.load', value: 20 }, time.getNow().toString(), admin.id);

        const strategy = new HybridStrategyEngine(simEngine);
        const action: Action = {
            id: 'boost',
            description: 'Boost',
            targetMetricId: 'system.load',
            valueMutation: 10
        };
        // 10, 20 -> 30 (Baseline)
        // 10, 20 -> (20+10=30) -> 10, 20, 30 linear.
        // Next (t=3) -> 40.

        const result = strategy.compare(state, action, 1);

        expect(result.baseline?.predictedValue).toBeCloseTo(30);
        expect(result.simulated?.predictedValue).toBeCloseTo(40);
        expect(result.delta).toBeCloseTo(10);
    });
});
