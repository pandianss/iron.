
import { StateModel, EvidenceGenerator } from '../L1/Truth';
import { Principal, LogicalTimestamp } from '../L0/Kernel';
import { ProtocolEngine } from '../L4/Protocol'; // Maybe reuse Protocol Engine for consequences? 
// Or just plain logic. Spec says "Mechanical escalation".

export interface SLA {
    id: string;
    metricId: string;
    min?: number;
    max?: number;
    windowTicks: number; // Duration to maintain
    incentiveAmount: number;
    penaltyAmount: number;
}

export class ObligationTracker {
    // Track active SLAs per principal? For MVP, just system-wide SLAs.
    constructor(private state: StateModel) { }

    public checkCompliance(sla: SLA): boolean {
        // Simple spot check: Is current value valid?
        // Real SLA needs time-window aggregation (avg over 1hr > X).
        // MVP: Check current value.
        const val = Number(this.state.get(sla.metricId));
        if (isNaN(val)) return false;

        if (sla.min !== undefined && val < sla.min) return false;
        if (sla.max !== undefined && val > sla.max) return false;

        return true;
    }
}

export class AccountabilityEngine {
    private slas: SLA[] = [];
    private tracker: ObligationTracker;

    constructor(private state: StateModel) {
        this.tracker = new ObligationTracker(state);
    }

    public registerSLA(sla: SLA) {
        this.slas.push(sla);
    }

    public evaluate(authority: Principal, time: LogicalTimestamp) {
        this.slas.forEach(sla => {
            const isCompliant = this.tracker.checkCompliance(sla);

            if (isCompliant) {
                // Trigger Incentive
                // Apply "Rewards" metric?
                // Let's assume a "system.rewards" metric exists.
                this.payout(sla.incentiveAmount, authority, time);
            } else {
                // Trigger Consequence
                this.penalize(sla.penaltyAmount, authority, time);
            }
        });
    }

    private payout(amount: number, authority: Principal, time: LogicalTimestamp) {
        const current = Number(this.state.get('system.rewards') || 0);
        const ev = EvidenceGenerator.create('system.rewards', current + amount, authority, time);
        this.state.apply(ev);
    }

    private penalize(amount: number, authority: Principal, time: LogicalTimestamp) {
        const current = Number(this.state.get('system.rewards') || 0);
        const ev = EvidenceGenerator.create('system.rewards', current - amount, authority, time);
        this.state.apply(ev);
    }
}
