
// src/Kernel.ts
import { Intent, StateModel, MetricRegistry, MetricPayload } from './L2/State';
import { IdentityManager, DelegationEngine } from './L1/Identity';
import { ProtocolEngine } from './L4/Protocol';
import { AuditLog } from './L5/Audit';
import { SignatureGuard, ScopeGuard, TimeGuard, BudgetGuard, ConflictGuard } from './L0/Guards';
import { Budget } from './L0/Kernel';

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
        // For simple State writes, resource = metricId, owner = ? (System or Self?)
        // Assuming Metric Write requires owning the metric or delegation.
        // For MVP, if actor == payload.principalId (which is signed), check minimal scope?
        // Let's assume standard write requires 'L2:Metric:Write'.
        const targetMetric = intent.payload.metricId;
        // In this model, who owns the metric? The System? 
        // Let's say Admin owns structure, Actor owns their data? 
        // Or assume System Scope. 
        // For now, let's verify actor has rights to act on targetMetric.
        const scopeResult = ScopeGuard({
            actor: intent.principalId,
            resource: `L2:${targetMetric}:Write`,
            owner: 'admin', // System Root
            engine: this.delegation
        });
        // Skip scope check for Admin (circular) or handle in ScopeGuard?
        // ScopeGuard already handles "isAuthorized". 
        // If admin is root, self-check passes.
        if (!scopeResult.ok) throw new Error(`Kernel Reject: ${scopeResult.violation}`);

        // Step 3: Intent Invariants (Time)
        // Get last state for metric to compare time
        const currentVal = this.state.get(targetMetric);
        const history = this.state.getHistory(targetMetric);
        const lastTs = history.length > 0 ? history[history.length - 1].updatedAt : '0';

        const timeResult = TimeGuard({ currentTs: intent.timestamp, lastTs });
        if (!timeResult.ok) throw new Error(`Kernel Reject: ${timeResult.violation}`);

        // Step 4: Protocol Resolution & Conflict
        // (If this Intent triggers a Protocol, we must check for conflicts)
        // This is tricky: Does the Intent *execute* a protocol, or does the Intent *trigger* one?
        // Usually Intent = State Change. 
        // If that State Change *triggers* a protocol, the Protocol Engine handles it.
        // But the Kernel must orchestrate.
        // Let's assume this execute() is processing a raw Intent.
        // If it succeeds, we check triggers.

        // Protocol Conflict Guard applies to triggers.
        // Let's resolve applicable protocols PRE-execution if possible? 
        // Or Post-Execution?
        // Formal Spec Gap 2 said "Reject if >1 protocol applies".
        // This implies checks before Side Effects (Cascading writes).
        // Let's defer Protocol Execution to after Commit, or handle recursively.
        // For THIS intent, we just guard the intent itself.

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
        // We log "ATTEMPT" to Audit Log. 
        // Note: AuditLog currently supports 'SUCCESS'/'FAILURE'. 
        // We need 'ATTEMPT'.
        // Let's expand L5 Audit types or overload. 
        // Creating a "Pending" entry? 
        // For strictness, let's append an ATTEMPT entry.
        this.audit.append(intent, 'ATTEMPT');

        try {
            // Step 7: Apply State Transition
            // StateModel.apply does its own checks (Redundant? or Layered Defense?)
            // Ideally Kernel guards are primary. StateModel takes "Trusted" input?
            // But we refactored StateModel to be robust (Gaps 3&5).
            // Let's call State.apply.
            this.state.apply(intent);

            // Step 8: Log OUTCOME
            // State.apply logged SUCCESS/FAILURE internally in previous step.
            // Wait, State.apply logs to AuditLog?
            // Yes. 
            // If Kernel logs ATTEMPT, and State logs SUCCESS, we have 2 entries per event.
            // This is "Verbose Traceability". Acceptable for Iron.

            return true;

        } catch (e: any) {
            // State.apply logged FAILURE internally (Gap 5).
            // We re-throw to HALT execution per Failure Semantics.
            throw new Error(`Kernel Halt: State Transition Failed: ${e.message}`);
        }
    }
}
