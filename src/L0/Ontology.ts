
/**
 * IRON-5 ONTOLOGY
 * The Single Source of Truth for all Kernel Primitives.
 * 
 * "No kernel module introduces a new undefined primitive."
 */

// --- I. Identity & Authority (Who) ---

export type PrincipalId = string; // e.g. "did:iron:123", "sys:root"

export interface Identity {
    id: PrincipalId;
    type: 'HUMAN' | 'AGENT' | 'SYSTEM' | 'DAO';
    publicKey: string; // ed25519
    createdAt: string; // LogicalTimestamp
}

export type Signature = string; // "ed25519:<hex>"

export interface Authority {
    principalId: PrincipalId;
    scope: Capability[];
    delegations: Delegation[];
}

export interface Capability {
    action: string; // "METRIC.WRITE"
    resource: string; // "system.loading"
    constraint?: string; // "value < 100"
}

export interface Delegation {
    granter: PrincipalId;
    grantee: PrincipalId;
    scope: Capability[];
    expiry: string; // LogicalTimestamp
    signature: Signature;
}

// --- II. State & Change (What) ---

export type MetricId = string;
export type MetricValue = number | string | boolean;

export interface State {
    hash: string; // Merkle Root
    metrics: Map<MetricId, MetricValue>;
    lineageHeight: number;
}

export interface Intent {
    intentId: string;
    principalId: PrincipalId;
    payload: {
        metricId: MetricId;
        value: MetricValue;
    };
    timestamp: string; // LogicalTimestamp
    expiresAt: string;
    signature: Signature;
}

export interface Event {
    id: string;
    type: string;
    timestamp: string;
    data: any;
}

// --- III. Law & Protocol (How) ---

export type ProtocolId = string;

export interface Protocol {
    id: ProtocolId;
    category: 'INTENT' | 'HABIT' | 'BUDGET' | 'AUTHORITY' | 'ACCOUNTABILITY' | 'RISK';
    logic: (state: State, intent: Intent) => Effect[];
}

export interface Law {
    id: string;
    statement: string; // "Authority Conservation Law"
    enforcement: (context: any) => boolean;
}

export interface Effect {
    metricId: MetricId;
    mutation: MetricValue;
}

// --- IV. Economics & Accountability (Cost) ---

export interface Budget {
    type: 'ENERGY' | 'COMPUTE' | 'RISK';
    limit: number;
    consumed: number;
}

export interface Violation {
    ruleId: string;
    offender: PrincipalId;
    severity: 'WARNING' | 'CRITICAL' | 'FATAL';
    timestamp: string;
}

export interface Accountability {
    score: number;
    history: Violation[];
}

// --- V. Federation (Where) ---

export interface Federation {
    kernelId: string;
    peers: string[]; // List of other Kernel IDs
    trustLevel: 'SOVEREIGN' | 'ALLIED' | 'HOSTILE';
}

// --- VI. Kernel Lifecycle (When) ---

export type KernelState =
    | 'UNINITIALIZED'
    | 'CONSTITUTED'
    | 'ACTIVE'
    | 'SUSPENDED'
    | 'VIOLATED'
    | 'RECOVERED'
    | 'DISSOLVED';
