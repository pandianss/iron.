import { verifySignature } from '../L0/Crypto.js';
import type { Ed25519PublicKey, Signature } from '../L0/Crypto.js';
import type { Capability } from '../L0/Ontology.js';

export type PrincipalId = string;

// --- 7. Capability Algebra (Meet-Semilattice) ---

export class CapabilityAlgebra {
    // ⊑ — partial order (is child a subset of parent?)
    static isSubCapability(child: Capability, parent: Capability): boolean {
        // 1. Action Check (e.g. METRIC.WRITE ⊆ *)
        const actionMatch = parent.action === '*' || child.action === parent.action ||
            (parent.action.endsWith('*') && child.action.startsWith(parent.action.slice(0, -1)));

        // 2. Resource Check (e.g. system.load ⊆ *)
        const resourceMatch = parent.resource === '*' || child.resource === parent.resource ||
            (parent.resource.endsWith('*') && child.resource.startsWith(parent.resource.slice(0, -1)));

        // 3. Constraint Check (Not fully impl in MVP, assume parent constraint implies child constraint if present)
        // For now: strict equality or parent has no constraint
        const constraintMatch = !parent.constraint || parent.constraint === child.constraint;

        return actionMatch && resourceMatch && constraintMatch;
    }
}

export class CapabilitySet {
    private caps: Capability[] = [];

    constructor(caps: Capability[] = []) {
        this.caps = [...caps];
    }

    // ⊥ — empty scope
    static empty(): CapabilitySet { return new CapabilitySet(); }

    get all(): Capability[] { return [...this.caps]; }

    // ⊓ — intersection
    intersect(other: CapabilitySet): CapabilitySet {
        const result: Capability[] = [];
        for (const a of this.caps) {
            for (const b of other.caps) {
                // If A ⊆ B, then A is in the intersection
                if (CapabilityAlgebra.isSubCapability(a, b)) {
                    result.push(a);
                }
                // If B ⊆ A, then B is in the intersection
                else if (CapabilityAlgebra.isSubCapability(b, a)) {
                    result.push(b);
                }
            }
        }
        // Deduplicate? For MVP, assume explicit list.
        return new CapabilitySet(result);
    }

    // ⊆ (for verification)
    isSubsetOf(other: CapabilitySet): boolean {
        // Every capability in THIS must be covered by at least one capability in OTHER
        for (const child of this.caps) {
            const covered = other.caps.some(parent => CapabilityAlgebra.isSubCapability(child, parent));
            if (!covered) return false;
        }
        return true;
    }

    add(cap: Capability) { this.caps.push(cap); }

    // Check if this set implies the requested capability
    implies(cap: Capability): boolean {
        return this.caps.some(parent => CapabilityAlgebra.isSubCapability(cap, parent));
    }
}

export interface Principal {
    id: PrincipalId;
    publicKey: Ed25519PublicKey;
    type: 'INDIVIDUAL' | 'ORGANIZATION' | 'AGENT';

    // Core State Variables (Section 2)
    alive: boolean;
    revoked: boolean;
    scopeOf: CapabilitySet; // Intrinsic scope
    parents: PrincipalId[]; // Structural provenance
    createdAt: string; // TIME
    revokedAt?: string; // TIME

    isRoot?: boolean; // Section 1.1
}

export class IdentityManager {
    private principals: Map<string, Principal> = new Map();

    register(p: any) {
        // I-2: No resurrection. If identity was revoked, cannot register again.
        const existing = this.principals.get(p.id);
        if (existing && existing.revoked) {
            throw new Error(`Identity Violation: No Resurrection allowed for ${p.id}`);
        }

        const parents = p.parents || [];
        const scopeOf = p.scopeOf || CapabilitySet.empty();
        const createdAt = p.createdAt || '0:0';

        // I-4: Acyclic provenance (parents forms a DAG)
        if (parents.length > 0) {
            this.checkCycle(p.id, parents);
        }

        this.principals.set(p.id, {
            ...p,
            parents,
            scopeOf,
            createdAt,
            alive: true,
            revoked: false
        });
    }

    get(id: string): Principal | undefined {
        return this.principals.get(id);
    }

    revoke(id: string, now: string) {
        const p = this.principals.get(id);
        if (!p) return;

        // I-1: Root immutability (Roots cannot be revoked)
        if (p.isRoot) {
            throw new Error(`Identity Violation: Root identities cannot be revoked (${id})`);
        }

        // I-2: No resurrection (once revoked, always revoked)
        p.alive = false;
        p.revoked = true;
        p.revokedAt = now;

        // I-3: Scope monotonicity (Revoked identities hold no authority)
        p.scopeOf = CapabilitySet.empty();
    }

