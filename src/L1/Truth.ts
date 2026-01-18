
import { AuditLedger, Evidence, LogicalTimestamp, Principal } from '../L0/Kernel';

// --- Metrics ---
export enum MetricType {
    COUNTER = 'COUNTER',
    GAUGE = 'GAUGE',
    BOOLEAN = 'BOOLEAN'
}

export interface MetricDefinition {
    id: string;
    description: string;
    type: MetricType;
    unit?: string;
    validator?: (value: any) => boolean;
}

export class MetricRegistry {
    private metrics: Map<string, MetricDefinition> = new Map();

    register(def: MetricDefinition) {
        if (this.metrics.has(def.id)) {
            throw new Error(`Metric ${def.id} already registered`);
        }
        this.metrics.set(def.id, def);
    }

    get(id: string): MetricDefinition | undefined {
        return this.metrics.get(id);
    }
}

// --- State ---
export interface StateValue<T = any> {
    value: T;
    updatedAt: string; // LogicalTimestamp
    evidenceHash: string; // Link to L0 ledger
}

export class StateModel {
    private state: Map<string, StateValue> = new Map();
    private history: Map<string, StateValue[]> = new Map(); // Key -> History

    constructor(private ledger: AuditLedger, private registry: MetricRegistry) { }

    // Ingest evidence to update state
    // "Evidence Semantics" from L0 are applied here
    // Evidence payload must be: { metricId: string, value: any }
    public apply(evidence: Evidence): void {
        const payload = evidence.payload;
        if (!payload || !payload.metricId || payload.value === undefined) {
            // Invalid payload, maybe log but don't crash? 
            // For IRON-5, maybe we reject invalid evidence?
            // But if it's in the ledger... the ledger is raw.
            // Let's assume we filter valid evidence.
            return;
        }

        const definition = this.registry.get(payload.metricId);
        if (!definition) {
            throw new Error(`Unknown metric: ${payload.metricId}`);
        }

        if (definition.validator && !definition.validator(payload.value)) {
            throw new Error(`Invalid value for ${payload.metricId}: ${payload.value}`);
        }

        // Commit to Ledger first (L0)
        const entry = this.ledger.append(evidence);

        // Update State (L1)
        const newState: StateValue = {
            value: payload.value,
            updatedAt: evidence.timestamp,
            evidenceHash: entry.hash
        };

        this.state.set(payload.metricId, newState);

        if (!this.history.has(payload.metricId)) {
            this.history.set(payload.metricId, []);
        }
        this.history.get(payload.metricId)?.push(newState);
    }

    public get(metricId: string): TLike | undefined {
        return this.state.get(metricId)?.value;
    }

    public getFullState(metricId: string): StateValue | undefined {
        return this.state.get(metricId);
    }

    public getHistory(metricId: string): StateValue[] {
        return this.history.get(metricId) || [];
    }
}

type TLike = any;

// --- Evidence Generator ---
export class EvidenceGenerator {
    static create(
        metricId: string,
        value: any,
        principal: Principal,
        time: LogicalTimestamp
    ): Evidence {
        return {
            payload: { metricId, value },
            signatory: principal.id,
            signature: 'mock_sig_' + principal.id, // In real world, sign payload
            timestamp: time.toString()
        };
    }
}
