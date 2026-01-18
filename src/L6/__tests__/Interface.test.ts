
import { AuditLedger, DeterministicTime, Principal } from '../../L0/Kernel';
import { MetricRegistry, MetricType, StateModel, EvidenceGenerator } from '../../L1/Truth';
import { GovernanceInterface, AttestationAPI, FederationBridge } from '../../L6/Interface';

describe('L6 Interfaces & Federation', () => {
    let ledger: AuditLedger;
    let time: DeterministicTime;
    let registry: MetricRegistry;
    let state: StateModel;
    let govInterface: GovernanceInterface;
    let attestationApi: AttestationAPI;
    let bridge: FederationBridge;
    const admin: Principal = { id: 'admin', publicKey: 'key' };

    beforeEach(() => {
        ledger = new AuditLedger();
        time = new DeterministicTime();
        registry = new MetricRegistry();
        state = new StateModel(ledger, registry);

        registry.register({ id: 'score', description: 'Score', type: MetricType.GAUGE });
        govInterface = new GovernanceInterface(state, ledger);
        attestationApi = new AttestationAPI(ledger);
        bridge = new FederationBridge(state);
    });

    test('Governance Interface: Should retrieve audit trail', () => {
        state.apply(EvidenceGenerator.create('score', 10, admin, time.getNow()));
        state.apply(EvidenceGenerator.create('score', 20, admin, time.getNow()));

        const trail = govInterface.getAuditTrail('score');
        expect(trail.length).toBe(2);
        expect(trail[0].value).toBe(10);
        expect(trail[1].value).toBe(20);
        expect(trail[0].proof).toBeDefined();
    });

    test('Attestation API: Should generate proof', () => {
        const evidence = EvidenceGenerator.create('score', 100, admin, time.getNow());
        state.apply(evidence);

        const proof = attestationApi.generateAttestation(evidence);
        expect(proof.value).toBe(100);
        expect(proof.ledgerHash).toBeDefined();
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
    });
});
