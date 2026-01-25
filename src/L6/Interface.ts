import { StateModel } from '../L2/State.js';
import type { Intent } from '../L2/State.js';
import { AuditLog } from '../L5/Audit.js';
import { verifySignature, signData, hash } from '../L0/Crypto.js';
import type { KeyPair, Ed25519PublicKey } from '../L0/Crypto.js';
import { GovernanceKernel } from '../Kernel.js';
import { Budget, BudgetType } from '../L0/Kernel.js';

export class GovernanceInterface {
    constructor(
        private kernel: GovernanceKernel,
        private state: StateModel,
        private log: AuditLog
    ) { }

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

    // The Single Door: All Writes must go through Kernel
    public submit(intent: Intent, options: { budgetLimit?: number } = {}) {
        const budget = new Budget(BudgetType.ENERGY, options.budgetLimit || 100);
        return this.kernel.execute(intent, budget);
    }
}

// --- VI.1 Consent Law ---
export class IntentBuilder {
    private principalId: string = '';
    private metricId: string = '';
    private value: any = null;
    private expiresAt: string = '0';
    private timestamp: string = '';

    // Context is crucial for Meaningful Consent
    private context: string = '';

    constructor() { }

    public withPrincipal(id: string): this { this.principalId = id; return this; }
    public withMetric(id: string): this { this.metricId = id; return this; }
    public withValue(val: any): this { this.value = val; return this; }

    // Binding the UI/Human Context to the Intent
    public withContext(uiLabel: string, workflowId: string): this {
        this.context = `${uiLabel}::${workflowId}`;
        return this;
    }

    public build(keyPair: KeyPair): Intent {
        if (!this.principalId || !this.metricId) throw new Error("Incomplete Intent");

        this.timestamp = `${Date.now()}:0`;
        const intentId = hash(`${this.principalId}:${this.metricId}:${this.timestamp}:${Math.random()}`);
        const payload = { metricId: this.metricId, value: this.value };

        // Consent Binding: The signature MUST cover the context if we support "Rich Intents" in future.
        // For MVP, we stick to the Kernel's rigid structure, but ideally 'context' would be part of payload metadata.
        const data = `${intentId}:${this.principalId}:${JSON.stringify(payload)}:${this.timestamp}:${this.expiresAt}`;
        const signature = signData(data, keyPair.privateKey);

        return {
            intentId,
            principalId: this.principalId,
            payload,
            timestamp: this.timestamp,
            expiresAt: this.expiresAt,
            signature
        };
    }
}

// --- VI.2 Emergency Law ---
export interface RootOverride {
    type: 'OVERRIDE';
    targetIntentId: string;
    justification: string;
    rootSignature: string;
}



