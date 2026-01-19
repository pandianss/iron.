import { DeterministicTime } from '../../L0/Kernel.js';
import { IdentityManager } from '../../L1/Identity.js';
import type { Principal } from '../../L1/Identity.js';
import { MetricRegistry, MetricType, StateModel } from '../../L2/State.js';
import { GovernanceInterface, AttestationAPI, FederationBridge } from '../../L6/Interface.js';
import { AuditLog } from '../../L5/Audit.js';

describe('L6 Interfaces & Federation', () => {
    let audit: AuditLog;
    let time: DeterministicTime;
    let registry: MetricRegistry;
    let identity: IdentityManager;
    let state: StateModel;
    let govInterface: GovernanceInterface;
    let attestationApi: AttestationAPI;
    let bridge: FederationBridge;
    const admin: Principal = { id: 'admin', publicKey: 'key', type: 'INDIVIDUAL', validFrom: 0, validUntil: 999999999 };

    beforeEach(() => {
        audit = new AuditLog();
        time = new DeterministicTime();
        registry = new MetricRegistry();
        identity = new IdentityManager();
        identity.register(admin);
        state = new StateModel(audit, registry, identity);

        registry.register({ id: 'score', description: 'Score', type: MetricType.GAUGE });
        govInterface = new GovernanceInterface(state, audit);
        attestationApi = new AttestationAPI(audit);
        bridge = new FederationBridge(state);
    });

    test('Governance Interface: Should retrieve audit trail', () => {
        state.applyTrusted({ metricId: 'score', value: 10 }, time.getNow().toString(), admin.id);
        state.applyTrusted({ metricId: 'score', value: 20 }, time.getNow().toString(), admin.id);

        const trail = govInterface.getAuditTrail('score');
        expect(trail.length).toBe(2);
        expect(trail[0]!.value).toBe(10);
        expect(trail[1]!.value).toBe(20);
        expect(trail[0]!.proof).toBeDefined();
    });

    test('Attestation API: Should generate proof', () => {
        const intent = state.applyTrusted({ metricId: 'score', value: 100 }, time.getNow().toString(), admin.id);

        const proof = attestationApi.generateAttestation(intent);
        expect(proof.value).toBe(100);
        expect(proof.ledgerHash).toBeDefined();
        expect(proof.ledgerHash).not.toBe('unknown');
    });

    test('Federation: Should reject untrusted partners', () => {
        const proof = { metricId: 'score', value: 50, timestamp: '0:0', signature: 'sig', ledgerHash: 'hash' };
        const accepted = bridge.ingestAttestation(proof, 'unknown-partner');
        expect(accepted).toBe(false);
    });

    test('Federation: Should accept trusted partners', () => {
        bridge.trustPartner('partner-A');
        const proof = { metricId: 'score', value: 50, timestamp: '0:0', signature: 'sig', ledgerHash: 'hash' };
        const accepted = bridge.ingestAttestation(proof, 'partner-A');
        expect(accepted).toBe(true);
        expect(state.get('score')).toBe(50);
    });
});
