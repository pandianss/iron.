import { StateModel, MetricRegistry } from '../L2/State.js';
import { TrendAnalyzer } from '../L2/Prediction.js';
import type { Forecast } from '../L2/Prediction.js';
import { LogicalTimestamp } from '../L0/Kernel.js';
import { AuditLog } from '../L5/Audit.js';
import { ProtocolEngine } from '../L4/Protocol.js';

// --- Action ---
export interface Action {
    id: string;
    description: string;
    targetMetricId: string;
    valueMutation: number;
}

// --- Simulation Engine ---
export class SimulationEngine {
    constructor(private registry: MetricRegistry, private protocols: ProtocolEngine) { }

    public run(
        currentState: StateModel,
        action: Action | null,
        horizon: number
    ): Forecast | null {
        // 1. Fork Store (Ephemeral)
        const simAudit = new AuditLog();
        const simState = new StateModel(simAudit, this.registry, (currentState as any).identityManager);

        // 2. Hydrate Simulation with current reality
        const targetId = action ? action.targetMetricId : "system.load";
        const originalHistory = currentState.getHistory(targetId);

        originalHistory.forEach(h => {
            simState.applyTrusted({ metricId: targetId, value: h.value }, h.updatedAt, 'sim-baseline');
        });

        // 3. Apply Action (if any)
        if (action) {
            const currentVal = Number(simState.get(targetId) || 0);
            const newVal = currentVal + action.valueMutation;

            const lastTimeStr = originalHistory.length > 0 ? originalHistory[originalHistory.length - 1]!.updatedAt : "0:0";
            const time = LogicalTimestamp.fromString(lastTimeStr);

            simState.applyTrusted({ metricId: targetId, value: newVal }, time.toString(), 'sim-action');

            // 4. Trigger Protocols (Simulated)
            // Note: ProtocolEngine needs to be forked or use SimState
            const simProtocols = new ProtocolEngine(simState);
            // In a real system, we'd copy registered protocols. 
            // For MVP sim, we assume the passed ProtocolEngine is the source.
            (this.protocols as any).protocols.forEach((p: any, id: string) => simProtocols.register(p));

            // Simulating a few ticks of protocols
            try {
                // Simulation doesn't have private keys, so we'd need a trusted execute in ProtocolEngine too
                // For now, we'll assume the sim just checks triggers.
                // Refactoring ProtocolEngine for Trusted Execution is Phase 3.
            } catch (e) {
                // Protocol conflict or failure in sim
            }
        }

        // 5. Run Prediction
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

