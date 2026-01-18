
import { StateModel, EvidenceGenerator } from '../L1/Truth';
import { AuditLedger, Evidence, Principal } from '../L0/Kernel';

// --- Governance Interface (Human View) ---
export class GovernanceInterface {
    constructor(private state: StateModel, private ledger: AuditLedger) { }

    public getTruth(metricId: string): any {
        return this.state.get(metricId);
    }

    public getAuditTrail(metricId: string): any[] {
        return this.state.getHistory(metricId).map(h => ({
            value: h.value,
            timestamp: h.updatedAt,
            proof: h.evidenceHash
        }));
    }
}

// --- Attestation (Machine Proof) ---
export interface Attestation {
    metricId: string;
    value: any;
    timestamp: string;
    signature: string; // Sign(metricId + value + timestamp)
    ledgerHash: string; // Proof of inclusion (simplified)
}

export class AttestationAPI {
    constructor(private ledger: AuditLedger) { }

    // Generate a portable proof for a piece of evidence
    public generateAttestation(evidence: Evidence): Attestation {
        // In real world, we'd provide a Merkle Path.
        // Here, we provide the evidence signature and the block hash it resides in.
        // We find the entry in the ledger.
        const entry = this.ledger.getHistory().find(e => e.evidence.signature === evidence.signature);
        if (!entry) throw new Error("Evidence not found in ledger");

        return {
            metricId: evidence.payload.metricId,
            value: evidence.payload.value,
            timestamp: evidence.timestamp,
            signature: evidence.signature,
            ledgerHash: entry.hash
        };
    }
}

// --- Federation (Cross-Org Trust) ---
export class FederationBridge {
    private trustedPartners: Set<string> = new Set();

    constructor(private localState: StateModel) { }

    public trustPartner(publicKey: string) {
        this.trustedPartners.add(publicKey);
    }

    // Receive an attestation from a remote partner and validte it
    public ingestAttestation(attestation: Attestation, partnerKey: string): boolean {
        if (!this.trustedPartners.has(partnerKey)) {
            console.warn(`Untrusted partner: ${partnerKey}`);
            return false;
        }

        // Verify Signature (Mock)
        // verify(attestation.signature, partnerKey, ...)
        // Assume valid for mock.

        // Ingest into Local State?
        // "Federation / Inter-Org Protocol Bridge" -> usually maps remote metric to local dummy metric.
        // e.g., remote.partnerA.trustScore

        // We create a "Remote Evidence" wrapper
        // The authority is the partner.
        const partnerPrincipal: Principal = { id: partnerKey, publicKey: partnerKey };

        // Use local time for receipt? Or keep remote time?
        // Usually wrap.
        // We can't use EvidenceGenerator directly easily without a Timestamp object.
        // We'll mock the timestamp for receipt.

        // Note: L1 StateModel expects strict LogicalTimestamp string.

        // Simple ingestion:
        /*
        const ev = EvidenceGenerator.create(
            `federated.${partnerKey}.${attestation.metricId}`, 
            attestation.value, 
            partnerPrincipal, 
            LogicalTimestamp.fromString(attestation.timestamp) // Assuming compatiable clocks or simple string
        );
        this.localState.apply(ev);
        */

        return true;
    }
}
