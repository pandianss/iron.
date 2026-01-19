import { StateModel } from '../L2/State.js';
import { IntentFactory } from '../L2/IntentFactory.js';
import { LogicalTimestamp } from '../L0/Kernel.js';
import type { PrincipalId } from '../L1/Identity.js';
import { IdentityManager } from '../L1/Identity.js';
import { verifySignature } from '../L0/Crypto.js';
import type { Ed25519PrivateKey } from '../L0/Crypto.js';
import { ExtensionValidator } from './Extension.js';
import type { Protocol, ProtocolBundle, Rule, Predicate } from './ProtocolTypes.js';
import { hash } from '../L0/Crypto.js';

export type { Protocol, ProtocolBundle };

export class ProtocolEngine {
    private protocols: Map<string, Protocol> = new Map();

    constructor(private state: StateModel) { }

    register(p: Protocol) {
        ExtensionValidator.validate(p);
        this.protocols.set(p.id!, p);
    }

    loadBundle(bundle: ProtocolBundle, trustScope: string) {
        // 1. Rule 1: Bundle ID Integrity
        const bundleCopy = { ...bundle };
        (bundleCopy as any).signature = undefined;
        (bundleCopy as any).bundleId = undefined;

        const cleanBundle = JSON.parse(JSON.stringify(bundleCopy));
        delete cleanBundle.signature;
        delete cleanBundle.bundleId;

        const sortedBundle = this.sortObject(cleanBundle);
        const stringToHash = JSON.stringify(sortedBundle);
        const calculatedId = hash(stringToHash);

        if (calculatedId !== bundle.bundleId) {
            throw new Error(`Bundle ID Mismatch: Expected ${bundle.bundleId}, calculated ${calculatedId}`);
        }

        // 2. Rule 2: Signature Verification
        let pubKey = bundle.owner.publicKey;
        if (pubKey.startsWith('ed25519:')) pubKey = pubKey.split(':')[1]!;

        let sig = bundle.signature;
        if (sig.startsWith('ed25519:')) sig = sig.split(':')[1]!;

        if (!verifySignature(calculatedId, sig, pubKey)) {
            throw new Error("Invalid Bundle Signature");
        }

        // 3. Rule 3: Owner Scope subset Trust Scope
        if (!this.isScopeAllowed(bundle.owner.scope, trustScope)) {
            throw new Error(`Owner Scope Violation: ${bundle.owner.scope} not allowed in ${trustScope}`);
        }

        // 4. Rule 7: Conflict Detection
        const existingTargets = new Map<string, string>();
        for (const p of this.protocols.values()) {
            this.getActionMetrics(p).forEach(m => existingTargets.set(m, p.id!));
        }

        for (const p of bundle.protocols) {
            ExtensionValidator.validate(p);
            const targets = this.getActionMetrics(p);
            for (const t of targets) {
                const existingId = existingTargets.get(t);
                if (existingId && existingId !== p.id) {
                    throw new Error(`Bundle Conflict: Protocol ${p.name || p.id} conflicts with ${existingId} on ${t}`);
                }
            }
        }

        // Apply
        bundle.protocols.forEach(p => {
            const id = p.id || `${bundle.bundleId}.${p.name}`;
            this.protocols.set(id, p);
        });
    }

    private isScopeAllowed(child: string, parent: string): boolean {
        if (parent === '*') return true;
        if (child === parent) return true;
        return child.startsWith(parent + ".");
    }

    private getActionMetrics(p: Protocol): string[] {
        const metrics: string[] = [];
        for (const r of p.execution) {
            if (typeof r === 'string') continue;
            const rule = r as Rule;
            if (rule.type === 'MUTATE_METRIC' && rule.metricId) {
                metrics.push(rule.metricId);
            }
        }
        return metrics;
    }

    evaluateAndExecute(authority: PrincipalId, privateKey: Ed25519PrivateKey, time: LogicalTimestamp) {
        const triggered: Protocol[] = [];

        for (const p of this.protocols.values()) {
            if (this.checkPreconditions(p)) {
                triggered.push(p);
            }
        }

        const targets = new Set<string>();
        for (const p of triggered) {
            const metrics = this.getActionMetrics(p);
            for (const m of metrics) {
                if (targets.has(m)) throw new Error(`Protocol Conflict: Multiple protocols targeting ${m}`);
                targets.add(m);
            }
        }

        for (const p of triggered) {
            this.executeRules(p, authority, privateKey, time);
        }
    }

    private checkPreconditions(p: Protocol): boolean {
        for (const pr of p.preconditions) {
            if (typeof pr === 'string') continue;
            const pre = pr as Predicate;
            if (pre.type === 'METRIC_THRESHOLD') {
                if (!pre.metricId || pre.value === undefined) continue;
                const current = Number(this.state.get(pre.metricId));
                if (isNaN(current)) return false;

                const thresh = Number(pre.value);
                if (pre.operator === '>' && !(current > thresh)) return false;
                if (pre.operator === '>=' && !(current >= thresh)) return false;
            }
            if (pre.type === 'ALWAYS') return true;
        }
        return p.preconditions.length > 0;
    }

    private executeRules(p: Protocol, authority: PrincipalId, privateKey: Ed25519PrivateKey, time: LogicalTimestamp) {
        for (const r of p.execution) {
            if (typeof r === 'string') continue;
            const rule = r as Rule;
            if (rule.type === 'MUTATE_METRIC' && rule.metricId && rule.mutation !== undefined) {
                const current = Number(this.state.get(rule.metricId) || 0);
                const newVal = current + rule.mutation;
                const intent = IntentFactory.create(rule.metricId, newVal, authority, privateKey, time.time + 1);
                this.state.apply(intent);
            }
        }
    }

    private sortObject(obj: any): any {
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(item => this.sortObject(item));
        const sorted: any = {};
        Object.keys(obj).sort().forEach(key => {
            sorted[key] = this.sortObject(obj[key]);
        });
        return sorted;
    }
}

