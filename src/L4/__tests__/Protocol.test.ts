import { DeterministicTime } from '../../L0/Kernel.js';
import { IdentityManager } from '../../L1/Identity.js';
import type { Principal } from '../../L1/Identity.js';
import { MetricRegistry, MetricType, StateModel } from '../../L2/State.js';
import { ProtocolEngine } from '../../L4/Protocol.js';
import type { Protocol } from '../../L4/Protocol.js';
import { AuditLog } from '../../L5/Audit.js';
import { generateKeyPair } from '../../L0/Crypto.js';

describe('L4 Protocol System', () => {
    let audit: AuditLog;
    let time: DeterministicTime;
    let registry: MetricRegistry;
    let identity: IdentityManager;
    let state: StateModel;
    let engine: ProtocolEngine;
    const adminKeys = generateKeyPair();
    const admin: Principal = { id: 'admin', publicKey: adminKeys.publicKey, type: 'INDIVIDUAL', validFrom: 0, validUntil: 999999999 };

    beforeEach(() => {
        audit = new AuditLog();
        time = new DeterministicTime();
        registry = new MetricRegistry();
        identity = new IdentityManager();
        identity.register(admin);
        state = new StateModel(audit, registry, identity);

        registry.register({ id: 'temp', description: 'Temperature', type: MetricType.GAUGE });
        registry.register({ id: 'fan', description: 'Fan Speed', type: MetricType.GAUGE });

        engine = new ProtocolEngine(state);
    });

    test('should trigger protocol when condition met', () => {
        const coolingProtocol: Protocol = {
            id: 'p-cool',
            name: 'Cooling Logic',
            category: 'Intent',
            preconditions: [{
                type: 'METRIC_THRESHOLD',
                metricId: 'temp',
                operator: '>',
                value: 30
            }],
            execution: [{
                type: 'MUTATE_METRIC',
                metricId: 'fan',
                mutation: 10
            }]
        };

        engine.register(coolingProtocol);

        // Case 1: Temp = 20 (No Trigger)
        state.applyTrusted({ metricId: 'temp', value: 20 }, time.getNow().toString(), admin.id);
        state.applyTrusted({ metricId: 'fan', value: 0 }, time.getNow().toString(), admin.id);

        engine.evaluateAndExecute(admin.id, adminKeys.privateKey, time.getNow());
        expect(state.get('fan')).toBe(0);

        // Case 2: Temp = 35 (Trigger)
        state.applyTrusted({ metricId: 'temp', value: 35 }, time.getNow().toString(), admin.id);

        engine.evaluateAndExecute(admin.id, adminKeys.privateKey, time.getNow());
        expect(state.get('fan')).toBe(10);
    });

    test('should execute multiple rules', () => {
        const coolingProtocol: Protocol = {
            id: 'p-cool',
            name: 'Cooling',
            category: 'Intent',
            preconditions: [{ type: 'METRIC_THRESHOLD', metricId: 'temp', operator: '>', value: 30 }],
            execution: [
                { type: 'MUTATE_METRIC', metricId: 'fan', mutation: 50 },
                { type: 'MUTATE_METRIC', metricId: 'temp', mutation: -5 }
            ]
        };
        engine.register(coolingProtocol);

        state.applyTrusted({ metricId: 'temp', value: 40 }, time.getNow().toString(), admin.id);
        state.applyTrusted({ metricId: 'fan', value: 10 }, time.getNow().toString(), admin.id);

        engine.evaluateAndExecute(admin.id, adminKeys.privateKey, time.getNow());

        expect(state.get('fan')).toBe(60);
        expect(state.get('temp')).toBe(35);
    });
});
