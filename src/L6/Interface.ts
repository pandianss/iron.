import { StateModel } from '../L2/State.js';
import type { Intent } from '../L2/State.js';
import { AuditLog } from '../L5/Audit.js';

export class GovernanceInterface {
    constructor(private state: StateModel, private log: AuditLog) { }

    public getTruth(id: string) { return this.state.get(id); }

    public getAuditTrail(id: string) {
        return this.log.getHistory()
            .filter(e => e.intent.payload.metricId === id)
            .map(e => ({
                value: e.intent.payload.value,
                timestamp: e.intent.timestamp,
                proof: e.hash
            }));
    }
}

export class AttestationAPI {
    constructor(private log: AuditLog) { }

    public generateAttestation(intent: Intent) {
        const history = this.log.getHistory();
        const entry = history.find(e => e.intent.intentId === intent.intentId);

        return {
            metricId: intent.payload.metricId,
            value: intent.payload.value,
            timestamp: intent.timestamp,
            signature: intent.signature,
            ledgerHash: entry ? entry.hash : 'unknown'
        };
    }
}

export class FederationBridge {
    private trustedPartners: Set<string> = new Set();

    constructor(private state: StateModel) { }

    public trustPartner(partner: string) {
        this.trustedPartners.add(partner);
    }

    public ingestAttestation(proof: any, partner: string): boolean {
        if (!this.trustedPartners.has(partner)) return false;

        // In a real bridge, we would verify the ledgerHash and signature here.
        // For this implementation, we'll just apply it to the state.
        this.state.applyTrusted(
            { metricId: proof.metricId, value: proof.value },
            proof.timestamp,
            `federated:${partner}`
        );
        return true;
    }
}
