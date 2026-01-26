// src/L0/Invariants.ts
import { IdentityManager } from '../L1/Identity.js';
import type { Action } from '../L2/State.js';

// --- 1. Ontology of Illegality ---
export type IllegalState =
    | 'NEGATIVE_BALANCE'
    | 'EXPIRED_AUTHORITY'
    | 'REVOKED_ENTITY'
    | 'BUDGET_EXCEEDED'
    | 'PROTOCOL_VIOLATION'
    | 'TEMPORAL_PARADOX'
    | 'SIGNATURE_INVALID'
    | 'NON_FINITE_METRIC'
    | 'INVALID_ID_FORMAT'
    | 'SELF_DELEGATION'
    | 'MISSING_METRIC_ID'
    | 'PAYLOAD_OVERSIZE';

export interface Invariant {
    id: string;
    description: string;
    predicate: (context: InvariantContext) => boolean;
    violation: IllegalState;
}

export interface InvariantContext {
    action: Action;
    manager: IdentityManager;
    state?: any;
}

export interface Rejection {
    code: IllegalState;
    invariantId: string;
    message: string;
}

// --- 2. Constitutional Invariants ---

// I. Identity Integrity
export const INV_ID_01: Invariant = {
    id: 'INV-ID-01',
    description: 'Signature format must be valid hex',
    predicate: ({ action }) => /^[0-9a-fA-F]+$/.test(action.signature),
    violation: 'SIGNATURE_INVALID'
};

export const INV_ID_02: Invariant = {
    id: 'INV-ID-02',
    description: 'Entity must exist in Identity Registry',
    predicate: ({ manager, action }) => {
        if (action.payload.protocolId === 'REGISTER') return true;
        return !!manager.get(action.initiator);
    },
    violation: 'REVOKED_ENTITY'
};

export const INV_ID_03: Invariant = {
    id: 'INV-ID-03',
    description: 'Entity must be ACTIVE',
    predicate: ({ manager, action }) => {
        if (action.payload.protocolId === 'REGISTER') return true;
        const entity = manager.get(action.initiator);
        return entity?.status === 'ACTIVE';
    },
    violation: 'REVOKED_ENTITY'
};

// II. Resource Bounds
export const INV_RES_01: Invariant = {
    id: 'INV-RES-01',
    description: 'Metrics must be finite numbers',
    predicate: ({ action }) => {
        if (typeof action.payload.value === 'number') {
            return Number.isFinite(action.payload.value);
        }
        return true;
    },
    violation: 'NON_FINITE_METRIC'
};

export const INV_RES_02: Invariant = {
    id: 'INV-RES-02',
    description: 'No future timestamp > 1 min',
    predicate: ({ action }) => {
        const now = Date.now();
        const tsString = typeof action.timestamp === 'string' ? action.timestamp : '';
        const ts = tsString ? parseInt(tsString.split(':')[0] || '0') : (typeof action.timestamp === 'number' ? action.timestamp : 0);

        return (ts as number) <= now + 60000;
    },
    violation: 'TEMPORAL_PARADOX'
};

export const INV_RES_03: Invariant = {
    id: 'INV-RES-03',
    description: 'Payload size limit (16KB)',
    predicate: ({ action }) => {
        return JSON.stringify(action.payload).length <= 16384;
    },
    violation: 'PAYLOAD_OVERSIZE'
};

// III. Structural Integrity
export const INV_PRO_01: Invariant = {
    id: 'INV-PRO-01',
    description: 'Action ID must be present',
    predicate: ({ action }) => !!action.actionId && action.actionId.length > 0,
    violation: 'INVALID_ID_FORMAT'
};

export const INV_PRO_02: Invariant = {
    id: 'INV-PRO-02',
    description: 'Payload must contain metricId',
    predicate: ({ action }) => !!action.payload?.metricId,
    violation: 'MISSING_METRIC_ID'
};

// --- Aggregate Constitutional Check ---
export const KERNEL_INVARIANTS: Invariant[] = [
    INV_ID_01, INV_ID_02, INV_ID_03,
    INV_RES_01, INV_RES_02, INV_RES_03,
    INV_PRO_01, INV_PRO_02
];

export function checkInvariants(context: InvariantContext): { ok: boolean; rejection?: Rejection } {
    for (const inv of KERNEL_INVARIANTS) {
        if (!inv.predicate(context)) {
            return {
                ok: false,
                rejection: {
                    code: inv.violation,
                    invariantId: inv.id,
                    message: `Invariant Violation: ${inv.description}`
                }
            };
        }
    }
    return { ok: true };
}
