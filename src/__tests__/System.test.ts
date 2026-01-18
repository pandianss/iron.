
import { DeterministicTime, Budget, BudgetType } from '../L0/Kernel';
import { generateKeyPair, KeyPair } from '../L0/Crypto';
import { IdentityManager, Principal, DelegationEngine, Delegation } from '../L1/Identity';
import { StateModel, MetricRegistry, MetricType } from '../L2/State';
import { IntentFactory } from '../L2/IntentFactory';
import { SimulationEngine } from '../L3/Sim';
import { ProtocolEngine } from '../L4/Protocol';
import { AuditLog } from '../L5/Audit';
import { GovernanceInterface } from '../L6/Interface';
import { GovernanceKernel } from '../Kernel';
import { Fuzzer } from '../Chaos/Fuzzer';

describe('Iron. Operationalization (Kernel & Guards)', () => {
    // Core
    let time: DeterministicTime;
    let identity: IdentityManager;
    let delegation: DelegationEngine;
    let auditLog: AuditLog;
    let registry: MetricRegistry;
    let state: StateModel;
    let protocol: ProtocolEngine;
    let kernel: GovernanceKernel;

    // Identities
    let adminKeys: KeyPair;
    let admin: Principal;

    beforeEach(() => {
        time = new DeterministicTime();
        adminKeys = generateKeyPair();
        admin = { id: 'admin', publicKey: adminKeys.publicKey, type: 'INDIVIDUAL', validFrom: 0, validUntil: 9999999, rules: ['*'] };

        identity = new IdentityManager();
        identity.register(admin);
        delegation = new DelegationEngine(identity);
        auditLog = new AuditLog();
        registry = new MetricRegistry();
        state = new StateModel(auditLog, registry, identity);

        registry.register({ id: 'load', description: '', type: MetricType.GAUGE });
        registry.register({ id: 'fan', description: '', type: MetricType.GAUGE });

        protocol = new ProtocolEngine(state);

        // Kernel Setup
        kernel = new GovernanceKernel(identity, delegation, state, protocol, auditLog, registry);
    });

    test('Atomic Execution Flow: Attempt -> Guard -> Execute -> Outcome', () => {
        const intent = IntentFactory.create('load', 50, admin.id, adminKeys.privateKey);

        const success = kernel.execute(intent);
        expect(success).toBe(true);

        // Verify L5 Log: Should have ATTEMPT and SUCCESS (from State)
        const history = auditLog.getHistory();
        expect(history.length).toBeGreaterThanOrEqual(2);
        expect(history[0].status).toBe('ATTEMPT');
        expect(history[1].status).toBe('SUCCESS');

        // Verify State
        expect(state.get('load')).toBe(50);
    });

    test('Guard Rejection: Invalid Signature', () => {
        const intent = IntentFactory.create('load', 50, admin.id, adminKeys.privateKey);
        intent.signature = 'bad';

        expect(() => kernel.execute(intent)).toThrow(/Kernel Reject: Invalid Signature/);

        // Verify no ATTEMPT logged for basic Guard rejection (filtered at gate)
        // Or strictly filtered? 12-Step says "Log ATTEMPT" is Step 5 or 8.
        // My Kernel Impl logs ATTEMPT at Step 6, AFTER Guards.
        // So no log expected.
        expect(auditLog.getHistory().length).toBe(0);
    });

    test('Guard Rejection: Scope Violation', () => {
        const userKeys = generateKeyPair();
        const user = { id: 'user', publicKey: userKeys.publicKey, type: 'INDIVIDUAL' as 'INDIVIDUAL', validFrom: 0, validUntil: 999 };
        identity.register(user);

        // User has no delegation
        const intent = IntentFactory.create('load', 50, user.id, userKeys.privateKey);

        expect(() => kernel.execute(intent)).toThrow(/Scope Violation/);
    });

    test('Chaos Fuzzer Run', async () => {
        const fuzzer = new Fuzzer(kernel, identity);
        await fuzzer.run(10);
        // Just ensuring it doesn't crash the test runner.
        // Assertions are inside Fuzzer matchers.
    });
});
