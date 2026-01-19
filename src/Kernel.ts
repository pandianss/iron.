import type { Intent, MetricPayload } from './L2/State.js';
import { StateModel, MetricRegistry } from './L2/State.js';
import { IdentityManager, DelegationEngine } from './L1/Identity.js';
import { ProtocolEngine } from './L4/Protocol.js';
import { AuditLog } from './L5/Audit.js';
import { SignatureGuard, ScopeGuard, TimeGuard, BudgetGuard } from './L0/Guards.js';
import { Budget } from './L0/Kernel.js';

export class GovernanceKernel {
    constructor(
        private identity: IdentityManager,
        private delegation: DelegationEngine,
        private state: StateModel,
        private protocols: ProtocolEngine,
        private audit: AuditLog,
        private registry: MetricRegistry
    ) { }

    // The Single Entry Point aka "receive(intent)"
    // Returns Result or Throws (Hard Failure)
    public execute(intent: Intent, budget?: Budget): boolean {
        // Step 1: Parse & Validate Signature
        const sigResult = SignatureGuard({ intent, manager: this.identity });
        if (!sigResult.ok) throw new Error(`Kernel Reject: ${sigResult.violation}`);

        // Step 2: Validate Identity & Scope
        const targetMetric = intent.payload.metricId;
        const scopeResult = ScopeGuard({
            actor: intent.principalId,
            resource: `L2:${targetMetric}:Write`,
            owner: 'admin', // System Root
            engine: this.delegation
        });
        if (!scopeResult.ok) throw new Error(`Kernel Reject: ${scopeResult.violation}`);

        // Step 3: Intent Invariants (Time)
        // Get last state for metric to compare time
        const history = this.state.getHistory(targetMetric);
        const lastTs = history.length > 0 ? history[history.length - 1]!.updatedAt : '0';

        const timeResult = TimeGuard({ currentTs: intent.timestamp, lastTs });
        if (!timeResult.ok) throw new Error(`Kernel Reject: ${timeResult.violation}`);

        // Step 5: Check Budget
        if (budget) {
            const cost = 1; // Deterministic Cost
            const budResult = BudgetGuard({ budget, cost });
            if (!budResult.ok) throw new Error(`Kernel Reject: ${budResult.violation}`);

            // Reserve/Consume
            budget.consume(cost);
        }

        // --- COMMIT POINT ---

        // Step 6: Log ATTEMPT
        this.audit.append(intent, 'ATTEMPT');

        try {
            // Step 7: Apply State Transition (TRUSTED)
            // We have validated guards, so we can bypass redundant checks in StateModel.
            this.state.applyTrusted(intent.payload, intent.timestamp, intent.principalId, intent.intentId);

            return true;

        } catch (e: any) {
            // Logged as FAILURE in state.apply logic or here?
            // StateModel.applyTrusted will log success. If it fails (e.g. validator), it throws.
            throw new Error(`Kernel Halt: State Transition Failed: ${e.message}`);
        }
    }
}

