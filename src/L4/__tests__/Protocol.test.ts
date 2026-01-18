
import { AuditLedger, DeterministicTime, Principal } from '../../L0/Kernel';
import { MetricRegistry, MetricType, StateModel, EvidenceGenerator } from '../../L1/Truth';
import { ProtocolEngine, Protocol, Condition } from '../../L4/Protocol';
import { Action } from '../../L3/Simulation';

describe('L4 Protocol System', () => {
    let ledger: AuditLedger;
    let time: DeterministicTime;
    let registry: MetricRegistry;
    let state: StateModel;
    let engine: ProtocolEngine;
    const admin: Principal = { id: 'admin', publicKey: 'key' };

    beforeEach(() => {
        ledger = new AuditLedger();
        time = new DeterministicTime();
        registry = new MetricRegistry();
        state = new StateModel(ledger, registry);

        registry.register({
            id: 'temp',
            description: 'Temperature',
            type: MetricType.GAUGE
        });
        registry.register({
            id: 'fan',
            description: 'Fan Speed',
            type: MetricType.GAUGE
        });

        engine = new ProtocolEngine(state);
    });

    test('should trigger protocol when condition met', () => {
        // Rule: If Temp > 30, Increase Fan by 10
        const coolingProtocol: Protocol = {
            id: 'p-cool',
            name: 'Cooling Logic',
            trigger: {
                metricId: 'temp',
                operator: '>',
                value: 30
            },
            response: {
                id: 'act-fan-up',
                description: 'Boost Fan',
                targetMetricId: 'fan',
                valueMutation: 10
            }
        };

        engine.register(coolingProtocol);

        // Case 1: Temp = 20 (No Trigger)
        state.apply(EvidenceGenerator.create('temp', 20, admin, time.getNow()));
        state.apply(EvidenceGenerator.create('fan', 0, admin, time.getNow()));

        let actions = engine.evaluate();
        expect(actions.length).toBe(0);

        // Case 2: Temp = 35 (Trigger)
        state.apply(EvidenceGenerator.create('temp', 35, admin, time.getNow()));

        actions = engine.evaluate();
        expect(actions.length).toBe(1);
        expect(actions[0].id).toBe('act-fan-up');
    });

    test('should execute triggered actions', () => {
        const coolingProtocol: Protocol = {
            id: 'p-cool',
            name: 'Cooling',
            trigger: { metricId: 'temp', operator: '>', value: 30 },
            response: { id: 'fan-up', description: '', targetMetricId: 'fan', valueMutation: 50 }
        };
        engine.register(coolingProtocol);

        // Setup
        state.apply(EvidenceGenerator.create('temp', 40, admin, time.getNow()));
        state.apply(EvidenceGenerator.create('fan', 10, admin, time.getNow()));

        // Evaluate & Execute
        const actions = engine.evaluate();
        engine.execute(actions, admin, time.getNow());

        // Check Effect: Fan should be 10 + 50 = 60
        expect(state.get('fan')).toBe(60);
    });
});
