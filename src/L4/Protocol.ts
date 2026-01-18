
import { StateModel, EvidenceGenerator } from '../L1/Truth';
import { Action } from '../L3/Simulation';
import { Principal, LogicalTimestamp } from '../L0/Kernel';

// --- Protocol DSL ---

export type ComparisonOperator = '>' | '<' | '==' | '>=' | '<=';

export interface Condition {
    metricId: string;
    operator: ComparisonOperator;
    value: number; // Simplified to numeric for now
}

export interface Protocol {
    id: string;
    name: string;
    trigger: Condition;
    response: Action; // The action to propose if trigger is met
    // Scope etc. omitted for MVP
}

// --- Engine ---

export class ProtocolEngine {
    private protocols: Map<string, Protocol> = new Map();

    constructor(private state: StateModel) { }

    public register(protocol: Protocol): void {
        // Validation logic here (L4 Compiler)
        if (!protocol.id || !protocol.trigger) {
            throw new Error('Invalid protocol definition');
        }
        this.protocols.set(protocol.id, protocol);
    }

    // Evaluate all protocols against current state
    // Returns a list of Proposed Actions
    public evaluate(): Action[] {
        const actions: Action[] = [];
        const now = Date.now(); // Wall clock for debug, but we check state values

        for (const proto of this.protocols.values()) {
            if (this.checkCondition(proto.trigger)) {
                actions.push(proto.response);
            }
        }
        return actions;
    }

    // Execute generated actions (Phase 4 -> L1/L3)
    // In a real OS, these might go to a "Pending Actions" pool or directly apply if auto-approved.
    public execute(actions: Action[], authority: Principal, time: LogicalTimestamp): void {
        actions.forEach(action => {
            // "Protocols may ONLY ... bind obligations ... define incentives"
            // But ultimately they result in Evidence on the Ledger (State Mutation).

            // For now, we reuse L1/L3 style mutation:
            const currentVal = Number(this.state.get(action.targetMetricId) || 0);
            const newVal = currentVal + action.valueMutation;

            const ev = EvidenceGenerator.create(action.targetMetricId, newVal, authority, time);
            this.state.apply(ev);
        });
    }

    private checkCondition(cond: Condition): boolean {
        const val = this.state.get(cond.metricId);
        if (typeof val !== 'number') return false; // Safety

        switch (cond.operator) {
            case '>': return val > cond.value;
            case '<': return val < cond.value;
            case '==': return val === cond.value;
            case '>=': return val >= cond.value;
            case '<=': return val <= cond.value;
            default: return false;
        }
    }
}
