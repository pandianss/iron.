
import { StateModel, EvidenceGenerator, MetricRegistry } from '../L1/Truth';
import { TrendAnalyzer, Forecast } from '../L2/Prediction';
import { Principal, LogicalTimestamp, AuditLedger, Evidence } from '../L0/Kernel';

// --- Action ---
export interface Action {
    id: string;
    description: string;
    // A simplified mutation: applying this action adds/sets a metric value
    // In a full system, this would be a Protocol execution
    targetMetricId: string;
    valueMutation: number; // e.g., +10, -5, or set value (simplified to additive for now)
}

// --- Simulation Engine ---
export class SimulatedState extends StateModel {
    // A wrapper or extension of StateModel that doesn't write to the REAL Ledger?
    // Or writes to a temporary Ledger?
    // For IRON-5 spec: "L0 Kernel - Audit Ledger - Hash-Chained".
    // Simulations shouldn't pollute the main ledger.
    // So we need a MockLedger or in-memory Ledger.

    constructor(
        ledger: AuditLedger, // We'll pass a fresh ephemeral ledger here
        registry: MetricRegistry,
        initialStateSnapshot: Map<string, any> // Simplified snapshot import
    ) {
        super(ledger, registry);
        // Hydrate state from snapshot
        // We need a way to force-set state in StateModel without evidence? 
        // Or we just generate "Genesis Evidence" for the simulation.
    }
}

export class SimulationEngine {
    constructor(private registry: MetricRegistry) { }

    public run(
        currentState: StateModel,
        action: Action | null,
        horizon: number
    ): Forecast | null {
        // 1. Fork State
        // Create an ephemeral ledger for the simulation
        const simLedger = new AuditLedger();
        const simState = new StateModel(simLedger, this.registry);

        // 2. Hydrate Simulation with current reality (Deep Copy mostly)
        // In a real sys, efficiently clone. Here, we loop.
        // We need to inspect `currentState` internals or add a public export.
        // Let's assume we can get history.

        // We need the history to feed the TrendAnalyzer.
        // Let's copy the history of the target metric.
        // If action impacts Metric A, we need history of A.

        const targetId = action ? action.targetMetricId : "system.load"; // Default or detect
        // Ideally we copy ALL state.

        const originalHistory = currentState.getHistory(targetId);
        const admin: Principal = { id: 'sim-admin', publicKey: 'sim' };

        // Replay history into simState to establish baseline
        // Note: Replaying ALL legacy evidence is expensive.
        // Usually we just take the last N points needed for prediction (TrendAnalyzer needs ~10).
        originalHistory.forEach(h => {
            // We construct a mock evidence to feed the state model
            // We don't care about timestamps being exact for the *ledger*, but we do for the *series*.
            // Only the value matters for the TrendAnalyzer currently (it ignores time in our impl).
            const ev = EvidenceGenerator.create(targetId, h.value, admin, LogicalTimestamp.fromString(h.updatedAt));
            simState.apply(ev);
        });

        // 3. Apply Action (if any)
        if (action) {
            // Apply the mutation as a new evidence at "Now"
            // For now, let's assume mutation is "Add X to current value"
            const currentVal = Number(simState.get(targetId) || 0);
            const newVal = currentVal + action.valueMutation;

            // "Now" in simulation is +1 tick from last history
            const lastTimeStr = originalHistory.length > 0 ? originalHistory[originalHistory.length - 1].updatedAt : "0:0";
            // Hacky increment
            const time = LogicalTimestamp.fromString(lastTimeStr); // Just reuse for now or mock

            const actionEv = EvidenceGenerator.create(targetId, newVal, admin, time);
            simState.apply(actionEv);
        }

        // 4. Run Prediction
        const analyzer = new TrendAnalyzer(simState);
        return analyzer.forecast(targetId, horizon);
    }
}

// --- Strategy ---
export class HybridStrategyEngine {
    constructor(private simEngine: SimulationEngine) { }

    public compare(
        currentState: StateModel,
        action: Action,
        horizon: number
    ): { baseline: Forecast | null, simulated: Forecast | null, delta: number } {

        const baseline = this.simEngine.run(currentState, null, horizon);
        const simulated = this.simEngine.run(currentState, action, horizon);

        let delta = 0;
        if (baseline && simulated) {
            delta = simulated.predictedValue - baseline.predictedValue;
        }

        return { baseline, simulated, delta };
    }
}
