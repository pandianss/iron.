import { StateModel } from '../L2/State.js';
import { LogicalTimestamp } from '../L0/Kernel.js';
import type { Principal } from '../L1/Identity.js';

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
    constructor(private state: StateModel) { }

    public checkCompliance(sla: SLA): boolean {
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
                this.payout(sla.incentiveAmount, authority, time);
            } else {
                this.penalize(sla.penaltyAmount, authority, time);
            }
        });
    }

    private payout(amount: number, authority: Principal, time: LogicalTimestamp) {
        const current = Number(this.state.get('system.rewards') || 0);
        this.state.applyTrusted({ metricId: 'system.rewards', value: current + amount }, time.toString(), authority.id);
    }

    private penalize(amount: number, authority: Principal, time: LogicalTimestamp) {
        const current = Number(this.state.get('system.rewards') || 0);
        this.state.applyTrusted({ metricId: 'system.rewards', value: current - amount }, time.toString(), authority.id);
    }
}

