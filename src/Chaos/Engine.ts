
import { StateModel, EvidenceGenerator } from '../L1/Truth';
import { Principal, LogicalTimestamp } from '../L0/Kernel';
import { Action, SimulationEngine } from '../L3/Simulation';

export class ChaosBudget {
    constructor(private limit: number, private currentSpend: number = 0) { }

    public canAfford(cost: number): boolean {
        return (this.currentSpend + cost) <= this.limit;
    }

    public spend(cost: number) {
        this.currentSpend += cost;
    }

    public reset() {
        this.currentSpend = 0;
    }

    public getRemaining(): number {
        return this.limit - this.currentSpend;
    }
}

export class ChaosEngine {
    private budget: ChaosBudget;

    constructor(
        private state: StateModel,
        budgetLimit: number = 100
    ) {
        this.budget = new ChaosBudget(budgetLimit);
    }

    public scheduleInjection(
        action: Action,
        cost: number,
        authority: Principal,
        time: LogicalTimestamp
    ): boolean {
        // 1. Check Safety (Circuit Breaker)
        if (!this.isSystemStable()) {
            console.warn("Chaos aborted: System unstable.");
            return false;
        }

        // 2. Check Budget
        if (!this.budget.canAfford(cost)) {
            console.warn("Chaos aborted: Budget exceeded.");
            return false;
        }

        // 3. Inject (Apply Action)
        this.budget.spend(cost);
        this.executeChaos(action, authority, time);
        return true;
    }

    private isSystemStable(): boolean {
        // Simple health check. MVP: load < 90?
        const load = Number(this.state.get('system.load') || 0);
        return load < 90;
    }

    private executeChaos(action: Action, authority: Principal, time: LogicalTimestamp) {
        // Reuse similar logic to L3/L4 appliers
        const currentVal = Number(this.state.get(action.targetMetricId) || 0);
        const newVal = currentVal + action.valueMutation;

        const ev = EvidenceGenerator.create(action.targetMetricId, newVal, authority, time);
        this.state.apply(ev);
    }
}