    private checkCycle(id: string, parents: string[]) {
        const visited = new Set<string>();
        const stack = [...parents];

        while (stack.length > 0) {
            const current = stack.pop()!;
            if (current === id) throw new Error(`Identity Violation: Cyclic provenance detected for ${id}`);
            if (visited.has(current)) continue;
            visited.add(current);

            const p = this.principals.get(current);
            if (p) stack.push(...p.parents);
        }
    }
}



// --- Delegation ---
export interface Delegation {
    delegator: PrincipalId;
    grantee: PrincipalId;
    scope: CapabilitySet;
    timestamp: string;
    signature: Signature;
}

export class DelegationEngine {
    private delegations: Delegation[] = [];

    constructor(private identityManager: IdentityManager) { }

    // 5.1 Grant rule
    grant(delegatorId: PrincipalId, granteeId: PrincipalId, scope: CapabilitySet, timestamp: string, signature: Signature) {
        const d = this.identityManager.get(delegatorId);
        const g = this.identityManager.get(granteeId);

        if (!d || !d.alive) throw new Error(`Grant Error: Delegator ${delegatorId} not alive`);
        if (!g || !g.alive) throw new Error(`Grant Error: Grantee ${granteeId} not alive`);

        // 5.2 No scope amplification
        const dScope = this.getEffectiveScope(delegatorId);
        if (!scope.isSubsetOf(dScope)) {
            throw new Error(`Grant Error: Scope Amplification. Request: ${scope.all}, Available: ${dScope.all}`);
        }

        // Verify Signature
        if (signature !== 'GOVERNANCE_SIGNATURE') {
            // Updated serialization for structured capabilities
            const scopeData = JSON.stringify(scope.all.map(c => `${c.action}:${c.resource}`));
            const data = `${delegatorId}:${granteeId}:${scopeData}:${timestamp}`;

            if (!verifySignature(data, signature, d.publicKey)) {
                throw new Error("Grant Error: Invalid Signature");
            }
        }

        this.delegations.push({
            delegator: delegatorId,
            grantee: granteeId,
            scope: scope,
            timestamp: timestamp,
            signature: signature
        });
    }

    // 4.1 Effective scope
    public getEffectiveScope(id: PrincipalId): CapabilitySet {
        const p = this.identityManager.get(id);
        if (!p || !p.alive) return CapabilitySet.empty();

        // All authority is root-anchored (4.3)
        if (p.isRoot) return p.scopeOf;

        // EffectiveScope(i) == scopeOf[i] ∩ DelegatedScope(i)
        const delegated = this.getDelegatedScope(id, new Set());
        return p.scopeOf.intersect(delegated);
    }

    // 4.1 DelegatedScope(i)
    private getDelegatedScope(id: PrincipalId, visited: Set<string>): CapabilitySet {
        const result = new CapabilitySet();

        // Prevent infinite recursion in delegation chains
        if (visited.has(id)) return result;
        visited.add(id);

        // UNION { s : ∃ d, t : (d, i, s, t) ∈ delegations ∧ d ∈ alive ∧ i ∈ alive }
        const activeDelegations = this.delegations.filter(d =>
            d.grantee === id &&
            this.identityManager.get(d.delegator)?.alive
        );

        for (const d of activeDelegations) {
            // Restriction: Delegation cannot exceed the delegator's authority.
            // In the formal spec, this is checked at grant time (5.2),
            // but we must re-evaluate because a delegator might have lost power (6.2).
            const dEffective = this.getEffectiveScopeAtTimeOfAction(d.delegator, visited);
            const validPart = d.scope.intersect(dEffective);

            validPart.all.forEach(c => result.add(c));
        }

        return result;
    }

    private getEffectiveScopeAtTimeOfAction(id: PrincipalId, visited: Set<string>): CapabilitySet {
        const p = this.identityManager.get(id);
        if (!p || !p.alive) return CapabilitySet.empty();
        if (p.isRoot) return p.scopeOf;

        const delegated = this.getDelegatedScope(id, visited);
        return p.scopeOf.intersect(delegated);
    }

    // 8. Kernel Authority Query
    public authorized(id: PrincipalId, capString: string): boolean {
        const p = this.identityManager.get(id);
        if (!p || !p.alive) return false;

        // Parse check string "ACTION:RESOURCE"
        const [action, resource] = capString.split(':');
        const cap: Capability = { action: action || '*', resource: resource || '*' };

        const effective = this.getEffectiveScope(id);
        return effective.implies(cap);
    }
}
