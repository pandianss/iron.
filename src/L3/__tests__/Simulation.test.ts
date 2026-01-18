
import { AuditLedger, DeterministicTime, Principal } from '../../L0/Kernel';
import { MetricRegistry, MetricType, StateModel, EvidenceGenerator } from '../../L1/Truth';
import { SimulationEngine, HybridStrategyEngine, Action } from '../../L3/Simulation';

describe('L3 Action & Simulation', () => {
    let ledger: AuditLedger;
    let time: DeterministicTime;
    let registry: MetricRegistry;
    let state: StateModel;
    let simEngine: SimulationEngine;
    const admin: Principal = { id: 'admin', publicKey: 'key' };

    beforeEach(() => {
        ledger = new AuditLedger();
        time = new DeterministicTime();
        registry = new MetricRegistry();
        state = new StateModel(ledger, registry);

        registry.register({
            id: 'system.load',
            description: 'System Load Average',
            type: MetricType.GAUGE
        });

        simEngine = new SimulationEngine(registry);
    });

    test('Simulation Equivalence: No action should match baseline', () => {
        // Seed state
        state.apply(EvidenceGenerator.create('system.load', 10, admin, time.getNow()));
        state.apply(EvidenceGenerator.create('system.load', 20, admin, time.getNow()));

        // Run Sim with null action
        const forecast = simEngine.run(state, null, 1);

        // Manual forecast (same as L2 test) -> 30
        expect(forecast?.predictedValue).toBeCloseTo(30);
    });

    test('Impact Proving: Action should alter forecast', () => {
        // Seed state: 10, 20. Trend is +10/tick. Next is 30.
        state.apply(EvidenceGenerator.create('system.load', 10, admin, time.getNow()));
        state.apply(EvidenceGenerator.create('system.load', 20, admin, time.getNow()));

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
        state.apply(EvidenceGenerator.create('system.load', 10, admin, time.getNow()));
        state.apply(EvidenceGenerator.create('system.load', 20, admin, time.getNow()));

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
